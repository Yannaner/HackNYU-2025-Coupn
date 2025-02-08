import easyocr

def classify_words(image_path):
    reader = easyocr.Reader(['en'])
    results = reader.readtext(image_path)

    # Concatenate the words into a single string
    full_text = ' '.join([text for (bbox, text, prob) in results])
    sentence = full_text.split('.')[0] + '.'
    print(f' {sentence}')
    
    return sentence

