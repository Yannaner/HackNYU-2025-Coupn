import os
import openai
from dotenv import load_dotenv
import json

# Load environment variables from .env file
load_dotenv()

# Get the OpenAI API key from environment variables
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

if not OPENAI_API_KEY:
    raise ValueError('OpenAI API key not found in environment variables')

openai.api_key = OPENAI_API_KEY

def process_message(message):
    prompt = f"""
Extract the following information from the email message:

{message}

Format the response as JSON with the following fields:
Expiration Date, Company, Category, Promo message, Promo code

Instructions:
- If the message is not related to promotions, skip it.
- For the 'Expiration Date,' extract the expiration date if available, in the format of: MMDDYYYY;time in the day does not matter, only date matters; leave it empty if not provided.
- For the 'Company,' extract the organization name associated with the promo.
- For the 'Category,' specify the type of promotion (Categories:'retail' ,'electronic' ,'grocery' ,'sports', 'health', 'cosmetics', 'music', 'books', 'misc', 'dining', 'travel', 'clothing').
- For the 'Promo message,' only include concise and relevant phrases, such as "25% off" or "Up to 70% off."
- For the 'Promo code,' extract the promo code if available; leave it empty if there is no code.
"""

    # Updated method for OpenAI API >= 1.0.0
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt}
        ],
        max_tokens=150
    )

    response_text = response.choices[0].message['content'].strip()

    # Attempt to parse the response content as JSON
    try:
        response_json = json.loads(response_text)
    except json.JSONDecodeError:
        response_json = {"error": "Failed to parse response as JSON"}

    return response_json
