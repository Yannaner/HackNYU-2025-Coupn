import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const formDataForWhisper = new FormData();
    formDataForWhisper.append('file', audioFile, 'audio.webm');
    formDataForWhisper.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formDataForWhisper,
    });

    const data = await response.json();

    return NextResponse.json({ text: data.text });
  } catch (error) {
    console.error('Error in transcription:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio' }, { status: 500 });
  }
}
