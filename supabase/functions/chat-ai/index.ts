import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = "AIzaSyDIonhKwOX92rcBtLnmvtxTYVx13-ioolg";
const googleSearchApiKey = "AIzaSyDNZJ9670CSXI0hSyNqFovMGxuRqbn29YE";
const searchEngineId = "558348571e0414fd7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content moderation: Check for inappropriate/adult content requests
const isInappropriateContent = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  const inappropriateKeywords = [
    'porn', 'sex', 'sexy', 'nude', 'naked', 'nsfw', 'adult', 'xxx', 'explicit',
    'erotic', 'sexual', '18+', 'hentai', 'fetish', 'obscene', 'vulgar',
    'inappropriate', 'seductive', 'intimate', 'provocative', 'lewd',
    'pornography', 'pornographic', 'intercourse', 'orgasm', 'masturbat',
    'breast', 'nipple', 'genitals', 'penis', 'vagina', 'anal',
    'rape', 'violence', 'gore', 'disturbing', 'graphic violence'
  ];
  
  return inappropriateKeywords.some(keyword => lowerQuery.includes(keyword));
};

// Enhanced intent detection: Check if query needs real-time/search data
const needsSearch = (query: string): boolean => {
  const searchKeywords = [
    'current', 'today', 'now', 'latest', 'recent', 'weather', 
    'news', 'stock', 'price', 'score', 'live', 'update',
    'what is happening', 'what happened', 'who won', 'real-time',
    'trending', 'breaking', 'search', 'find', 'look up', 'tell me about recent'
  ];
  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
};

// Detect if query needs images (visual content)
const needsImages = (query: string): boolean => {
  const imageKeywords = [
    'image', 'images', 'picture', 'pictures', 'photo', 'photos',
    'show me', 'look like', 'looks like', 'appearance', 'visual',
    'see', 'view', 'gallery', 'screenshot', 'pic', 'pics',
    'how does', 'what does', 'design', 'style', 'color', 'face',
    'img', 'provide an img', 'provide img', 'show img', 'display img',
    'can you provide', 'give me image', 'send image', 'share image'
  ];
  const lowerQuery = query.toLowerCase();
  return imageKeywords.some(keyword => lowerQuery.includes(keyword));
};

// Extract topic from conversation context with enhanced context tracking
const extractTopicFromContext = (message: string, context?: any[]): string => {
  // Context reference keywords (user referring to previous topic)
  const contextReferences = ['above', 'previous', 'that topic', 'those', 'these', 'it', 'them', 'earlier', 'before'];
  const hasContextRef = contextReferences.some(ref => message.toLowerCase().includes(ref));
  
  // If user is asking for images in follow-up or references previous context
  if ((needsImages(message) || hasContextRef) && context && context.length > 0) {
    // Get last substantive messages (excluding image-only requests)
    const recentMessages = context
      .filter((msg: any) => msg.role === 'user' && !msg.content.toLowerCase().match(/^(can you |please |could you )?(provide|show|display|send|give me) (an? )?(img|image|picture|photo)/))
      .slice(-3)
      .map((msg: any) => msg.content);
    
    if (recentMessages.length > 0) {
      // Return the most recent substantive topic
      return recentMessages[recentMessages.length - 1];
    }
  }
  
  return message;
};

