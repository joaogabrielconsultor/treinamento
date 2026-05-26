import { LayoutDashboard, Library, LogOut, ChevronRight, Users, GraduationCap, Shield, Building2, Sun, Moon, Palette, FileText, Trophy, BarChart2, Table2, Tag, ClipboardList, FileBarChart, Handshake, Package, Calculator, Wallet, Store, UserCog, BookOpen, FileSpreadsheet, ScanSearch } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { useState } from 'react';
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
}

const navItems = [
  { view: 'dashboard'    as ViewType, icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'production'   as ViewType, icon: BarChart2,       label: 'Produção' },
  { view: 'proposals'    as ViewType, icon: FileText,        label: 'Propostas' },
  { view: 'simulator'   as ViewType, icon: Calculator,      label: 'Simulador' },
  { view: 'ranking'         as ViewType, icon: Trophy,    label: 'Ranking' },
  { view: 'conta-corrente'  as ViewType, icon: Wallet,    label: 'Conta Corrente' },
  { view: 'catalog'         as ViewType, icon: Library,   label: 'Treinamentos' },
  { view: 'login-bancos'    as ViewType, icon: Building2, label: 'Login Bancos' },
  { view: 'roteiros'        as ViewType, icon: BookOpen,   label: 'Roteiros' },
  { view: 'consulta-margem' as ViewType, icon: ScanSearch, label: 'Consulta Margem' },
];

const adminItems = [
  { view: 'admin-users'             as ViewType, icon: Users,         label: 'Usuários' },
  { view: 'admin-convenios'         as ViewType, icon: Handshake,     label: 'Convênios' },
  { view: 'admin-banks'             as ViewType, icon: Building2,     label: 'Bancos' },
  { view: 'admin-products'          as ViewType, icon: Package,       label: 'Produtos' },
  { view: 'admin-financial-tables'  as ViewType, icon: Table2,        label: 'Tabelas' },
  { view: 'admin-categories'        as ViewType, icon: Tag,           label: 'Categorias' },
  { view: 'admin-reports'           as ViewType, icon: FileBarChart,  label: 'Relatórios' },
  { view: 'admin-conta-corrente'    as ViewType, icon: Wallet,        label: 'Conta Corrente' },
  { view: 'admin-lojas'             as ViewType, icon: Store,         label: 'Lojas' },
  { view: 'admin-usuarios-banco'    as ViewType, icon: UserCog,       label: 'Usuários Banco' },
  { view: 'admin-proposal-statuses' as ViewType, icon: Tag,          label: 'Status Propostas' },
  { view: 'admin-conta-empresa'     as ViewType, icon: Building2,     label: 'Conta Empresa' },
  { view: 'admin-courses'           as ViewType, icon: GraduationCap, label: 'Treinamentos' },
  { view: 'admin-roteiros'          as ViewType, icon: BookOpen,        label: 'Roteiros' },
  { view: 'admin-importacao'        as ViewType, icon: FileSpreadsheet, label: 'Importação CRM' },
  { view: 'admin-personalizacao'    as ViewType, icon: Palette,         label: 'Personalização' },
];

export function Sidebar({ currentView, onNavigate, user, onSignOut, isAdmin, onOpenProfile }: SidebarProps) {
  const { darkMode, toggleDarkMode } = useAppContext();

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

  return (
    <aside
      className="w-60 flex flex-col h-screen sticky top-0 flex-shrink-0"
      style={{
        background: 'linear-gradient(180deg, #0d1525 0%, #0a1120 100%)',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Brand */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <LogoComponent size="md" />
          <div className="min-w-0">
            <span
              className="font-bold text-sm leading-none block truncate"
              style={{
                background: 'linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Aprova Mais
            </span>
            <span className="text-[11px] mt-0.5 block truncate" style={{ color: '#64748B' }}>
              Plataforma Financeira
            </span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ view, icon: Icon, label }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${active ? 'nav-active' : ''}`}
              style={active
                ? { color: '#2DD4BF' }
                : { color: '#64748B' }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#64748B';
                }
              }}
            >
              <Icon className="w-[17px] h-[17px] flex-shrink-0" />
              <span className="flex-1 min-w-0 text-left truncate">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 opacity-60 flex-shrink-0" />}
            </button>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <div className="divider-cyber mb-3" />
            <div className="flex items-center gap-2 px-3 mb-2">
              <Shield className="w-3 h-3" style={{ color: '#14B8A6' }} />
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: '#14B8A6' }}
              >
                Admin
              </span>
            </div>
            {adminItems.map(({ view, icon: Icon, label }) => {
              const active = isAdminActive(view);
              return (
                <button
                  key={view}
                  onClick={() => onNavigate(view)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 ${active ? 'nav-active' : ''}`}
                  style={active ? { color: '#2DD4BF' } : { color: '#64748B' }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLElement).style.color = '#94A3B8';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                      (e.currentTarget as HTMLElement).style.color = '#64748B';
                    }
                  }}
                >
                  <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                  <span className="flex-1 min-w-0 text-left truncate">{label}</span>
                  {active && <ChevronRight className="w-3 h-3 opacity-60 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 space-y-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
          style={{ color: '#64748B' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
            (e.currentTarget as HTMLElement).style.color = '#94A3B8';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#64748B';
          }}
        >
          {darkMode
            ? <Sun className="w-[15px] h-[15px]" />
            : <Moon className="w-[15px] h-[15px]" />
          }
          {darkMode ? 'Modo claro' : 'Modo escuro'}
        </button>

        {/* User */}
        <button
          onClick={onOpenProfile}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-1 transition-all text-left"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          title="Editar perfil"
        >
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
            style={{
              background: 'linear-gradient(135deg, #14B8A6, #06B6D4)',
              color: '#fff',
              boxShadow: '0 0 10px rgba(20,184,166,0.3)',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: '#E2E8F0' }}>{displayName}</p>
            <p className="text-[10px] truncate" style={{ color: '#64748B' }}>{displayEmail}</p>
          </div>
          <UserCog className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#475569' }} />
        </button>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-medium transition-all duration-200"
          style={{ color: '#64748B' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)';
            (e.currentTarget as HTMLElement).style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#64748B';
          }}
        >
          <LogOut className="w-[15px] h-[15px]" />
          Sair da plataforma
        </button>
      </div>
    </aside>
  );
}
