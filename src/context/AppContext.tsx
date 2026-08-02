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
  const DEFAULT_LOGO = '/gs-logo.svg';
  // localStorage é apenas cache local para evitar flash no carregamento
  const [logoUrl, setLogoUrlState] = useState(() => {
    const cached = localStorage.getItem('logoUrl');
    return !cached || cached === '/logo.png' ? DEFAULT_LOGO : cached;
  });
  // Tema dark-only — a identidade GS CRED é preto + volt
  const darkMode = true;

  // Busca a logo do banco de dados ao iniciar — garante que todos os usuários vejam
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const url: string = data.logo_url && data.logo_url !== '/logo.png' ? data.logo_url : DEFAULT_LOGO;
        setLogoUrlState(url);
        localStorage.setItem('logoUrl', url);
      })
      .catch(() => {/* usa cache do localStorage como fallback */});
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

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

  // Tema fixo em dark — mantido para compatibilidade com o contexto
  const toggleDarkMode = () => {};

  return (
    <AppContext.Provider value={{ logoUrl, setLogoUrl, darkMode, toggleDarkMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
