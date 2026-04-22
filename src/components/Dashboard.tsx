import { Trophy, BookOpen, Clock, Target, ArrowRight, CheckCircle2, Play } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Course, Enrollment } from '../types';
import { ViewType } from '../types';

interface DashboardProps {
  user: User;
  courses: Course[];
  enrollments: Enrollment[];
  onNavigate: (view: ViewType, courseId?: string) => void;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
      <div className={`inline-flex p-2.5 rounded-xl mb-3 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-gray-500 text-sm mt-0.5">{label}</p>
    </div>
  );
}

export function Dashboard({ user, courses, enrollments, onNavigate }: DashboardProps) {
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário';
  const firstName = displayName.split(' ')[0];

  const enrolled = enrollments.length;
  const completed = enrollments.filter((e) => e.completed).length;
  const inProgress = enrollments.filter((e) => !e.completed && e.progress_percent > 0).length;
  const totalMinutes = enrollments.reduce((acc, e) => {
    const course = courses.find((c) => c.id === e.course_id);
    if (!course) return acc;
    return acc + Math.round((course.duration_minutes * e.progress_percent) / 100);
  }, 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const enrolledCourses = enrollments
    .filter((e) => !e.completed)
    .map((e) => ({
      enrollment: e,
      course: courses.find((c) => c.id === e.course_id),
    }))
    .filter((item) => item.course)
    .slice(0, 3);

  const suggestedCourses = courses
    .filter((c) => !enrollments.find((e) => e.course_id === c.id))
    .slice(0, 3);

  const levelColors: Record<string, string> = {
    Iniciante: 'bg-emerald-100 text-emerald-700',
    Intermediário: 'bg-amber-100 text-amber-700',
    Avançado: 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, {firstName}!
        </h1>
        <p className="text-gray-500 mt-1">Continue aprendendo e evolua sua carreira.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={BookOpen} label="Matriculado" value={enrolled} color="bg-blue-500" />
        <StatCard icon={CheckCircle2} label="Concluídos" value={completed} color="bg-emerald-500" />
        <StatCard icon={Target} label="Em andamento" value={inProgress} color="bg-amber-500" />
        <StatCard
          icon={Clock}
          label="Horas estudadas"
          value={`${hours}h${mins > 0 ? ` ${mins}m` : ''}`}
          color="bg-slate-600"
        />
      </div>

      {enrolledCourses.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Continuar aprendendo</h2>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid gap-4">
            {enrolledCourses.map(({ enrollment, course }) => {
              if (!course) return null;
              return (
                <div
                  key={enrollment.id}
                  onClick={() => onNavigate('course', course.id)}
                  className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-20 h-14 object-cover rounded-xl flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-gray-500 text-sm mt-0.5">{course.instructor}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${enrollment.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 flex-shrink-0">
                        {enrollment.progress_percent}%
                      </span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-50 group-hover:bg-blue-600 flex items-center justify-center transition-colors">
                    <Play className="w-4 h-4 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {suggestedCourses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {enrolled === 0 ? 'Comece a aprender' : 'Sugestões para você'}
            </h2>
            <button
              onClick={() => onNavigate('catalog')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {suggestedCourses.map((course) => (
              <div
                key={course.id}
                onClick={() => onNavigate('course', course.id)}
                className="bg-white border border-gray-100 rounded-2xl overflow-hidden cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <img
                  src={course.thumbnail_url}
                  alt={course.title}
                  className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="p-4">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelColors[course.level] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {course.level}
                  </span>
                  <h3 className="font-semibold text-gray-900 mt-2 group-hover:text-blue-600 transition-colors line-clamp-2 text-sm leading-snug">
                    {course.title}
                  </h3>
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60}min</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {enrolled === 0 && suggestedCourses.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Comece sua jornada!</h3>
          <p className="text-gray-500 mb-4">Explore nosso catálogo e matricule-se em um curso.</p>
          <button
            onClick={() => onNavigate('catalog')}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-medium transition-colors"
          >
            Ver cursos
          </button>
        </div>
      )}
    </div>
  );
}
