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

const levelColors: Record<string, string> = {
  Iniciante: 'bg-emerald-100 text-emerald-700',
  Intermediário: 'bg-amber-100 text-amber-700',
  Avançado: 'bg-red-100 text-red-700',
};

const lessonTypeLabel: Record<string, string> = {
  video: 'Vídeo',
  text: 'Texto',
  quiz: 'Avaliação',
};

const lessonTypeColor: Record<string, string> = {
  video: 'bg-brand-light text-brand',
  text:  'bg-gray-100 text-gray-600',
  quiz:  'bg-amber-100 text-amber-700',
};

export function CourseDetail({
  course, modules, enrollment, lessonProgress,
  onNavigate, onEnroll, onSelectLesson, expandedModules, onToggleModule,
}: CourseDetailProps) {
  const completedIds = new Set(lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id));
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <button
        onClick={() => onNavigate('catalog')}
        className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white mb-6 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao catálogo
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="relative rounded-2xl overflow-hidden mb-6 h-64">
            <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${levelColors[course.level] || 'bg-gray-100 text-gray-700'}`}>
                {course.level}
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{course.title}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400 mb-8">
            <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{course.instructor}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60 > 0 ? `${course.duration_minutes % 60}min` : ''}
            </span>
            <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" />{totalLessons} aulas</span>
          </div>

          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Conteúdo do curso</h2>

          <div className="space-y-3">
            {modules.map((module) => {
              const isExpanded = expandedModules.has(module.id);
              const moduleCompleted = module.lessons?.every((l) => completedIds.has(l.id));
              return (
                <div key={module.id} className="border border-gray-200 dark:border-dk-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => onToggleModule(module.id)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-dk-surface hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      {moduleCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex-shrink-0" />
                      )}
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">{module.title}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400">{module.lessons?.length || 0} aulas</span>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExpanded && module.lessons && (
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {module.lessons.map((lesson) => {
                        const isDone = completedIds.has(lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => enrollment && onSelectLesson(lesson)}
                            disabled={!enrollment}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors bg-white dark:bg-dk-card ${
                              enrollment
                                ? 'hover:bg-brand-light dark:hover:bg-brand/10 cursor-pointer'
                                : 'cursor-default opacity-60'
                            }`}
                          >
                            {isDone
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              : <Play className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                            <span className={`text-sm flex-1 ${isDone ? 'text-gray-500 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                              {lesson.title}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${lessonTypeColor[lesson.lesson_type] || 'bg-gray-100 text-gray-600'}`}>
                              {lessonTypeLabel[lesson.lesson_type] || lesson.lesson_type}
                            </span>
                            <span className="text-xs text-gray-400 flex-shrink-0">{lesson.duration_minutes}min</span>
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

        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dk-card border border-gray-200 dark:border-dk-border rounded-2xl p-6 sticky top-8 shadow-sm">
            {enrollment ? (
              <>
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1.5">
                    <span>Progresso do curso</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{enrollment.progress_percent}%</span>
                  </div>
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-brand h-2 rounded-full transition-all"
                      style={{ width: `${enrollment.progress_percent}%` }}
                    />
                  </div>
                </div>

                {enrollment.completed ? (
                  <div className="text-center py-4">
                    <Award className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                    <p className="font-semibold text-gray-900 dark:text-white">Curso concluído!</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Parabéns pelo seu aprendizado.</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const firstIncomplete = modules
                        .flatMap((m) => m.lessons || [])
                        .find((l) => !completedIds.has(l.id));
                      if (firstIncomplete) onSelectLesson(firstIncomplete);
                    }}
                    className="w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    {enrollment.progress_percent === 0 ? 'Iniciar curso' : 'Continuar'}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Matricule-se para acessar todo o conteúdo</p>
                </div>
                <button
                  onClick={() => onEnroll(course.id)}
                  className="w-full bg-brand hover:bg-brand-hover text-white py-3 rounded-xl font-semibold transition-colors"
                >
                  Matricular-se gratuitamente
                </button>
              </>
            )}

            <div className="mt-5 pt-5 border-t border-gray-100 dark:border-dk-border space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <BookOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span>{totalLessons} aulas</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span>{Math.floor(course.duration_minutes / 60)}h {course.duration_minutes % 60 > 0 ? `${course.duration_minutes % 60}min` : ''} de conteúdo</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <Award className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span>Certificado de conclusão</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
