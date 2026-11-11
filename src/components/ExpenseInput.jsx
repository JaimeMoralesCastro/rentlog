import { useState } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition.js';
import { formatCurrencyPrecise } from '../finance/dateHelpers.js';
import Select from './Select.jsx';

// Sin iconos — micrófono y enviar son etiquetas tipográficas.
export default function ExpenseInput({ onAdd, properties = [], propertyId, onPropertyChange }) {
  const [text, setText] = useState('');
  const [lastAdded, setLastAdded] = useState(null);
  const { isListening, interim, supported, start, stop } = useSpeechRecognition();

  const submit = async (value) => {
    const v = (value ?? text).trim();
    if (!v) return;
    const parsed = await onAdd(v, propertyId);
    if (parsed) { setLastAdded(parsed); setTimeout(() => setLastAdded(null), 3500); }
    setText('');
  };
  const toggleMic = () => isListening ? stop() : start((final) => submit(final));

  return (
    <div>
      {properties.length > 0 && (
        <div className="mb-2.5">
          <Select
            value={propertyId ?? ''}
            onChange={v => onPropertyChange?.(v || null)}
            options={[{ value: '', label: 'Sin asignar' }, ...properties.map(p => ({ value: p.id, label: p.name }))]}
          />
        </div>
      )}

      <div className="flex items-center gap-2 border border-hairline px-3 py-2 focus-within:border-ink-900">
        <input
          value={isListening ? interim : text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={isListening ? 'Escuchando…' : 'Ej. 120€ limpieza'}
          className="flex-1 bg-transparent text-[15px] text-ink-900 focus:outline-none py-1"
        />
        {supported && (
          <button
            onClick={toggleMic}
            className={`shrink-0 h-7 px-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] ${isListening ? 'bg-ink-900 text-white' : 'text-ink-500 hover:text-ink-900'}`}
            title="Dictar gasto"
          >
            {isListening ? <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse-dot" />rec</span> : 'voz'}
          </button>
        )}
        <button
          onClick={() => submit()}
          className="shrink-0 bg-ink-900 text-white h-7 px-3 text-[11px] font-semibold uppercase tracking-[0.1em]"
        >
          Añadir
        </button>
      </div>

      {lastAdded && (
        <p className="mt-3 text-[12px] text-ink-900 animate-fade-in">
          ✓ Añadido <span className="font-medium">{formatCurrencyPrecise(lastAdded.amount)}</span> · {lastAdded.category} / {lastAdded.subcategory}
        </p>
      )}
    </div>
  );
}
