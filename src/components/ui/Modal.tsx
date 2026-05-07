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
  sm:  'max-w-sm',
  md:  'max-w-md',
  lg:  'max-w-lg',
  xl:  'max-w-2xl',
  '2xl': 'max-w-3xl',
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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`relative flex flex-col bg-white dark:bg-dk-card rounded-2xl shadow-2xl w-full ${SIZES[size]} max-h-[90vh] animate-modal-in`}>

        {/* Sticky header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-dk-border flex-shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-dk-surface transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6">
          {children}
        </div>

        {/* Sticky footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-dk-border flex-shrink-0 bg-gray-50/80 dark:bg-dk-surface/40 rounded-b-2xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export const btnCancel = 'flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-dk-border text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dk-surface transition-colors';
export const btnPrimary = 'flex-1 py-2.5 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition-all disabled:opacity-60';
export const primaryBg = { backgroundColor: '#1e4033' } as const;
