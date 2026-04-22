import { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Video, FileText, HelpCircle, Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Lesson, Module, LessonProgress, QuizQuestion } from '../types';

interface LessonViewerProps {
  lesson: Lesson;
  modules: Module[];
  lessonProgress: LessonProgress[];
  onBack: () => void;
  onComplete: () => void;
  onNavigateLesson: (lesson: Lesson) => void;
  isCompleted: boolean;
  enrollmentId: string;
  totalLessons: number;
  completedCount: number;
}

const typeIcon = {
  video: Video,
  text: FileText,
  quiz: HelpCircle,
};

const typeLabel = {
  video: 'Vídeo',
  text: 'Texto',
  quiz: 'Avaliação',
};

function getEmbedUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct'; src: string } {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}?rel=0` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { type: 'direct', src: url };
}

function DirectVideoPlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const rewind15 = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 15);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    setVolume(val);
    if (val === 0) { v.muted = true; setMuted(true); }
    else { v.muted = false; setMuted(false); }
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onMeta = () => setDuration(v.duration);
    const onTime = () => setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    const onEnded = () => setPlaying(false);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('ended', onEnded);
    return () => {
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('ended', onEnded);
    };
  }, [src]);

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  };

  const currentTime = videoRef.current?.currentTime ?? 0;

  return (
    <div className="bg-black rounded-2xl overflow-hidden mb-6 relative group">
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video object-contain"
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
      />

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Barra de progresso — somente leitura */}
        <div className="w-full h-1.5 bg-white/20 rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center gap-4">
          <button onClick={rewind15} title="Voltar 15 segundos" className="text-white hover:text-blue-400 transition-colors flex items-center gap-1">
            <RotateCcw className="w-5 h-5" />
            <span className="text-xs font-bold">15</span>
          </button>

          <button onClick={togglePlay} className="w-9 h-9 bg-white rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors">
            {playing ? <Pause className="w-4 h-4 text-black" /> : <Play className="w-4 h-4 text-black ml-0.5" />}
          </button>

          <div className="flex items-center gap-2 ml-1">
            <button onClick={toggleMute} className="text-white hover:text-blue-400 transition-colors">
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={changeVolume} className="w-20 h-1 accent-blue-500 cursor-pointer" />
          </div>

          <span className="text-white/70 text-xs ml-auto">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
      </div>

      <div className="absolute inset-0 cursor-pointer" onClick={togglePlay} style={{ bottom: '60px' }} />
    </div>
  );
}

function VideoPlayer({ src }: { src: string }) {
  const embed = getEmbedUrl(src);

  if (embed.type === 'direct') return <DirectVideoPlayer src={src} />;

  return (
    <div className="bg-black rounded-2xl overflow-hidden mb-6">
      <iframe
        src={embed.src}
        className="w-full aspect-video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function QuizViewer({ content }: { content: string }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  let questions: QuizQuestion[] = [];
  try {
    questions = JSON.parse(content);
  } catch {
    return <p className="text-gray-400 text-sm">Prova sem questões configuradas.</p>;
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return <p className="text-gray-400 text-sm">Prova sem questões configuradas.</p>;
  }

  const score = submitted
    ? questions.filter((q, i) => answers[i] === q.correct).length
    : 0;

  return (
    <div className="space-y-6">
      {questions.map((q, qi) => (
        <div key={qi} className="bg-gray-50 rounded-xl p-4">
          <p className="font-semibold text-gray-800 mb-3 text-sm">
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = submitted && oi === q.correct;
              const isWrong = submitted && selected && oi !== q.correct;
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                  className={`w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-colors ${
                    isCorrect
                      ? 'bg-green-100 border-green-400 text-green-800 font-medium'
                      : isWrong
                      ? 'bg-red-100 border-red-400 text-red-800'
                      : selected
                      ? 'bg-blue-100 border-blue-400 text-blue-800'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300'
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}
          className="w-full py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Enviar respostas
        </button>
      ) : (
        <div className={`rounded-xl p-4 text-center font-semibold ${
          score === questions.length
            ? 'bg-green-100 text-green-800'
            : score >= questions.length * 0.7
            ? 'bg-blue-100 text-blue-800'
            : 'bg-red-100 text-red-800'
        }`}>
          Resultado: {score}/{questions.length} acertos
          {score === questions.length && ' — Parabéns!'}
          {score < questions.length * 0.7 && ' — Tente novamente.'}
        </div>
      )}
    </div>
  );
}

export function LessonViewer({
  lesson,
  modules,
  lessonProgress,
  onBack,
  onComplete,
  onNavigateLesson,
  isCompleted,
}: LessonViewerProps) {
  const allLessons = modules.flatMap((m) => m.lessons || []);
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const completedIds = new Set(lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id));

  const TypeIcon = typeIcon[lesson.lesson_type] || FileText;
  const contentParagraphs = lesson.content?.split('\n').filter(Boolean) ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao curso
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1 rounded-full">
              <TypeIcon className="w-3.5 h-3.5" />
              {typeLabel[lesson.lesson_type] || 'Conteúdo'}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3.5 h-3.5" />
              {lesson.duration_minutes} min
            </span>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-6">{lesson.title}</h1>

          {lesson.lesson_type === 'video' && (
            lesson.video_url
              ? <VideoPlayer key={lesson.id} src={lesson.video_url!} />
              : (
                <div className="bg-slate-900 rounded-2xl aspect-video flex items-center justify-center mb-6">
                  <div className="text-center">
                    <Video className="w-10 h-10 text-white/40 mx-auto mb-2" />
                    <p className="text-white/40 text-sm">Nenhum vídeo carregado</p>
                  </div>
                </div>
              )
          )}

          {lesson.lesson_type === 'quiz' ? (
            <QuizViewer content={lesson.content} />
          ) : (
            <div className="prose prose-sm max-w-none">
              {contentParagraphs.map((para, i) => {
                if (para.startsWith('**') && para.endsWith('**')) {
                  return (
                    <h3 key={i} className="text-base font-bold text-gray-900 mt-5 mb-2">
                      {para.slice(2, -2)}
                    </h3>
                  );
                }
                if (para.startsWith('- ')) {
                  return (
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <p className="text-gray-600 text-sm leading-relaxed">{para.slice(2)}</p>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-gray-600 text-sm leading-relaxed mb-3">
                    {para}
                  </p>
                );
              })}
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            {prevLesson ? (
              <button
                onClick={() => onNavigateLesson(prevLesson)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Aula anterior
              </button>
            ) : (
              <div />
            )}

            <button
              onClick={onComplete}
              disabled={isCompleted}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCompleted ? 'Concluida' : 'Marcar como concluida'}
            </button>

            {nextLesson ? (
              <button
                onClick={() => onNavigateLesson(nextLesson)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
              >
                Proxima <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div />
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Conteudo do curso</h3>
          <div className="space-y-2">
            {modules.map((module) => (
              <div key={module.id}>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2 py-1">
                  {module.title}
                </p>
                {module.lessons?.map((l) => {
                  const isActive = l.id === lesson.id;
                  const isDone = completedIds.has(l.id);
                  return (
                    <button
                      key={l.id}
                      onClick={() => onNavigateLesson(l)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-sm transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-200' : 'text-emerald-500'}`} />
                      ) : (
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${isActive ? 'border-blue-200' : 'border-gray-300'}`} />
                      )}
                      <span className="truncate">{l.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
