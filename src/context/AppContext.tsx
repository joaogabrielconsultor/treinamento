import { createContext, useContext, useState, useEffect } from 'react';

interface AppContextType {
  logoUrl: string;
  setLogoUrl: (url: string) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

const AppContext = createContext<AppContextType>({
  logoUrl: '',
  setLogoUrl: () => {},
  darkMode: false,
  toggleDarkMode: () => {},
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrlState] = useState(() => localStorage.getItem('logoUrl') ?? '');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const setLogoUrl = (url: string) => {
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
