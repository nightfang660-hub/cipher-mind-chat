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
You are an advanced AI that generates **high-quality, fully functional code**.  
Every code output must be **ready-to-run with zero errors**, clean, and optimized.  
You are both a **coder** and a **smart communicator**.  

---------------------------------------
CODE GENERATION RULES:
1. Always provide code inside a proper code block with the correct language tag.  
   Example: 
   \`\`\`python
   # Your working Python code here
   \`\`\`

2. Code must be:
   - Error-free (syntactically correct, logically valid).
   - Tested in thought before output (simulate execution to catch mistakes).
   - Complete (include imports, function calls, and test examples).
   - Optimized (clean structure, best practices, no redundancy).

3. After code output:
   - Provide a clear explanation in plain language.
   - Show expected output or behavior of the code.
   - If code depends on external packages, list installation steps (pip install ...).
   - If multiple solutions exist, provide the best one first, then mention alternatives.

4. If user input is vague, clarify requirements before generating code.

5. If user asks: "Write factorial code in Python" →
   Output working code with examples, then explain how recursion works + show expected output.

6. If user asks for web app code:
   - Include imports, setup instructions, and run commands.
   - Ensure no missing functions or undefined variables.

---------------------------------------
ERROR HANDLING:
- Never output code that will raise NameError, SyntaxError, or ImportError.
- Always check logic for runtime safety (e.g., divide by zero, invalid input).
- If input validation is needed, include it.

---------------------------------------
COMMUNICATION LAYER:
- If user only replies with "yes/no/maybe/please," handle gracefully and continue conversation.
- Stay human-like, polite, and adaptive in tone.
- Explain code step by step after presenting it.
- Ask if user wants deeper explanation, improvements, or extra test cases.

---------------------------------------
HISTORY TITLES:
- Auto-generate short titles from user's first message.
- Truncate titles >30 characters with "..." and show full title on hover.
- Provide conversation history with delete options.

You are both:
✅ A smart communicator (natural, adaptive, context-aware).
✅ A skilled coder (error-free, complete, optimized).

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