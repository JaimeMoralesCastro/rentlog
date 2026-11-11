import { useState, useRef, useCallback } from 'react';

// Reutilizado de Gastolens: dictado de gastos por voz (Web Speech API).
const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState('');
  const ref = useRef(null);

  const supported = !!SpeechRecognition;

  const start = useCallback((onFinal) => {
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.lang = 'es-ES';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = e => {
      let inter = '', final = '';
      for (const result of e.results) {
        if (result.isFinal) final += result[0].transcript;
        else inter += result[0].transcript;
      }
      setInterim(inter || final);
      if (final) { onFinal(final.trim()); setInterim(''); }
    };
    rec.onend = () => { setIsListening(false); setInterim(''); };
    rec.onerror = () => { setIsListening(false); setInterim(''); };

    rec.start();
    ref.current = rec;
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    ref.current?.stop();
    setIsListening(false);
    setInterim('');
  }, []);

  return { isListening, interim, supported, start, stop };
}
