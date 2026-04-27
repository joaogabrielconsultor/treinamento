import { createContext, useContext, useState, useEffect } from 'react';

interface AppContextType {
  logoUrl: string;
  setLogoUrl: (url: string) => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType>({
  logoUrl: '',
  setLogoUrl: async () => {},
  darkMode: false,
  toggleDarkMode: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  // localStorage é apenas cache local para evitar flash no carregamento
  const [logoUrl, setLogoUrlState] = useState(() => localStorage.getItem('logoUrl') ?? '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  // Busca a logo do banco de dados ao iniciar — garante que todos os usuários vejam
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const url: string = data.logo_url ?? '';
        setLogoUrlState(url);
        localStorage.setItem('logoUrl', url);
      })
      .catch(() => {/* usa cache do localStorage como fallback */});
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setLogoUrl = async (url: string) => {
    const token = localStorage.getItem('token');
    await fetch('/api/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ logo_url: url }),
    });
    setLogoUrlState(url);
    localStorage.setItem('logoUrl', url);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem('darkMode', String(next));
      return next;
    });
  };

  return (
    <AppContext.Provider value={{ logoUrl, setLogoUrl, darkMode, toggleDarkMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
