import { BookOpen, LayoutDashboard, Library, LogOut, ChevronRight, Users, GraduationCap, Shield } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  user: User;
  onSignOut: () => void;
  isAdmin: boolean;
}

const navItems = [
  { view: 'dashboard' as ViewType, icon: LayoutDashboard, label: 'Dashboard' },
  { view: 'catalog' as ViewType, icon: Library, label: 'Catálogo de Cursos' },
];

const adminItems = [
  { view: 'admin-users' as ViewType, icon: Users, label: 'Usuários' },
  { view: 'admin-courses' as ViewType, icon: GraduationCap, label: 'Treinamentos' },
];

export function Sidebar({ currentView, onNavigate, user, onSignOut, isAdmin }: SidebarProps) {
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">EduTrain</span>
            <p className="text-slate-500 text-xs mt-0.5">Treinamentos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ view, icon: Icon, label }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
              currentView === view
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Icon className="w-[18px] h-[18px]" />
            <span className="flex-1 text-left">{label}</span>
            {currentView === view && <ChevronRight className="w-4 h-4 opacity-70" />}
          </button>
        ))}

        {isAdmin && (
          <div className="pt-4">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Shield className="w-3 h-3 text-purple-400" />
              <p className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Administração</p>
            </div>
            {adminItems.map(({ view, icon: Icon, label }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  currentView === view || (view === 'admin-courses' && currentView === 'admin-course-edit')
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span className="flex-1 text-left">{label}</span>
                {(currentView === view || (view === 'admin-courses' && currentView === 'admin-course-edit')) && (
                  <ChevronRight className="w-4 h-4 opacity-70" />
                )}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{displayName}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sair
        </button>
      </div>
    </aside>
  );
}
