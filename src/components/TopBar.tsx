import { User } from '@supabase/supabase-js';
import { ViewType } from '../types';

/* ═══════════════════════════════════════════════════════════════
   BARRA SUPERIOR — GS CRED
   Moldura de topo: eyebrow mono + seção em Anton + status/data/usuário.
   Dá corpo à estrutura (sidebar + topo + conteúdo).
═══════════════════════════════════════════════════════════════ */

const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  production: 'Produção',
  proposals: 'Propostas',
  simulator: 'Simulador',
  ranking: 'Ranking',
  'conta-corrente': 'Conta Corrente',
  catalog: 'Treinamentos',
  course: 'Treinamento',
  lesson: 'Aula',
  'login-bancos': 'Login Bancos',
  roteiros: 'Roteiros',
  'consulta-margem': 'Consulta de Margem',
  'admin-users': 'Usuários',
  'admin-convenios': 'Convênios',
  'admin-banks': 'Bancos',
  'admin-products': 'Produtos',
  'admin-financial-tables': 'Tabelas',
  'admin-categories': 'Categorias',
  'admin-reports': 'Relatórios',
  'admin-conta-corrente': 'Conta Corrente',
  'admin-commission-report': 'Relatório de Comissões',
  'admin-lojas': 'Lojas',
  'admin-usuarios-banco': 'Usuários Banco',
  'admin-proposal-statuses': 'Status de Propostas',
  'admin-conta-empresa': 'Conta Empresa',
  'admin-courses': 'Treinamentos',
  'admin-course-edit': 'Editar Curso',
  'admin-roteiros': 'Roteiros',
  'admin-importacao': 'Importação CRM',
  'admin-personalizacao': 'Personalização',
};

const MONO = "'Space Mono', ui-monospace, monospace";
const ANTON = "'Anton', Impact, sans-serif";

interface TopBarProps {
  currentView: ViewType;
  user: User;
  onOpenProfile: () => void;
}

export function TopBar({ currentView, user, onOpenProfile }: TopBarProps) {
  const label = VIEW_LABELS[currentView] ?? 'GS CRED';
  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário';
  const initials = displayName.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between gap-4 px-6"
      style={{
        height: 64,
        background: 'rgba(5,5,5,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {/* Seção atual */}
      <div className="min-w-0">
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.22em', color: '#C6FF00' }}>
          // GS.SISTEMA
        </div>
        <h1
          className="truncate leading-none mt-1"
          style={{ fontFamily: ANTON, fontSize: 22, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#F4F4F4' }}
        >
          {label}
        </h1>
      </div>

      {/* Status + data + usuário */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(198,255,0,0.06)', border: '1px solid rgba(198,255,0,0.2)' }}
        >
          <span className="live-dot" />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: '#C6FF00' }}>ONLINE</span>
        </div>

        <div
          className="hidden sm:block px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', color: '#9A9A9A' }}
        >
          {today}
        </div>

        <button
          onClick={onOpenProfile}
          className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-full transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(198,255,0,0.4)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.09)'; }}
          title="Editar perfil"
        >
          <span
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #C6FF00, #A9E000)', color: '#0A0A0A', fontFamily: MONO, fontWeight: 700, fontSize: 12 }}
          >
            {initials}
          </span>
          <span className="hidden sm:block text-[12px] font-semibold truncate max-w-[140px]" style={{ color: '#E2E8F0' }}>
            {displayName}
          </span>
        </button>
      </div>
    </header>
  );
}
