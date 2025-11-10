import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

// Fetch Google Search results (web + optional images)
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
      link: item.link,
      displayLink: item.displayLink
    })) || [];

    let imageResults = [];
    
    // Only fetch images if the query explicitly asks for visual content
    if (includeImages) {
      // Enhance query with quality keywords for better HD/4K results
      const qualityQuery = `${query} high quality HD 4K`;
      const imageUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(qualityQuery)}&searchType=image&imgSize=huge&imgType=photo&num=10`;
      const imageResponse = await fetch(imageUrl);
      const imageData = imageResponse.ok ? await imageResponse.json() : null;
      
      // Deduplicate images by URL
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
    const { message } = await req.json();
    
    console.log('Processing Google-only search request:', message);

    if (!googleSearchApiKey || !searchEngineId) {
      throw new Error('Google Search API credentials not found');
    }

    // Check for inappropriate content
    if (isInappropriateContent(message)) {
      console.log('⚠️ Blocked inappropriate content request:', message);
      return new Response(
        JSON.stringify({
          response: "SYSTEM_ASSISTANT@system ⚠️ I cannot provide adult content, explicit images, or inappropriate material. I'm designed to be a helpful and safe factual assistant. Please ask me something else!"
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Check if query needs images
    const shouldFetchImages = needsImages(message);
    
    // Fetch Google Search results
    console.log('🔍 Fetching Google Search results for:', message);
    const searchResults = await fetchSearchResults(message, shouldFetchImages);
    
    if (!searchResults || (!searchResults.web?.length && !searchResults.images?.length)) {
      return new Response(
        JSON.stringify({
          response: "SYSTEM_ASSISTANT@system ❌ No reliable information found on Google for this query. Please try rephrasing your question."
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Get current date/time
    const currentDateTime = new Date().toLocaleString("en-IN", { 
      timeZone: "Asia/Kolkata",
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Build response from Google Search results
    let response = `SYSTEM_ASSISTANT@system 🕒 As of ${currentDateTime}\n🔍 Query: ${message}\n\n`;
    
    // Add web results
    if (searchResults.web?.length > 0) {
      const topResult = searchResults.web[0];
      response += `📄 Result:\n${topResult.snippet}\n\n`;
      response += `🌐 Source: ${topResult.displayLink}\n`;
      
      // Add additional sources if available
      if (searchResults.web.length > 1) {
        response += `\n📚 Additional sources:\n`;
        searchResults.web.slice(1).forEach((result: any, index: number) => {
          response += `${index + 2}. [${result.title}](${result.link})\n`;
        });
      }
    }
    
    response += `\n💬 Tip: You can always ask another question for live facts.`;

    // Prepare response data
    const responseData: any = { response };
    
    // Add images if available
    if (searchResults.images?.length > 0) {
      responseData.searchResults = {
        web: searchResults.web || [],
        images: searchResults.images
      };
    }

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return new Response(JSON.stringify({ 
      response: `SYSTEM_ASSISTANT@system ⚠️ I encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
