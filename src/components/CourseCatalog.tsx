import { useState } from 'react';
import { Search, Clock, BookOpen, Filter } from 'lucide-react';
import { Course, Enrollment, ViewType } from '../types';

interface CourseCatalogProps {
  courses: Course[];
  enrollments: Enrollment[];
  loading: boolean;
  onNavigate: (view: ViewType, courseId?: string) => void;
}

const levelColors: Record<string, string> = {
  Iniciante: 'bg-emerald-100 text-emerald-700',
  Intermediário: 'bg-amber-100 text-amber-700',
  Avançado: 'bg-red-100 text-red-700',
};

const categoryColors: Record<string, string> = {
  Liderança:    'bg-teal-100 text-teal-700',
  'Soft Skills':'bg-sky-100 text-sky-700',
  Tecnologia:   'bg-violet-100 text-violet-700',
  Segurança:    'bg-orange-100 text-orange-700',
  Gestão:       'bg-indigo-100 text-indigo-700',
  Vendas:       'bg-rose-100 text-rose-700',
};

export function CourseCatalog({ courses, enrollments, loading, onNavigate }: CourseCatalogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedLevel, setSelectedLevel] = useState('Todos');

  const categories = ['Todos', ...Array.from(new Set(courses.map((c) => c.category)))];
  const levels = ['Todos', 'Iniciante', 'Intermediário', 'Avançado'];

  const filtered = courses.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()) ||
      c.instructor.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'Todos' || c.category === selectedCategory;
    const matchLevel = selectedLevel === 'Todos' || c.level === selectedLevel;
    return matchSearch && matchCategory && matchLevel;
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Catálogo de Cursos</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{courses.length} treinamentos disponíveis</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cursos, instrutores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-dk-border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand bg-white dark:bg-dk-card"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-gray-200 dark:border-dk-border rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand bg-white dark:bg-dk-card"
          >
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="border border-gray-200 dark:border-dk-border rounded-xl px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-brand bg-white dark:bg-dk-card"
          >
            {levels.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-dk-card rounded-2xl overflow-hidden border border-gray-100 dark:border-dk-border animate-pulse">
              <div className="h-44 bg-gray-200 dark:bg-dk-surface" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum curso encontrado.</p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory('Todos'); setSelectedLevel('Todos'); }}
            className="mt-3 text-brand text-sm hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course) => {
            const enrollment = enrollments.find((e) => e.course_id === course.id);
            return (
              <div
                key={course.id}
                onClick={() => onNavigate('course', course.id)}
                className="bg-white dark:bg-dk-card border border-gray-100 dark:border-dk-border rounded-2xl overflow-hidden cursor-pointer hover:shadow-lg hover:border-brand-muted dark:hover:border-brand transition-all duration-200 group flex flex-col"
              >
                <div className="relative overflow-hidden h-44">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[course.category] || 'bg-gray-100 text-gray-700'}`}>
                      {course.category}
                    </span>
                  </div>
                  {enrollment?.completed && (
                    <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                      Concluído
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${levelColors[course.level] || 'bg-gray-100 text-gray-600'}`}>
                      {course.level}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-brand transition-colors leading-snug mb-1 flex-1">
                    {course.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-3">{course.description}</p>

                  <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-dk-border pt-3 mt-auto">
                    <span>{course.instructor}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {Math.floor(course.duration_minutes / 60)}h{course.duration_minutes % 60 > 0 ? ` ${course.duration_minutes % 60}min` : ''}
                    </span>
                  </div>

                  {enrollment && !enrollment.completed && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                        <span>Progresso</span>
                        <span>{enrollment.progress_percent}%</span>
                      </div>
                      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-brand h-1.5 rounded-full"
                          style={{ width: `${enrollment.progress_percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
