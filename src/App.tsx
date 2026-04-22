import { useState } from 'react';
import { AuthPage } from './components/AuthPage';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CourseCatalog } from './components/CourseCatalog';
import { CourseDetail } from './components/CourseDetail';
import { LessonViewer } from './components/LessonViewer';
import { AdminUsers } from './components/admin/AdminUsers';
import { AdminCourses } from './components/admin/AdminCourses';
import { AdminCourseEdit } from './components/admin/AdminCourseEdit';
import { useAuth } from './hooks/useAuth';
import { useCourses, useCourseDetail } from './hooks/useCourses';
import { useEnrollments, useLessonProgress } from './hooks/useEnrollments';
import { useIsAdmin } from './hooks/useAdmin';
import { ViewType, Lesson } from './types';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [adminEditCourseId, setAdminEditCourseId] = useState<string | null>(null);

  const { courses, loading: coursesLoading } = useCourses();
  const { course, modules, loading: courseDetailLoading } = useCourseDetail(selectedCourseId);
  const { enrollments, enroll, refetch: refetchEnrollments } = useEnrollments(user?.id ?? null);
  const currentEnrollment = enrollments.find((e) => e.course_id === selectedCourseId) ?? null;
  const { progress: lessonProgress, completeLesson } = useLessonProgress(user?.id ?? null, selectedCourseId);
  const { isAdmin } = useIsAdmin(user);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage onSuccess={() => setCurrentView('dashboard')} />;
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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar
        currentView={currentView}
        onNavigate={navigate}
        user={adaptedUser}
        onSignOut={signOut}
        isAdmin={isAdmin}
      />

      <main className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && (
          <Dashboard user={adaptedUser} courses={courses} enrollments={enrollments} onNavigate={navigate} />
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
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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

        {currentView === 'admin-users' && isAdmin && <AdminUsers />}
        {currentView === 'admin-courses' && isAdmin && <AdminCourses onNavigate={navigate} />}
        {currentView === 'admin-course-edit' && isAdmin && adminEditCourseId && (
          <AdminCourseEdit courseId={adminEditCourseId} onNavigate={navigate} />
        )}
      </main>
    </div>
  );
}
