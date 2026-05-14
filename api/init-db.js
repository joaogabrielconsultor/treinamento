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
        created_at timestamptz NOT NULL DEFAULT now(),
        archived_at timestamptz
      )
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at timestamptz`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key text`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key_type text CHECK (pix_key_type IN ('cpf','cnpj','email','telefone','aleatoria'))`);

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

    // ─── LOJAS ────────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS lojas (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS loja_id uuid REFERENCES lojas(id) ON DELETE SET NULL`);

    // ─── PRODUTOS ─────────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ─── BANCOS E CONVÊNIOS ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS banks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS convenios (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // ─── PRODUÇÃO / RANKING / GAMIFICAÇÃO ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS table_categories (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        multiplier numeric(5,2) NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_tables (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        bank text NOT NULL DEFAULT '',
        category_id uuid REFERENCES table_categories(id) ON DELETE SET NULL,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES banks(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS convenio_id uuid REFERENCES convenios(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS comissao_empresa numeric(5,2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS comissao_corretor numeric(5,2) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS coeficiente numeric(10,7) NOT NULL DEFAULT 0`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS tipo_proposta text`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS parceiro text`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS expires_at date`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS convenio_descricao text`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS disponivel_para text NOT NULL DEFAULT 'todos'`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS prazo_inicial integer`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS prazo_final integer`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS juros_inicial numeric(10,6)`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS juros_final numeric(10,6)`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS coef_inicial numeric(10,7)`);
    await client.query(`ALTER TABLE financial_tables ADD COLUMN IF NOT EXISTS coef_final numeric(10,7)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_ranges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        financial_table_id uuid NOT NULL REFERENCES financial_tables(id) ON DELETE CASCADE,
        tipo_proposta text NOT NULL DEFAULT '',
        expires_at date,
        convenio_descricao text NOT NULL DEFAULT '',
        parceiro text NOT NULL DEFAULT '',
        prazo_inicial integer,
        prazo_final integer,
        juros_inicial numeric(10,6),
        juros_final numeric(10,6),
        coef_inicial numeric(10,6),
        coef_final numeric(10,6),
        comissao_empresa numeric(5,2) NOT NULL DEFAULT 0,
        comissao_corretor numeric(5,2) NOT NULL DEFAULT 0,
        disponivel_para text NOT NULL DEFAULT 'todos',
        category_id uuid REFERENCES table_categories(id) ON DELETE SET NULL,
        min_value numeric(15,2) NOT NULL DEFAULT 0,
        max_value numeric(15,2),
        base_points integer NOT NULL DEFAULT 0,
        multiplier numeric(5,2),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES banks(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS convenio_id uuid REFERENCES convenios(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES products(id) ON DELETE SET NULL`);
    await client.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS coeficiente numeric(10,7) NOT NULL DEFAULT 0`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS scoring_rules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id uuid NOT NULL REFERENCES financial_tables(id) ON DELETE CASCADE,
        min_value numeric(15,2) NOT NULL DEFAULT 0,
        max_value numeric(15,2),
        points integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS proposals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        proposal_number text NOT NULL DEFAULT '',
        value numeric(15,2) NOT NULL DEFAULT 0,
        product text NOT NULL DEFAULT '',
        bank text NOT NULL DEFAULT '',
        convenio text NOT NULL DEFAULT '',
        table_id uuid REFERENCES financial_tables(id) ON DELETE SET NULL,
        client_name text NOT NULL DEFAULT '',
        client_cpf text NOT NULL DEFAULT '',
        client_phone text NOT NULL DEFAULT '',
        status text NOT NULL DEFAULT 'Digitada' CHECK (status IN ('Digitada','Em análise','Aprovada','Paga','Cancelada')),
        points_earned integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await client.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS status_comissao text CHECK (status_comissao IN ('Ag. Comissão', 'Comissão Paga'))`);
    await client.query(`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS allow_broker_edit boolean NOT NULL DEFAULT false`);
    await client.query(`ALTER TABLE proposals DROP CONSTRAINT IF EXISTS proposals_status_check`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS proposal_statuses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        color text NOT NULL DEFAULT 'blue',
        order_index integer NOT NULL DEFAULT 0,
        is_system boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const defaultStatuses = [
      { name: 'Digitada',    color: 'blue',   order: 0, is_system: true },
      { name: 'Em análise',  color: 'amber',  order: 1, is_system: true },
      { name: 'Aprovada',    color: 'purple', order: 2, is_system: true },
      { name: 'Paga',        color: 'green',  order: 3, is_system: true },
      { name: 'Cancelada',   color: 'red',    order: 4, is_system: true },
    ];
    for (const s of defaultStatuses) {
      await client.query(
        `INSERT INTO proposal_statuses (name, color, order_index, is_system) VALUES ($1,$2,$3,$4) ON CONFLICT (name) DO NOTHING`,
        [s.name, s.color, s.order, s.is_system]
      );
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS commission_payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        total_value numeric(15,2) NOT NULL DEFAULT 0,
        proposal_count integer NOT NULL DEFAULT 0,
        notes text DEFAULT '',
        paid_by uuid REFERENCES users(id),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_points (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_points integer NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS badges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        description text NOT NULL DEFAULT '',
        icon text NOT NULL DEFAULT '🏅',
        condition_type text NOT NULL DEFAULT 'proposals_paid',
        condition_value integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_badges (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
        earned_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, badge_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_streaks (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        current_streak integer NOT NULL DEFAULT 0,
        best_streak integer NOT NULL DEFAULT 0,
        last_activity_date date,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS monthly_goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        month integer NOT NULL,
        year integer NOT NULL,
        target_points integer NOT NULL DEFAULT 0,
        target_proposals integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE(user_id, month, year)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message text NOT NULL,
        read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    // Seed badges padrão
    const { rows: badgeCheck } = await client.query('SELECT id FROM badges LIMIT 1');
    if (badgeCheck.length === 0) {
      await client.query(`
        INSERT INTO badges (name, description, icon, condition_type, condition_value) VALUES
        ('Primeira Proposta', 'Cadastrou a primeira proposta paga', '🥇', 'proposals_paid', 1),
        ('5 Propostas', 'Atingiu 5 propostas pagas', '🔥', 'proposals_paid', 5),
        ('10 Propostas', 'Atingiu 10 propostas pagas', '💎', 'proposals_paid', 10),
        ('50 Propostas', 'Atingiu 50 propostas pagas', '🚀', 'proposals_paid', 50),
        ('100 Propostas', 'Atingiu 100 propostas pagas', '👑', 'proposals_paid', 100),
        ('Streak 3 dias', 'Produziu por 3 dias seguidos', '⚡', 'streak', 3),
        ('Streak 7 dias', 'Produziu por 7 dias seguidos', '🌟', 'streak', 7),
        ('500 pontos', 'Acumulou 500 pontos', '🎯', 'total_points', 500),
        ('1000 pontos', 'Acumulou 1000 pontos', '🏆', 'total_points', 1000)
      `);
    }

    // Seed categorias padrão
    const { rows: catCheck } = await client.query('SELECT id FROM table_categories LIMIT 1');
    if (catCheck.length === 0) {
      await client.query(`
        INSERT INTO table_categories (name, multiplier) VALUES
        ('Alta comissão', 2.0),
        ('Média comissão', 1.0),
        ('Baixa comissão', 0.5),
        ('Premium', 3.0),
        ('Estratégica', 1.5)
      `);
    }

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
