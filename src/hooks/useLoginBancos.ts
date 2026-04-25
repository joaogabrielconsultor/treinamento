import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { LoginBanco } from '../types';

export function useLoginBancos() {
  const [bancos, setBancos] = useState<LoginBanco[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBancos = useCallback(async () => {
    setLoading(true);
    api.get<LoginBanco[]>('/login-bancos', true)
      .then(setBancos)
      .catch(() => setBancos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchBancos(); }, [fetchBancos]);

  const createBanco = async (data: { nome: string; login: string; senha: string; url: string }) => {
    await api.post('/login-bancos', data, true);
    fetchBancos();
  };

  const updateBanco = async (id: string, data: { nome: string; login: string; senha: string; url: string }) => {
    await api.put(`/login-bancos/${id}`, data, true);
    fetchBancos();
  };

  const deleteBanco = async (id: string) => {
    await api.delete(`/login-bancos/${id}`, true);
    fetchBancos();
  };

  return { bancos, loading, createBanco, updateBanco, deleteBanco, refetch: fetchBancos };
}
