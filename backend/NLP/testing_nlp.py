import os
import wave
import io
from google.cloud import speech
from pydub import AudioSegment
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path='../.env')

# Set up Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "hacknyu.json")

# Audio recording parameters
RATE = 44100
CHUNK = int(RATE / 10)  # 100ms

def convert_to_mono(audio_path):
    # Load the audio file
    audio = AudioSegment.from_wav(audio_path)
    # Convert to mono
    audio = audio.set_channels(1)
    # Export the audio to a BytesIO object
    mono_audio = io.BytesIO()
    audio.export(mono_audio, format="wav")
    mono_audio.seek(0)
    return mono_audio

def transcribe_audio(audio_content):
    print("Starting transcription...")
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(content=audio_content.read())
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
        sample_rate_hertz=RATE,
        language_code='en-US'
    )

    response = client.recognize(config=config, audio=audio)

    print("Transcription response received.")
    print("Response:", response)

    if not response.results:
        print("No transcription results.")
    else:
        for result in response.results:
            print('Transcript: {}'.format(result.alternatives[0].transcript))

if __name__ == "__main__":
    # Use a sample audio file for testing
    audio_path = "./voice_data/harvard.wav"
    mono_audio = convert_to_mono(audio_path)

    print("Audio content length:", len(mono_audio.getvalue()))
    transcribe_audio(mono_audio)