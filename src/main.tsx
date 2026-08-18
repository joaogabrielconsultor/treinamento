import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Paywall global — se QUALQUER chamada à API voltar 402 (assinatura suspensa),
// desloga e recarrega. Cobre todas as telas (cada uma tem seu próprio fetch).
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const res = await _origFetch(...args);
  if (res.status === 402 && localStorage.getItem('token')) {
    try {
      const data = await res.clone().json();
      if (data?.paywall) {
        localStorage.removeItem('token');
        if (!sessionStorage.getItem('paywall_kick')) {
          sessionStorage.setItem('paywall_kick', '1');
          window.location.reload();
        }
      }
    } catch { /* resposta não-JSON, ignora */ }
  }
  return res;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
