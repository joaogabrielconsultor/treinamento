import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Enrollment, LessonProgress } from '../types';

export function useEnrollments(userId: string | null) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEnrollments = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    api.get<Enrollment[]>('/enrollments', true)
      .then(setEnrollments)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  const enroll = async (courseId: string) => {
    if (!userId) return;
    await api.post('/enrollments', { course_id: courseId }, true);
    fetchEnrollments();
  };

  return { enrollments, loading, enroll, refetch: fetchEnrollments };
}

export function useLessonProgress(userId: string | null, courseId: string | null) {
  const [progress, setProgress] = useState<LessonProgress[]>([]);

  const fetchProgress = useCallback(async () => {
    if (!userId || !courseId) return;
    api.get<LessonProgress[]>(`/progress/${courseId}`, true).then(setProgress);
  }, [userId, courseId]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const completeLesson = async (
    lessonId: string,
    enrollmentId: string,
    totalLessons: number,
    completedCount: number
  ) => {
    if (!userId) return;
    await api.post('/progress', { lesson_id: lessonId, enrollment_id: enrollmentId, total_lessons: totalLessons, completed_count: completedCount }, true);
    fetchProgress();
  };

  return { progress, completeLesson, refetch: fetchProgress };
}
