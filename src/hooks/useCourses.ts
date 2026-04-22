import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Course, Module } from '../types';

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Course[]>('/courses')
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  return { courses, loading };
}

export function useCourseDetail(courseId: string | null) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    setLoading(true);
    Promise.all([
      api.get<Course>(`/courses/${courseId}`),
      api.get<Module[]>(`/courses/${courseId}/modules`),
    ]).then(([c, m]) => {
      setCourse(c);
      setModules(m);
    }).finally(() => setLoading(false));
  }, [courseId]);

  return { course, modules, loading };
}
