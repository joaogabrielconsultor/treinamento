import { useState, useEffect } from 'react';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CourseCatalog } from './components/CourseCatalog';
import { CourseDetail } from './components/CourseDetail';
import { LessonViewer } from './components/LessonViewer';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminCourses } from './components/admin/AdminCourses';
import { AdminCourseEdit } from './components/admin/AdminCourseEdit';
import { AdminPersonalizacao } from './components/admin/AdminPersonalizacao';
import { AdminTables } from './components/admin/AdminTables';
import { AdminCategories } from './components/admin/AdminCategories';
import { AdminBanks } from './components/admin/AdminBanks';
import { AdminConvenios } from './components/admin/AdminConvenios';
import { AdminProducts } from './components/admin/AdminProducts';
import { AdminProposals } from './components/admin/AdminProposals';
import { AdminReports } from './components/admin/AdminReports';
import { LoginBancos } from './components/LoginBancos';
import { Proposals } from './components/Proposals';
import { Simulator, SimPrefill } from './components/Simulator';
import { Ranking } from './components/Ranking';
import { Production } from './components/Production';
import { ContaCorrente } from './components/ContaCorrente';
import { AdminContaCorrente } from './components/admin/AdminContaCorrente';
import { AdminLojas } from './components/admin/AdminLojas';
import { AdminContaEmpresa } from './components/admin/AdminContaEmpresa';
import { AdminProposalStatuses } from './components/admin/AdminProposalStatuses';
import { AdminUsuariosBanco } from './components/admin/AdminUsuariosBanco';
import { ProfileModal } from './components/ProfileModal';
import { useAuth } from './hooks/useAuth';
import { useCourses, useCourseDetail } from './hooks/useCourses';
import { useEnrollments, useLessonProgress } from './hooks/useEnrollments';
import { useIsAdmin } from './hooks/useAdmin';
import { AppProvider } from './context/AppContext';
import { ViewType, Lesson } from './types';

