import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  children: React.ReactNode;
  footer?: React.ReactNode;
}

const SIZES: Record<NonNullable<ModalProps['size']>, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  '2xl':'max-w-3xl',
};

export function Modal({ open, onClose, title, subtitle, size = 'md', children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 animate-overlay-in"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative flex flex-col w-full ${SIZES[size]} max-h-[90vh] rounded-2xl animate-modal-in modal-panel`}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <div className="min-w-0 pr-3">
            <h2 className="text-[15px] font-semibold leading-tight tracking-tight" style={{ color: 'var(--text-1)' }}>{title}</h2>
            {subtitle && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-icon flex-shrink-0 -mr-2 hover:bg-white/5"
            style={{ color: 'var(--text-3)' }}
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="px-6 py-4 flex-shrink-0 rounded-b-2xl flex-shrink-0"
            style={{
              borderTop: '1px solid var(--card-border)',
              background: 'var(--surface-subtle)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export const btnCancel = 'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all btn-ghost';
export const btnPrimary = 'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all btn-cyber';
export const primaryBg = {} as const;
