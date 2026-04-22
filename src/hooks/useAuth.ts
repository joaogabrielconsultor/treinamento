import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get<AuthUser>('/auth/me', true)
      .then(setUser)
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await api.post<{ user: AuthUser; token: string }>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const signUp = async (email: string, password: string, full_name: string) => {
    const data = await api.post<{ user: AuthUser; token: string }>('/auth/register', { email, password, full_name });
    localStorage.setItem('token', data.token);
    setUser(data.user);
  };

  const signOut = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return { user, loading, signIn, signUp, signOut };
}
