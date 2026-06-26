import { useState, useEffect, useRef } from 'react';
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
import { Roteiros } from './components/Roteiros';
import { AdminRoteiros } from './components/admin/AdminRoteiros';
import { AdminImportacao } from './components/admin/AdminImportacao';
import { ConsultaMargem } from './components/ConsultaMargem';
import { ProfileModal } from './components/ProfileModal';
import { useAuth } from './hooks/useAuth';
import { useIdleLogout } from './hooks/useIdleLogout';
import { useCourses, useCourseDetail } from './hooks/useCourses';
import { useEnrollments, useLessonProgress } from './hooks/useEnrollments';
import { useIsAdmin } from './hooks/useAdmin';
import { AppProvider } from './context/AppContext';
import { ViewType, Lesson } from './types';

function AppInner() {
  const { user, loading: authLoading, signIn, signOut } = useAuth();
  useIdleLogout(signOut, !!user);

  const VALID_VIEWS = new Set<ViewType>([
    'dashboard','catalog','course','lesson','admin-users','admin-courses',
    'admin-course-edit','login-bancos','admin-personalizacao','proposals',
    'simulator','ranking','production','admin-proposals','admin-financial-tables',
    'admin-categories','admin-banks','admin-convenios','admin-products',
    'admin-reports','conta-corrente','admin-conta-corrente','admin-lojas',
    'admin-conta-empresa','admin-proposal-statuses','admin-usuarios-banco',
    'roteiros','admin-roteiros','admin-importacao','consulta-margem',
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
  const simPrefillFromSim = useRef(false);
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
          user={{ full_name: user.full_name, email: user.email, phone: user.phone, photo_url: user.photo_url }}
          onClose={() => setShowProfile(false)}
          onUpdated={(name, email, phone, photo_url) => {
            user.full_name = name;
            user.email = email;
            if (phone !== undefined) user.phone = phone;
            if (photo_url !== undefined) user.photo_url = photo_url;
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
        {currentView === 'admin-courses'         && isAdmin && <AdminCourses onNavigate={navigate} isMaster={isMaster} />}
        {currentView === 'admin-personalizacao'  && isAdmin && <AdminPersonalizacao />}
        {currentView === 'admin-course-edit'     && isAdmin && adminEditCourseId && (
          <AdminCourseEdit courseId={adminEditCourseId} onNavigate={navigate} />
        )}
        {currentView === 'admin-financial-tables' && isAdmin && <AdminTables isMaster={isMaster} />}
        {currentView === 'admin-categories'       && isAdmin && <AdminCategories isMaster={isMaster} />}
        {currentView === 'admin-banks'            && isAdmin && <AdminBanks isMaster={isMaster} />}
        {currentView === 'admin-convenios'        && isAdmin && <AdminConvenios isMaster={isMaster} />}
        {currentView === 'admin-products'         && isAdmin && <AdminProducts isMaster={isMaster} />}
        {currentView === 'admin-reports'           && isAdmin && <AdminReports />}
        {currentView === 'login-bancos' && <LoginBancos isAdmin={isAdmin} />}
        {currentView === 'proposals'  && <Proposals prefill={simPrefill} onClearPrefill={() => setSimPrefill(null)} onFormClosed={() => { if (simPrefillFromSim.current) { simPrefillFromSim.current = false; navigate('simulator'); } }} isAdmin={isAdmin} isMaster={isMaster} />}
        {/* Simulator permanece montado para preservar estado dos filtros */}
        <div style={{ display: currentView === 'simulator' ? '' : 'none' }}>
          <Simulator onSendProposal={data => { setSimPrefill(data); simPrefillFromSim.current = true; navigate('proposals'); }} isAdmin={isAdmin} corretor={user} />
        </div>
        {currentView === 'ranking'              && <Ranking userId={user.id} />}
        {currentView === 'production'           && <Production isAdmin={isAdmin} />}
        {currentView === 'conta-corrente'       && <ContaCorrente isAdmin={isAdmin || isMaster} />}
        {currentView === 'admin-conta-corrente' && isAdmin && <AdminContaCorrente isMaster={isMaster} />}
        {currentView === 'admin-lojas'           && isAdmin && <AdminLojas isMaster={isMaster} />}
        {currentView === 'admin-conta-empresa'   && isAdmin && <AdminContaEmpresa isMaster={isMaster} />}
        {currentView === 'admin-proposal-statuses' && isAdmin && <AdminProposalStatuses isMaster={isMaster} />}
        {currentView === 'admin-usuarios-banco'  && isAdmin && <AdminUsuariosBanco isMaster={isMaster} />}
        {currentView === 'roteiros'              && <Roteiros />}
        {currentView === 'admin-roteiros'        && isAdmin && <AdminRoteiros isMaster={isMaster} />}
        {currentView === 'admin-importacao'     && isAdmin && <AdminImportacao />}
        {currentView === 'consulta-margem'     && <ConsultaMargem isAdmin={isAdmin} />}
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
