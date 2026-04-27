import { Plus, Eye, EyeOff, Pencil, Trash2, BookOpen } from 'lucide-react';
import { useAdminCourses } from '../../hooks/useAdmin';
import { ViewType } from '../../types';

interface AdminCoursesProps {
  onNavigate: (view: ViewType, courseId?: string) => void;
}

const levelColors: Record<string, string> = {
  Iniciante: 'bg-emerald-100 text-emerald-700',
  Intermediário: 'bg-amber-100 text-amber-700',
  Avançado: 'bg-red-100 text-red-700',
};

export function AdminCourses({ onNavigate }: AdminCoursesProps) {
  const { courses, loading, createCourse, deleteCourse, togglePublished } = useAdminCourses();

  const handleCreate = async () => {
    const id = await createCourse();
    if (id) onNavigate('admin-course-edit', id);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Excluir o curso "${title}"? Esta ação não pode ser desfeita.`)) return;
    await deleteCourse(id);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestão de Treinamentos</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            {courses.length} curso{courses.length !== 1 ? 's' : ''} cadastrado{courses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-hover transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      <div className="grid gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border shadow-sm p-5 flex items-center gap-5"
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-dk-surface">
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-gray-300 dark:text-gray-600" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 dark:text-white truncate">{course.title}</h3>
                <span
                  className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                    course.published
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 dark:bg-dk-surface text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {course.published ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{course.description || 'Sem descrição'}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">{course.category}</span>
                <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[course.level] || 'bg-gray-100 text-gray-600'}`}>
                  {course.level}
                </span>
                <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{course.duration_minutes} min</span>
                {course.instructor && (
                  <>
                    <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{course.instructor}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => togglePublished(course.id, course.published)}
                title={course.published ? 'Despublicar' : 'Publicar'}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {course.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onNavigate('admin-course-edit', course.id)}
                title="Editar"
                className="p-2 rounded-lg text-gray-400 hover:bg-brand-light dark:hover:bg-brand/20 hover:text-brand transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(course.id, course.title)}
                title="Excluir"
                className="p-2 rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {courses.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-dk-card rounded-2xl border border-gray-100 dark:border-dk-border">
            <BookOpen className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">Nenhum curso cadastrado</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-white text-sm font-medium rounded-xl hover:bg-brand-hover transition-colors"
            >
              <Plus className="w-4 h-4" />
              Criar primeiro curso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
