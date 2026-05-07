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

const typeIcon = { video: Video, text: FileText, quiz: HelpCircle };
const typeLabel = { video: 'Vídeo', text: 'Texto', quiz: 'Avaliação' };
const typeBadge: Record<string, string> = { video: 'badge-teal', text: 'badge-neutral', quiz: 'badge-amber' };

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
    <div
      className="rounded-2xl overflow-hidden mb-6 relative group"
      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video object-contain"
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload nofullscreen noremoteplayback"
        disablePictureInPicture
      />

      <div
        className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      >
        {/* Progress bar */}
        <div className="progress-track h-1.5 mb-3 overflow-hidden">
          <div className="progress-bar h-1.5 transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={rewind15}
            title="Voltar 15 segundos"
            className="flex items-center gap-1 transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
          >
            <RotateCcw className="w-4 h-4" />
            <span className="text-xs font-bold num">15</span>
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{ background: 'linear-gradient(135deg, #14B8A6, #06B6D4)' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(20,184,166,0.5)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
          >
            {playing
              ? <Pause className="w-3.5 h-3.5 text-white" />
              : <Play className="w-3.5 h-3.5 text-white ml-0.5" />
            }
          </button>

          <div className="flex items-center gap-2 ml-1">
            <button
              onClick={toggleMute}
              className="transition-colors"
              style={{ color: 'rgba(255,255,255,0.7)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#14B8A6'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; }}
            >
              {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={changeVolume}
              className="w-16 h-1 cursor-pointer"
              style={{ accentColor: '#14B8A6' }}
            />
          </div>

          <span className="text-xs ml-auto num" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
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
    <div
      className="rounded-2xl overflow-hidden mb-6"
      style={{ background: '#000', border: '1px solid rgba(255,255,255,0.06)' }}
    >
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
    return <p className="text-sm" style={{ color: '#475569' }}>Prova sem questões configuradas.</p>;
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return <p className="text-sm" style={{ color: '#475569' }}>Prova sem questões configuradas.</p>;
  }

  const score = submitted ? questions.filter((q, i) => answers[i] === q.correct).length : 0;
  const pct = questions.length > 0 ? score / questions.length : 0;

  return (
    <div className="space-y-5">
      {questions.map((q, qi) => (
        <div
          key={qi}
          className="rounded-xl p-4"
          style={{ background: 'rgba(26,32,53,0.6)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="font-semibold text-sm mb-3" style={{ color: '#E2E8F0' }}>
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const isCorrect = submitted && oi === q.correct;
              const isWrong = submitted && selected && oi !== q.correct;

              let bg = 'rgba(11,16,32,0.7)';
              let border = 'rgba(255,255,255,0.07)';
              let color = '#94A3B8';

              if (isCorrect) { bg = 'rgba(34,197,94,0.1)'; border = 'rgba(34,197,94,0.35)'; color = '#4ade80'; }
              else if (isWrong) { bg = 'rgba(239,68,68,0.1)'; border = 'rgba(239,68,68,0.35)'; color = '#f87171'; }
              else if (selected) { bg = 'rgba(20,184,166,0.1)'; border = 'rgba(20,184,166,0.4)'; color = '#2DD4BF'; }

              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all"
                  style={{ background: bg, border: `1px solid ${border}`, color }}
                  onMouseEnter={(e) => { if (!submitted && !selected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,184,166,0.3)'; }}
                  onMouseLeave={(e) => { if (!submitted && !selected) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; }}
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
          className="btn-cyber w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Enviar respostas
        </button>
      ) : (
        <div
          className="rounded-xl p-4 text-center font-semibold text-sm"
          style={{
            background: pct === 1
              ? 'rgba(34,197,94,0.08)'
              : pct >= 0.7
              ? 'rgba(20,184,166,0.08)'
              : 'rgba(239,68,68,0.08)',
            border: `1px solid ${pct === 1 ? 'rgba(34,197,94,0.25)' : pct >= 0.7 ? 'rgba(20,184,166,0.25)' : 'rgba(239,68,68,0.25)'}`,
            color: pct === 1 ? '#4ade80' : pct >= 0.7 ? '#2DD4BF' : '#f87171',
          }}
        >
          Resultado: {score}/{questions.length} acertos
          {score === questions.length && ' — Parabéns!'}
          {pct < 0.7 && ' — Tente novamente.'}
        </div>
      )}
    </div>
  );
}

export function LessonViewer({
  lesson, modules, lessonProgress, onBack, onComplete,
  onNavigateLesson, isCompleted,
}: LessonViewerProps) {
  const allLessons = modules.flatMap((m) => m.lessons || []);
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;
  const completedIds = new Set(lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id));

  const TypeIcon = typeIcon[lesson.lesson_type] || FileText;
  const contentParagraphs = lesson.content?.split('\n').filter(Boolean) ?? [];

  return (
    <div className="p-8 max-w-4xl mx-auto" style={{ color: '#E2E8F0' }}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium mb-6 transition-all"
        style={{ color: '#64748B' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao curso
      </button>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-3">
            <span className={`badge ${typeBadge[lesson.lesson_type] || 'badge-neutral'} inline-flex items-center gap-1.5`}>
              <TypeIcon className="w-3 h-3" />
              {typeLabel[lesson.lesson_type] || 'Conteúdo'}
            </span>
            <span className="flex items-center gap-1 text-xs num" style={{ color: '#475569' }}>
              <Clock className="w-3.5 h-3.5" />
              {lesson.duration_minutes} min
            </span>
          </div>

          <h1 className="text-xl font-bold mb-6" style={{ color: '#E2E8F0' }}>{lesson.title}</h1>

          {lesson.lesson_type === 'video' && (
            lesson.video_url
              ? <VideoPlayer key={lesson.id} src={lesson.video_url!} />
              : (
                <div
                  className="rounded-2xl aspect-video flex items-center justify-center mb-6"
                  style={{ background: 'rgba(11,16,32,0.85)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="text-center">
                    <Video className="w-10 h-10 mx-auto mb-2" style={{ color: '#334155' }} />
                    <p className="text-sm" style={{ color: '#334155' }}>Nenhum vídeo carregado</p>
                  </div>
                </div>
              )
          )}

          {lesson.lesson_type === 'quiz' ? (
            <QuizViewer content={lesson.content} />
          ) : (
            <div className="space-y-3">
              {contentParagraphs.map((para, i) => {
                if (para.startsWith('**') && para.endsWith('**')) {
                  return (
                    <h3 key={i} className="text-sm font-bold mt-5 mb-1" style={{ color: '#E2E8F0' }}>
                      {para.slice(2, -2)}
                    </h3>
                  );
                }
                if (para.startsWith('- ')) {
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                        style={{ background: '#14B8A6' }}
                      />
                      <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>{para.slice(2)}</p>
                    </div>
                  );
                }
                return (
                  <p key={i} className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                    {para}
                  </p>
                );
              })}
            </div>
          )}

          {/* Navigation footer */}
          <div
            className="mt-8 pt-6 flex items-center justify-between"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            {prevLesson ? (
              <button
                onClick={() => onNavigateLesson(prevLesson)}
                className="flex items-center gap-2 text-sm font-medium transition-all"
                style={{ color: '#64748B' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
              >
                <ArrowLeft className="w-4 h-4" /> Aula anterior
              </button>
            ) : <div />}

            <button
              onClick={onComplete}
              disabled={isCompleted}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${isCompleted ? '' : 'btn-cyber'}`}
              style={isCompleted ? {
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
                color: '#4ade80',
                cursor: 'default',
              } : {}}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCompleted ? 'Concluída' : 'Marcar como concluída'}
            </button>

            {nextLesson ? (
              <button
                onClick={() => onNavigateLesson(nextLesson)}
                className="flex items-center gap-2 text-sm font-medium transition-all"
                style={{ color: '#64748B' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#94A3B8'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#64748B'; }}
              >
                Próxima <ArrowRight className="w-4 h-4" />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* Sidebar — lesson list */}
        <div className="lg:col-span-1">
          <div
            className="rounded-2xl p-4 sticky top-8"
            style={{
              background: 'rgba(11,16,32,0.9)',
              border: '1px solid rgba(255,255,255,0.07)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#475569' }}>
              Conteúdo do curso
            </h3>
            <div className="space-y-3">
              {modules.map((module) => (
                <div key={module.id}>
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 mb-1"
                    style={{ color: '#334155' }}
                  >
                    {module.title}
                  </p>
                  <div className="space-y-0.5">
                    {module.lessons?.map((l) => {
                      const isActive = l.id === lesson.id;
                      const isDone = completedIds.has(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => onNavigateLesson(l)}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left text-xs transition-all"
                          style={{
                            background: isActive ? 'rgba(20,184,166,0.12)' : 'transparent',
                            border: isActive ? '1px solid rgba(20,184,166,0.25)' : '1px solid transparent',
                            color: isActive ? '#2DD4BF' : isDone ? '#475569' : '#94A3B8',
                          }}
                          onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                          onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                        >
                          {isDone ? (
                            <CheckCircle2
                              className="w-3.5 h-3.5 flex-shrink-0"
                              style={{ color: isActive ? '#2DD4BF' : '#22c55e' }}
                            />
                          ) : (
                            <div
                              className="w-3.5 h-3.5 rounded-full border-2 flex-shrink-0"
                              style={{ borderColor: isActive ? '#14B8A6' : '#334155' }}
                            />
                          )}
                          <span className="truncate">{l.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
