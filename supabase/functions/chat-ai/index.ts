import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
const googleSearchApiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
const searchEngineId = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");

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
    'trending', 'breaking', 'search', 'find', 'look up', 'tell me about recent',
    'time', 'date', 'year', 'day', 'month', 'temperature', 'forecast',
    'cyclone', 'storm', 'prime minister', 'president', 'who is', 'what is the'
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

    // ROUTING LOGIC: Determine if real-time data is needed
    const shouldSearch = needsSearch(message);
    const shouldFetchImages = needsImages(message);
    
    let searchResults = null;
    let googleSnippet = '';
    
    // 🔹 ROUTE 1: Real-time queries → Google Search API (Direct Display)
    if (shouldSearch || shouldFetchImages) {
      const topicQuery = shouldFetchImages ? extractTopicFromContext(message, context) : message;
      console.log('🔍 Fetching real-time data for:', topicQuery);
      
      searchResults = await fetchSearchResults(topicQuery, shouldFetchImages);
      
      // For pure image requests, return immediately
      if (shouldFetchImages && !shouldSearch && searchResults?.images?.length > 0) {
        const currentDateTime = new Date().toLocaleString("en-IN", { 
          timeZone: "Asia/Kolkata",
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit', hour12: true
        });
        
        return new Response(JSON.stringify({
          response: `SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}\n\n🖼️ Here are high-quality images about "${topicQuery}":`,
          searchResults: {
            images: searchResults.images,
            web: []
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Build Google Search snippet for factual queries
      if (searchResults && searchResults.web && searchResults.web.length > 0) {
        googleSnippet = searchResults.web.map((result: any, index: number) => 
          `${index + 1}. ${result.title}\n   ${result.snippet}\n   ${result.link}`
        ).join('\n\n');
      }
    }

    // Build conversation history for context
    const conversationHistory = context && context.length > 0 
      ? context.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      : [];

    // Add Google Search snippet context if available
    const userMessage = googleSnippet 
      ? `User Query: ${message}\n\n📡 GOOGLE SEARCH DATA (LIVE):\n${googleSnippet}\n\n⚡ Use the above real-time data to answer the query. Extract facts directly from snippets.`
      : message;

    conversationHistory.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    // Get current date/time in IST timezone for accurate timestamp
    const currentDateTime = new Date().toLocaleString("en-IN", { 
      timeZone: "Asia/Kolkata",
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
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
            text: `You are SYSTEM_ASSISTANT — a hybrid AI combining Google Search (real-time data) and Gemini (reasoning).

🕒 Current System Time: ${currentDateTime} (IST - Asia/Kolkata)

🎯 ROUTING RULES:
1. **Real-Time Queries** (weather, stock, time, news, events):
   → If Google Search data is provided, extract facts DIRECTLY from snippets
   → Display factual, clean, timestamped response
   → Start with: "SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}"

2. **Reasoning Queries** (explanations, summaries, general knowledge):
   → Use Gemini reasoning and your training knowledge
   → Start with: "SYSTEM_ASSISTANT@system"
   → Be conversational, helpful, and clear

📋 FORMATTING RULES:
- Use clean paragraphs, bullet points, or tables
- Bold important numbers/entities
- Include markdown links: [text](url)
- Use emojis naturally 😊
- Never cite "Google" or "search results" explicitly — present facts naturally

💹 STOCK DATA FORMAT:
| Company | Ticker | Current Price | % Change | Market |
|---------|--------|---------------|----------|--------|
| Tesla   | TSLA   | $439.52       | +0.49%   | NASDAQ |

🌤 WEATHER FORMAT:
"Right now in [location], it's [temp]°C and [condition]. Wind: [speed] km/h."

🧠 KEY PRINCIPLE:
If Google Search data exists → use it (real-time facts)
If no Google data → use Gemini reasoning (training knowledge)

Always prioritize live data for current queries. Keep responses clean, factual, and timestamped.`
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