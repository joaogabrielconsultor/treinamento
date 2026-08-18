import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { markSuspended, clearSuspended } from '../lib/paywall';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin' | 'master';
  phone?: string | null;
  photo_url?: string | null;
  conta_status?: string;
  conta_cakto_email?: string | null;
  conta_primeiro_pagamento?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.get<AuthUser>('/auth/me', true)
      .then((u) => {
        setUser(u);
        if (u?.conta_status && !['ativo', 'teste'].includes(u.conta_status)) markSuspended(u.conta_status);
        else clearSuspended();
      })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    const data = await api.post<{ user: AuthUser; token: string }>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    // suspenso entra normal e cai na tela de renovação dentro do app
    if (data.user?.conta_status && !['ativo', 'teste'].includes(data.user.conta_status)) markSuspended(data.user.conta_status);
    else clearSuspended();
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