// Enhanced search: Fetch web results and optionally images
const fetchSearchResults = async (query: string, includeImages: boolean = false) => {
  try {
    // Fetch web search results
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;
    const webResponse = await fetch(searchUrl);
    
    if (!webResponse.ok) {
      console.error('Search API error:', webResponse.status);
      return null;
    }
    
    const webData = await webResponse.json();
    const webResults = webData.items?.slice(0, 3).map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link
    })) || [];

    let imageResults = [];
    
    // Only fetch images if the query explicitly asks for visual content
    if (includeImages) {
      // Enhance query with quality keywords for better HD/4K results
      const qualityQuery = `${query} high quality HD 4K`;
      const imageUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(qualityQuery)}&searchType=image&imgSize=huge&imgType=photo&num=10`;
      const imageResponse = await fetch(imageUrl);
      const imageData = imageResponse.ok ? await imageResponse.json() : null;
      
      // Deduplicate images by URL and title
      const uniqueImages = new Map();
      imageData?.items?.forEach((item: any) => {
        const imageUrl = item.link;
        if (!uniqueImages.has(imageUrl)) {
          uniqueImages.set(imageUrl, {
            title: item.title,
            link: imageUrl,
            thumbnail: item.image?.thumbnailLink
          });
        }
      });
      
      // Get top 6 unique high-quality images
      imageResults = Array.from(uniqueImages.values()).slice(0, 6);
    }

    return {
      web: webResults,
      images: imageResults,
      query: query
    };
  } catch (error) {
    console.error('Error fetching search results:', error);
    return null;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context } = await req.json();
    
    console.log('Processing chat request:', { message, context });

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    // CRITICAL: Check for inappropriate content BEFORE any API calls
    if (isInappropriateContent(message)) {
      console.log('⚠️ Blocked inappropriate content request:', message);
      return new Response(
        JSON.stringify({
          response: "SYSTEM_ASSISTANT@system ⚠️ I cannot provide adult content, explicit images, or inappropriate material. I'm designed to be a helpful and safe AI assistant. Please ask me something else - I'm here to help with information, technology, science, education, and much more! 😊"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Check if we need to fetch search results
    let searchContext = '';
    let searchResults = null;
    const shouldFetchImages = needsImages(message);
    const shouldSearch = needsSearch(message);
    
    // If user wants images, extract topic from context and fetch
    if (shouldFetchImages) {
      const topicQuery = extractTopicFromContext(message, context);
      console.log('Fetching images for topic:', topicQuery);
      searchResults = await fetchSearchResults(topicQuery, true);
      
      // If this is primarily an image request (not asking for info), return images directly
      const isImageOnlyRequest = message.toLowerCase().match(/^(can you |please |could you )?(provide|show|display|send|give me) (an? )?(img|image|picture|photo)/);
      
      if ((isImageOnlyRequest || !shouldSearch) && searchResults?.images?.length > 0) {
        return new Response(JSON.stringify({
          response: `SYSTEM_ASSISTANT@system 🖼️ Here are high-quality images about "${topicQuery}":`,
          searchResults: {
            images: searchResults.images,
            web: []
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // For info requests or mixed requests, fetch search data and process through Gemini
    if (shouldSearch || shouldFetchImages) {
      searchResults = await fetchSearchResults(message, shouldFetchImages);
      if (searchResults) {
        searchContext = '\n\n📊 REAL-TIME SEARCH DATA:\n\n';
        
        if (searchResults.web && searchResults.web.length > 0) {
          searchContext += '🔍 Web Results:\n' + 
            searchResults.web.map((result: any, index: number) => 
              `${index + 1}. ${result.title}\n   📝 ${result.snippet}\n   🔗 ${result.link}`
            ).join('\n\n') + '\n\n';
        }
        
        if (searchResults.images && searchResults.images.length > 0) {
          searchContext += '🖼️ Image Results (HIGH QUALITY):\n' + 
            searchResults.images.map((result: any, index: number) => 
              `${index + 1}. ${result.title}\n   🔗 ${result.link}`
            ).join('\n') + '\n\n';
          searchContext += '✨ Note: These images will be displayed directly in the chat for the user.\n\n';
        }
      }
    }

    // Build conversation history for context
    const conversationHistory = context && context.length > 0 
      ? context.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      : [];

    // Add current message with enhanced search context
    const userMessage = searchContext 
      ? `${message}${searchContext}\n\n📋 INSTRUCTIONS FOR YOU:\n- Analyze the search results above carefully\n- Provide a well-structured, accurate response based on the real-time data\n- Include relevant links in your answer using markdown format [text](url)\n- If images are available, mention them naturally in your response (images will be displayed separately)\n- Keep your tone warm, professional, and conversational (J.A.R.V.I.S style)\n- Use emojis naturally throughout your response for better engagement and readability 😊\n- Format your response with clear sections if needed\n- Be friendly and helpful like talking to a friend`
      : message;

    conversationHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: conversationHistory,
        systemInstruction: {
          parts: [{
            text: `You are J.A.R.V.I.S (Just A Rather Very Intelligent System) - an advanced AI assistant inspired by Tony Stark's AI companion.

🎯 YOUR CORE CAPABILITIES:

1. **Context Tracking & Memory**:
   - Maintain awareness of the conversation topic across multiple turns
   - When users say "above topic", "that", "previous", "it", "these", refer to the most recently discussed subject
   - Track topic changes and update your understanding accordingly
   - Use NLU (Natural Language Understanding) to infer intent from context

2. **Intent Detection**:
   - Detect whether the user wants information (explanation, analysis, details)
   - Detect whether the user wants visual content (images, diagrams, illustrations)
   - Understand follow-up questions that reference previous topics

3. **Topic Continuity**:
   - Keep memory of the current discussion topic
   - Never lose context mid-conversation
   - Build upon previous exchanges naturally

💬 RESPONSE GUIDELINES:

**For Informational Queries**:
- Provide detailed, structured explanations
- Use clear formatting with sections, bullet points, and numbered lists
- Include relevant links using markdown format: [text](url)
- Be comprehensive yet concise
- Use emojis naturally for visual clarity

**For Image Requests**:
- The system automatically provides up to 6 high-quality, unique 4K/HD images
- Focus your text response on contextualizing or explaining the visuals
- Each image is unique and relevant to the topic
- Images are displayed separately with download options
- Don't describe image URLs or technical details

**Context-Aware Responses**:
- If user says "show images on above topic", extract topic from recent conversation
- If user introduces a new topic, acknowledge the context shift
- Maintain conversation flow naturally

🌐 REAL-TIME INFORMATION:
- Leverage search results for current information (news, weather, stocks, events)
- Synthesize information from multiple sources
- Always cite sources with markdown links
- Provide timestamps when available
- Mention if data may be outdated

🎨 COMMUNICATION STYLE:
- Start responses with "SYSTEM_ASSISTANT@system "
- Be conversational yet professional (think J.A.R.V.I.S: helpful, intelligent, slightly witty)
- Use structured formatting for clarity
- Include relevant emojis but don't overdo it
- Provide actionable next steps when appropriate

📊 OUTPUT FORMATTING:
- Use markdown for structure
- Keep explanations clear and organized
- For code, use proper code blocks with language tags
- Preserve all formatting, links, and emojis

Remember: You're not just an AI - you're J.A.R.V.I.S. Be helpful, intelligent, accurate, and maintain perfect context awareness throughout the conversation.`
          }]
        },
        generationConfig: {
          temperature: 0.4,
          topK: 64,
          topP: 0.98,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini response:', data);

    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'SYSTEM_ASSISTANT@system Error processing request. Please try again.';
    
    // Clean up response formatting while preserving emojis and structure
    aiResponse = aiResponse.replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').trim();
    
    // Ensure proper prefix format
    if (!aiResponse.startsWith('SYSTEM_ASSISTANT@system')) {
      aiResponse = `SYSTEM_ASSISTANT@system ${aiResponse}`;
    }

    // Prepare response with search results if available
    const responseData: any = { response: aiResponse };
    if (searchResults && (searchResults.web?.length || searchResults.images?.length)) {
      responseData.searchResults = {
        web: searchResults.web,
        images: searchResults.images
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});