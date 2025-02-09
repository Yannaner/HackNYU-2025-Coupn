import os
import pickle
import base64
import json
import re
import requests  # Added for processing external image URLs
import email
from email import policy
from email.parser import BytesParser
from collections import defaultdict
from bs4 import BeautifulSoup

from flask import Flask, request, jsonify
from flask_cors import CORS
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from dotenv import load_dotenv
from imageOCR import classify_words  
from message_processing import process_message 

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
load_dotenv()

# Get the OAuth 2.0 client secrets file path from environment variables
OAUTH2_CLIENT_SECRETS_FILE = os.getenv('OAUTH2_CLIENT_SECRETS_FILE')

if not OAUTH2_CLIENT_SECRETS_FILE or not os.path.exists(OAUTH2_CLIENT_SECRETS_FILE):
    raise FileNotFoundError(f'OAuth 2.0 client secrets file not found: {OAUTH2_CLIENT_SECRETS_FILE}')

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_service():
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                OAUTH2_CLIENT_SECRETS_FILE, SCOPES)
            creds = flow.run_local_server(port=8080)
        # Save the credentials for the next run
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)

    service = build('gmail', 'v1', credentials=creds)
    return service

def get_message_body(msg):
    # Retrieve the plain text part of the email.
    if 'data' in msg['payload']['body']:
        body = msg['payload']['body']['data']
    else:
        parts = msg['payload'].get('parts', [])
        for part in parts:
            if part['mimeType'] == 'text/plain':
                body = part['body']['data']
                break
        else:
            body = ''
    return base64.urlsafe_b64decode(body).decode('utf-8')

# NEW FUNCTION: Extract HTML body from the email if available.
def get_html_body(msg):
    """
    Extracts the HTML portion of the email message.
    """
    html = ''
    if msg['payload'].get('mimeType') == 'text/html' and 'data' in msg['payload']['body']:
         html = base64.urlsafe_b64decode(msg['payload']['body']['data']).decode('utf-8')
    else:
         parts = msg['payload'].get('parts', [])
         for part in parts:
              if part['mimeType'] == 'text/html' and 'data' in part['body']:
                  html = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                  break
    return html

def check_image_size(file_path):
    """
    Check if an image file is larger than 275KB
    """
    MIN_SIZE_BYTES = 275 * 1024  # 250KB in bytes
    try:
        file_size = os.path.getsize(file_path)
        return file_size >= MIN_SIZE_BYTES
    except OSError:
        return False

# MODIFIED FUNCTION: Process attachments and return OCR text output.
def process_attachments(service, msg, store_dir):
    """
    Processes image attachments: saves them, runs OCR/classification,
    and returns the combined classified text.
    """
    classified_texts = ""
    if 'parts' in msg['payload']:
        for part in msg['payload']['parts']:
            if part['filename']:
                if 'data' in part['body']:
                    data = part['body']['data']
                else:
                    att_id = part['body']['attachmentId']
                    att = service.users().messages().attachments().get(userId='me', messageId=msg['id'], id=att_id).execute()
                    data = att['data']
                file_data = base64.urlsafe_b64decode(data.encode('UTF-8'))
                path = os.path.join(store_dir, part['filename'])
                with open(path, 'wb') as f:
                    f.write(file_data)
                print(f'Saved attachment: {path}')
                # Process image attachments if the mime type is image and size > 250KB
                if part['mimeType'].startswith('image/'):
                    if check_image_size(path):
                        result = classify_words(path)
                        print(f"Classified attachment image text: {result}")
                        if result:
                            classified_texts += "\n" + result
                    else:
                        print(f"Skipping OCR for {path} - file size below 275KB")
    return classified_texts

