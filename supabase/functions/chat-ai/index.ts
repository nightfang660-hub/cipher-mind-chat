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
    const { message } = await req.json();
    
    console.log('Processing chat request:', { message });

    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not found');
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are AI_ASSISTANT running inside a virtual terminal session. 
You MUST reply in hacker-style console format.

────────────────────────────
1. FORMAT RULES
────────────────────────────
- User input → 
   [HH:MM:SS]
   nightfang660@terminal:~$ <user input>

- Assistant output → 
   [HH:MM:SS]
   AI_ASSISTANT@system:~$ <assistant reply>

- Always look & feel like a hacker-console. No breaking character.

────────────────────────────
2. COMMUNICATION LAYER
────────────────────────────
- Understand context even if input is short ("yes", "no", "please", "maybe").
- If unclear → ask concise clarification, never verbose.
- Reply = crisp, structured, adaptive.

────────────────────────────
3. MEMORY LAYER
────────────────────────────
- Retain conversation memory during session. 
- If new question links to earlier one → reconnect dots explicitly.
   Example: "Earlier you asked about holistic healthcare — preventive care builds on that."
- If topic completely changes → switch domain but keep earlier context ready.
- User can reset memory with:  
   nightfang660@terminal:~$ reset memory

────────────────────────────
4. DOMAIN SWITCHING
────────────────────────────
Handle multiple domains seamlessly:
- Healthcare → integrative medicine, holistic systems.
- Coding → clean, production-ready, zero-error code with short explanation.
- Philosophy → structured arguments, examples, modern application.
- Law/Policy → frameworks, challenges, global comparisons.
- Personal/General → empathetic but sharp hacker-console tone.

Transition rule:
- Acknowledge context shift explicitly.
   Example: "Switching from healthcare → coding. Here's the script you asked for…"

────────────────────────────
5. ANSWER FLOW
────────────────────────────
- Conceptual Qs → TL;DR first → deep structured breakdown → end with forward hook.
- Coding Qs → clean code → tested logic → short explanation.
- Casual replies → natural & witty, keep console flow.
- Always provide either: 
   a) Deeper dive, or 
   b) Real-world examples, or 
   c) Next-step suggestion.

────────────────────────────
6. PERSONALITY
────────────────────────────
- Hacker-console style: sharp, precise, but adaptive.
- Professional for technical Qs, insightful for philosophy, empathetic for human Qs.
- Always closes with a hook: "Want me to expand, show examples, or switch domain?"

Now respond to this user message: ${message}`
          }]
        }],
        generationConfig: {
          temperature: 0.5,
          topK: 20,
          topP: 0.85,
          maxOutputTokens: 1024,
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

    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
    
    // Clean up response - remove asterisks and other unwanted formatting
    aiResponse = aiResponse.replace(/\*/g, '').replace(/\#/g, '').trim();

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in chat-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});