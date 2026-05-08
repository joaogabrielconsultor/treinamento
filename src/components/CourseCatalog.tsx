import { useState } from 'react';
import { Search, Clock, BookOpen, ChevronDown } from 'lucide-react';
import { Course, Enrollment, ViewType } from '../types';

interface CourseCatalogProps {
  courses: Course[];
  enrollments: Enrollment[];
  loading: boolean;
  onNavigate: (view: ViewType, courseId?: string) => void;
}

const levelBadge: Record<string, string> = {
  Iniciante:    'badge-green',
  Intermediário:'badge-amber',
  Avançado:     'badge-red',
};

export function CourseCatalog({ courses, enrollments, loading, onNavigate }: CourseCatalogProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedLevel, setSelectedLevel] = useState('Todos');

  const categories = ['Todos', ...Array.from(new Set(courses.map((c) => c.category)))];
  const levels = ['Todos', 'Iniciante', 'Intermediário', 'Avançado'];

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.instructor.toLowerCase().includes(q);
    const matchCategory = selectedCategory === 'Todos' || c.category === selectedCategory;
    const matchLevel    = selectedLevel    === 'Todos' || c.level    === selectedLevel;
    return matchSearch && matchCategory && matchLevel;
  });

  const selectCls = 'input-cyber px-3 py-2.5 text-sm rounded-xl appearance-none cursor-pointer pr-8';

  return (
    <div className="p-8 max-w-6xl mx-auto" style={{ color: 'var(--text-1)' }}>
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-1)' }}>Catálogo de Treinamentos</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
          {courses.length} treinamentos disponíveis
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3 mb-6 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="relative flex-1">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--text-3)' }}
          />
          <input
            type="text"
            placeholder="Buscar treinamentos, instrutores..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-cyber w-full pl-10 pr-4 py-2.5 text-sm rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={selectCls}
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)', color: 'var(--text-2)' }}
            >
              {categories.map((c) => <option key={c} value={c} style={{ background: '#0B1020' }}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          </div>
          <div className="relative">
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className={selectCls}
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border-1)', color: 'var(--text-2)' }}
            >
              {levels.map((l) => <option key={l} value={l} style={{ background: '#0B1020' }}>{l}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: 'var(--text-3)' }} />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
            >
              <div className="skeleton h-44 rounded-none" />
              <div className="p-5 space-y-3">
                <div className="skeleton h-3 w-1/4" />
                <div className="skeleton h-5 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 animate-fade-up">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'var(--surface-subtle)', border: '1px solid var(--card-border)' }}
          >
            <BookOpen className="w-8 h-8" style={{ color: '#334155' }} />
          </div>
          <p className="font-medium mb-1" style={{ color: 'var(--text-3)' }}>Nenhum curso encontrado</p>
          <button
            onClick={() => { setSearch(''); setSelectedCategory('Todos'); setSelectedLevel('Todos'); }}
            className="text-sm font-medium transition-colors mt-2"
            style={{ color: '#14B8A6' }}
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course, i) => {
            const enrollment = enrollments.find((e) => e.course_id === course.id);
            return (
              <div
                key={course.id}
                onClick={() => onNavigate('course', course.id)}
                className="glass-card rounded-2xl overflow-hidden cursor-pointer group flex flex-col animate-fade-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="relative overflow-hidden h-44">
                  <img
                    src={course.thumbnail_url}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(8,13,24,0.85) 0%, transparent 55%)' }}
                  />
                  {/* Category chip */}
                  <div className="absolute top-3 left-3">
                    <span className="badge badge-teal text-[10px]">{course.category}</span>
                  </div>
                  {enrollment?.completed && (
                    <div className="absolute top-3 right-3">
                      <span className="badge badge-green text-[10px]">Concluído</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`badge ${levelBadge[course.level] || 'badge-neutral'} text-[10px]`}>
                      {course.level}
                    </span>
                  </div>

                  <h3
                    className="font-semibold text-sm leading-snug mb-1 flex-1 transition-colors"
                    style={{ color: 'var(--text-1)' }}
                  >
                    {course.title}
                  </h3>
                  <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-3)' }}>
                    {course.description}
                  </p>

                  <div
                    className="flex items-center justify-between text-xs pt-3 mt-auto"
                    style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-3)' }}
                  >
                    <span>{course.instructor}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span className="num">
                        {Math.floor(course.duration_minutes / 60)}h
                        {course.duration_minutes % 60 > 0 ? ` ${course.duration_minutes % 60}min` : ''}
                      </span>
                    </span>
                  </div>

                  {enrollment && !enrollment.completed && (
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span style={{ color: 'var(--text-3)' }}>Progresso</span>
                        <span className="num" style={{ color: 'var(--text-3)' }}>{enrollment.progress_percent}%</span>
                      </div>
                      <div className="progress-track h-1.5">
                        <div
                          className="progress-bar h-1.5"
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
