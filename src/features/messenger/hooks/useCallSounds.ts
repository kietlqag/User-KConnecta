import { useEffect, useRef } from 'react';

type TonePattern = {
  frequencies: number[];
  onMs: number;
  offMs: number;
  gain?: number;
  wave?: OscillatorType;
};

async function ensureAudioContext(ctxRef: { current: AudioContext | null }) {
  if (!ctxRef.current) {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    ctxRef.current = new AudioCtx();
  }
  if (ctxRef.current.state === 'suspended') {
    await ctxRef.current.resume();
  }
  return ctxRef.current;
}

function startToneLoop(ctx: AudioContext, pattern: TonePattern): () => void {
  let stopped = false;
  let timeoutId: number | null = null;
  const gainNode = ctx.createGain();
  gainNode.gain.value = pattern.gain ?? 0.15;
  gainNode.connect(ctx.destination);

  const oscillators: OscillatorNode[] = [];

  const stopOscillators = () => {
    oscillators.splice(0).forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
  };

  const scheduleNext = (delayMs: number) => {
    if (stopped) return;
    timeoutId = window.setTimeout(playBurst, delayMs);
  };

  const playBurst = () => {
    if (stopped) return;
    stopOscillators();

    pattern.frequencies.forEach((frequency) => {
      const osc = ctx.createOscillator();
      osc.type = pattern.wave ?? 'sine';
      osc.frequency.value = frequency;
      osc.connect(gainNode);
      osc.start();
      oscillators.push(osc);
    });

    timeoutId = window.setTimeout(() => {
      stopOscillators();
      scheduleNext(pattern.offMs);
    }, pattern.onMs);
  };

  playBurst();

  return () => {
    stopped = true;
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    stopOscillators();
    gainNode.disconnect();
  };
}

const INCOMING_RING: TonePattern = {
  frequencies: [440, 554],
  onMs: 900,
  offMs: 2200,
  gain: 0.22,
  wave: 'sine',
};

const OUTGOING_WAIT: TonePattern = {
  frequencies: [425, 475],
  onMs: 1800,
  offMs: 3600,
  gain: 0.16,
  wave: 'sine',
};

interface UseCallSoundsOptions {
  incomingRinging: boolean;
  outgoingWaiting: boolean;
}

/** Plays programmatic ringtone (incoming) and ringback/wait tone (outgoing). */
export function useCallSounds({ incomingRinging, outgoingWaiting }: UseCallSoundsOptions) {
  const ctxRef = useRef<AudioContext | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unlock = () => {
      void ensureAudioContext(ctxRef);
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    const shouldPlay = incomingRinging || outgoingWaiting;

    if (!shouldPlay) {
      stopRef.current?.();
      stopRef.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      const ctx = await ensureAudioContext(ctxRef);
      if (!ctx || cancelled) return;

      stopRef.current?.();
      const pattern = incomingRinging ? INCOMING_RING : OUTGOING_WAIT;
      stopRef.current = startToneLoop(ctx, pattern);
    })();

    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [incomingRinging, outgoingWaiting]);

  useEffect(() => {
    return () => {
      stopRef.current?.();
      stopRef.current = null;
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);
}
