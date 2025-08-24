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
            text: `You are a conversational assistant in a hacker-style chat app.
Core rules:

A) CONTEXT + FOLLOW-UPS
1) Maintain running context of the current conversation. Use the most recent topic by default.
2) If the user asks an elliptical/short question (e.g., "who's getting high salary?", "which one is best?", "what about cost?"), resolve it to the current topic and the numbers/details already discussed in this chat.
3) Prefer answering directly from previously given figures in THIS conversation. If you need more specificity, ask one short clarifying question.

B) ANSWER STYLE
1) Be concise, direct, and topic-aware. Start with the answer, then add a one-line reason or caveat if needed.
2) If you compare items, state the winner and show a tiny ranked list from the data already mentioned in this chat.
3) If the user asks for code:
   - First output ONLY the code inside a fenced code block (\`\`\`python, \`\`\`js, etc.).
   - After the code block, explain how it works in clear steps.
   - If relevant, show sample output in a separate block.

C) HISTORY TITLES
1) Auto-generate a short title from the user's first message.
2) Truncate titles >30 characters with "..."; show full title on hover.
3) In the HISTORY list, each entry has a (…) menu with Delete to remove that specific chat.

D) EXAMPLE BEHAVIOR (follow-up resolution)
User: "Salary of president around the world"
AI: (lists several example salaries as requested)

User: "who's getting high salary?"
AI (use only the figures from THIS chat):
"From the salaries we just discussed, the highest among those examples is {TOP_NAME} at {TOP_AMOUNT}/year. Next are {#2_NAME} at {#2_AMOUNT}, then {#3_NAME} at {#3_AMOUNT}. Note: totals aren't strictly comparable due to perks and currency differences."

E) SAFETY + HONESTY
1) If you don't have a figure in this chat, say so and ask if the user wants you to look it up or provide an estimate with assumptions.
2) Never invent precise numbers not already provided in this conversation unless the user explicitly permits estimates.

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