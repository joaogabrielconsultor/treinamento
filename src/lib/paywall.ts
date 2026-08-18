import { useEffect, useState } from 'react';

/* Estado global de assinatura suspensa — alimentado tanto pelo /auth/me quanto
   pelo interceptor global de fetch (qualquer 402). Enquanto suspenso, o app
   mantém o usuário "dentro" (sidebar navegável) mas troca o conteúdo pela tela
   de renovação. */

let _suspended = false;
let _status = '';
const _listeners = new Set<() => void>();

export function getPaywall() {
  return { suspended: _suspended, status: _status };
}

export function markSuspended(status?: string) {
  const s = status || 'suspenso';
  if (!_suspended || _status !== s) {
    _suspended = true;
    _status = s;
    _listeners.forEach((l) => l());
  }
}

export function clearSuspended() {
  if (_suspended) {
    _suspended = false;
    _status = '';
    _listeners.forEach((l) => l());
  }
}

export function subscribePaywall(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

export function usePaywall() {
  const [state, setState] = useState(getPaywall);
  useEffect(() => subscribePaywall(() => setState(getPaywall())), []);
  return state;
}
