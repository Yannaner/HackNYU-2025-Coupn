"use client";

import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceFeedbackProps {
  promotions: any[];
}

export function VoiceFeedback({ promotions }: VoiceFeedbackProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          await processAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setTranscript("Error: Could not access microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
        // Stop all tracks in the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
        setIsProcessing(true);
      } catch (error) {
        console.error('Error stopping recording:', error);
        setTranscript("Error: Could not stop recording. Please try again.");
        setIsRecording(false);
        setIsProcessing(false);
      }
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      setTranscript("Processing your audio...");
      
      // First, convert audio to text
      const formData = new FormData();
      formData.append('audio', audioBlob);

      const transcriptionResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        throw new Error('Failed to transcribe audio');
      }

      const transcriptionData = await transcriptionResponse.json();
      const text = transcriptionData.text;
      setTranscript(text);

      // Then, get AI response with promotions
      const aiResponse = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: text,
          promotions: promotions 
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to get AI response');
      }

      const aiData = await aiResponse.json();
      const response = aiData.response;

      // Finally, convert response to speech
      const speechResponse = await fetch('/api/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: response }),
      });

      if (!speechResponse.ok) {
        throw new Error('Failed to convert text to speech');
      }

      const audioData = await speechResponse.blob();
      const audioUrl = URL.createObjectURL(audioData);
      const audio = new Audio(audioUrl);
      await audio.play();

    } catch (error) {
      console.error('Error processing audio:', error);
      setTranscript("Sorry, there was an error processing your request. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">Voice Assistant</h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Ask me about available deals
        </p>
      </div>
      
      <Button
        variant={isRecording ? "destructive" : "default"}
        size="lg"
        className="rounded-full w-20 h-20 shadow-md hover:shadow-lg transition-all duration-200"
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : isRecording ? (
          <MicOff className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>

      {transcript && (
        <div className="w-full max-w-md bg-neutral-50 dark:bg-neutral-800 p-4 rounded-lg">
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            Your message:
          </p>
          <p className="text-sm">{transcript}</p>
        </div>
      )}

      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        {isRecording ? "Click to stop recording" : isProcessing ? "Processing..." : "Click to start recording"}
      </div>
    </div>
  );
}
