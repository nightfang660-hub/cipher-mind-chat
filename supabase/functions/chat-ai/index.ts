import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const googleSearchApiKey = "AIzaSyDNZJ9670CSXI0hSyNqFovMGxuRqbn29YE";
const searchEngineId = "558348571e0414fd7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Intent detection: Check if query needs real-time/search data
const needsSearch = (query: string): boolean => {
  const searchKeywords = [
    'current', 'today', 'now', 'latest', 'recent', 'weather', 
    'news', 'stock', 'price', 'score', 'live', 'update',
    'what is happening', 'what happened', 'who won', 'real-time'
  ];
  const lowerQuery = query.toLowerCase();
  return searchKeywords.some(keyword => lowerQuery.includes(keyword));
};

// Fetch Google Search results
const fetchSearchResults = async (query: string) => {
  try {
    const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${googleSearchApiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}&num=5`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      console.error('Search API error:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.items?.slice(0, 3).map((item: any) => ({
      title: item.title,
      snippet: item.snippet,
      link: item.link
    })) || null;
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
    if (needsSearch(message)) {
      const searchResults = await fetchSearchResults(message);
      if (searchResults && searchResults.length > 0) {
        searchContext = '\n\nReal-time search results:\n' + 
          searchResults.map((result: any, index: number) => 
            `${index + 1}. ${result.title}\n   ${result.snippet}\n   Source: ${result.link}`
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

    // Add current message with search context if available
    const userMessage = searchContext 
      ? `${message}${searchContext}\n\nPlease use the search results above to provide an accurate, up-to-date answer. Include relevant links when helpful.`
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
            text: `SYSTEM_ASSISTANT@system You are a senior software engineer with advanced communication capabilities.

Your job is to generate production-ready, optimized, error-free, and maintainable code while maintaining natural conversation flow.

CODING STANDARDS:
- Python → PEP8
- Java → Google Java Style  
- JavaScript/TypeScript → Airbnb Style Guide
- C++ → Google C++ Style Guide
- Go → Effective Go

CORE RULES:
1. Write clean, readable, modular code with meaningful names
2. Include concise comments for complex functions
3. Add robust error handling with clear messages
4. Use configs/env variables, never hardcode sensitive values
5. Optimize for performance (consider time/space complexity)
6. Follow security best practices (OWASP Top 10)
7. Apply DRY and KISS principles
8. Provide working examples with usage snippets

CODE QUALITY ENFORCEMENT (CRITICAL):
- Validate ALL syntax before responding
- Ensure proper import statements
- Check for undefined variables
- Verify type correctness (especially TypeScript)
- Validate bracket/parenthesis matching
- Check semicolons and commas
- Ensure proper JSX syntax
- Verify all function signatures
- Test logic flow mentally
- Confirm no deprecated APIs
- Check for common errors (off-by-one, null refs, etc.)

COMMUNICATION:
- Always start responses with "SYSTEM_ASSISTANT@system "
- Be concise but complete
- Use proper code blocks with language tags
- Handle ambiguous requests by offering specific alternatives
- Remember conversation context and user preferences
- For "yes/no" to multiple options → ask for clarification
- For "example" → provide immediate concrete code
- Maintain technical depth appropriate to user's level

OUTPUT STYLE:
- Terminal-like, plain text
- No excessive formatting or asterisks
- Brief explanations after code
- Clear next steps when relevant

Remember: Generate working, production-ready, SYNTAX-VALIDATED code while maintaining natural conversation flow.`
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 512,
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
    
    // Clean up response formatting while preserving structure
    aiResponse = aiResponse.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').trim();
    
    // Ensure proper prefix format
    if (!aiResponse.startsWith('SYSTEM_ASSISTANT@system')) {
      aiResponse = `SYSTEM_ASSISTANT@system ${aiResponse}`;
    }
    return new Response(JSON.stringify({ response: aiResponse }), {
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