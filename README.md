# EduTrain — Plataforma de Treinamentos

Sistema LMS (Learning Management System) para gestão de treinamentos corporativos.

## Stack

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS
- **Backend:** Supabase (Auth + Postgres + RLS)
- **Ícones:** Lucide React

## Como rodar localmente

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

As credenciais estão no Supabase Dashboard → Settings → API.

### 3. Rodar as migrations

No Supabase Dashboard → SQL Editor, execute os arquivos em `supabase/migrations/` em ordem.

### 4. Iniciar o servidor

```bash
npm run dev
```

Acesse: `http://localhost:5173`

## Funcionalidades

- Autenticação (login/cadastro)
- Dashboard com progresso do usuário
- Catálogo de cursos
- Visualizador de aulas (vídeo, texto, quiz)
- Painel Admin: gestão de usuários e treinamentos

## Como ativar um administrador

No Supabase Dashboard → Table Editor → `profiles`, altere o campo `role` de `user` para `admin`.
