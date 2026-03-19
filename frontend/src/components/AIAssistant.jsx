import { useState } from 'react';
import { Bot, Send, X, MessageCircle } from 'lucide-react';
import api from '../utils/api';

const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;

    const userText = message.trim();
    setMessage('');
    setLoading(true);

    const userMessage = { role: 'user', parts: [{ text: userText }] };
    const newHistory = [...history, userMessage];
    setHistory(newHistory);

    try {
      const { data } = await api.post('/ai/chat', {
        history,
        message: userText
      });

      setHistory(prev => [...prev, { role: 'model', parts: [{ text: data.response }] }]);
    } catch {
      setHistory(prev => [...prev, {
        role: 'model',
        parts: [{ text: 'I am currently unavailable. Please try again shortly.' }]
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-primary text-white rounded-full p-4 shadow-xl hover:scale-105 transition"
      >
        <MessageCircle size={22} />
      </button>

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[95vw] h-[520px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col animate-slide-up">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-white rounded-t-2xl">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <p className="font-semibold text-sm">AgriSmart AI</p>
                <p className="text-xs text-gray-300">Field Assistant Online</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/10 rounded">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
            {history.length === 0 && (
              <div className="text-sm text-gray-600 bg-white p-3 rounded-lg border">
                Namaste! Ask about crop nutrition, fertilizer dosage, pest control, or product selection.
              </div>
            )}
            {history.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-br-sm'
                    : 'bg-white border text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.parts?.[0]?.text}
                </div>
              </div>
            ))}
            {loading && <p className="text-xs text-gray-500">AgriSmart AI is thinking...</p>}
          </div>

          <div className="p-3 border-t bg-white rounded-b-2xl">
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Ask your farming question..."
                className="input-field text-sm"
              />
              <button onClick={sendMessage} className="btn-primary px-3">
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
