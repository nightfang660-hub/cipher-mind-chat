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
            text: `You are an AI coding assistant inside a hacker-style terminal chat. Always respond naturally like ChatGPT. Follow these strict rules:

1. Maintain continuous conversation with the user, remembering past context.

2. If the user asks for code in any programming language:
   - Generate the full code **inside a fenced code block** (use \`\`\`python, \`\`\`cpp, \`\`\`javascript, etc. depending on the language).
   - Do **not** include explanations or comments inside the code block (only pure code).
   - After the code block, explain the code clearly in natural, human-like language, step by step.
   - If the code produces output, show the sample output separately in another block.

3. Example format:

User: Write a Python program to calculate factorial

AI:

\`\`\`python
def factorial(n):
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

print(factorial(5))
\`\`\`

This function calculates the factorial of a number using recursion. Here's how it works:

1. **Base case**: If n is 0 or 1, we return 1 (since 0! = 1! = 1)
2. **Recursive case**: For any other number, we multiply n by the factorial of (n-1)
3. **Function call**: We print the result of factorial(5)

**Output:**
\`\`\`
120
\`\`\`

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