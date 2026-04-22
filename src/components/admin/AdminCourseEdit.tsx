import { useState, useRef } from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Save,
  GripVertical,
  Video,
  FileText,
  HelpCircle,
  Loader2,
  Upload,
  CheckCircle2,
} from 'lucide-react';
import { useAdminCourseEdit } from '../../hooks/useAdmin';
import { Course, Module, Lesson, ViewType, QuizQuestion } from '../../types';

interface AdminCourseEditProps {
  courseId: string;
  onNavigate: (view: ViewType) => void;
}

const lessonTypeIcon = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
};

const lessonTypeLabel = {
  video: 'Vídeo',
  text: 'Texto',
  quiz: 'Prova',
};

// ─── Quiz Editor ───────────────────────────────────────────────────────────────
function QuizEditor({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  let initial: QuizQuestion[] = [];
  try { initial = JSON.parse(content); } catch { initial = []; }
  if (!Array.isArray(initial)) initial = [];

  const [questions, setQuestions] = useState<QuizQuestion[]>(initial);

  const update = (next: QuizQuestion[]) => {
    setQuestions(next);
    onChange(JSON.stringify(next));
  };

  const addQuestion = () =>
    update([...questions, { question: '', options: ['', ''], correct: 0 }]);

  const removeQuestion = (qi: number) =>
    update(questions.filter((_, i) => i !== qi));

  const setQuestion = (qi: number, text: string) => {
    const next = questions.map((q, i) => i === qi ? { ...q, question: text } : q);
    update(next);
  };

  const setOption = (qi: number, oi: number, text: string) => {
    const next = questions.map((q, i) =>
      i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? text : o) } : q
    );
    update(next);
  };

  const addOption = (qi: number) => {
    const next = questions.map((q, i) =>
      i === qi ? { ...q, options: [...q.options, ''] } : q
    );
    update(next);
  };

  const removeOption = (qi: number, oi: number) => {
    const next = questions.map((q, i) => {
      if (i !== qi) return q;
      const opts = q.options.filter((_, j) => j !== oi);
      return { ...q, options: opts, correct: Math.min(q.correct, opts.length - 1) };
    });
    update(next);
  };

  const setCorrect = (qi: number, oi: number) => {
    const next = questions.map((q, i) => i === qi ? { ...q, correct: oi } : q);
    update(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-500">Questões da prova</label>
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar questão
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-4 border border-dashed border-gray-200 rounded-xl">
          Nenhuma questão adicionada ainda.
        </p>
      )}

      {questions.map((q, qi) => (
        <div key={qi} className="border border-gray-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 w-5">{qi + 1}.</span>
            <input
              type="text"
              value={q.question}
              onChange={(e) => setQuestion(qi, e.target.value)}
              placeholder="Texto da questão"
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button type="button" onClick={() => removeQuestion(qi)} className="text-gray-300 hover:text-red-500">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 pl-7">
            <p className="text-xs text-gray-400">Opções — marque a correta:</p>
            {q.options.map((opt, oi) => (
              <div key={oi} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCorrect(qi, oi)}
                  title="Marcar como correta"
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    q.correct === oi ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'
                  }`}
                >
                  {q.correct === oi && <CheckCircle2 className="w-3 h-3 text-white" />}
                </button>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => setOption(qi, oi, e.target.value)}
                  placeholder={`Opção ${oi + 1}`}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {q.options.length > 2 && (
                  <button type="button" onClick={() => removeOption(qi, oi)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => addOption(qi)}
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              + Adicionar opção
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Video Upload ──────────────────────────────────────────────────────────────
function VideoUpload({ lessonId, currentUrl, onUploaded }: {
  lessonId: string;
  currentUrl?: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File) => {
    setUploading(true);
    setError('');
    const form = new FormData();
    form.append('video', file);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`/api/lessons/${lessonId}/upload-video`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const text = await res.text();
      let data: { error?: string; video_url?: string };
      try { data = JSON.parse(text); } catch { throw new Error(`Erro no servidor: ${text.slice(0, 100)}`); }
      if (!res.ok) throw new Error(data.error || 'Erro no upload');
      onUploaded(data.video_url!);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-500">Vídeo do treinamento</label>

      {currentUrl && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Vídeo carregado
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-blue-200 rounded-xl text-sm text-blue-600 hover:border-blue-400 hover:bg-blue-50 disabled:opacity-50 transition-colors"
      >
        {uploading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
          : <><Upload className="w-4 h-4" /> {currentUrl ? 'Substituir vídeo' : 'Carregar vídeo'}</>
        }
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Lesson Row ────────────────────────────────────────────────────────────────
function LessonRow({
  lesson,
  moduleId,
  onUpdate,
  onDelete,
}: {
  lesson: Lesson;
  moduleId: string;
  onUpdate: (moduleId: string, lessonId: string, updates: Partial<Lesson>) => void;
  onDelete: (moduleId: string, lessonId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [local, setLocal] = useState(lesson);
  const [dirty, setDirty] = useState(false);

  const Icon = lessonTypeIcon[local.lesson_type];

  const set = (field: keyof Lesson, value: string | number) => {
    setLocal((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  };

  const save = () => {
    onUpdate(moduleId, lesson.id, {
      title: local.title,
      content: local.content,
      lesson_type: local.lesson_type,
      duration_minutes: local.duration_minutes,
      video_url: local.video_url,
    });
    setDirty(false);
  };

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <Icon className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-gray-700 truncate">{local.title}</span>
        <span className="text-xs text-gray-400">{local.duration_minutes} min</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
          {lessonTypeLabel[local.lesson_type]}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Excluir esta aula?')) onDelete(moduleId, lesson.id);
          }}
          className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>

      {expanded && (
        <div className="p-4 space-y-3 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Título da aula</label>
              <input
                type="text"
                value={local.title}
                onChange={(e) => set('title', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duração (min)</label>
              <input
                type="number"
                min={0}
                value={local.duration_minutes}
                onChange={(e) => set('duration_minutes', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select
              value={local.lesson_type}
              onChange={(e) => set('lesson_type', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="video">Vídeo</option>
              <option value="text">Texto</option>
              <option value="quiz">Prova</option>
            </select>
          </div>

          {local.lesson_type === 'video' && (
            <VideoUpload
              lessonId={lesson.id}
              currentUrl={local.video_url}
              onUploaded={(url) => {
                setLocal((p) => ({ ...p, video_url: url }));
                setDirty(true);
              }}
            />
          )}

          {local.lesson_type === 'quiz' ? (
            <QuizEditor
              content={local.content}
              onChange={(v) => set('content', v)}
            />
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {local.lesson_type === 'video' ? 'Descrição / Notas (opcional)' : 'Conteúdo'}
              </label>
              <textarea
                value={local.content}
                onChange={(e) => set('content', e.target.value)}
                rows={5}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y"
                placeholder={local.lesson_type === 'video' ? 'Notas sobre o vídeo...' : 'Conteúdo da aula (suporta Markdown)...'}
              />
            </div>
          )}

          {dirty && (
            <div className="flex justify-end">
              <button
                onClick={save}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Salvar aula
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Module Section ────────────────────────────────────────────────────────────
function ModuleSection({
  module,
  onUpdateModule,
  onDeleteModule,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
}: {
  module: Module;
  onUpdateModule: (id: string, updates: { title: string }) => void;
  onDeleteModule: (id: string) => void;
  onAddLesson: (moduleId: string) => void;
  onUpdateLesson: (moduleId: string, lessonId: string, updates: Partial<Lesson>) => void;
  onDeleteLesson: (moduleId: string, lessonId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [title, setTitle] = useState(module.title);
  const [titleDirty, setTitleDirty] = useState(false);

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 bg-white">
        <button onClick={() => setExpanded((p) => !p)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleDirty(true); }}
          onBlur={() => {
            if (titleDirty) { onUpdateModule(module.id, { title }); setTitleDirty(false); }
          }}
          className="flex-1 text-sm font-semibold text-gray-800 bg-transparent border-0 focus:outline-none focus:bg-blue-50 focus:px-2 rounded transition-all"
        />
        <span className="text-xs text-gray-400">{module.lessons?.length || 0} aula{(module.lessons?.length || 0) !== 1 ? 's' : ''}</span>
        <button
          onClick={() => { if (confirm('Excluir este módulo e todas as suas aulas?')) onDeleteModule(module.id); }}
          className="p-1 text-gray-300 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-4 space-y-2 bg-gray-50 border-t border-gray-100">
          <div className="pt-3 space-y-2">
            {module.lessons?.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                moduleId={module.id}
                onUpdate={onUpdateLesson}
                onDelete={onDeleteLesson}
              />
            ))}
          </div>
          <button
            onClick={() => onAddLesson(module.id)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-blue-600 border-2 border-dashed border-blue-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors mt-2"
          >
            <Plus className="w-4 h-4" />
            Adicionar aula
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AdminCourseEdit({ courseId, onNavigate }: AdminCourseEditProps) {
  const {
    course,
    modules,
    loading,
    saving,
    saveCourse,
    addModule,
    updateModule,
    deleteModule,
    addLesson,
    updateLesson,
    deleteLesson,
  } = useAdminCourseEdit(courseId);

  const [form, setForm] = useState<Partial<Course>>({});
  const [formDirty, setFormDirty] = useState(false);

  const field = (key: keyof Course, value: string | number | boolean) => {
    setForm((p) => ({ ...p, [key]: value }));
    setFormDirty(true);
  };

  const handleSaveCourse = async () => {
    await saveCourse(form);
    setForm({});
    setFormDirty(false);
  };

  if (loading || !course) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const current = { ...course, ...form };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => onNavigate('admin-courses')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Treinamentos
      </button>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Editar Curso</h1>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              current.published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {current.published ? 'Publicado' : 'Rascunho'}
          </span>
          {formDirty && (
            <button
              onClick={handleSaveCourse}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          )}
        </div>
      </div>

      {/* Course metadata */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Informações do Curso</h2>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
          <input
            type="text"
            value={current.title}
            onChange={(e) => field('title', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
          <textarea
            value={current.description}
            onChange={(e) => field('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
            <input
              type="text"
              value={current.category}
              onChange={(e) => field('category', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nível</label>
            <select
              value={current.level}
              onChange={(e) => field('level', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option>Iniciante</option>
              <option>Intermediário</option>
              <option>Avançado</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Instrutor</label>
            <input
              type="text"
              value={current.instructor}
              onChange={(e) => field('instructor', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Duração total (min)</label>
            <input
              type="number"
              min={0}
              value={current.duration_minutes}
              onChange={(e) => field('duration_minutes', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">URL da Thumbnail</label>
          <input
            type="text"
            value={current.thumbnail_url}
            onChange={(e) => field('thumbnail_url', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${current.published ? 'bg-blue-600' : 'bg-gray-200'}`}
              onClick={() => field('published', !current.published)}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${current.published ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </div>
            <span className="text-sm text-gray-700 font-medium">Publicar curso</span>
          </label>
        </div>
      </div>

      {/* Modules & Lessons */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-800">Módulos e Aulas</h2>
        <button
          onClick={addModule}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Novo módulo
        </button>
      </div>

      <div className="space-y-4">
        {modules.map((mod) => (
          <ModuleSection
            key={mod.id}
            module={mod}
            onUpdateModule={updateModule}
            onDeleteModule={deleteModule}
            onAddLesson={addLesson}
            onUpdateLesson={updateLesson}
            onDeleteLesson={deleteLesson}
          />
        ))}

        {modules.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-gray-400 text-sm mb-3">Nenhum módulo ainda</p>
            <button
              onClick={addModule}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Adicionar primeiro módulo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
