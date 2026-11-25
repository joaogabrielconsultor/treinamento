import { LayoutDashboard, Library, LogOut, Users, GraduationCap, Building2, Palette, FileText, Trophy, BarChart2, Table2, Tag, FileBarChart, Handshake, Package, Calculator, Wallet, Store, UserCog, BookOpen, FileSpreadsheet, ScanSearch, Receipt, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ViewType } from '../types';
import { LogoComponent } from './LogoComponent';
import { useAppContext } from '../context/AppContext';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  user: User;
  onSignOut: () => void;
  isAdmin: boolean;
  onOpenProfile: () => void;
  /** Menu aberto no celular (abaixo de lg a sidebar vira gaveta). */
  open?: boolean;
  onClose?: () => void;
}

type NavItem = { view: ViewType; icon: typeof Users; label: string };

export const navItems: NavItem[] = [
  { view: 'dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'production',      icon: BarChart2,       label: 'Produção' },
  { view: 'proposals',       icon: FileText,        label: 'Propostas' },
  { view: 'simulator',       icon: Calculator,      label: 'Simulador' },
  { view: 'ranking',         icon: Trophy,          label: 'Ranking' },
  { view: 'conta-corrente',  icon: Wallet,          label: 'Conta Corrente' },
  { view: 'catalog',         icon: Library,         label: 'Treinamentos' },
  { view: 'login-bancos',    icon: Building2,       label: 'Login Bancos' },
  { view: 'roteiros',        icon: BookOpen,        label: 'Roteiros' },
  { view: 'consulta-margem', icon: ScanSearch,      label: 'Consulta Margem' },
];

export const adminGroups: { label: string; items: NavItem[] }[] = [
  {
    label: 'Cadastros',
    items: [
      { view: 'admin-users',            icon: Users,     label: 'Usuários' },
      { view: 'admin-convenios',        icon: Handshake, label: 'Convênios' },
      { view: 'admin-banks',            icon: Building2, label: 'Bancos' },
      { view: 'admin-products',         icon: Package,   label: 'Produtos' },
      { view: 'admin-financial-tables', icon: Table2,    label: 'Tabelas' },
      { view: 'admin-categories',       icon: Tag,       label: 'Categorias' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { view: 'admin-conta-corrente',    icon: Wallet,       label: 'Conta Corrente' },
      { view: 'admin-reports',           icon: FileBarChart, label: 'Relatórios' },
      { view: 'admin-commission-report', icon: Receipt,      label: 'Relatório Comissões' },
      { view: 'admin-proposal-statuses', icon: Tag,          label: 'Status Propostas' },
      { view: 'admin-conta-empresa',     icon: Building2,    label: 'Conta Empresa' },
    ],
  },
  {
    label: 'Operação',
    items: [
      { view: 'admin-lojas',          icon: Store,           label: 'Lojas' },
      { view: 'admin-usuarios-banco', icon: UserCog,         label: 'Usuários Banco' },
      { view: 'admin-importacao',     icon: FileSpreadsheet, label: 'Importação CRM' },
    ],
  },
  {
    label: 'Conteúdo e sistema',
    items: [
      { view: 'admin-courses',        icon: GraduationCap, label: 'Treinamentos' },
      { view: 'admin-roteiros',       icon: BookOpen,      label: 'Roteiros' },
      { view: 'admin-personalizacao', icon: Palette,       label: 'Personalização' },
    ],
  },
];

function NavButton({ item, active, onClick }: { item: NavItem; active: boolean; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`nav-item ${active ? 'nav-active' : ''}`}
    >
      <Icon className="nav-icon" />
      <span className="flex-1 min-w-0 text-left truncate">{item.label}</span>
    </button>
  );
}

export function Sidebar({ currentView, onNavigate, user, onSignOut, isAdmin, onOpenProfile, open = false, onClose }: SidebarProps) {
  const { companyName } = useAppContext();

  const displayName = user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'Usuário';
  const displayEmail = user.email ?? '';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  const isAdminActive = (view: ViewType) =>
    currentView === view ||
    (view === 'admin-courses' && currentView === 'admin-course-edit');

  const go = (view: ViewType) => { onNavigate(view); onClose?.(); };

  return (
    <>
      {/* fundo escurecido da gaveta (só no celular) */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 lg:hidden transition-opacity ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`sidebar fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-[260px] lg:w-[248px] flex flex-col flex-shrink-0 transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-label="Navegação principal"
      >
        {/* Marca */}
        <div className="flex items-center gap-3 px-5 h-16 flex-shrink-0">
          <LogoComponent size="sm" />
          <div className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
              {companyName}
            </span>
            <span className="block truncate text-xs" style={{ color: 'var(--text-3)' }}>
              Crédito consignado
            </span>
          </div>
          {onClose && (
            <button onClick={onClose} className="lg:hidden btn btn-icon" style={{ color: 'var(--text-3)' }} aria-label="Fechar menu">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navegação */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="space-y-px">
            {navItems.map(item => (
              <NavButton key={item.view} item={item} active={currentView === item.view} onClick={() => go(item.view)} />
            ))}
          </div>

          {isAdmin && adminGroups.map(group => (
            <div key={group.label} className="mt-6">
              <div className="nav-group-label">{group.label}</div>
              <div className="space-y-px">
                {group.items.map(item => (
                  <NavButton key={item.view} item={item} active={isAdminActive(item.view)} onClick={() => go(item.view)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Usuário */}
        <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid var(--border-1)' }}>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenProfile}
              className="nav-item flex-1 min-w-0 !h-auto !py-2"
              title="Editar perfil"
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
              >
                {initials}
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-[13px] font-medium truncate" style={{ color: 'var(--text-1)' }}>{displayName}</span>
                <span className="block text-xs truncate" style={{ color: 'var(--text-3)' }}>{displayEmail}</span>
              </span>
            </button>
            <button
              onClick={onSignOut}
              className="btn btn-icon nav-signout"
              title="Sair"
              aria-label="Sair da plataforma"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
