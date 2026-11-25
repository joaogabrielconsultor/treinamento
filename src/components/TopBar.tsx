import { Menu, ChevronRight } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ViewType } from '../types';
import { navItems, adminGroups } from './Sidebar';

/* ═══════════════════════════════════════════════════════════════
   BARRA SUPERIOR
   Mostra onde o usuário está (trilha), a data e o acesso ao perfil.
   O título grande fica no cabeçalho de cada página.
═══════════════════════════════════════════════════════════════ */

const EXTRA_LABELS: Partial<Record<ViewType, string>> = {
  course: 'Treinamento',
  lesson: 'Aula',
  'admin-course-edit': 'Editar curso',
};

function trail(view: ViewType): string[] {
  const main = navItems.find(i => i.view === view);
  if (main) return [main.label];
  for (const g of adminGroups) {
    const it = g.items.find(i => i.view === view);
    if (it) return ['Admin', g.label, it.label];
  }
  if (view === 'admin-course-edit') return ['Admin', 'Treinamentos', 'Editar curso'];
  if (view === 'course' || view === 'lesson') return ['Treinamentos', EXTRA_LABELS[view]!];
  return [EXTRA_LABELS[view] ?? 'Início'];
}

interface TopBarProps {
  currentView: ViewType;
  user: User;
  onOpenProfile: () => void;
  onOpenMenu?: () => void;
}

export function TopBar({ currentView, user, onOpenProfile, onOpenMenu }: TopBarProps) {
  const crumbs = trail(currentView);
  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário';
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '');

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-3 h-14 px-4 sm:px-7 xl:px-10"
      style={{
        background: 'rgba(15,17,19,0.86)',
        backdropFilter: 'saturate(140%) blur(10px)',
        WebkitBackdropFilter: 'saturate(140%) blur(10px)',
        borderBottom: '1px solid var(--border-1)',
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {onOpenMenu && (
          <button onClick={onOpenMenu} className="lg:hidden btn btn-icon -ml-2" style={{ color: 'var(--text-2)' }} aria-label="Abrir menu">
            <Menu className="w-5 h-5" />
          </button>
        )}
        <nav aria-label="Você está em" className="flex items-center gap-1.5 min-w-0 text-[13px]">
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={i} className={`flex items-center gap-1.5 min-w-0 ${last ? '' : 'hidden sm:flex'}`}>
                <span className="truncate" style={{ color: last ? 'var(--text-1)' : 'var(--text-3)', fontWeight: last ? 500 : 400 }}>{c}</span>
                {!last && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-4)' }} />}
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="hidden sm:block text-[13px] capitalize" style={{ color: 'var(--text-3)' }}>{today}</span>
        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2 rounded-full pl-0.5 pr-0.5 sm:pr-3 py-0.5 transition-colors hover:bg-white/5"
          title="Editar perfil"
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-semibold"
            style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
          >
            {initials}
          </span>
          <span className="hidden sm:block text-[13px] font-medium truncate max-w-[160px]" style={{ color: 'var(--text-1)' }}>
            {displayName}
          </span>
        </button>
      </div>
    </header>
  );
}
