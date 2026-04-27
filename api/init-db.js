const bcrypt = require('bcryptjs');
const pool = require('./db');

async function initDb() {
  const client = await pool.connect();
  try {
    await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name text,
        email text UNIQUE NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        title text NOT NULL,
        description text NOT NULL DEFAULT '',
        category text NOT NULL DEFAULT 'Geral',
        thumbnail_url text NOT NULL DEFAULT '',
        duration_minutes integer NOT NULL DEFAULT 0,
        level text NOT NULL DEFAULT 'Iniciante',
        instructor text NOT NULL DEFAULT '',
        published boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title text NOT NULL,
        order_index integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lessons (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        title text NOT NULL,
        content text NOT NULL DEFAULT '',
        lesson_type text NOT NULL DEFAULT 'video' CHECK (lesson_type IN ('video','text','quiz')),
        video_url text,
        duration_minutes integer NOT NULL DEFAULT 0,
        order_index integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url text`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        progress_percent integer NOT NULL DEFAULT 0,
        completed boolean NOT NULL DEFAULT false,
        enrolled_at timestamptz NOT NULL DEFAULT now(),
        completed_at timestamptz,
        UNIQUE(user_id, course_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS lesson_progress (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
        completed boolean NOT NULL DEFAULT false,
        completed_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, lesson_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lesson_id uuid NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
        score integer NOT NULL DEFAULT 0,
        total integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, lesson_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS login_bancos (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        nome text NOT NULL,
        login text NOT NULL,
        senha text NOT NULL,
        url text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        key text PRIMARY KEY,
        value text NOT NULL DEFAULT '',
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Master admin — único que pode gerenciar funções, não pode ser rebaixado
    const MASTER_EMAIL = 'adm@rozesstartflow.com';
    const MASTER_NAME  = 'Administrador Master';
    const MASTER_PASS  = 'Rozes10**@';

    const { rows: masterRows } = await client.query('SELECT id FROM users WHERE email = $1', [MASTER_EMAIL]);
    if (masterRows.length === 0) {
      const hash = await bcrypt.hash(MASTER_PASS, 10);
      await client.query(
        'INSERT INTO users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4)',
        [MASTER_NAME, MASTER_EMAIL, hash, 'admin']
      );
      console.log('Master admin criado:', MASTER_EMAIL);
    } else {
      // Garante que a senha e o papel estejam corretos mesmo após reinicialização
      const hash = await bcrypt.hash(MASTER_PASS, 10);
      await client.query(
        'UPDATE users SET password_hash = $1, role = $2, full_name = $3 WHERE email = $4',
        [hash, 'admin', MASTER_NAME, MASTER_EMAIL]
      );
    }

    console.log('Banco de dados pronto.');
  } catch (err) {
    console.error('Erro na inicialização do banco:', err.message);
  } finally {
    client.release();
  }
}

module.exports = initDb;
