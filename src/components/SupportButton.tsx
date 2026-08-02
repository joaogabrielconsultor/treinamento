import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Headphones } from 'lucide-react';
import { buildWhatsappLink } from '../lib/config';

/* ═══════════════════════════════════════════════════════════════
   BOTÃO DE SUPORTE FLUTUANTE (WhatsApp)
   Fica fixo no canto inferior direito, visível em todas as telas.
   Ao clicar, abre um cartão com o atalho para o WhatsApp do suporte.
═══════════════════════════════════════════════════════════════ */

interface SupportButtonProps {
  /** Nome do usuário logado — usado para personalizar a mensagem. */
  userName?: string;
}

const WHATSAPP_GREEN = '#25D366';

export function SupportButton({ userName }: SupportButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const greeting = userName
    ? `Olá! Sou ${userName} e preciso de ajuda com a plataforma GS CRED.`
    : undefined;

  return (
    <div
      ref={rootRef}
      className="fixed z-[9998] flex flex-col items-end gap-3"
      style={{ right: 22, bottom: 22 }}
    >
      {/* Cartão de suporte */}
      {open && (
        <div
          className="rounded-2xl overflow-hidden w-[290px]"
          style={{
            background: 'var(--modal-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-1)',
            boxShadow: 'var(--shadow-lifted), 0 0 0 1px rgba(37,211,102,0.10)',
            animation: 'support-pop 0.26s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          {/* Cabeçalho */}
          <div
            className="px-4 py-3.5 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, rgba(37,211,102,0.14), rgba(198,255,0,0.10))', borderBottom: '1px solid var(--border-1)' }}
          >
            <span
              className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
              style={{ background: `${WHATSAPP_GREEN}22`, color: WHATSAPP_GREEN }}
            >
              <Headphones className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-none" style={{ color: 'var(--text-1)' }}>Suporte</p>
              <p className="text-[11px] mt-1 leading-none" style={{ color: 'var(--text-3)' }}>Costumamos responder rápido</p>
            </div>
          </div>

          {/* Corpo */}
          <div className="px-4 py-3.5">
            <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--text-2)' }}>
              Precisa de ajuda? Fale com nossa equipe pelo WhatsApp e tire suas dúvidas em tempo real.
            </p>
            <a
              href={buildWhatsappLink(greeting)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: WHATSAPP_GREEN, color: '#fff', boxShadow: '0 4px 14px rgba(37,211,102,0.35)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
            >
              <MessageCircle className="w-4 h-4" />
              Abrir WhatsApp
            </a>
          </div>
        </div>
      )}

      {/* Botão flutuante (FAB) */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center rounded-full transition-all"
        style={{
          width: 56,
          height: 56,
          background: open ? 'var(--bg-surface)' : `linear-gradient(135deg, ${WHATSAPP_GREEN}, #1cb455)`,
          color: open ? 'var(--text-1)' : '#fff',
          border: open ? '1px solid var(--border-2)' : 'none',
          boxShadow: open ? 'var(--shadow-card)' : '0 6px 20px rgba(37,211,102,0.45)',
        }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1.06)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)'; }}
        aria-label={open ? 'Fechar suporte' : 'Abrir suporte'}
        title="Suporte"
      >
        {!open && (
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: WHATSAPP_GREEN, animation: 'support-ping 2.4s cubic-bezier(0,0,0.2,1) infinite', zIndex: -1 }}
          />
        )}
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}
      </button>
    </div>
  );
}
