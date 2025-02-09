import os
import pickle
import base64
import json
from flask import Flask, request, jsonify
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from dotenv import load_dotenv
from imageOCR import classify_words  
from message_processing import process_message 
import re
import email
from email import policy
from email.parser import BytesParser
from collections import defaultdict
from bs4 import BeautifulSoup

app = Flask(__name__)
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

def save_attachments(service, msg, store_dir):
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
                # Call classify_words on the saved image
                if part['mimeType'].startswith('image/'):
                    classify_words(path)

def get_newest_emails(service, store_dir):
    results = service.users().messages().list(userId='me', maxResults=1).execute()
    messages = results.get('messages', [])

    if not messages:
        print('No messages found.')
    else:
        for message in messages:
            msg = service.users().messages().get(userId='me', id=message['id'], format='full').execute()
            msg_str = get_message_body(msg)
            print('Message: %s' % msg_str)
            save_attachments(service, msg, store_dir)


            processed_message = process_message(msg_str)
            print('Processed Message:', processed_message)

            #JSON file /backend/email/attachments
            json_filename = os.path.join(store_dir, f'processed_message.json')
            with open(json_filename, 'w') as json_file:
                json.dump(processed_message, json_file)
            print(f'Saved processed message as JSON: {json_filename}')


@app.route('/fetch-emails', methods=['GET'])
def fetch_emails():
    service = get_service()
    store_dir = 'attachments'  
    if not os.path.exists(store_dir):
        os.makedirs(store_dir)
    get_newest_emails(service, store_dir)
    return 'Emails fetched and processed.', 200

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
    app.run(debug=True, port=5000)