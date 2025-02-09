import os
import io
import pyaudio
from google.cloud import speech
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(dotenv_path='../.env')

# Set up Google Cloud credentials
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "hacknyu.json")

# Audio recording parameters
RATE = 16000
CHUNK = int(RATE / 10)  # 100ms

def record_audio():
    p = pyaudio.PyAudio()

    # Print available audio input devices
    print("Available audio input devices:")
    for i in range(p.get_device_count()):
        info = p.get_device_info_by_index(i)
        print(f"Device {i}: {info['name']}")

    # Select the correct microphone device (update the index as needed)
    device_index = 1  # Change this to the correct device index for your microphone

    # Open the selected microphone
    stream = p.open(format=pyaudio.paInt16,
                    channels=1,
                    rate=RATE,
                    input=True,
                    input_device_index=device_index,
                    frames_per_buffer=CHUNK)

    print("Recording...")

    frames = []

    try:
        while True:
            data = stream.read(CHUNK)
            frames.append(data)
    except KeyboardInterrupt:
        print("Recording stopped")

    stream.stop_stream()
    stream.close()
    p.terminate()

    print("Finished recording.")
    return b''.join(frames)

def transcribe_audio(audio_content):
    print("Starting transcription...")
    client = speech.SpeechClient()

    audio = speech.RecognitionAudio(content=audio_content)
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
    audio_content = record_audio()
    print("Audio content length:", len(audio_content))
    transcribe_audio(audio_content)