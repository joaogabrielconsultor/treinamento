import { createContext, useContext, useState, useEffect } from 'react';

const DEFAULT_COMPANY = 'GS CRED';

interface AppContextType {
  logoUrl: string;
  setLogoUrl: (url: string) => Promise<void>;
  companyName: string;
  setCompanyName: (name: string) => Promise<void>;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType>({
  logoUrl: '',
  setLogoUrl: async () => {},
  companyName: DEFAULT_COMPANY,
  setCompanyName: async () => {},
  darkMode: false,
  toggleDarkMode: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const DEFAULT_LOGO = '/logo.png';
  // localStorage é apenas cache local para evitar flash no carregamento
  const [logoUrl, setLogoUrlState] = useState(() => localStorage.getItem('logoUrl') || DEFAULT_LOGO);
  const [companyName, setCompanyNameState] = useState(() => localStorage.getItem('companyName') || DEFAULT_COMPANY);
  // Tema dark-only — a identidade GS CRED é preto + volt
  const darkMode = true;

  // Busca configurações (logo + nome da empresa) do banco ao iniciar
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const url: string = data.logo_url || DEFAULT_LOGO;
        setLogoUrlState(url);
        localStorage.setItem('logoUrl', url);
        const name: string = data.company_name || DEFAULT_COMPANY;
        setCompanyNameState(name);
        localStorage.setItem('companyName', name);
      })
      .catch(() => {/* usa cache do localStorage como fallback */});
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  async function putSettings(body: Record<string, string>) {
    const token = localStorage.getItem('token');
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
  }

  const setLogoUrl = async (url: string) => {
    await putSettings({ logo_url: url });
    setLogoUrlState(url);
    localStorage.setItem('logoUrl', url);
  };

  const setCompanyName = async (name: string) => {
    const clean = name.trim() || DEFAULT_COMPANY;
    await putSettings({ company_name: clean });
    setCompanyNameState(clean);
    localStorage.setItem('companyName', clean);
  };

  // Tema fixo em dark — mantido para compatibilidade com o contexto
  const toggleDarkMode = () => {};

  return (
    <AppContext.Provider value={{ logoUrl, setLogoUrl, companyName, setCompanyName, darkMode, toggleDarkMode }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
