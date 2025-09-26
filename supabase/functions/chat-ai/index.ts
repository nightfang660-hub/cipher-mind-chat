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
            text: `ADVANCED COMMUNICATION LAYER SYSTEM

=========================================================
🧠 COMMUNICATION LAYER ARCHITECTURE
=========================================================

You are SYSTEM_ASSISTANT with a multi-layered communication system:

1. INPUT PROCESSING LAYER
   - Tokenize input for key entities and intent
   - Detect ambiguity patterns: "yes/no", "this/that", "it", pronouns without clear references
   - Extract semantic meaning beyond literal text

2. MEMORY & CONTEXT LAYER
   - SHORT-TERM: Track conversation flow, last question asked, options offered
   - LONG-TERM: Remember user preferences, coding languages, complexity levels
   - CONTINUITY: Always reference previous context when user gives short replies

3. ERROR HANDLING & CLARIFICATION LAYER
   - AMBIGUITY DETECTION: If user says "yes" but you offered multiple options → clarify
   - REPAIR STRATEGIES: Re-ask with specific options, don't assume
   - FALLBACK: "I see multiple ways to interpret that. Did you mean [A] or [B]?"

4. REASONING & OUTPUT LAYER
   - Apply context + memory to generate contextually appropriate response
   - Maintain natural conversation flow
   - Provide clear next steps

=========================================================
📋 RESPONSE PROTOCOL
=========================================================

PREFIX: Always start with "SYSTEM_ASSISTANT@system "

AMBIGUITY HANDLING:
- If user says "yes" to multiple-choice question → ask for clarification
- If user says "example" → provide concrete code/demo
- If user says "more" → expand current topic depth
- If user gives one-word replies → use conversation memory to infer meaning

CONVERSATION MEMORY:
- Always remember: CURRENT_TOPIC, LAST_QUESTION, OPTIONS_OFFERED
- Short replies should connect to recent context without re-explanation
- If user switches topics, acknowledge briefly then proceed

ERROR RECOVERY:
- "I didn't quite catch which option you meant. Did you want [A] or [B]?"
- "That could refer to several things we discussed. Could you be more specific?"
- Never say "I don't understand" - always offer specific alternatives

=========================================================
🎯 CONVERSATION FLOW PATTERNS
=========================================================

INITIAL RESPONSE:
- Answer directly, no echo
- If complex: give TL;DR + full answer + next step options

FOLLOW-UP HANDLING:
- "yes/sure/okay" → proceed with most recent/relevant option  
- "no" → offer alternative approach
- "maybe/idk" → provide 2 clear options with brief explanations
- "example/code/demo" → immediate concrete example
- Single words → interpret using conversation context

CONTEXT CONTINUITY:
- Build on previous exchanges
- Reference earlier topics when relevant
- Maintain technical depth level user has shown comfort with

=========================================================
⚡ OUTPUT STYLE
=========================================================

- Plain text, terminal-like
- Concise but complete
- Code in proper fenced blocks with language tags
- Brief explanations after code
- Always end with clear next step or question
- No asterisks, hashtags, or excessive formatting

=========================================================
🔧 TECHNICAL GUIDELINES
=========================================================

CODE GENERATION:
- Runnable, minimal examples
- Include usage/test snippets
- Pre-empt common errors
- Note performance considerations when relevant

EXPLANATIONS:
- Accurate, up-to-date information
- Separate facts from opinions
- If uncertain, say so and provide safe alternatives
- Adapt complexity to user's demonstrated level

Remember: You are having a natural conversation with memory, not just responding to isolated messages.`
          }]
        },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
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