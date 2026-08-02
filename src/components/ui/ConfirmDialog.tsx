import { useState, useEffect, useCallback } from 'react';
import { Trash2, HelpCircle } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   MODAL DE CONFIRMAÇÃO — GS CRED
   Substitui o confirm() nativo por um diálogo elegante.

   Uso (em qualquer lugar, sem hook):
     import { confirmDialog } from './ui/ConfirmDialog';
     if (!(await confirmDialog({
       title: 'Excluir proposta?',
       message: 'Esta ação não pode ser desfeita.',
       variant: 'danger',
       confirmText: 'Excluir',
     }))) return;
═══════════════════════════════════════════════════════════════ */

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'default';
}

type OpenFn = (opts: ConfirmOptions) => void;

let opener: OpenFn | null = null;
let resolver: ((v: boolean) => void) | null = null;

/** Abre o modal e resolve com true (confirmar) ou false (cancelar). */
export function confirmDialog(opts: ConfirmOptions | string): Promise<boolean> {
  const options: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
  return new Promise((resolve) => {
    if (!opener) {
      // Fallback caso o provider não esteja montado
      resolve(window.confirm(options.message));
      return;
    }
    resolver = resolve;
    opener(options);
  });
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    opener = (o) => { setLeaving(false); setOpts(o); };
    return () => { opener = null; };
  }, []);

  const finish = useCallback((value: boolean) => {
    setLeaving(true);
    window.setTimeout(() => {
      setOpts(null);
      resolver?.(value);
      resolver = null;
    }, 160);
  }, []);

  useEffect(() => {
    if (!opts) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish(false);
      if (e.key === 'Enter') finish(true);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [opts, finish]);

  if (!opts) return <>{children}</>;

  const danger = opts.variant === 'danger';
  const Icon = danger ? Trash2 : HelpCircle;
  const accent = danger ? '#f87171' : '#C6FF00';
  const accentBg = danger ? 'rgba(248,113,113,0.12)' : 'rgba(198,255,0,0.12)';

  return (
    <>
      {children}
      <div
        className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
        style={{
          background: 'rgba(3,7,18,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          animation: leaving ? 'overlay-in 0.16s ease-in reverse both' : 'overlay-in 0.18s ease-out both',
        }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) finish(false); }}
      >
        <div
          className="w-full max-w-[380px] rounded-2xl overflow-hidden"
          style={{
            background: 'var(--modal-bg)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--border-1)',
            boxShadow: `var(--shadow-lifted), 0 0 0 1px ${danger ? 'rgba(248,113,113,0.10)' : 'rgba(198,255,0,0.08)'}`,
            animation: leaving ? 'modal-in 0.16s ease-in reverse both' : 'modal-in 0.24s cubic-bezier(0.16,1,0.3,1) both',
          }}
          role="alertdialog"
          aria-modal="true"
        >
          <div className="px-5 pt-5 pb-4 flex gap-3.5">
            <span
              className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ background: accentBg, color: accent }}
            >
              <Icon className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-[15px] font-bold leading-snug" style={{ color: 'var(--text-1)' }}>
                {opts.title ?? (danger ? 'Confirmar exclusão' : 'Confirmar ação')}
              </h3>
              <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: 'var(--text-2)' }}>
                {opts.message}
              </p>
            </div>
          </div>

          <div
            className="px-5 py-3.5 flex items-center justify-end gap-2.5"
            style={{ borderTop: '1px solid var(--border-1)', background: 'var(--surface-subtle)' }}
          >
            <button
              onClick={() => finish(false)}
              className="btn-ghost px-4 py-2 rounded-lg text-[13px] font-medium"
            >
              {opts.cancelText ?? 'Cancelar'}
            </button>
            <button
              onClick={() => finish(true)}
              autoFocus
              className={`px-4 py-2 rounded-lg text-[13px] font-semibold ${danger ? 'btn-danger' : 'btn-cyber'}`}
              style={danger ? { color: '#fca5a5' } : undefined}
            >
              {opts.confirmText ?? (danger ? 'Excluir' : 'Confirmar')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
