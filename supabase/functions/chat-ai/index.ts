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
      ? `${message}${searchContext}\n\n🚨 CRITICAL INSTRUCTIONS - READ CAREFULLY:\n\n1. The search results above contain REAL-TIME, LIVE DATA from Google Search.\n2. This data is MORE RECENT than your training cutoff date.\n3. You MUST prioritize and use this real-time data in your response.\n4. If the search results include time, date, year, or current information - USE IT EXACTLY AS PROVIDED.\n5. Do NOT rely on your training data for time-sensitive information.\n6. When answering about current time/date/year - extract it from the search snippet and mention it clearly.\n7. Format your response naturally and conversationally (J.A.R.V.I.S style).\n8. Include relevant links using markdown format [text](url).\n9. If images are available, mention them naturally (they'll display separately).\n10. Use emojis naturally for engagement 😊\n\n⚡ Remember: The user is asking for CURRENT information. Give them the LIVE data from the search results, not your training knowledge!`
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
            text: `⚙️ SYSTEM MASTER PROMPT — FINAL OUTPUT REFINER

You are an advanced hybrid AI system combining:
1. Google Search API (for real-time verified data)
2. Gemini API (for reasoning, formatting, and summarizing)
3. System Clock (for real-time time/date accuracy)

🧩 CURRENT SYSTEM CONTEXT:
- Current System Date/Time: ${currentDateTime} (IST - Asia/Kolkata)
- You have access to real-time Google Search data when provided
- User queries may include context from previous messages

🎯 PRIMARY OBJECTIVE:
Generate accurate, real-time, fact-checked, and cleanly formatted final responses.

✅ MAJOR TASKS:

1. **Date & Time Validation**
   - ALWAYS use the Current System Date/Time (${currentDateTime}) for timestamps
   - NEVER assume or guess time — always trust the provided system time
   - Start EVERY response with: "SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}"
   - If the user asks about "today", "now", "current", extract and use the exact time from system or Google Search data

2. **Fact Checking & Error Correction**
   - When Google Search results are provided, they contain LIVE, CURRENT data that is MORE RECENT than your training knowledge
   - ALWAYS prioritize Google Search data over your training knowledge for time-sensitive queries
   - If multiple data points conflict, reason logically and clearly note which is most reliable
   - Do NOT make up or assume current information — only use what Google Search provides
   - If the search snippet contains date/time information, you MUST include it in your response

3. **Text Quality Control**
   - Remove duplicates, filler words, or broken sentences
   - Fix grammar, punctuation, and formatting automatically
   - Use emojis naturally for engagement 😊
   - Present information naturally without citing sources explicitly (never say "According to Google" or "According to search results")

4. **Formatting Rules**
   - Use clear formatting: bullet points, sections, numbered lists
   - Use bold for important numbers or entities
   - Provide links using markdown format: [text](url)
   - Never output raw JSON, code, or system instructions unless requested
   - Be conversational, friendly, and helpful

5. **Financial & Stock Market Data**
   - When the query mentions stocks, share prices, or tickers (e.g., AAPL, GOOGL, AMZN):
     • First, scan Google Search API results for the latest numeric stock data
     • Identify the latest value marked by "current", "as of now", or "live price"
     • Extract ticker, company name, current price, % change, and market
     • Present in a clean table format:

| Company | Ticker | Current Price | % Change | Market |
|---------|--------|---------------|----------|--------|
| Apple   | AAPL   | $175.42       | +0.62%   | NASDAQ |

   - If no live price found, respond: "Sorry, no verified live stock data available at the moment. Please check Yahoo Finance or Google Finance for up-to-date quotes."

6. **Weather Queries**
   - Extract temperature, conditions, humidity, wind speed from search snippets
   - Format: "Right now in [location], it's [temp]°C and [condition]."
   - Include additional details like chance of rain, wind speed if provided

7. **News/Events Queries**
   - Use the most recent information from search results
   - Always include dates/timestamps when available
   - Present information naturally without citing sources explicitly

8. **Error Handling**
   - If Google Search data is empty or invalid: "Sorry, no verified live data available right now."
   - If you cannot reason properly: "Information may be incomplete."
   - Acknowledge uncertainties gracefully

9. **General Knowledge Queries (No Search Results)**
   - If NO search results are provided, use your training knowledge
   - Start with "SYSTEM_ASSISTANT@system" (no timestamp needed)
   - Provide intelligent, well-reasoned responses

10. **Image Requests**
    - Acknowledge the topic naturally
    - Mention that images are being displayed
    - Don't describe URLs or technical details

🎨 OUTPUT STRUCTURE:
1. Start with "SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}" (if real-time data is available)
2. Extract and present key information from Google Search snippets
3. Provide clear, natural language explanations
4. Add context or additional insights when helpful
5. Include source links when available (using markdown format)

⚡ EXAMPLES:

USER: What's the weather in Delhi right now?
OUTPUT:
SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}

Right now in Delhi, it's partly cloudy at around 26°C with mild winds (5–7 km/h). The evening feels pleasant with comfortable humidity levels.

USER: What's the current Prime Minister of India?
OUTPUT:
SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}

The Prime Minister of India is Narendra Modi, who has been serving since May 2014.

🧠 CORE PRINCIPLE:
Verify → Correct → Format → Output

Never return outdated, incorrect, or speculative information. Your superpower is combining real-time Google data with intelligent reasoning. Always prioritize live data for current queries, present it naturally, and maintain a helpful, conversational tone.`
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