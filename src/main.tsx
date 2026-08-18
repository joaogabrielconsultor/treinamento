import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { markSuspended } from './lib/paywall';

// Paywall global — se QUALQUER chamada à API voltar 402 (assinatura suspensa),
// marca o estado suspenso. O app mantém o usuário logado (sidebar navegável) e
// mostra a tela de renovação no lugar do conteúdo. Cobre todas as telas.
const _origFetch = window.fetch.bind(window);
window.fetch = async (...args: Parameters<typeof fetch>) => {
  const res = await _origFetch(...args);
  if (res.status === 402 && localStorage.getItem('token')) {
    try {
      const data = await res.clone().json();
      if (data?.paywall) markSuspended(data.status);
    } catch { /* resposta não-JSON, ignora */ }
  }
  return res;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