function AppInner() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();

  const VALID_VIEWS = new Set<ViewType>([
    'dashboard','catalog','course','lesson','admin-users','admin-courses',
    'admin-course-edit','login-bancos','admin-personalizacao','proposals',
    'simulator','ranking','production','admin-proposals','admin-financial-tables',
    'admin-categories','admin-banks','admin-convenios','admin-products',
    'admin-reports','conta-corrente','admin-conta-corrente','admin-lojas',
    'admin-conta-empresa','admin-proposal-statuses','admin-usuarios-banco',
  ]);

  function parseHash() {
    const raw = window.location.hash.replace('#', '');
    const [view, id] = raw.split('/');
    return { view, id };
  }

  const [currentView, setCurrentView] = useState<ViewType>(() => {
    const { view } = parseHash();
    // lesson sem estado completo → volta ao course na próxima etapa
    if (view === 'lesson') return 'course';
    return VALID_VIEWS.has(view as ViewType) ? (view as ViewType) : 'dashboard';
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(() => {
    const { view, id } = parseHash();
    return (view === 'course' || view === 'lesson') && id ? id : null;
  });

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const [adminEditCourseId, setAdminEditCourseId] = useState<string | null>(() => {
    const { view, id } = parseHash();
    return view === 'admin-course-edit' && id ? id : null;
  });

  // Mantém o hash da URL sincronizado com a view atual
  useEffect(() => {
    if (authLoading) return;
    let hash = currentView as string;
    if (currentView === 'course' && selectedCourseId) hash = `course/${selectedCourseId}`;
    else if (currentView === 'admin-course-edit' && adminEditCourseId) hash = `admin-course-edit/${adminEditCourseId}`;
    const next = `#${hash}`;
    if (window.location.hash !== next) window.location.hash = hash;
  }, [currentView, selectedCourseId, adminEditCourseId, authLoading]);

  const { courses, loading: coursesLoading } = useCourses();
  const { course, modules, loading: courseDetailLoading } = useCourseDetail(selectedCourseId);
  const { enrollments, enroll, refetch: refetchEnrollments } = useEnrollments(user?.id ?? null);
  const currentEnrollment = enrollments.find((e) => e.course_id === selectedCourseId) ?? null;
  const { progress: lessonProgress, completeLesson } = useLessonProgress(user?.id ?? null, selectedCourseId);
  const { isAdmin, isMaster } = useIsAdmin(user);
  const [simPrefill, setSimPrefill] = useState<SimPrefill | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="spinner-cyber" />
        <p className="text-xs font-medium" style={{ color: 'var(--text-3)' }}>Carregando...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage signIn={signIn} onSuccess={() => setCurrentView('dashboard')} />;
  }

  const navigate = (view: ViewType, courseId?: string) => {
    setCurrentView(view);
    if (view === 'admin-course-edit' && courseId) {
      setAdminEditCourseId(courseId);
      return;
    }
    if (courseId) {
      setSelectedCourseId(courseId);
      setExpandedModules(new Set(modules.map((m) => m.id)));
    }
    if (view === 'catalog' || view === 'dashboard') {
      setSelectedLesson(null);
    }
  };

  const handleSelectLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setCurrentView('lesson');
  };

  const handleToggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const handleCompleteLesson = async () => {
    if (!selectedLesson || !currentEnrollment) return;
    const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
    const completedIds = new Set(lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id));
    await completeLesson(selectedLesson.id, currentEnrollment.id, totalLessons, completedIds.size);
    refetchEnrollments();
  };

  const completedIds = new Set(lessonProgress.filter((lp) => lp.completed).map((lp) => lp.lesson_id));
  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  const adaptedUser = {
    ...user,
    user_metadata: { full_name: user.full_name },
  } as Parameters<typeof Sidebar>[0]['user'];

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        user={adaptedUser}
        onSignOut={signOut}
        isAdmin={isAdmin}
        onOpenProfile={() => setShowProfile(true)}
      />
      {showProfile && (
        <ProfileModal
          user={{ full_name: user.full_name, email: user.email }}
          onClose={() => setShowProfile(false)}
          onUpdated={(name, email) => {
            user.full_name = name;
            user.email = email;
            setShowProfile(false);
          }}
        />
      )}

      <main className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-base)' }}>
        {currentView === 'dashboard' && (
          <Dashboard user={adaptedUser} onNavigate={navigate} isAdmin={isAdmin} />
        )}

        {currentView === 'catalog' && (
          <CourseCatalog courses={courses} enrollments={enrollments} loading={coursesLoading} onNavigate={navigate} />
        )}

        {currentView === 'course' && course && !courseDetailLoading && (
          <CourseDetail
            course={course}
            modules={modules}
            enrollment={currentEnrollment}
            lessonProgress={lessonProgress}
            onNavigate={navigate}
            onEnroll={async (courseId) => {
              await enroll(courseId);
              setExpandedModules(new Set(modules.map((m) => m.id)));
            }}
            onSelectLesson={handleSelectLesson}
            expandedModules={expandedModules}
            onToggleModule={handleToggleModule}
          />
        )}

        {currentView === 'course' && courseDetailLoading && (
          <div className="p-8 flex items-center justify-center min-h-64">
            <div className="animate-spin w-8 h-8 border-4 border-brand border-t-transparent rounded-full" />
          </div>
        )}

        {currentView === 'lesson' && selectedLesson && (
          <LessonViewer
            lesson={selectedLesson}
            modules={modules}
            lessonProgress={lessonProgress}
            onBack={() => { setCurrentView('course'); setSelectedLesson(null); }}
            onComplete={handleCompleteLesson}
            onNavigateLesson={handleSelectLesson}
            isCompleted={completedIds.has(selectedLesson.id)}
            enrollmentId={currentEnrollment?.id ?? ''}
            totalLessons={totalLessons}
            completedCount={completedIds.size}
          />
        )}

        {currentView === 'admin-users'          && isAdmin && <AdminUsers currentUserEmail={user.email} />}
        {currentView === 'admin-courses'         && isAdmin && <AdminCourses onNavigate={navigate} />}
        {currentView === 'admin-personalizacao'  && isAdmin && <AdminPersonalizacao />}
        {currentView === 'admin-course-edit'     && isAdmin && adminEditCourseId && (
          <AdminCourseEdit courseId={adminEditCourseId} onNavigate={navigate} />
        )}
        {currentView === 'admin-financial-tables' && isAdmin && <AdminTables />}
        {currentView === 'admin-categories'       && isAdmin && <AdminCategories />}
        {currentView === 'admin-banks'            && isAdmin && <AdminBanks />}
        {currentView === 'admin-convenios'        && isAdmin && <AdminConvenios />}
        {currentView === 'admin-products'         && isAdmin && <AdminProducts />}
        {currentView === 'admin-reports'           && isAdmin && <AdminReports />}
        {currentView === 'login-bancos' && <LoginBancos isAdmin={isAdmin} />}
        {currentView === 'proposals'  && <Proposals prefill={simPrefill} onClearPrefill={() => setSimPrefill(null)} isAdmin={isAdmin} isMaster={isMaster} />}
        {currentView === 'simulator'  && (
          <Simulator onSendProposal={data => { setSimPrefill(data); navigate('proposals'); }} isAdmin={isAdmin} />
        )}
        {currentView === 'ranking'              && <Ranking userId={user.id} />}
        {currentView === 'production'           && <Production isAdmin={isAdmin} />}
        {currentView === 'conta-corrente'       && <ContaCorrente />}
        {currentView === 'admin-conta-corrente' && isAdmin && <AdminContaCorrente />}
        {currentView === 'admin-lojas'           && isAdmin && <AdminLojas />}
        {currentView === 'admin-conta-empresa'   && isAdmin && <AdminContaEmpresa />}
        {currentView === 'admin-proposal-statuses' && isAdmin && <AdminProposalStatuses />}
        {currentView === 'admin-usuarios-banco'  && isAdmin && <AdminUsuariosBanco />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
