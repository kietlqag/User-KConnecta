import { useState, useRef, useEffect } from 'react';
import { chatService } from '@/services/chatService';

const MAX_VOICE_RECORDING_SEC = 60;
const VOICE_MESSAGE_PREFIX = '__VOICE__:';

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
}

function getAudioFileExtension(mimeType: string) {
  if (mimeType.includes('mp4')) return 'm4a';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mpeg')) return 'mp3';
  return 'webm';
}

export function useVoiceRecorder(connected: boolean, onSendMessage: (content: string) => void, setReportNotice: (msg: string | null) => void) {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [voiceRecordingSec, setVoiceRecordingSec] = useState(0);

  const voiceRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const voiceStartedAtRef = useRef(0);
  const voiceTimerRef = useRef<number | null>(null);

  const resetVoiceRecording = () => {
    if (voiceTimerRef.current) {
      window.clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
    voiceStreamRef.current = null;
    voiceRecorderRef.current = null;
    voiceChunksRef.current = [];
    voiceStartedAtRef.current = 0;
    setVoiceRecordingSec(0);
    setIsRecordingVoice(false);
  };

  const startVoiceRecording = async () => {
    if (!connected || isRecordingVoice || isSendingVoice) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setReportNotice('Trình duyệt không hỗ trợ ghi âm.');
      window.setTimeout(() => setReportNotice(null), 1800);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getSupportedAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      voiceChunksRef.current = [];
      voiceStartedAtRef.current = Date.now();
      voiceStreamRef.current = stream;
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const chunks = voiceChunksRef.current;
        const durationSec = Math.max(1, Math.round((Date.now() - voiceStartedAtRef.current) / 1000));
        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
        if (voiceTimerRef.current) {
          window.clearInterval(voiceTimerRef.current);
          voiceTimerRef.current = null;
        }
        voiceStreamRef.current?.getTracks().forEach((track) => track.stop());
        setIsRecordingVoice(false);
        setIsSendingVoice(true);
        try {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: finalMimeType });
            const file = new File([blob], `voice-${Date.now()}.${getAudioFileExtension(finalMimeType)}`, {
              type: finalMimeType,
            });
            const uploaded = await chatService.uploadVoiceMessage(file, durationSec);
            onSendMessage(
              `${VOICE_MESSAGE_PREFIX}${JSON.stringify({
                audioUrl: uploaded.audioUrl,
                durationSec: uploaded.durationSec ?? durationSec,
                mimeType: uploaded.mimeType ?? finalMimeType,
              })}`,
            );
          }
        } catch {
          setReportNotice('Không thể gửi tin nhắn thoại.');
          window.setTimeout(() => setReportNotice(null), 1800);
        } finally {
          setIsSendingVoice(false);
          resetVoiceRecording();
        }
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setVoiceRecordingSec(0);
      voiceTimerRef.current = window.setInterval(() => {
        const elapsedSec = Math.max(0, Math.floor((Date.now() - voiceStartedAtRef.current) / 1000));
        setVoiceRecordingSec(elapsedSec);
        if (elapsedSec >= MAX_VOICE_RECORDING_SEC && recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 500);
    } catch {
      setReportNotice('Không thể truy cập micro.');
      window.setTimeout(() => setReportNotice(null), 1800);
      resetVoiceRecording();
    }
  };

  const stopAndSendVoiceRecording = () => {
    const recorder = voiceRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      resetVoiceRecording();
      return;
    }
    recorder.stop();
  };

  const cancelVoiceRecording = () => {
    const recorder = voiceRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.stop();
    }
    resetVoiceRecording();
  };

  useEffect(() => {
    return () => {
      if (voiceTimerRef.current) window.clearInterval(voiceTimerRef.current);
      voiceStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  return {
    isRecordingVoice,
    isSendingVoice,
    voiceRecordingSec,
    startVoiceRecording,
    stopAndSendVoiceRecording,
    cancelVoiceRecording,
  };
}
