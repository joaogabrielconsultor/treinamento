import { Trophy, BookOpen, Clock, Target, ArrowRight, CheckCircle2, Play, Sparkles } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Course, Enrollment, ViewType } from '../types';

interface DashboardProps {
  user: User;
  courses: Course[];
  enrollments: Enrollment[];
  onNavigate: (view: ViewType, courseId?: string) => void;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  iconClass: string;
  iconColor: string;
  delay?: number;
}

function StatCard({ icon: Icon, label, value, iconClass, iconColor, delay = 0 }: StatCardProps) {
  return (
    <div
      className="stat-card rounded-2xl p-5 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`inline-flex w-10 h-10 rounded-xl items-center justify-center mb-4 ${iconClass}`}>
        <Icon className="w-5 h-5" style={{ color: iconColor }} />
      </div>
      <p className="text-2xl font-bold num" style={{ color: '#E2E8F0' }}>{value}</p>
      <p className="text-xs mt-1 font-medium" style={{ color: '#475569' }}>{label}</p>
    </div>
  );
}

export function Dashboard({ user, courses, enrollments, onNavigate }: DashboardProps) {
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const firstName = displayName.split(' ')[0];

  const enrolled  = enrollments.length;
  const completed = enrollments.filter((e) => e.completed).length;
  const inProgress = enrollments.filter((e) => !e.completed && e.progress_percent > 0).length;
  const totalMinutes = enrollments.reduce((acc, e) => {
    const course = courses.find((c) => c.id === e.course_id);
    return course ? acc + Math.round((course.duration_minutes * e.progress_percent) / 100) : acc;
  }, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins  = totalMinutes % 60;

  const enrolledCourses = enrollments
    .filter((e) => !e.completed)
    .map((e) => ({ enrollment: e, course: courses.find((c) => c.id === e.course_id) }))
    .filter((item) => item.course)
    .slice(0, 3);

  const suggestedCourses = courses
    .filter((c) => !enrollments.find((e) => e.course_id === c.id))
    .slice(0, 3);

  const levelBadge: Record<string, string> = {
    Iniciante:    'badge-green',
    Intermediário:'badge-amber',
    Avançado:     'badge-red',
  };

  return (
    <div
      className="min-h-screen p-8 max-w-6xl mx-auto"
      style={{ color: '#E2E8F0' }}
    >
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center gap-2 mb-1">
          <div className="live-dot" />
          <span className="text-xs font-medium" style={{ color: '#14B8A6' }}>Sistema ativo</span>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: '#E2E8F0' }}>
          Olá, {firstName}
        </h1>
        <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
          Continue sua jornada de aprendizado e evolua sua performance.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen}     label="Matriculados"   value={enrolled}   iconClass="icon-box-teal"   iconColor="#14B8A6" delay={0}   />
        <StatCard icon={CheckCircle2} label="Concluídos"     value={completed}  iconClass="icon-box-green"  iconColor="#22c55e" delay={60}  />
        <StatCard icon={Target}       label="Em andamento"   value={inProgress} iconClass="icon-box-amber"  iconColor="#f59e0b" delay={120} />
        <StatCard
          icon={Clock}
          label="Horas estudadas"
          value={`${hours}h${mins > 0 ? ` ${mins}m` : ''}`}
          iconClass="icon-box-blue"
          iconColor="#60a5fa"
          delay={180}
        />
      </div>

      {/* In progress courses */}
      {enrolledCourses.length > 0 && (
        <div className="mb-8 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4" style={{ color: '#14B8A6' }} />
              <h2 className="text-sm font-bold" style={{ color: '#E2E8F0' }}>Continuar aprendendo</h2>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="flex items-center gap-1 text-xs font-medium transition-all"
              style={{ color: '#14B8A6' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#2DD4BF'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid gap-3">
            {enrolledCourses.map(({ enrollment, course }) => {
              if (!course) return null;
              return (
                <div
                  key={enrollment.id}
                  onClick={() => onNavigate('course', course.id)}
                  className="glass-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer group"
                >
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-16 h-12 object-cover rounded-xl flex-shrink-0"
                    style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h3
                      className="font-semibold text-sm truncate transition-colors"
                      style={{ color: '#E2E8F0' }}
                    >
                      {course.title}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{course.instructor}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 progress-track h-1.5">
                        <div
                          className="progress-bar h-1.5"
                          style={{ width: `${enrollment.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-semibold flex-shrink-0 num" style={{ color: '#64748B' }}>
                        {enrollment.progress_percent}%
                      </span>
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                    style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.18)' }}
                  >
                    <Play className="w-3.5 h-3.5" style={{ color: '#14B8A6' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested courses */}
      {suggestedCourses.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '260ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: '#14B8A6' }} />
              <h2 className="text-sm font-bold" style={{ color: '#E2E8F0' }}>
                {enrolled === 0 ? 'Comece a aprender' : 'Recomendados para você'}
              </h2>
            </div>
            <button
              onClick={() => onNavigate('catalog')}
              className="flex items-center gap-1 text-xs font-medium transition-all"
              style={{ color: '#14B8A6' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#2DD4BF'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
            >
              Ver catálogo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {suggestedCourses.map((course, i) => (
              <div
                key={course.id}
                onClick={() => onNavigate('course', course.id)}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer group animate-fade-up"
                style={{ animationDelay: `${260 + i * 80}ms` }}
              >
                <div className="relative overflow-hidden h-36">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(8,13,24,0.8) 0%, transparent 60%)' }}
                  />
                </div>
                <div className="p-4">
                  <span className={`badge ${levelBadge[course.level] || 'badge-neutral'} mb-2`}>
                    {course.level}
                  </span>
                  <h3
                    className="font-semibold text-sm mt-2 line-clamp-2 leading-snug transition-colors"
                    style={{ color: '#E2E8F0' }}
                  >
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: '#475569' }} />
                    <span className="text-xs num" style={{ color: '#64748B' }}>
                      {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}min
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {enrolled === 0 && suggestedCourses.length === 0 && (
        <div className="text-center py-20 animate-fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'rgba(20,184,166,0.08)',
              border: '1px solid rgba(20,184,166,0.15)',
              boxShadow: '0 0 30px rgba(20,184,166,0.08)',
            }}
          >
            <Trophy className="w-8 h-8" style={{ color: '#14B8A6' }} />
          </div>
          <h3 className="text-base font-semibold mb-2" style={{ color: '#E2E8F0' }}>Comece sua jornada</h3>
          <p className="text-sm mb-5" style={{ color: '#64748B' }}>Explore o catálogo e matricule-se em um curso.</p>
          <button
            onClick={() => onNavigate('catalog')}
            className="btn-cyber px-6 py-2.5 rounded-xl text-sm"
          >
            Ver treinamentos
          </button>
        </div>
      )}
    </div>
  );
}
