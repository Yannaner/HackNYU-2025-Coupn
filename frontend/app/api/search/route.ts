import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { query, promotions } = await request.json()

    // Validate inputs
    if (!query || !promotions || !Array.isArray(promotions)) {
      return NextResponse.json(
        { error: 'Invalid request: query and promotions array are required' },
        { status: 400 }
      );
    }

    // Call OpenAI API
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OpenAI API key is missing');
      return NextResponse.json(
        { error: 'Missing API key. Please check your environment variables.' },
        { status: 500 }
      );
    }

    console.log('Making request to OpenAI API with query:', query);
    console.log('Number of promotions:', promotions.length);

    // Add timeout and proper headers for Node.js environment
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      // Create context from promotions
      const promotionsContext = promotions.map((promo: any, index: number) => (
        `[${index}] ${promo.Company} - ${promo["Promo message"]} (Category: ${promo.Category}, Expires: ${promo["Expiration Date"]})`
      )).join('\n');

      console.log('Sending request to OpenAI...');

      const requestBody = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that helps users find relevant promotions and discounts. 
                     You have access to the following promotions:\n\n${promotionsContext}\n\n
                     MAKE SURE TO GO THROUGH EACH PROMOTION INDIVIDUALLY.
                     Your task is to find ALL promotions that match ANY part of the user's query.
                     For example, if the user searches for "food and makeup":
                     - Return ALL promotions related to food
                     - AND ALL promotions related to makeup
                     - Include promotions that match either category or company names
                     - IF THE COMPANY IS NOT RELEVANT, DO NOT INCLUDE IT
                     - If there are duplicates, you should show all of them as well.
                     
                     Analyze the user's query and return a JSON object containing:
                     1. An array of indices of relevant promotions (0-based index in the promotions list)
                     2. A brief explanation of why these promotions are relevant
                     
                     Format your response as a valid JSON object with this structure:
                     {
                       "relevant_indices": number[],
                       "explanation": string
                     }
                     
                     Guidelines:
                     - Return ALL promotions that match ANY part of the query
                     - Consider category, company name, and promotion message when matching
                     - If a query has multiple terms (e.g., "food and makeup"), include matches for ALL terms
                     - Be inclusive rather than exclusive in your matching
                     - If no relevant promotions are found, return an empty array`
          },
          {
            role: "user",
            content: query
          }
        ],
        temperature: 0.4,
        response_format: { type: "json_object" }
      };

      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        return NextResponse.json(
          { error: `OpenAI API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        );
      }

      const result = await response.json();
      console.log('OpenAI API response:', JSON.stringify(result, null, 2));

      if (!result.choices?.[0]?.message?.content) {
        console.error('Invalid response format from OpenAI:', result);
        return NextResponse.json(
          { error: 'Invalid response format from AI' },
          { status: 500 }
        );
      }

      // Parse the response
      let aiResponse;
      try {
        aiResponse = JSON.parse(result.choices[0].message.content);
      } catch (error) {
        console.error('Failed to parse AI response:', result.choices[0].message.content);
        return NextResponse.json(
          { error: 'Failed to parse AI response' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        relevant_indices: aiResponse.relevant_indices,
        explanation: aiResponse.explanation
      });

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Fetch error details:', error);
      return NextResponse.json(
        { error: `Request failed: ${error instanceof Error ? error.message : String(error)}` },
        { status: 500 }
      );
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Search error:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to process search request: ' + errorMessage },
      { status: 500 }
    );
  }
}
