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
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner-cyber" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Gestão de Treinamentos</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            {courses.length} curso{courses.length !== 1 ? 's' : ''} cadastrado{courses.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm btn-cyber font-semibold"
        >
          <Plus className="w-4 h-4" />
          Novo Curso
        </button>
      </div>

      <div className="grid gap-4">
        {courses.map((course) => (
          <div
            key={course.id}
            className="rounded-2xl p-5 flex items-center gap-5 overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)' }}>
              {course.thumbnail_url ? (
                <img src={course.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6" style={{ color: 'var(--text-3)' }} />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold truncate" style={{ color: 'var(--text-1)' }}>{course.title}</h3>
                <span
                  className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                  style={course.published
                    ? { background: 'rgba(34,197,94,0.12)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.2)' }
                    : { background: 'var(--surface-subtle)', color: 'var(--text-3)', border: '1px solid var(--border-1)' }
                  }
                >
                  {course.published ? 'Publicado' : 'Rascunho'}
                </span>
              </div>
              <p className="text-sm truncate" style={{ color: 'var(--text-3)' }}>{course.description || 'Sem descrição'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{course.category}</span>
                <span className="text-xs" style={{ color: 'var(--border-2)' }}>•</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${levelColors[course.level] || 'bg-gray-100 text-gray-600'}`}>
                  {course.level}
                </span>
                <span className="text-xs" style={{ color: 'var(--border-2)' }}>•</span>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>{course.duration_minutes} min</span>
                {course.instructor && (
                  <>
                    <span className="text-xs" style={{ color: 'var(--border-2)' }}>•</span>
                    <span className="text-xs truncate max-w-[160px]" style={{ color: 'var(--text-3)' }}>{course.instructor}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => togglePublished(course.id, course.published)}
                title={course.published ? 'Despublicar' : 'Publicar'}
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              >
                {course.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button
                onClick={() => onNavigate('admin-course-edit', course.id)}
                title="Editar"
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(20,184,166,0.1)'; (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(course.id, course.title)}
                title="Excluir"
                className="p-1.5 rounded-lg transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {courses.length === 0 && (
          <div className="text-center py-20 rounded-2xl" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-3)' }} />
            <p className="mb-4" style={{ color: 'var(--text-3)' }}>Nenhum curso cadastrado</p>
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm btn-cyber font-semibold"
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
