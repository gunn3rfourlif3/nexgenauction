import React from 'react';
import { useState, useRef, useEffect } from 'react';

const ChatAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: 'Hi! I can help with registering, verification, deposits, fees/VAT/STC, participation and invoices.' }
  ]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({ message: text })
      });
      const json = await res.json();
      const reply = json?.data?.reply || 'Sorry, I could not process that.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const quick = [
    'How do I register?',
    'How do I verify my email?',
    'How do deposits work?',
    'Explain fees and VAT',
    'Register participation',
    'What is Preparing Lots?'
  ];

  return (
    <>
      <button onClick={() => setOpen(true)} className="fixed bottom-6 right-6 bg-black text-white rounded-full px-4 py-3 shadow-lg">
        Ask Nexus
      </button>
      {open && (
        <div className="fixed bottom-20 right-6 w-96 bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
          <div className="px-4 py-3 border-b flex justify-between items-center">
            <div className="font-semibold">Nexus Assistant</div>
            <button onClick={() => setOpen(false)} className="text-gray-600">✕</button>
          </div>
          <div ref={ref} className="px-4 py-3 h-64 overflow-y-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'assistant' ? 'text-gray-800' : 'text-black'}>
                <div className={m.role === 'assistant' ? 'bg-gray-100 rounded p-2' : 'bg-blue-100 rounded p-2'}>{m.content}</div>
              </div>
            ))}
            {loading && <div className="text-gray-500">Thinking…</div>}
          </div>
          <div className="px-4 py-2 border-t">
            <div className="flex flex-wrap gap-2 mb-2">
              {quick.map((q, idx) => (
                <button key={idx} onClick={() => send(q)} className="text-xs bg-gray-200 px-2 py-1 rounded">{q}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question" className="flex-1 border rounded px-2 py-2" />
              <button onClick={() => { const t = input; setInput(''); send(t); }} className="bg-black text-white px-3 rounded">Send</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAssistant;