import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const googleSearchApiKey = Deno.env.get("GOOGLE_SEARCH_API_KEY");
const searchEngineId = Deno.env.get("GOOGLE_SEARCH_ENGINE_ID");
const openAIApiKey = Deno.env.get("OPENAI_API_KEY");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Content moderation
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

// Detect if query needs real-time data
const needsRealTimeData = (query: string): boolean => {
  const lowerQuery = query.toLowerCase();
  const realTimeKeywords = [
    'current', 'today', 'now', 'time', 'weather', 'news', 'stock', 'live',
    'latest', 'value', 'temperature', 'rate', 'event', 'happening', 'price',
    'score', 'result', 'update', 'today\'s', 'right now', 'this moment',
    'currency', 'exchange', 'forecast', 'breaking', 'recent'
  ];
  return realTimeKeywords.some(keyword => lowerQuery.includes(keyword));
};

// Detect if query needs images
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

// Fetch Google Search results
const fetchSearchResults = async (query: string, includeImages: boolean = false) => {
  try {
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
      link: item.link,
      displayLink: item.displayLink
    })) || [];

    let imageResults = [];
    
    if (includeImages) {
      const qualityQuery = `${query} high quality HD 4K`;
      const imageUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(qualityQuery)}&searchType=image&imgSize=huge&imgType=photo&num=10`;
      const imageResponse = await fetch(imageUrl);
      const imageData = imageResponse.ok ? await imageResponse.json() : null;
      
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

// Call OpenAI with streaming
const streamOpenAI = async (messages: any[], model: string) => {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      stream: true,
      max_completion_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('OpenAI API error:', response.status, error);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  return response.body;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, model = 'gpt-5-nano', conversationHistory = [] } = await req.json();
    
    console.log('Processing request:', message, 'Model:', model);

    if (!googleSearchApiKey || !searchEngineId || !openAIApiKey) {
      throw new Error('API credentials not configured');
    }

    // Check for inappropriate content
    if (isInappropriateContent(message)) {
      console.log('⚠️ Blocked inappropriate content request');
      return new Response(
        JSON.stringify({
          response: "⚠️ I cannot provide inappropriate content. Please ask something else!"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine routing: Real-time data → Google, General chat → OpenAI
    const useGoogle = needsRealTimeData(message) || needsImages(message);
    
    if (useGoogle) {
      // Route to Google Search
      console.log('🔍 Routing to Google Search');
      const shouldFetchImages = needsImages(message);
      const searchResults = await fetchSearchResults(message, shouldFetchImages);
      
      if (!searchResults || (!searchResults.web?.length && !searchResults.images?.length)) {
        return new Response(
          JSON.stringify({
            response: "❌ No reliable information found on Google. Please try rephrasing."
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let response = ``;
      
      if (searchResults.web?.length > 0) {
        const topResult = searchResults.web[0];
        response += `📄 Information:\n${topResult.snippet}\n\n`;
        response += `🌐 Source: ${topResult.displayLink}\n`;
        
        if (searchResults.web.length > 1) {
          response += `\n📚 Additional sources:\n`;
          searchResults.web.slice(1).forEach((result: any, index: number) => {
            response += `${index + 2}. [${result.title}](${result.link})\n`;
          });
        }
      }
      
      response += `\n💬 Ask me anything!`;

      const responseData: any = { response };
      if (searchResults.images?.length > 0) {
        responseData.searchResults = {
          web: searchResults.web || [],
          images: searchResults.images
        };
      }

      return new Response(JSON.stringify(responseData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
      
    } else {
      // Route to OpenAI with streaming
      console.log('🤖 Routing to OpenAI with model:', model);
      
      const messages = [
        { 
          role: 'system', 
          content: 'You are a helpful AI assistant. Provide clear, accurate, and thoughtful responses. Use natural language and be conversational.'
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: message }
      ];

      const stream = await streamOpenAI(messages, model);
      
      // Create streaming response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n').filter(line => line.trim() !== '');
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') continue;
                  
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                  } catch (e) {
                    // Skip malformed JSON
                  }
                }
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            console.error('Streaming error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(readableStream, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
      });
    }
    
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(JSON.stringify({ 
      response: `⚠️ Error: ${errorMessage}`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
