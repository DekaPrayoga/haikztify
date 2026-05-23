import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const AI_BASE = 'https://api.haikz.me/ai';
const AI_AUTH = 'haikz-ai-2026';
const PHOTO_MODES = [
  { id: 'photographic', label: 'Foto Realistik', emoji: '📷' },
  { id: 'anime',        label: 'Anime',          emoji: '🎌' },
  { id: 'digital-art',  label: 'Digital Art',    emoji: '🎨' },
  { id: 'cinematic',    label: 'Cinematic',      emoji: '🎬' },
  { id: 'cartoon',      label: '3D Cartoon',     emoji: '🧸' },
];

function HaikzSpinner({ size = 28 }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      style={{ borderRadius: 6, animation: 'haikz-spin 1.4s linear infinite' }}
    />
  );
}

function StaticLogo({ size = 24 }) {
  return <img src="/logo.png" alt="" width={size} height={size} style={{ borderRadius: 6 }} />;
}

function MessageContent({ text }) {
  return (
    <div className="ai-md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children }) => <h3 className="ai-h-super">{children}</h3>,
          h2: ({ children }) => <h3 className="ai-h-super">{children}</h3>,
          h3: ({ children }) => <h3 className="ai-h-super">{children}</h3>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
          code: ({ inline, children, ...props }) =>
            inline
              ? <code className="ai-code-inline" {...props}>{children}</code>
              : <pre className="ai-code-block"><code {...props}>{children}</code></pre>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

async function streamChat({ messages, onChunk, onDone, onError }) {
  try {
    const res = await fetch(`${AI_BASE}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_AUTH}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.5-instant',
        messages,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${t.slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) onChunk(delta);
        } catch { /* skip non-JSON lines */ }
      }
    }
    onDone();
  } catch (e) {
    onError(e);
  }
}

async function generateImage(prompt) {
  const res = await fetch(`${AI_BASE}/v1/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AI_AUTH}`,
    },
    body: JSON.stringify({ prompt, n: 1, size: '1024x1024' }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data?.[0]?.url || data.data?.[0]?.b64_json || null;
}

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // { role, content, images? }
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [showPhotoModes, setShowPhotoModes] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // base64 data URL
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text && !pendingImage) return;
    if (streaming) return;

    // /buatfoto command — open mode picker
    if (text.toLowerCase().startsWith('/buatfoto')) {
      setShowPhotoModes(true);
      return;
    }

    const userMsg = {
      role: 'user',
      content: text,
      ...(pendingImage ? { images: [pendingImage] } : {}),
    };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setPendingImage(null);

    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setStreaming(true);

    const apiMessages = next.map(m => ({
      role: m.role,
      content: m.images
        ? [
            { type: 'text', text: m.content },
            ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } })),
          ]
        : m.content,
    }));

    await streamChat({
      messages: apiMessages,
      onChunk: (delta) => {
        setMessages(prev => {
          const arr = [...prev];
          const last = arr[arr.length - 1];
          if (last && last.role === 'assistant') {
            arr[arr.length - 1] = { ...last, content: last.content + delta };
          }
          return arr;
        });
      },
      onDone: () => setStreaming(false),
      onError: (err) => {
        setMessages(prev => {
          const arr = [...prev];
          arr[arr.length - 1] = {
            role: 'assistant',
            content: `_Error: ${err.message}_`,
          };
          return arr;
        });
        setStreaming(false);
      },
    });
  };

  const handlePhotoMode = async (mode) => {
    setShowPhotoModes(false);
    const stripped = input.replace(/^\/buatfoto\s*/i, '').trim();
    if (!stripped) {
      setInput('/buatfoto ');
      return;
    }
    const finalPrompt = `${stripped}, style: ${mode.id}`;
    const userMsg = { role: 'user', content: `/buatfoto (${mode.label}): ${stripped}` };
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '', generating: true }]);
    setInput('');
    setStreaming(true);
    try {
      const url = await generateImage(finalPrompt);
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1] = {
          role: 'assistant',
          content: url
            ? `![generated image](${url.startsWith('data:') || url.startsWith('http') ? url : `data:image/png;base64,${url}`})`
            : '_Gagal generate image_',
        };
        return arr;
      });
    } catch (e) {
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1] = { role: 'assistant', content: `_Error: ${e.message}_` };
        return arr;
      });
    }
    setStreaming(false);
  };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  return (
    <>
      <button
        className="ai-fab"
        onClick={() => setOpen(o => !o)}
        title="AI Chat"
        aria-label="AI Chat"
      >
        <img src="/logo.png" alt="" width={28} height={28} style={{ borderRadius: 6 }} />
      </button>

      {open && (
        <aside className="ai-panel" role="dialog" aria-label="AI Chat">
          <header className="ai-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <StaticLogo size={28} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>HaikZTIFY AI</div>
                <div style={{ fontSize: 11, color: '#b3b3b3' }}>powered by GPT</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="ai-close" aria-label="Tutup">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </header>

          <div ref={scrollRef} className="ai-scroll">
            {messages.length === 0 && (
              <div className="ai-empty">
                <StaticLogo size={48} />
                <p style={{ marginTop: 12 }}>Tanya apa aja, atau ketik <code>/buatfoto</code> untuk generate gambar.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                {m.role === 'assistant' && (
                  <div className="ai-avatar">
                    {streaming && i === messages.length - 1
                      ? <HaikzSpinner size={24} />
                      : <StaticLogo size={24} />}
                  </div>
                )}
                <div className="ai-bubble">
                  {m.images && m.images.map((img, j) => (
                    <img key={j} src={img} alt="" className="ai-attach" />
                  ))}
                  {m.content
                    ? <MessageContent text={m.content} />
                    : <span className="ai-thinking">Berpikir…</span>}
                </div>
              </div>
            ))}
          </div>

          {pendingImage && (
            <div className="ai-pending">
              <img src={pendingImage} alt="" />
              <button onClick={() => setPendingImage(null)}>×</button>
            </div>
          )}

          {showPhotoModes && (
            <div className="ai-modes">
              <div className="ai-modes-title">Pilih mode foto:</div>
              <div className="ai-modes-grid">
                {PHOTO_MODES.map(m => (
                  <button key={m.id} className="ai-mode-btn" onClick={() => handlePhotoMode(m)}>
                    <span style={{ fontSize: 18 }}>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
                <button className="ai-mode-btn ai-mode-cancel" onClick={() => setShowPhotoModes(false)}>Batal</button>
              </div>
            </div>
          )}

          <div className="ai-input-row">
            <button
              onClick={() => fileRef.current?.click()}
              className="ai-icon-btn"
              title="Lampirkan gambar"
              disabled={streaming}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
              </svg>
            </button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Tanya apa aja, atau /buatfoto …"
              disabled={streaming}
              rows={1}
            />
            <button onClick={send} disabled={streaming || (!input.trim() && !pendingImage)} className="ai-send">
              {streaming
                ? <HaikzSpinner size={18} />
                : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.36 1.18L4 11l13 1-13 1-1.97 6.22a1 1 0 0 0 1.37 1.18z"/>
                  </svg>
                )}
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
