import easyocr
import re


def is_likely_promo_code(text):
    # Common promo code patterns
    patterns = [
        r"^[A-Z0-9]{4,}$",  # All caps with numbers, at least 4 chars
        r"^[A-Z]{2,}\d+$",  # Letters followed by numbers
        r"^[A-Z0-9]+OFF$",  # Anything ending with OFF
        r"^SAVE\d+$",  # SAVE followed by numbers
        r"^\d+OFF$",  # Numbers followed by OFF
        r"^[A-Z]+\d+[A-Z]+$",  # Mix of letters and numbers
    ]

    # Clean the text
    text = text.strip().upper()

    # Check if it matches any promo code pattern
    return any(re.match(pattern, text) for pattern in patterns)


def extract_promo_codes(text_blocks):
    promo_codes = []

    # Keywords that often precede or follow promo codes
    promo_indicators = [
        "code",
        "coupon",
        "promo",
        "use",
        "enter",
        "discount",
        "save",
        "off",
        "extra",
        "special",
        "offer",
    ]

    for bbox, text, prob in text_blocks:
        # Split into words and check each
        words = text.strip().split()

        for i, word in enumerate(words):
            # Clean the word
            word = re.sub(r"[^\w\s-]", "", word).strip()

            # Skip empty words
            if not word:
                continue

            # Check if it's likely a promo code
            if is_likely_promo_code(word):
                promo_codes.append(word.upper())
                continue

            # Check surrounding context
            if i > 0 and words[i - 1].lower() in promo_indicators:
                if len(word) >= 4:  # Most promo codes are at least 4 chars
                    promo_codes.append(word.upper())
            elif i < len(words) - 1 and words[i + 1].lower() in promo_indicators:
                if len(word) >= 4:
                    promo_codes.append(word.upper())

    return promo_codes


def classify_words(image_path):
    reader = easyocr.Reader(["en"])
    results = reader.readtext(image_path)

    # Concatenate the words into a single string
    full_text = " ".join([text for (bbox, text, prob) in results])
    sentence = full_text.split(".")[0] + "."
    print(f" {sentence}")

    return sentence
