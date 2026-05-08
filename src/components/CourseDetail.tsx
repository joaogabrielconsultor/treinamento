import { ArrowLeft, Clock, Users, Play, CheckCircle2, ChevronDown, ChevronUp, BookOpen, Award } from 'lucide-react';
import { Course, Module, Enrollment, LessonProgress, Lesson, ViewType } from '../types';

interface CourseDetailProps {
  course: Course;
  modules: Module[];
  enrollment: Enrollment | null;
  lessonProgress: LessonProgress[];
  onNavigate: (view: ViewType, courseId?: string) => void;
  onEnroll: (courseId: string) => void;
  onSelectLesson: (lesson: Lesson) => void;
  expandedModules: Set<string>;
  onToggleModule: (moduleId: string) => void;
}

const levelBadge: Record<string, string> = {
  Iniciante:    'badge-green',
  Intermediário:'badge-amber',
  Avançado:     'badge-red',
};

const lessonTypeLabel: Record<string, string> = {
  video: 'Vídeo',
  text:  'Texto',
  quiz:  'Avaliação',
};

const lessonTypeBadge: Record<string, string> = {
  video: 'badge-teal',
  text:  'badge-neutral',
  quiz:  'badge-amber',
};

export function CourseDetail({
  course, modules, enrollment, lessonProgress,
  onNavigate, onEnroll, onSelectLesson, expandedModules, onToggleModule,
}: CourseDetailProps) {
  const completedIds = new Set(lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id));
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ color: 'var(--text-1)' }}>
      <button
        onClick={() => onNavigate('catalog')}
        className="flex items-center gap-2 text-sm font-medium mb-6 transition-all"
        style={{ color: 'var(--text-3)' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden mb-6 h-64">
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(5,8,22,0.85) 0%, rgba(5,8,22,0.2) 60%, transparent 100%)' }}
            />
            <div className="absolute bottom-4 left-4">
              <span className={`badge ${levelBadge[course.level] || 'badge-neutral'}`}>{course.level}</span>
            </div>
          </div>

          <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>{course.title}</h1>
          <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-3)' }}>{course.description}</p>

          <div className="flex flex-wrap gap-4 text-xs mb-8" style={{ color: 'var(--text-3)' }}>
            <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{course.instructor}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="num">{Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60 > 0 ? `${course.duration_minutes % 60}min` : ''}</span>
            </span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" />{totalLessons} aulas</span>
          </div>

          <h2 className="text-sm font-bold mb-3" style={{ color: 'var(--text-2)' }}>Conteúdo do curso</h2>

          <div className="space-y-2">
            {modules.map((module) => {
              const isExpanded = expandedModules.has(module.id);
              const moduleCompleted = module.lessons?.every((l) => completedIds.has(l.id));
              return (
                <div
                  key={module.id}
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid var(--card-border)' }}
                >
                  <button
                    onClick={() => onToggleModule(module.id)}
                    className="w-full flex items-center justify-between p-4 text-left transition-all"
                    style={{ background: 'rgba(26,32,53,0.6)' }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,32,53,0.9)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(26,32,53,0.6)'; }}
                  >
                    <div className="flex items-center gap-3">
                      {moduleCompleted
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                        : <div className="w-4 h-4 rounded-full border-2 flex-shrink-0" style={{ borderColor: '#334155' }} />
                      }
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{module.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{module.lessons?.length || 0} aulas</span>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                        : <ChevronDown className="w-4 h-4" style={{ color: 'var(--text-3)' }} />}
                    </div>
                  </button>

                  {isExpanded && module.lessons && (
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {module.lessons.map((lesson) => {
                        const isDone = completedIds.has(lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => enrollment && onSelectLesson(lesson)}
                            disabled={!enrollment}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-all"
                            style={{
                              background: 'var(--card-bg)',
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              opacity: enrollment ? 1 : 0.5,
                              cursor: enrollment ? 'pointer' : 'default',
                            }}
                            onMouseEnter={(e) => { if (enrollment) (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.04)'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(11,16,32,0.85)'; }}
                          >
                            {isDone
                              ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: '#22c55e' }} />
                              : <Play className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-3)' }} />
                            }
                            <span className="text-sm flex-1" style={{ color: isDone ? '#475569' : '#94A3B8' }}>
                              {lesson.title}
                            </span>
                            <span className={`badge ${lessonTypeBadge[lesson.lesson_type] || 'badge-neutral'} text-[10px]`}>
                              {lessonTypeLabel[lesson.lesson_type] || lesson.lesson_type}
                            </span>
                            <span className="text-[11px] flex-shrink-0 num" style={{ color: 'var(--text-3)' }}>
                              {lesson.duration_minutes}min
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar card */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl p-5 sticky top-8"
            style={{
              background: 'rgba(11,16,32,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            {enrollment ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-3)' }}>Progresso</span>
                    <span className="font-bold num" style={{ color: 'var(--text-1)' }}>{enrollment.progress_percent}%</span>
                  </div>
                  <div className="progress-track h-2">
                    <div className="progress-bar h-2" style={{ width: `${enrollment.progress_percent}%` }} />
                  </div>
                </div>

                {enrollment.completed ? (
                  <div className="text-center py-4">
                    <Award className="w-10 h-10 mx-auto mb-2" style={{ color: '#fbbf24' }} />
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>Curso concluído!</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Parabéns pelo seu aprendizado.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const firstIncomplete = modules
                        .flatMap((m) => m.lessons || [])
                        .find((l) => !completedIds.has(l.id));
                      if (firstIncomplete) onSelectLesson(firstIncomplete);
                    }}
                    className="btn-cyber w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {enrollment.progress_percent === 0 ? 'Iniciar curso' : 'Continuar'}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Matricule-se para acessar todo o conteúdo</p>
                </div>
                <button
                  onClick={() => onEnroll(course.id)}
                  className="btn-cyber w-full py-3 rounded-xl text-sm font-semibold"
                >
                  Matricular-se gratuitamente
                </button>
              </>
            )}

            <div className="mt-5 pt-4 space-y-2.5" style={{ borderTop: '1px solid var(--card-border)' }}>
              {[
                { icon: BookOpen, text: `${totalLessons} aulas` },
                { icon: Clock, text: `${Math.floor(course.duration_minutes / 60)}h ${course.duration_minutes % 60 > 0 ? `${course.duration_minutes % 60}min` : ''} de conteúdo` },
                { icon: Award, text: 'Certificado de conclusão' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                  <span className="num">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
