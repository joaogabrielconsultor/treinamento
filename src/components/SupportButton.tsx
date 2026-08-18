import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Headphones } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CHAT DE SUPORTE (interno, cliente ↔ dono)
   FAB fixo no canto inferior direito. Abre um chat de verdade —
   as mensagens vão pro painel do dono em /admin → Suporte.
   Funciona mesmo com a assinatura suspensa.
═══════════════════════════════════════════════════════════════ */

const VOLT = '#C6FF00';

interface Msg { id: string; from_owner: boolean; body: string; created_at: string; }

const token = () => localStorage.getItem('token') ?? '';
const authFetch = (p: string, opts?: RequestInit) =>
  fetch(p, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}`, ...(opts?.headers || {}) } });

export function SupportButton() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const hasToken = !!token();

  const loadMsgs = useCallback(async () => {
    try {
      const r = await authFetch('/api/support/messages');
      if (r.ok) { setMsgs(await r.json()); setUnread(0); }
    } catch { /* ignore */ }
  }, []);

  const loadUnread = useCallback(async () => {
    try {
      const r = await authFetch('/api/support/unread');
      if (r.ok) { const d = await r.json(); setUnread(d.unread || 0); }
    } catch { /* ignore */ }
  }, []);

  // Polling: mensagens quando aberto (4s), badge de não lidas quando fechado (20s).
  useEffect(() => {
    if (!hasToken) return;
    if (open) {
      loadMsgs();
      const t = setInterval(loadMsgs, 4000);
      return () => clearInterval(t);
    }
    loadUnread();
    const t = setInterval(loadUnread, 20000);
    return () => clearInterval(t);
  }, [open, hasToken, loadMsgs, loadUnread]);

  // Rola pro fim quando chegam mensagens
  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [msgs, open]);

  // Fecha ao apertar Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Permite abrir o chat de qualquer lugar (ex.: link "falar com suporte" na tela de renovação)
  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener('open-support-chat', openIt);
    return () => window.removeEventListener('open-support-chat', openIt);
  }, []);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText('');
    // otimista
    const temp: Msg = { id: `tmp-${Date.now()}`, from_owner: false, body, created_at: new Date().toISOString() };
    setMsgs((m) => [...m, temp]);
    try {
      const r = await authFetch('/api/support/messages', { method: 'POST', body: JSON.stringify({ body }) });
      if (r.ok) { const saved = await r.json(); setMsgs((m) => m.map((x) => (x.id === temp.id ? saved : x))); }
    } catch { /* ignore */ }
    setSending(false);
  };

  if (!hasToken) return null;

  return (
    <div ref={rootRef} className="fixed z-[9998] flex flex-col items-end gap-3" style={{ right: 22, bottom: 22 }}>
      {open && (
        <div
          className="rounded-2xl overflow-hidden w-[330px] flex flex-col"
          style={{
            height: 460, maxHeight: 'calc(100vh - 120px)',
            background: 'var(--modal-bg, #0d0d0d)', backdropFilter: 'blur(20px)',
            border: '1px solid var(--border-1, rgba(255,255,255,0.1))',
            boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            animation: 'support-pop 0.26s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Cabeçalho */}
          <div className="px-4 py-3 flex items-center gap-3 flex-shrink-0" style={{ background: 'linear-gradient(135deg, rgba(198,255,0,0.14), rgba(169,224,0,0.06))', borderBottom: '1px solid var(--border-1, rgba(255,255,255,0.08))' }}>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0" style={{ background: 'rgba(198,255,0,0.18)', color: VOLT }}>
              <Headphones className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold leading-none" style={{ color: 'var(--text-1, #f4f4f4)' }}>Suporte GS CRED</p>
              <p className="text-[11px] mt-1 leading-none" style={{ color: 'var(--text-3, #8a8a8a)' }}>Fale com a gente — respondemos aqui</p>
            </div>
            <button onClick={() => setOpen(false)} style={{ color: 'var(--text-3, #8a8a8a)' }}><X className="w-4 h-4" /></button>
          </div>

          {/* Mensagens */}
          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2" style={{ background: 'var(--bg-base, #070707)' }}>
            {msgs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <MessageCircle className="w-8 h-8 mb-2" style={{ color: 'var(--text-3, #555)' }} />
                <p className="text-[12px]" style={{ color: 'var(--text-3, #8a8a8a)' }}>Manda sua dúvida que a gente responde por aqui.</p>
              </div>
            ) : msgs.map((m) => (
              <div key={m.id} className={`flex ${m.from_owner ? 'justify-start' : 'justify-end'}`}>
                <div
                  className="max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-snug whitespace-pre-wrap break-words"
                  style={m.from_owner
                    ? { background: 'var(--bg-surface, #1a1a1a)', color: 'var(--text-1, #e8e8e8)', border: '1px solid var(--border-1, rgba(255,255,255,0.08))', borderBottomLeftRadius: 4 }
                    : { background: VOLT, color: '#0a0a0a', fontWeight: 500, borderBottomRightRadius: 4 }}
                >
                  {m.body}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-2.5 flex items-center gap-2 flex-shrink-0" style={{ borderTop: '1px solid var(--border-1, rgba(255,255,255,0.08))', background: 'var(--modal-bg, #0d0d0d)' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Escreva uma mensagem..."
              className="flex-1 px-3 py-2 text-[13px] rounded-xl outline-none"
              style={{ background: 'var(--bg-base, #070707)', border: '1px solid var(--border-1, rgba(255,255,255,0.1))', color: 'var(--text-1, #f4f4f4)' }}
            />
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0 disabled:opacity-40"
              style={{ background: VOLT, color: '#0a0a0a' }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-full transition-all"
        style={{
          width: 56, height: 56,
          background: open ? 'var(--bg-surface, #1a1a1a)' : `linear-gradient(135deg, ${VOLT}, #A9E000)`,
          color: open ? 'var(--text-1, #f4f4f4)' : '#0a0a0a',
          border: open ? '1px solid var(--border-2, rgba(255,255,255,0.14))' : 'none',
          boxShadow: open ? 'var(--shadow-card, 0 6px 20px rgba(0,0,0,0.4))' : '0 6px 20px rgba(198,255,0,0.4)',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        aria-label={open ? 'Fechar suporte' : 'Abrir suporte'}
        title="Suporte"
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full text-[11px] font-bold"
            style={{ background: '#ef4444', color: '#fff', border: '2px solid #070707' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
    </div>
  );
}
