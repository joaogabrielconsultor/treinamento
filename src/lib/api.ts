const BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function headers(auth = false) {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) {
    const t = getToken();
    if (t) h['Authorization'] = `Bearer ${t}`;
  }
  return h;
}

async function req<T>(method: string, path: string, body?: unknown, auth = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(auth),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error || 'Erro na requisição') as Error & { payload?: unknown; status?: number };
    err.payload = data;
    err.status = res.status;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, auth = false) => req<T>('GET', path, undefined, auth),
  post: <T>(path: string, body: unknown, auth = false) => req<T>('POST', path, body, auth),
  put: <T>(path: string, body: unknown, auth = false) => req<T>('PUT', path, body, auth),
  delete: <T>(path: string, auth = false) => req<T>('DELETE', path, undefined, auth),
};