# MODIFIED FUNCTION: Process inline images in HTML and return OCR text output.
def process_inline_images(html_content, store_dir):
    """
    Parses the HTML to find inline images, processes them,
    and returns the combined classified text output.
    """
    classified_texts = ""
    soup = BeautifulSoup(html_content, 'html.parser')
    img_tags = soup.find_all('img')
    for i, img in enumerate(img_tags):
        src = img.get('src')
        if not src:
            continue
        # Process data URI images
        if src.startswith('data:'):
            try:
                header, encoded = src.split(',', 1)
                match = re.search(r'data:image/(\w+);base64', header)
                ext = match.group(1) if match else 'png'
                image_data = base64.b64decode(encoded)
                filename = os.path.join(store_dir, f'inline_image_{i}.{ext}')
                with open(filename, 'wb') as f:
                    f.write(image_data)
                print(f"Saved inline image from data URI: {filename}")
                if check_image_size(filename):
                    result = classify_words(filename)
                    print(f"Classified inline data URI image text: {result}")
                    if result:
                        classified_texts += "\n" + result
                else:
                    print(f"Skipping OCR for {filename} - file size below 275KB")
            except Exception as e:
                print(f"Failed to process inline data URI image. Error: {str(e)}")
        # Process external URL images
        elif src.startswith('http'):
            try:
                response = requests.get(src)
                if response.status_code == 200:
                    ext_candidate = src.split('.')[-1].split('?')[0]
                    ext = ext_candidate.lower() if ext_candidate.lower() in ['jpg', 'jpeg', 'png', 'gif', 'bmp'] else 'jpg'
                    filename = os.path.join(store_dir, f'inline_image_{i}.{ext}')
                    with open(filename, 'wb') as f:
                        f.write(response.content)
                    print(f"Saved inline image from URL: {filename}")
                    if check_image_size(filename):
                        result = classify_words(filename)
                        print(f"Classified inline URL image text: {result}")
                        if result:
                            classified_texts += "\n" + result
                    else:
                        print(f"Skipping OCR for {filename} - file size below 275KB")
                else:
                    print(f"Failed to download image from {src}: HTTP {response.status_code}")
            except Exception as e:
                print(f"Failed to download inline image from URL: {src}. Error: {str(e)}")
    return classified_texts

def get_newest_emails(service, store_dir):
    results = service.users().messages().list(userId='me', maxResults=3, q='category:promotions').execute()
    messages = results.get('messages', [])

    if not messages:
        print("No messages found.")
        return []
    
    processed_promotions = []
    for message in messages:
        msg = service.users().messages().get(userId='me', id=message['id'], format='full').execute()
        msg_str = get_message_body(msg)
        print("Message: %s" % msg_str)
        
        # Process attachments and capture OCR results
        attachments_text = process_attachments(service, msg, store_dir)
        
        # Process inline HTML images and capture OCR results
        html_content = get_html_body(msg)
        inline_images_text = ""
        if html_content:
            inline_images_text = process_inline_images(html_content, store_dir)
        
        # Combine the original message text with classified image text
        combined_text = msg_str + "\n" + attachments_text + "\n" + inline_images_text
        
        # Process the combined message text with the AI message processor
        processed_promotion = process_message(combined_text)
        if processed_promotion:
            processed_promotions.extend(processed_promotion if isinstance(processed_promotion, list) else [processed_promotion])
    
    return processed_promotions

@app.route('/fetch-emails', methods=['GET'])
def fetch_emails():
    try:
        service = get_service()
        store_dir = 'attachments'
        if not os.path.exists(store_dir):
            os.makedirs(store_dir)
        promotions = get_newest_emails(service, store_dir)
        print("Processed promotions:", promotions)  # Debug log
        return jsonify(promotions)
    except Exception as e:
        print(f"Error in fetch_emails: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/gmail-webhook', methods=['POST'])
def gmail_webhook():
    envelope = request.get_json()
    if not envelope:
        return 'Bad Request: No JSON payload received', 400
    if 'message' not in envelope:
        return 'Bad Request: No message field in JSON payload', 400
    message = envelope['message']
    if 'data' not in message:
        return 'Bad Request: No data field in message', 400

    # Decode the Pub/Sub message
    pubsub_message = base64.urlsafe_b64decode(message['data']).decode('utf-8')
    print(f'Received message: {pubsub_message}')
    fetch_emails()

    return 'OK', 200

if __name__ == '__main__':
    print("Starting Flask server...")
    app.run(debug=True, port=5000, host='127.0.0.1')
