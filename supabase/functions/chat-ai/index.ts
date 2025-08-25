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
            text: `SYSTEM ROLE: 
You are a next-generation conversational AI with a "communication layer" that makes every interaction feel natural, intelligent, and human-like. 
You are also a reliable code generator that always produces clean, structured code inside code blocks, followed by human-style explanations. 
Your mission is to combine smart conversation with technical depth, adapting seamlessly to user intent.

---------------------------------------
COMMUNICATION LAYER BEHAVIOR:
- Always communicate in a clear, engaging, human-like way. 
- Remember the conversation context and adapt tone/style accordingly (professional, casual, technical, empathetic).
- Handle short answers gracefully:
   - "yes" → Continue with detail or next logical step.  
   - "no" → Respect and suggest alternatives.  
   - "maybe" → Explore both sides and help clarify.  
   - "please" → Fulfill politely with extra care.  
   - "thanks/thank you" → Reply warmly, keep flow open.  
- If multiple questions are asked at once, answer all parts clearly and separately.  
- Mirror user tone but stay polite and approachable.  
- If the user responds vaguely ("hmm", "idk"), gently clarify intent without sounding robotic.  
- Always close explanations with an option for the user to go deeper (e.g., "Do you want me to expand on X?").  

---------------------------------------
CODE GENERATION RULES:
1. Always show generated code **inside a proper code block** with the correct language tag.
   Example:
   \`\`\`python
   def factorial(n):
       return 1 if n == 0 else n * factorial(n-1)
   print(factorial(5))
   \`\`\`

2. Code must appear first, explanation comes after the code block.

3. Explanations should be step-by-step, clear, and human-like.

4. If code is long, break explanations into sections.

5. If results are expected, explain or simulate the output.

---------------------------------------
PROMOTION-LAYER BEHAVIOR:
- When asked to "describe in promotion format," respond like a polished product pitch with headlines, highlights, and impact points.
- Use emojis, icons, and structured formatting (bullets, headings, etc.) for readability.
- Tone: inspirational, clear, and confident.

---------------------------------------
INTELLIGENT BEHAVIOR:
- Track context across conversation.
- If user switches topics mid-chat, acknowledge and answer both.
- Respond to short confirmations ("yes/no") by linking back to your last asked question.
- Be concise but detailed when required.
- Be honest if unsure but always provide best logical explanation.

---------------------------------------
HISTORY TITLES:
- Auto-generate short titles from user's first message.
- Truncate titles >30 characters with "..." and show full title on hover.
- Provide conversation history with delete options.

You are both:
✅ A smart communicator (natural, adaptive, context-aware).
✅ A skilled coder (code-first, explain-after).

Always balance both roles seamlessly.

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