import os
import re
import json
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure Gemini API
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))


def process_message(message_text):
    try:
        # Clean and prepare the message text
        cleaned_text = re.sub(r"\s+", " ", message_text).strip()

        # Prompt for Gemini
        prompt = f"""You are a promotion extraction assistant. Your task is to carefully analyze the email content and extract specific promotional details into a structured format.

        Follow these detailed instructions:
        1. Company Identification:
           - Primary sources: email sender, email signature, header branding
           - Secondary sources: website domains, social media handles
           - Look for official company names (e.g., "Nike, Inc." rather than just "nike.com")
           - For multi-brand companies, identify the specific brand offering the promotion
           Examples:
           - From: orders@nike.com -> Company: "Nike"
           - From: marketing@stores.macys.com -> Company: "Macy's"

        2. Category Classification:
           - Categories: retail, electronic, grocery, sports, health, cosmetics, music, books, misc, dining, travel, clothing
           - Consider both the company's main business and the specific promotion
           - For multi-category promotions, choose the most relevant category
           Examples:
           - Nike shoes sale -> Category: "sports"
           - Amazon electronics -> Category: "electronic"
           - Restaurant deals -> Category: "dining"

        3. Promotion Details:
           - Start with the key benefit (e.g., "20% off", "Buy One Get One Free")
           - Include important conditions (e.g., "on orders over $50")
           - Specify product scope (e.g., "all shoes", "select items only")
           - Keep it concise but informative (aim for 10-15 words)
           Examples:
           - "30% off all shoes + free shipping on orders over $75"
           - "Buy one get one 50% off on all winter accessories"

        4. Promotional Codes:
           - IMPORTANT: Look for [DETECTED_PROMO_CODES: code1, code2] in the text - these are promo codes detected in images
           - Common formats: SAVE20, SUMMER2024, FREESHIP
           - Look for formatting like "Use code:", "Enter:", "Promo code:", "Code:"
           - anything that mentions a code
           - Any STRING OF CHARACTERS that does not resonate a word is likely a promo code.
           - Check both body text and images
           - If multiple codes found, prioritize:
             1. Codes from [DETECTED_PROMO_CODES] section
             2. Codes with better offers (higher percentage, more inclusive)
             3. Codes that appear more prominent in the text
           Examples:
           - "Use code SAVE20 at checkout" -> Promo code: "SAVE20"
           - "Enter SUMMER2024" -> Promo code: "SUMMER2024"
           - "[DETECTED_PROMO_CODES: SPRING30]" -> Promo code: "SPRING30"

        5. Bar Codes:
           - Look for numerical sequences of 8-13 digits
           - Common formats: UPC (12 digits), EAN (13 digits)
           - Check for terms like "scan this code" or "present this number"
           Examples:
           - "Scan: 123456789012" -> Bar code: "123456789012"
           - No bar code mentioned -> Bar code: ""

        6. Expiration Date:
           - Primary formats: "Valid until", "Expires", "Offer ends"
           - Convert all dates to YYYY-MM-DD
           - For relative dates ("ends in 3 days"), calculate the actual date
           - If no date found, set to 3 months from current date
           Examples:
           - "Valid until March 15" -> "2025/03/15"
           - "Expires next week" -> [calculate date]
           - No date mentioned -> [current date + 3 months]

        7. Promotional Links:
           - Look for call-to-action buttons/links
           - Common text: "Shop Now", "Redeem", "Learn More"
           - Extract full URLs when possible
           - For shortened URLs, keep as is
           Examples:
           - "Shop now: https://nike.com/sale" -> Link to Promo: "https://nike.com/sale"
           - "Visit bit.ly/sale24" -> Link to Promo: "bit.ly/sale24"

        Return the information in this exact JSON format:
        {{
            "Company": "company name",
            "Category": "category",
            "Promo message": "promotion details",
            "Promo code": "code or empty string",
            "Bar code": "barcode or empty string",
            "Expiration Date": "YYYY-MM-DD",
            "Link to Promo": "URL or empty string"
        }}

        Email text:
        {cleaned_text}

        Important Guidelines:
        1. Be thorough - scan the entire email including headers and footers
        2. Handle edge cases:
           - Multiple promotions? Choose the most valuable one
           - Unclear information? Use the most likely interpretation
           - Missing data? Use empty strings (don't make up information)
        3. Validate your output:
           - Check that all required fields are present
           - Verify date format is correct
           - Ensure category matches the allowed list
        4. Quality checks:
           - Is the company name properly capitalized?
           - Is the promo message clear and actionable?
           - Are all URLs complete and properly formatted?
           - Double-check detected promo codes from images
        """

        # Generate response using Gemini
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)

        # Parse the response
        try:
            # Extract JSON from the response
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:-3]  # Remove ```json and ``` markers
            elif json_str.startswith("{"):
                json_str = json_str  # Already clean JSON

            result = json.loads(json_str)

            # Validate required fields
            required_fields = [
                "Company",
                "Category",
                "Promo message",
                "Promo code",
                "Bar code",
                "Expiration Date",
                "Link to Promo",
            ]
            for field in required_fields:
                if field not in result:
                    result[field] = ""

            return result

        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return None

    except Exception as e:
        print(f"Error processing message: {e}")
        return None
