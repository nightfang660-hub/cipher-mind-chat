import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Build conversation history for context
    const conversationHistory = context && context.length > 0 
      ? context.map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      : [];

    // Add current message
    conversationHistory.push({
      role: 'user',
      parts: [{ text: message }]
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

Remember: Generate working, production-ready code while maintaining natural conversation flow.`
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