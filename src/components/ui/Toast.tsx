import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   SISTEMA DE FEEDBACK (TOASTS) — GS CRED
   Substitui os alert() nativos do navegador por notificações
   elegantes no estilo do design system (glass + accent teal).

   Uso:
     const toast = useToast();
     toast.success('Proposta salva com sucesso!');
     toast.error('Não foi possível salvar.');
     toast.info('Sincronizando...');
     toast.warning('Verifique os dados.');
═══════════════════════════════════════════════════════════════ */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

interface ToastOptions {
  title?: string;
  duration?: number;
}

interface ToastAPI {
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  warning: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
  show: (type: ToastType, message: string, opts?: ToastOptions) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastAPI | null>(null);

const CONFIG: Record<ToastType, { icon: typeof CheckCircle2; color: string; glow: string; bar: string; label: string }> = {
  success: { icon: CheckCircle2,  color: '#22c55e', glow: 'rgba(34,197,94,0.35)',  bar: 'linear-gradient(90deg,#22c55e,#16a34a)', label: 'Sucesso' },
  error:   { icon: XCircle,       color: '#f87171', glow: 'rgba(248,113,113,0.35)', bar: 'linear-gradient(90deg,#f87171,#ef4444)', label: 'Erro' },
  warning: { icon: AlertTriangle, color: '#fbbf24', glow: 'rgba(245,158,11,0.35)',  bar: 'linear-gradient(90deg,#fbbf24,#d97706)', label: 'Atenção' },
  info:    { icon: Info,          color: '#2DD4BF', glow: 'rgba(20,184,166,0.35)',  bar: 'linear-gradient(90deg,#14B8A6,#06B6D4)', label: 'Informação' },
};

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type: ToastType, message: string, opts?: ToastOptions) => {
    const id = ++counter;
    const duration = opts?.duration ?? (type === 'error' ? 6000 : 4000);
    setToasts((prev) => [...prev, { id, type, message, title: opts?.title, duration }]);
  }, []);

  const api: ToastAPI = {
    show,
    success: (m, o) => show('success', m, o),
    error:   (m, o) => show('error', m, o),
    warning: (m, o) => show('warning', m, o),
    info:    (m, o) => show('info', m, o),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed z-[9999] flex flex-col gap-2.5 pointer-events-none"
        style={{ top: 18, right: 18, width: 'min(380px, calc(100vw - 36px))' }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const close = useCallback(() => {
    setLeaving(true);
    window.setTimeout(onClose, 220);
  }, [onClose]);

  useEffect(() => {
    timer.current = window.setTimeout(close, toast.duration);
    return () => window.clearTimeout(timer.current);
  }, [toast.duration, close]);

  return (
    <div
      className="pointer-events-auto relative overflow-hidden rounded-xl flex items-start gap-3 pl-3.5 pr-9 py-3"
      style={{
        background: 'var(--modal-bg)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: '1px solid var(--border-1)',
        boxShadow: `var(--shadow-lifted), 0 0 0 1px ${cfg.glow}`,
        animation: leaving
          ? 'toast-out 0.22s cubic-bezier(0.4,0,1,1) forwards'
          : 'toast-in 0.32s cubic-bezier(0.16,1,0.3,1) both',
      }}
      role="alert"
    >
      {/* Barra lateral colorida */}
      <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: cfg.bar }} />

      <span
        className="flex-shrink-0 mt-0.5 flex items-center justify-center w-6 h-6 rounded-lg"
        style={{ background: `${cfg.color}1f`, color: cfg.color }}
      >
        <Icon className="w-4 h-4" />
      </span>

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="text-[12.5px] font-semibold leading-snug" style={{ color: 'var(--text-1)' }}>
          {toast.title ?? cfg.label}
        </p>
        <p className="text-[12px] leading-snug mt-0.5 break-words" style={{ color: 'var(--text-2)' }}>
          {toast.message}
        </p>
      </div>

      <button
        onClick={close}
        className="absolute top-2 right-2 p-1 rounded-md transition-colors"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        aria-label="Fechar"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Barra de progresso do tempo */}
      <span
        className="absolute left-0 bottom-0 h-[2px]"
        style={{
          background: cfg.bar,
          opacity: 0.7,
          animation: `toast-progress ${toast.duration}ms linear forwards`,
        }}
      />
    </div>
  );
}

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast precisa estar dentro de <ToastProvider>');
  return ctx;
}
