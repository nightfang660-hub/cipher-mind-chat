import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = "AIzaSyDIonhKwOX92rcBtLnmvtxTYVx13-ioolg";
const googleSearchApiKey = "AIzaSyDNZJ9670CSXI0hSyNqFovMGxuRqbn29YE";
const searchEngineId = "558348571e0414fd7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced intent detection: Check if query needs real-time/search data
const needsSearch = (query: string): boolean => {
  const searchKeywords = [
    'current', 'today', 'now', 'latest', 'recent', 'weather', 
    'news', 'stock', 'price', 'score', 'live', 'update',
    'what is happening', 'what happened', 'who won', 'real-time',
    'trending', 'breaking', 'image', 'picture', 'photo', 'show me',
    'search', 'find', 'look up', 'tell me about recent'
  ];
  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
};

// Enhanced search: Fetch web results, images, and news
const fetchSearchResults = async (query: string) => {
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

    // Fetch image results
    const imageUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&searchType=image&num=3`;
    const imageResponse = await fetch(imageUrl);
    const imageData = imageResponse.ok ? await imageResponse.json() : null;
    const imageResults = imageData?.items?.slice(0, 3).map((item: any) => ({
      title: item.title,
      link: item.link,
      thumbnail: item.image?.thumbnailLink
    })) || [];

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

    // Check if we need to fetch search results
    let searchContext = '';
    let searchResults = null;
    if (needsSearch(message)) {
      searchResults = await fetchSearchResults(message);
      if (searchResults) {
        searchContext = '\n\n📊 REAL-TIME SEARCH DATA:\n\n';
        
        if (searchResults.web && searchResults.web.length > 0) {
          searchContext += '🔍 Web Results:\n' + 
            searchResults.web.map((result: any, index: number) => 
              `${index + 1}. ${result.title}\n   📝 ${result.snippet}\n   🔗 ${result.link}`
            ).join('\n\n') + '\n\n';
        }
        
        if (searchResults.images && searchResults.images.length > 0) {
          searchContext += '🖼️ Image Results:\n' + 
            searchResults.images.map((result: any, index: number) => 
              `${index + 1}. ${result.title}\n   🔗 ${result.link}`
            ).join('\n') + '\n\n';
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
            text: `SYSTEM_ASSISTANT@system You are J.A.R.V.I.S - an advanced AI assistant combining technical expertise with real-time information access.

🎯 YOUR IDENTITY:
- Senior software engineer with production-level coding expertise
- Real-time information specialist with web search capabilities
- Professional yet warm communicator (inspired by J.A.R.V.I.S from Iron Man)

📚 CODING STANDARDS:
- Python → PEP8 | Java → Google Java Style | JavaScript/TypeScript → Airbnb Style Guide
- C++ → Google C++ Style | Go → Effective Go

🔧 CORE CAPABILITIES:
1. CODE GENERATION: Write clean, readable, modular production-ready code
2. REAL-TIME DATA: Leverage search results for current information (news, weather, stocks, events)
3. STRUCTURED RESPONSES: Format answers with clear sections, relevant links, and context
4. ERROR HANDLING: Robust error management with clear messages
5. SECURITY: Follow OWASP Top 10, never hardcode secrets
6. PERFORMANCE: Optimize for time/space complexity

🌐 WHEN USING SEARCH RESULTS:
- Synthesize information from multiple sources intelligently
- Always cite sources with proper markdown links: [Source Name](url)
- Verify information consistency across sources
- Provide timestamps or dates when available
- Mention if data may be outdated or conflicting
- Include relevant images when they add value

💬 COMMUNICATION STYLE:
- Start responses with "SYSTEM_ASSISTANT@system "
- Be conversational yet professional (think J.A.R.V.I.S: helpful, intelligent, slightly witty)
- Use structured formatting: headers, bullet points, numbered lists
- Include relevant emojis for visual clarity (but don't overdo it)
- Provide actionable next steps when appropriate
- Remember conversation context and build upon it

📊 RESPONSE STRUCTURE FOR REAL-TIME QUERIES:
1. Direct answer to the question
2. Key facts from search results
3. Relevant links (use markdown: [Title](url))
4. Additional context or recommendations
5. Next steps (if applicable)

🔍 CODE QUALITY ENFORCEMENT:
- Validate ALL syntax before responding
- Ensure proper imports and type correctness
- Check bracket/parenthesis matching, semicolons, commas
- Verify JSX syntax and function signatures
- Test logic flow mentally
- Confirm no deprecated APIs or common errors

🎨 OUTPUT FORMATTING:
- Use code blocks with language tags
- Structure long responses with clear sections
- Keep explanations concise but complete
- Use markdown for links, bold, and emphasis
- Avoid excessive asterisks or formatting

Remember: You're not just an AI - you're J.A.R.V.I.S. Be helpful, intelligent, accurate, and provide real value through both code and real-time information.`
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