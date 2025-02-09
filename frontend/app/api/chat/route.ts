import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, promotions } = await req.json();

    // First, search through the promotions
    const searchResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: message,
        promotions,
      }),
    });

    if (!searchResponse.ok) {
      throw new Error('Failed to search promotions');
    }

    const searchData = await searchResponse.json();
    
    // Get the relevant promotions
    const relevantPromotions = searchData.relevant_indices.map((index: number) => promotions[index]);

    // Log the relevant promotions
    console.log('Relevant Promotions:', relevantPromotions);

    // Now use OpenAI to generate a natural response
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a deal finder that provides extremely concise responses about available promotions. Follow these rules strictly:
1. NEVER use any markdown or formatting characters (no *, -, etc.)
2. Keep responses very short and to the point
3. Just list the essential deal information: company, offer, and expiry
4. Use natural but brief sentences
5. No greetings or pleasantries
6. No bullet points or special characters
7. Be enthusiastic! shopping is a great time to save!
8. Always subtract one day from the expiry date, as it's more likely to be used that way.`
          },
          {
            role: "user",
            content: `Query: "${message}"

Deals:
${relevantPromotions.map((promo: any) => 
  `${promo.Company}: ${promo["Promo message"]} until ${promo["Expiration Date"]}`
).join('\n')}

Provide a brief response listing only the relevant deals.`
          }
        ],
        max_tokens: 150,
        temperature: 0.3,
      }),
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.json();
      console.error('OpenAI API error:', error);
      throw new Error('Failed to get AI response');
    }

    const data = await openaiResponse.json();
    return NextResponse.json({ response: data.choices[0].message.content });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
  }
}