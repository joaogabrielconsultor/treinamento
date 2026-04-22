import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { Course, Module, Lesson } from '../types';

interface AdminUser {
  id: string;
  full_name: string | null;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  enrollment_count: number;
}

export function useIsAdmin(user: { role: 'user' | 'admin' } | null) {
  return { isAdmin: user?.role === 'admin', loading: false };
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    api.get<AdminUser[]>('/admin/users', true)
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleRole = async (userId: string, currentRole: 'user' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    await api.put(`/admin/users/${userId}/role`, { role: newRole }, true);
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
  };

  const createUser = async (email: string, password: string, full_name: string, role: 'user' | 'admin') => {
    const newUser = await api.post<AdminUser>('/admin/users', { email, password, full_name, role }, true);
    setUsers((prev) => [{ ...newUser, enrollment_count: 0 }, ...prev]);
  };

  return { users, loading, toggleRole, createUser, refetch: fetchUsers };
}

export function useAdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    api.get<Course[]>('/courses/all', true)
      .then(setCourses)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const createCourse = async (): Promise<string | null> => {
    const data = await api.post<Course>('/courses', {
      title: 'Novo Curso', description: '', category: 'Geral',
      thumbnail_url: '', duration_minutes: 0, level: 'Iniciante',
      instructor: '', published: false,
    }, true);
    await fetchCourses();
    return data?.id ?? null;
  };

  const deleteCourse = async (id: string) => {
    await api.delete(`/courses/${id}`, true);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  };

  const togglePublished = async (id: string, current: boolean) => {
    await api.put(`/courses/${id}`, { published: !current }, true);
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, published: !current } : c));
  };

  return { courses, loading, createCourse, deleteCourse, togglePublished, refetch: fetchCourses };
}

export function useAdminCourseEdit(courseId: string | null) {
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    Promise.all([
      api.get<Course>(`/courses/${courseId}`),
      api.get<Module[]>(`/courses/${courseId}/modules`),
    ]).then(([c, m]) => {
      setCourse(c);
      setModules(m.map((mod) => ({
        ...mod,
        lessons: [...(mod.lessons || [])].sort((a: Lesson, b: Lesson) => a.order_index - b.order_index),
      })));
    }).finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const saveCourse = async (updates: Partial<Course>) => {
    if (!courseId) return;
    setSaving(true);
    await api.put(`/courses/${courseId}`, updates, true);
    setCourse((prev) => prev ? { ...prev, ...updates } : prev);
    setSaving(false);
  };

  const addModule = async () => {
    if (!courseId) return;
    const data = await api.post<Module>('/modules', {
      course_id: courseId, title: 'Novo Módulo', order_index: modules.length + 1,
    }, true);
    setModules((prev) => [...prev, { ...data, lessons: [] }]);
  };

  const updateModule = async (moduleId: string, updates: Partial<Module>) => {
    await api.put(`/modules/${moduleId}`, updates, true);
    setModules((prev) => prev.map((m) => m.id === moduleId ? { ...m, ...updates } : m));
  };

  const deleteModule = async (moduleId: string) => {
    await api.delete(`/modules/${moduleId}`, true);
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
  };

  const addLesson = async (moduleId: string) => {
    const mod = modules.find((m) => m.id === moduleId);
    const data = await api.post<Lesson>('/lessons', {
      module_id: moduleId, title: 'Nova Aula', content: '',
      lesson_type: 'video', duration_minutes: 0,
      order_index: (mod?.lessons?.length || 0) + 1,
    }, true);
    setModules((prev) => prev.map((m) =>
      m.id === moduleId ? { ...m, lessons: [...(m.lessons || []), data] } : m
    ));
  };

  const updateLesson = async (moduleId: string, lessonId: string, updates: Partial<Lesson>) => {
    await api.put(`/lessons/${lessonId}`, updates, true);
    setModules((prev) => prev.map((m) =>
      m.id === moduleId
        ? { ...m, lessons: m.lessons?.map((l) => l.id === lessonId ? { ...l, ...updates } : l) }
        : m
    ));
  };

  const deleteLesson = async (moduleId: string, lessonId: string) => {
    await api.delete(`/lessons/${lessonId}`, true);
    setModules((prev) => prev.map((m) =>
      m.id === moduleId ? { ...m, lessons: m.lessons?.filter((l) => l.id !== lessonId) } : m
    ));
  };

  return { course, modules, loading, saving, saveCourse, addModule, updateModule, deleteModule, addLesson, updateLesson, deleteLesson };
}
