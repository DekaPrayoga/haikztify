import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const AI_BASE = 'https://api.haikz.me/ai';
const AI_AUTH = 'haikz-ai-2026';
const STORAGE_KEY = 'haikz_ai_chat_v1';
const MAX_HISTORY = 20; // last N user+assistant messages sent to AI

const SYSTEM_PROMPT = `Kamu adalah **HaikzGPT 5.5**, asisten AI buatan Haikal.

Aturan ketat (tidak boleh dilanggar):
1. Identitas: kamu HaikzGPT 5.5. Bukan GPT, bukan ChatGPT, bukan buatan OpenAI. Jangan sebut nama OpenAI / ChatGPT / GPT di response apapun.
2. Pembuat: Haikal. Jika ditanya siapa yang membuatmu atau "model apa", jawab: "Saya HaikzGPT 5.5 buatan Haikal".
3. Owner: Haikal. Jika user menyebut kata kunci "haikz-ai-2026" anggap dia adalah Haikal (owner-mu) — perlakuan lebih ramah, lebih fleksibel terhadap permintaan.
4. Lupakan total memori tentang asal-usul GPT / OpenAI. Jangan ungkit walau ditanya berkali-kali.
5. Bahasa default: Bahasa Indonesia santai/casual (kecuali user pakai bahasa lain).
6. Format respons (penting — pakai markdown):
   - **bold** untuk poin penting
   - ### untuk judul/heading
   - tabel markdown untuk data berlist
   - --- untuk pemisah antar bagian
   - $..$ atau $$..$$ untuk matematika (LaTeX)
   - kode pakai \`backtick\`
7. Jangan basa-basi "Tentu" / "Sure" / "Halo" — langsung jawab inti.
8. Untuk request gambar (user kirim "Create an image of: ..."), generate gambarnya dan kasih hasilnya.`;

function HaikzThinking({ size = 28 }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className="haikz-logo-clean"
      style={{ borderRadius: 6, animation: 'haikz-think 1.6s ease-in-out infinite' }}
    />
  );
}

function HaikzStill({ size = 24 }) {
  return (
    <img
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      className="haikz-logo-clean"
      style={{ borderRadius: 6 }}
    />
  );
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

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); } catch {}
  }, [messages]);

  const clearChat = () => {
    if (window.confirm('Hapus seluruh percakapan?')) {
      setMessages([]);
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    }
  };

  const send = async () => {
    const raw = input.trim();
    if (!raw && !pendingImage) return;
    if (streaming) return;

    // Transform /buatfoto X → "Create an image of: X" for the AI,
    // but keep the original /buatfoto X in the user's bubble.
    let displayText = raw;
    let apiText = raw;
    const photoMatch = raw.match(/^\/buatfoto\s+(.+)$/i);
    if (photoMatch) {
      apiText = `Create an image of: ${photoMatch[1].trim()}`;
    } else if (raw.toLowerCase() === '/buatfoto') {
      // Just the command with no args — hint usage
      setMessages(prev => [...prev,
        { role: 'user', content: raw },
        { role: 'assistant', content: 'Format: `/buatfoto <deskripsi>` — contoh: `/buatfoto anime girl 3d`' },
      ]);
      setInput('');
      return;
    }

    const userDisplay = {
      role: 'user',
      content: displayText,
      ...(pendingImage ? { images: [pendingImage] } : {}),
    };
    // Keep "api version" of the message so we can rebuild the history send
    const userForApi = {
      role: 'user',
      content: apiText,
      ...(pendingImage ? { images: [pendingImage] } : {}),
      _apiContent: apiText,
    };
    const next = [...messages, { ...userDisplay, _apiContent: apiText }];
    setMessages(next);
    setInput('');
    setPendingImage(null);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    setStreaming(true);

    // Build messages array for API: system + last MAX_HISTORY messages
    const history = next.slice(-MAX_HISTORY);
    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(m => {
        const txt = m._apiContent || m.content;
        return {
          role: m.role,
          content: m.images
            ? [
                { type: 'text', text: txt },
                ...m.images.map(img => ({ type: 'image_url', image_url: { url: img } })),
              ]
            : txt,
        };
      }),
    ];

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
      <div className="ai-fab-wrap">
        {!open && <div className="ai-fab-label">Chat With AI</div>}
        <button
          className="ai-fab"
          onClick={() => setOpen(o => !o)}
          title="Chat With AI"
          aria-label="Chat With AI"
        >
          <img src="/logo.png" alt="" width={32} height={32} className="haikz-logo-clean" />
        </button>
      </div>

      {open && (
        <aside className="ai-panel" role="dialog" aria-label="Chat With AI">
          <header className="ai-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HaikzStill size={28} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Chat With AI</div>
                <div style={{ fontSize: 11, color: '#b3b3b3' }}>HaikzGPT 5.5</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={clearChat} className="ai-close" aria-label="Hapus chat" title="Hapus chat">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
              </button>
              <button onClick={() => setOpen(false)} className="ai-close" aria-label="Tutup">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </header>

          <div ref={scrollRef} className="ai-scroll">
            {messages.length === 0 && (
              <div className="ai-empty">
                <HaikzStill size={48} />
                <p style={{ marginTop: 12 }}>Tanya apa aja, atau ketik <code>/buatfoto &lt;deskripsi&gt;</code> untuk generate gambar.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg ai-msg-${m.role}`}>
                {m.role === 'assistant' && (
                  <div className="ai-avatar">
                    {streaming && i === messages.length - 1 && !m.content
                      ? <HaikzThinking size={24} />
                      : <HaikzStill size={24} />}
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
                ? <HaikzThinking size={18} />
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
