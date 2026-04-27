import { LayoutDashboard, Library, LogOut, ChevronRight, Users, GraduationCap, Shield, Building2, Moon, Sun, Palette } from 'lucide-react';
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
}

const navItems = [
  { view: 'dashboard'    as ViewType, icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'catalog'      as ViewType, icon: Library,         label: 'Catálogo de Cursos' },
  { view: 'login-bancos' as ViewType, icon: Building2,       label: 'Login Bancos' },
];

const adminItems = [
  { view: 'admin-users'          as ViewType, icon: Users,         label: 'Usuários' },
  { view: 'admin-courses'        as ViewType, icon: GraduationCap, label: 'Treinamentos' },
  { view: 'admin-personalizacao' as ViewType, icon: Palette,       label: 'Personalização' },
];

export function Sidebar({ currentView, onNavigate, user, onSignOut, isAdmin }: SidebarProps) {
  const { darkMode, toggleDarkMode } = useAppContext();

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <aside className="w-64 flex flex-col h-screen sticky top-0" style={{ backgroundColor: '#263e34', borderRight: '1px solid #1e3329' }}>
      {/* Brand */}
      <div className="p-6" style={{ borderBottom: '1px solid #1e3329' }}>
        <div className="flex items-center gap-3">
          <LogoComponent size="md" />
          <div>
            <span className="font-bold text-lg leading-none" style={{ color: '#dabb39' }}>Aprova Mais</span>
            <p className="text-xs mt-0.5" style={{ color: '#7fa890' }}>Treinamentos</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ view, icon: Icon, label }) => {
          const isActive = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onNavigate(view)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={isActive
                ? { backgroundColor: '#1e3329', color: '#dabb39' }
                : { color: '#9dbfb0' }
              }
              onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = '#1e3329'; (e.currentTarget as HTMLElement).style.color = '#ffffff'; } }}
              onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9dbfb0'; } }}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="flex-1 text-left">{label}</span>
              {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
            </button>
          );
        })}

        {isAdmin && (
          <div className="pt-4">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Shield className="w-3 h-3" style={{ color: '#dabb39' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#dabb39' }}>Administração</p>
            </div>
            {adminItems.map(({ view, icon: Icon, label }) => {
              const isActive =
                currentView === view ||
                (view === 'admin-courses' && currentView === 'admin-course-edit');
              return (
                <button
                  key={view}
                  onClick={() => onNavigate(view)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={isActive
                    ? { backgroundColor: '#1e3329', color: '#dabb39' }
                    : { color: '#9dbfb0' }
                  }
                  onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = '#1e3329'; (e.currentTarget as HTMLElement).style.color = '#ffffff'; } }}
                  onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9dbfb0'; } }}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  <span className="flex-1 text-left">{label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-4 space-y-1" style={{ borderTop: '1px solid #1e3329' }}>
        {/* Dark mode toggle */}
        <button
          onClick={toggleDarkMode}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#9dbfb0' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1e3329'; (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9dbfb0'; }}
        >
          {darkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          {darkMode ? 'Modo claro' : 'Modo escuro'}
        </button>

        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#dabb39' }}>
            <span className="text-xs font-bold" style={{ color: '#1e3329' }}>{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{displayName}</p>
            <p className="text-xs truncate" style={{ color: '#7fa890' }}>{user.email}</p>
          </div>
        </div>

        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ color: '#9dbfb0' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1e3329'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#9dbfb0'; }}
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sair
        </button>
      </div>
    </aside>
  );
}
