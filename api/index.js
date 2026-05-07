require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const pool = require('./db');
const initDb = require('./init-db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = process.env.JWT_SECRET;
const MASTER_ADMIN_EMAIL = 'adm@rozesstartflow.com';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Auth middleware ───────────────────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token obrigatório' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: 'Email ou senha incorretos' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Email ou senha incorretos' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }, token });
  } catch {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, full_name, role, created_at FROM users WHERE id = $1', [req.user.id]);
  res.json(rows[0] || null);
});

// ─── COURSES ───────────────────────────────────────────────────────────────────
app.get('/api/courses', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM courses WHERE published = true ORDER BY created_at DESC');
  res.json(rows);
});

app.get('/api/courses/all', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM courses ORDER BY created_at DESC');
  res.json(rows);
});

app.get('/api/courses/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM courses WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Curso não encontrado' });
  res.json(rows[0]);
});

app.post('/api/courses', auth, adminOnly, async (req, res) => {
  const { title, description, category, thumbnail_url, duration_minutes, level, instructor, published } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO courses (title, description, category, thumbnail_url, duration_minutes, level, instructor, published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',
    [title, description || '', category || 'Geral', thumbnail_url || '', duration_minutes || 0, level || 'Iniciante', instructor || '', published ?? false]
  );
  res.json(rows[0]);
});

app.put('/api/courses/:id', auth, adminOnly, async (req, res) => {
  const fields = ['title', 'description', 'category', 'thumbnail_url', 'duration_minutes', 'level', 'instructor', 'published'];
  const updates = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE courses SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
  res.json(rows[0]);
});

app.delete('/api/courses/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM courses WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── MODULES ───────────────────────────────────────────────────────────────────
app.get('/api/courses/:id/modules', async (req, res) => {
  const { rows: mods } = await pool.query(
    'SELECT * FROM modules WHERE course_id = $1 ORDER BY order_index', [req.params.id]
  );
  const { rows: lessons } = await pool.query(
    'SELECT l.* FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.course_id = $1 ORDER BY l.order_index', [req.params.id]
  );
  const result = mods.map(m => ({
    ...m,
    lessons: lessons.filter(l => l.module_id === m.id)
  }));
  res.json(result);
});

app.post('/api/modules', auth, adminOnly, async (req, res) => {
  const { course_id, title, order_index } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO modules (course_id, title, order_index) VALUES ($1,$2,$3) RETURNING *',
    [course_id, title, order_index || 0]
  );
  res.json(rows[0]);
});

app.put('/api/modules/:id', auth, adminOnly, async (req, res) => {
  const { title, order_index } = req.body;
  const { rows } = await pool.query(
    'UPDATE modules SET title = COALESCE($1, title), order_index = COALESCE($2, order_index) WHERE id = $3 RETURNING *',
    [title, order_index, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/modules/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM modules WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── LESSONS ───────────────────────────────────────────────────────────────────
app.post('/api/lessons', auth, adminOnly, async (req, res) => {
  const { module_id, title, content, lesson_type, duration_minutes, order_index } = req.body;
  const { rows } = await pool.query(
    'INSERT INTO lessons (module_id, title, content, lesson_type, duration_minutes, order_index) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [module_id, title, content || '', lesson_type || 'video', duration_minutes || 0, order_index || 0]
  );
  res.json(rows[0]);
});

app.put('/api/lessons/:id', auth, adminOnly, async (req, res) => {
  const fields = ['title', 'content', 'lesson_type', 'duration_minutes', 'order_index', 'video_url'];
  const updates = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nenhum campo' });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE lessons SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`, values);
  res.json(rows[0]);
});

app.delete('/api/lessons/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM lessons WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── VIDEO UPLOAD ──────────────────────────────────────────────────────────────
app.post('/api/lessons/:id/upload-video', auth, adminOnly, async (req, res) => {
  try {
    console.log('[UPLOAD] req.files:', req.files ? Object.keys(req.files) : 'undefined');
    console.log('[UPLOAD] content-type:', req.headers['content-type']);

    if (!req.files || !req.files.video) {
      console.log('[UPLOAD] ERRO: arquivo nao encontrado em req.files');
      return res.status(400).json({ error: 'Arquivo não recebido. Verifique o envio.' });
    }

    const file = req.files.video;
    console.log('[UPLOAD] arquivo recebido:', file.name, file.size, 'bytes');

    const ext = path.extname(file.name) || '.mp4';
    const filename = `${Date.now()}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);

    console.log('[UPLOAD] salvando em:', filepath);
    await file.mv(filepath);
    console.log('[UPLOAD] arquivo salvo com sucesso');

    const videoUrl = `/uploads/${filename}`;
    const { rows } = await pool.query(
      'UPDATE lessons SET video_url = $1 WHERE id = $2 RETURNING *',
      [videoUrl, req.params.id]
    );
    console.log('[UPLOAD] banco atualizado, video_url:', videoUrl);
    res.json(rows[0]);
  } catch (err) {
    console.error('[UPLOAD ERROR]', err.message, err.stack);
    res.status(500).json({ error: err.message || 'Erro ao fazer upload' });
  }
});

// ─── ENROLLMENTS ───────────────────────────────────────────────────────────────
app.get('/api/enrollments', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM enrollments WHERE user_id = $1', [req.user.id]);
  res.json(rows);
});

app.post('/api/enrollments', auth, async (req, res) => {
  const { course_id } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1,$2) ON CONFLICT (user_id, course_id) DO UPDATE SET enrolled_at = now() RETURNING *',
      [req.user.id, course_id]
    );
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao matricular' });
  }
});

// ─── LESSON PROGRESS ───────────────────────────────────────────────────────────
app.get('/api/progress/:course_id', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT lp.* FROM lesson_progress lp
     JOIN lessons l ON lp.lesson_id = l.id
     JOIN modules m ON l.module_id = m.id
     WHERE m.course_id = $1 AND lp.user_id = $2`,
    [req.params.course_id, req.user.id]
  );
  res.json(rows);
});

app.post('/api/progress', auth, async (req, res) => {
  const { lesson_id, enrollment_id, total_lessons, completed_count } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO lesson_progress (user_id, lesson_id, enrollment_id, completed, completed_at)
       VALUES ($1,$2,$3,true,now())
       ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed = true, completed_at = now()
       RETURNING *`,
      [req.user.id, lesson_id, enrollment_id]
    );
    const newCompleted = completed_count + 1;
    const progress = total_lessons > 0 ? Math.round((newCompleted / total_lessons) * 100) : 0;
    const isCompleted = newCompleted >= total_lessons;
    await pool.query(
      'UPDATE enrollments SET progress_percent = $1, completed = $2, completed_at = $3 WHERE id = $4',
      [progress, isCompleted, isCompleted ? new Date() : null, enrollment_id]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar progresso' });
  }
});

// ─── QUIZ RESULTS ─────────────────────────────────────────────────────────────
app.get('/api/quiz-results/:lesson_id', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM quiz_results WHERE user_id = $1 AND lesson_id = $2',
    [req.user.id, req.params.lesson_id]
  );
  res.json(rows[0] || null);
});

app.post('/api/quiz-results', auth, async (req, res) => {
  const { lesson_id, score, total } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO quiz_results (user_id, lesson_id, score, total)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, lesson_id) DO NOTHING
       RETURNING *`,
      [req.user.id, lesson_id, score, total]
    );
    res.json(rows[0] || null);
  } catch (e) {
    res.status(500).json({ error: 'Erro ao salvar resultado' });
  }
});

// ─── ADMIN: USERS ──────────────────────────────────────────────────────────────
app.get('/api/admin/users', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role, u.created_at,
            COUNT(e.id)::int AS enrollment_count
     FROM users u
     LEFT JOIN enrollments e ON e.user_id = u.id
     GROUP BY u.id ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

app.put('/api/admin/users/:id/role', auth, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Role inválido' });
  // Apenas o master admin pode alterar funções
  if (req.user.email !== MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Apenas o administrador master pode alterar funções de usuários' });
  }
  // A função do master admin não pode ser alterada
  const { rows: target } = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
  if (!target[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (target[0].email === MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'A função do administrador master não pode ser alterada' });
  }
  const { rows } = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, full_name, role', [role, req.params.id]);
  res.json(rows[0]);
});

// ─── ADMIN: CREATE USER ────────────────────────────────────────────────────────
app.post('/api/admin/users', auth, adminOnly, async (req, res) => {
  const { email, password, full_name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role) VALUES ($1, $2, $3, $4) RETURNING id, email, full_name, role, created_at',
      [email, hash, full_name || null, role || 'user']
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// ─── ADMIN: DELETE USER ────────────────────────────────────────────────────────
app.delete('/api/admin/users/:id', auth, adminOnly, async (req, res) => {
  if (req.user.email !== MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Apenas o administrador master pode excluir usuários' });
  }
  const { rows: target } = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
  if (!target[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (target[0].email === MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'O administrador master não pode ser excluído' });
  }
  await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ─── ADMIN: CHANGE USER PASSWORD ───────────────────────────────────────────────
app.put('/api/admin/users/:id/password', auth, adminOnly, async (req, res) => {
  if (req.user.email !== MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Apenas o administrador master pode alterar senhas' });
  }
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
  const { rows: target } = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
  if (!target[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  const hash = await bcrypt.hash(password, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.params.id]);
  res.json({ success: true });
});

// ─── APP SETTINGS ─────────────────────────────────────────────────────────────
app.get('/api/settings', async (req, res) => {
  const { rows } = await pool.query("SELECT key, value FROM app_settings");
  const settings = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json({ logo_url: settings.logo_url ?? '' });
});

app.put('/api/settings', auth, adminOnly, async (req, res) => {
  const { logo_url } = req.body;
  await pool.query(
    `INSERT INTO app_settings (key, value, updated_at) VALUES ('logo_url', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [logo_url ?? '']
  );
  res.json({ logo_url: logo_url ?? '' });
});

// ─── LOGIN BANCOS ──────────────────────────────────────────────────────────────
app.get('/api/login-bancos', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM login_bancos ORDER BY nome ASC');
  res.json(rows);
});

app.post('/api/login-bancos', auth, adminOnly, async (req, res) => {
  const { nome, login, senha, url } = req.body;
  if (!nome || !login || !senha || !url) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  const { rows } = await pool.query(
    'INSERT INTO login_bancos (nome, login, senha, url) VALUES ($1,$2,$3,$4) RETURNING *',
    [nome, login, senha, url]
  );
  res.json(rows[0]);
});

app.put('/api/login-bancos/:id', auth, adminOnly, async (req, res) => {
  const { nome, login, senha, url } = req.body;
  if (!nome || !login || !senha || !url) return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
  const { rows } = await pool.query(
    'UPDATE login_bancos SET nome=$1, login=$2, senha=$3, url=$4 WHERE id=$5 RETURNING *',
    [nome, login, senha, url, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Registro não encontrado' });
  res.json(rows[0]);
});

app.delete('/api/login-bancos/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM login_bancos WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── PRODUTOS ────────────────────────────────────────────────────────────────
app.get('/api/products', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM products ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/products', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('INSERT INTO products (name) VALUES ($1) RETURNING *', [name]);
  res.json(rows[0]);
});

app.put('/api/products/:id', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  const { rows } = await pool.query('UPDATE products SET name=$1 WHERE id=$2 RETURNING *', [name, req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/products/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── BANCOS ───────────────────────────────────────────────────────────────────
app.get('/api/banks', auth, async (req, res) => {
  const { convenio_id } = req.query;
  if (convenio_id) {
    // Retorna apenas bancos que têm tabelas ativas nesse convênio
    const { rows } = await pool.query(`
      SELECT DISTINCT b.id, b.name, b.created_at
      FROM banks b
      JOIN financial_tables ft ON ft.bank_id = b.id
      WHERE ft.convenio_id = $1 AND ft.active = true
      ORDER BY b.name ASC
    `, [convenio_id]);
    return res.json(rows);
  }
  const { rows } = await pool.query('SELECT * FROM banks ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/banks', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('INSERT INTO banks (name) VALUES ($1) RETURNING *', [name]);
  res.json(rows[0]);
});

app.put('/api/banks/:id', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  const { rows } = await pool.query('UPDATE banks SET name=$1 WHERE id=$2 RETURNING *', [name, req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/banks/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM banks WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── CONVÊNIOS ────────────────────────────────────────────────────────────────
app.get('/api/convenios', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM convenios ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/convenios', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('INSERT INTO convenios (name) VALUES ($1) RETURNING *', [name]);
  res.json(rows[0]);
});

app.put('/api/convenios/:id', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  const { rows } = await pool.query('UPDATE convenios SET name=$1 WHERE id=$2 RETURNING *', [name, req.params.id]);
  res.json(rows[0]);
});

app.delete('/api/convenios/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM convenios WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── CATEGORIAS ───────────────────────────────────────────────────────────────
app.get('/api/categories', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM table_categories ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/categories', auth, adminOnly, async (req, res) => {
  const { name, multiplier } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query(
    'INSERT INTO table_categories (name, multiplier) VALUES ($1,$2) RETURNING *',
    [name, multiplier || 1]
  );
  res.json(rows[0]);
});

app.put('/api/categories/:id', auth, adminOnly, async (req, res) => {
  const { name, multiplier } = req.body;
  const { rows } = await pool.query(
    'UPDATE table_categories SET name=COALESCE($1,name), multiplier=COALESCE($2,multiplier) WHERE id=$3 RETURNING *',
    [name, multiplier, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/categories/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM table_categories WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── TABELAS FINANCEIRAS ───────────────────────────────────────────────────────
app.get('/api/financial-tables', auth, async (req, res) => {
  const { convenio_id, bank_id } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (convenio_id) { conditions.push(`ft.convenio_id = $${i++}`); values.push(convenio_id); }
  if (bank_id)     { conditions.push(`ft.bank_id = $${i++}`);     values.push(bank_id); }
  // Corretores só veem tabelas ativas
  if (req.user.role !== 'admin' || convenio_id || bank_id) {
    conditions.push(`ft.active = true`);
  }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT ft.*,
           tc.name as category_name, tc.multiplier as category_multiplier,
           b.name as bank_name, cv.name as convenio_name
    FROM financial_tables ft
    LEFT JOIN table_categories tc ON tc.id = ft.category_id
    LEFT JOIN banks b ON b.id = ft.bank_id
    LEFT JOIN convenios cv ON cv.id = ft.convenio_id
    ${where}
    ORDER BY ft.name ASC
  `, values);
  res.json(rows);
});

app.post('/api/financial-tables', auth, adminOnly, async (req, res) => {
  const { name, bank_id, convenio_id, category_id, active } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query(
    'INSERT INTO financial_tables (name, bank_id, convenio_id, category_id, active) VALUES ($1,$2,$3,$4,$5) RETURNING *',
    [name, bank_id || null, convenio_id || null, category_id || null, active !== false]
  );
  res.json(rows[0]);
});

app.put('/api/financial-tables/:id', auth, adminOnly, async (req, res) => {
  const { name, bank_id, convenio_id, category_id, active } = req.body;
  const fields = { name, bank_id, convenio_id, category_id, active };
  const updates = [];
  const values = [];
  let i = 1;
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { updates.push(`${k} = $${i++}`); values.push(v === '' ? null : v); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nenhum campo' });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE financial_tables SET ${updates.join(', ')} WHERE id=$${i} RETURNING *`, values);
  res.json(rows[0]);
});

app.delete('/api/financial-tables/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM financial_tables WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── REGRAS DE PONTUAÇÃO ───────────────────────────────────────────────────────
app.get('/api/scoring-rules/:table_id', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM scoring_rules WHERE table_id=$1 ORDER BY min_value ASC',
    [req.params.table_id]
  );
  res.json(rows);
});

app.post('/api/scoring-rules', auth, adminOnly, async (req, res) => {
  const { table_id, min_value, max_value, points } = req.body;
  if (!table_id) return res.status(400).json({ error: 'table_id obrigatório' });
  const { rows } = await pool.query(
    'INSERT INTO scoring_rules (table_id, min_value, max_value, points) VALUES ($1,$2,$3,$4) RETURNING *',
    [table_id, min_value || 0, max_value || null, points || 0]
  );
  res.json(rows[0]);
});

app.put('/api/scoring-rules/:id', auth, adminOnly, async (req, res) => {
  const { min_value, max_value, points } = req.body;
  const { rows } = await pool.query(
    'UPDATE scoring_rules SET min_value=COALESCE($1,min_value), max_value=$2, points=COALESCE($3,points) WHERE id=$4 RETURNING *',
    [min_value, max_value || null, points, req.params.id]
  );
  res.json(rows[0]);
});

app.delete('/api/scoring-rules/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM scoring_rules WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── HELPER: calcula pontos de uma proposta ────────────────────────────────────
async function calcPoints(tableId, value) {
  if (!tableId) return 0;
  const { rows: rules } = await pool.query(
    `SELECT sr.points, tc.multiplier FROM scoring_rules sr
     JOIN financial_tables ft ON ft.id = sr.table_id
     LEFT JOIN table_categories tc ON tc.id = ft.category_id
     WHERE sr.table_id = $1
       AND sr.min_value <= $2
       AND (sr.max_value IS NULL OR sr.max_value >= $2)
     ORDER BY sr.min_value DESC LIMIT 1`,
    [tableId, value]
  );
  if (!rules[0]) return 0;
  const multiplier = parseFloat(rules[0].multiplier) || 1;
  return Math.round(rules[0].points * multiplier);
}

async function awardBadgesAndNotify(client, userId) {
  const { rows: [up] } = await client.query('SELECT total_points FROM user_points WHERE user_id=$1', [userId]);
  const totalPoints = up?.total_points || 0;
  const { rows: [pc] } = await client.query(
    "SELECT COUNT(*)::int as cnt FROM proposals WHERE user_id=$1 AND status='Paga'", [userId]
  );
  const proposalsPaid = pc?.cnt || 0;
  const { rows: [st] } = await client.query('SELECT current_streak FROM user_streaks WHERE user_id=$1', [userId]);
  const streak = st?.current_streak || 0;

  const { rows: allBadges } = await client.query('SELECT * FROM badges');
  for (const badge of allBadges) {
    let earned = false;
    if (badge.condition_type === 'proposals_paid' && proposalsPaid >= badge.condition_value) earned = true;
    if (badge.condition_type === 'total_points' && totalPoints >= badge.condition_value) earned = true;
    if (badge.condition_type === 'streak' && streak >= badge.condition_value) earned = true;
    if (earned) {
      const { rowCount } = await client.query(
        'INSERT INTO user_badges (user_id, badge_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [userId, badge.id]
      );
      if (rowCount > 0) {
        await client.query(
          'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
          [userId, `🏅 Nova medalha conquistada: ${badge.name}!`]
        );
      }
    }
  }
}

async function updateStreak(client, userId) {
  const today = new Date().toISOString().split('T')[0];
  const { rows: [st] } = await client.query('SELECT * FROM user_streaks WHERE user_id=$1', [userId]);
  if (!st) {
    await client.query(
      'INSERT INTO user_streaks (user_id, current_streak, best_streak, last_activity_date) VALUES ($1,1,1,$2)',
      [userId, today]
    );
    return;
  }
  const last = st.last_activity_date ? new Date(st.last_activity_date).toISOString().split('T')[0] : null;
  if (last === today) return;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const newStreak = last === yesterday ? st.current_streak + 1 : 1;
  const bestStreak = Math.max(newStreak, st.best_streak);
  await client.query(
    'UPDATE user_streaks SET current_streak=$1, best_streak=$2, last_activity_date=$3, updated_at=now() WHERE user_id=$4',
    [newStreak, bestStreak, today, userId]
  );
}

// ─── CHECK NÚMERO DUPLICADO ───────────────────────────────────────────────────
app.get('/api/proposals/check-number', auth, async (req, res) => {
  const { proposal_number, exclude_id } = req.query;
  if (!proposal_number) return res.json({ exists: false });
  const { rows } = await pool.query(
    `SELECT id, client_name FROM proposals WHERE proposal_number = $1 ${exclude_id ? 'AND id != $2' : ''}`,
    exclude_id ? [proposal_number, exclude_id] : [proposal_number]
  );
  res.json({ exists: rows.length > 0, client_name: rows[0]?.client_name || null });
});

// ─── PROPOSTAS ────────────────────────────────────────────────────────────────
app.get('/api/proposals', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const { bank, table_id, convenio, product, status, start_date, end_date, user_id } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (!isAdmin) { conditions.push(`p.user_id = $${i++}`); values.push(req.user.id); }
  else if (user_id) { conditions.push(`p.user_id = $${i++}`); values.push(user_id); }
  if (bank)       { conditions.push(`p.bank ILIKE $${i++}`);      values.push(`%${bank}%`); }
  if (table_id)   { conditions.push(`p.table_id = $${i++}`);      values.push(table_id); }
  if (convenio)   { conditions.push(`p.convenio ILIKE $${i++}`);  values.push(`%${convenio}%`); }
  if (product)    { conditions.push(`p.product ILIKE $${i++}`);   values.push(`%${product}%`); }
  if (status)     { conditions.push(`p.status = $${i++}`);        values.push(status); }
  if (start_date) { conditions.push(`p.created_at >= $${i++}`);   values.push(start_date); }
  if (end_date)   { conditions.push(`p.created_at <= $${i++}`);   values.push(end_date + ' 23:59:59'); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT p.*, u.full_name as user_name, u.email as user_email,
           ft.name as table_name, tc.name as category_name,
           b.name as bank_name, cv.name as convenio_name, pr.name as product_name
    FROM proposals p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN financial_tables ft ON ft.id = p.table_id
    LEFT JOIN table_categories tc ON tc.id = ft.category_id
    LEFT JOIN banks b ON b.id = p.bank_id
    LEFT JOIN convenios cv ON cv.id = p.convenio_id
    LEFT JOIN products pr ON pr.id = p.product_id
    ${where}
    ORDER BY p.created_at DESC
  `, values);
  res.json(rows);
});

app.post('/api/proposals', auth, async (req, res) => {
  const { proposal_number, value, product, product_id, bank, convenio, table_id, bank_id, convenio_id, client_name, client_cpf, client_phone } = req.body;
  // Campos obrigatórios
  if (!proposal_number || !value || (!product && !product_id) || !client_name || !client_cpf || !client_phone) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios' });
  }
  // Verifica número duplicado
  const { rows: dup } = await pool.query('SELECT id, client_name FROM proposals WHERE proposal_number = $1', [proposal_number]);
  if (dup.length > 0) {
    return res.status(409).json({ error: `Número ${proposal_number} já cadastrado para o cliente "${dup[0].client_name}"` });
  }
  // Resolve nome do produto se veio por ID
  let productName = product || '';
  if (product_id) {
    const { rows: pr } = await pool.query('SELECT name FROM products WHERE id=$1', [product_id]);
    if (pr[0]) productName = pr[0].name;
  }
  // Corretor sempre cria como Digitada
  const { rows } = await pool.query(
    `INSERT INTO proposals (user_id, proposal_number, value, product, product_id, bank, convenio, table_id, bank_id, convenio_id, client_name, client_cpf, client_phone, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Digitada') RETURNING *`,
    [req.user.id, proposal_number, value, productName, product_id||null, bank||'', convenio||'', table_id||null, bank_id||null, convenio_id||null, client_name, client_cpf, client_phone]
  );
  res.json(rows[0]);
});

app.put('/api/proposals/:id', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const { rows: [existing] } = await pool.query('SELECT * FROM proposals WHERE id=$1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Proposta não encontrada' });
  if (!isAdmin && existing.user_id !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

  // Corretor não pode alterar status em nenhuma hipótese
  if (!isAdmin && req.body.status !== undefined) {
    return res.status(403).json({ error: 'Apenas o administrador pode alterar o status da proposta' });
  }
  const fields = ['proposal_number','value','product','product_id','bank','convenio','table_id','bank_id','convenio_id','client_name','client_cpf','client_phone'];
  if (isAdmin) fields.push('status');
  const updates = ['updated_at = now()'];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }
  values.push(req.params.id);

  const { rows: [updated] } = await pool.query(
    `UPDATE proposals SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  // Se mudou para Paga, calcular e adicionar pontos
  if (isAdmin && req.body.status === 'Paga' && existing.status !== 'Paga') {
    const pts = await calcPoints(updated.table_id, parseFloat(updated.value));
    await pool.query('UPDATE proposals SET points_earned=$1 WHERE id=$2', [pts, updated.id]);
    updated.points_earned = pts;
    await pool.query(
      `INSERT INTO user_points (user_id, total_points, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (user_id) DO UPDATE SET total_points = user_points.total_points + $2, updated_at = now()`,
      [updated.user_id, pts]
    );
    const client2 = await pool.connect();
    try {
      await updateStreak(client2, updated.user_id);
      await awardBadgesAndNotify(client2, updated.user_id);
    } finally { client2.release(); }
    await pool.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
      [updated.user_id, `💰 Proposta #${updated.proposal_number} marcada como Paga! +${pts} pontos`]
    );
    // Notifica se ultrapassou alguém no ranking
    const { rows: myRank } = await pool.query(`
      SELECT COUNT(*)::int + 1 as pos FROM user_points
      WHERE total_points > (SELECT COALESCE(total_points,0) FROM user_points WHERE user_id=$1)
    `, [updated.user_id]);
    if (myRank[0].pos <= 3) {
      const { rows: allUsers } = await pool.query('SELECT user_id FROM user_points WHERE user_id != $1', [updated.user_id]);
      for (const row of allUsers) {
        await pool.query(
          'INSERT INTO notifications (user_id, message) VALUES ($1,$2)',
          [row.user_id, `🏆 Mudança no ranking! Confira sua posição.`]
        );
      }
    }
  }

  // Se removido de Paga, subtrair pontos
  if (isAdmin && existing.status === 'Paga' && req.body.status && req.body.status !== 'Paga') {
    const pts = existing.points_earned || 0;
    if (pts > 0) {
      await pool.query('UPDATE proposals SET points_earned=0 WHERE id=$1', [existing.id]);
      await pool.query(
        'UPDATE user_points SET total_points = GREATEST(0, total_points - $1), updated_at=now() WHERE user_id=$2',
        [pts, existing.user_id]
      );
    }
  }

  res.json(updated);
});

app.delete('/api/proposals/:id', auth, adminOnly, async (req, res) => {
  const { rows: [p] } = await pool.query('SELECT * FROM proposals WHERE id=$1', [req.params.id]);
  if (p && p.status === 'Paga' && p.points_earned > 0) {
    await pool.query(
      'UPDATE user_points SET total_points = GREATEST(0, total_points - $1), updated_at=now() WHERE user_id=$2',
      [p.points_earned, p.user_id]
    );
  }
  await pool.query('DELETE FROM proposals WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── RANKING ──────────────────────────────────────────────────────────────────
app.get('/api/ranking', auth, async (req, res) => {
  const { period } = req.query; // 'weekly' | 'monthly' | all (default)
  let dateFilter = '';
  if (period === 'weekly')  dateFilter = "AND p.created_at >= now() - interval '7 days'";
  if (period === 'monthly') dateFilter = "AND date_trunc('month', p.created_at) = date_trunc('month', now())";

  let query;
  if (period === 'weekly' || period === 'monthly') {
    query = `
      SELECT u.id as user_id, u.full_name, u.email,
             COALESCE(SUM(p.points_earned),0)::int as total_points,
             COUNT(p.id) FILTER (WHERE p.status='Paga')::int as proposals_paid,
             COALESCE(SUM(p.value) FILTER (WHERE p.status='Paga'),0)::numeric as total_value
      FROM users u
      LEFT JOIN proposals p ON p.user_id = u.id ${dateFilter}
      WHERE u.role != 'admin'
      GROUP BY u.id, u.full_name, u.email
      ORDER BY total_points DESC, proposals_paid DESC
    `;
  } else {
    query = `
      SELECT u.id as user_id, u.full_name, u.email,
             COALESCE(up.total_points,0)::int as total_points,
             COUNT(p.id) FILTER (WHERE p.status='Paga')::int as proposals_paid,
             COALESCE(SUM(p.value) FILTER (WHERE p.status='Paga'),0)::numeric as total_value
      FROM users u
      LEFT JOIN user_points up ON up.user_id = u.id
      LEFT JOIN proposals p ON p.user_id = u.id
      WHERE u.role != 'admin'
      GROUP BY u.id, u.full_name, u.email, up.total_points
      ORDER BY total_points DESC, proposals_paid DESC
    `;
  }
  const { rows } = await pool.query(query);
  res.json(rows.map((r, i) => ({ ...r, position: i + 1 })));
});

// ─── DASHBOARD DE PRODUÇÃO ────────────────────────────────────────────────────
app.get('/api/production/dashboard', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin';
  const userFilter = isAdmin ? '' : `AND p.user_id = '${req.user.id}'`;

  const { rows: [today] } = await pool.query(`
    SELECT COALESCE(SUM(value),0)::numeric as value, COUNT(*)::int as count
    FROM proposals p WHERE status='Paga'
    AND date_trunc('day', p.created_at) = date_trunc('day', now()) ${userFilter}
  `);
  const { rows: [month] } = await pool.query(`
    SELECT COALESCE(SUM(value),0)::numeric as value, COUNT(*)::int as count
    FROM proposals p WHERE status='Paga'
    AND date_trunc('month', p.created_at) = date_trunc('month', now()) ${userFilter}
  `);
  const { rows: [total] } = await pool.query(`
    SELECT COUNT(*)::int as total_proposals,
           COUNT(*) FILTER (WHERE status='Paga')::int as paid,
           COUNT(*) FILTER (WHERE status='Em análise')::int as in_analysis,
           COUNT(*) FILTER (WHERE status='Aprovada')::int as approved,
           COUNT(*) FILTER (WHERE status='Digitada')::int as typed,
           COUNT(*) FILTER (WHERE status='Cancelada')::int as cancelled
    FROM proposals p WHERE 1=1 ${userFilter}
  `);

  let bestBroker = null;
  let topTable = null;
  let myPoints = 0;
  let myPosition = null;

  if (isAdmin) {
    const { rows: [bb] } = await pool.query(`
      SELECT u.full_name, COALESCE(up.total_points,0)::int as points
      FROM users u JOIN user_points up ON up.user_id = u.id
      ORDER BY up.total_points DESC LIMIT 1
    `);
    bestBroker = bb || null;

    const { rows: [tt] } = await pool.query(`
      SELECT ft.name, COUNT(p.id)::int as count
      FROM proposals p JOIN financial_tables ft ON ft.id = p.table_id
      WHERE p.status='Paga'
      GROUP BY ft.name ORDER BY count DESC LIMIT 1
    `);
    topTable = tt || null;
  } else {
    const { rows: [mp] } = await pool.query(
      'SELECT COALESCE(total_points,0)::int as points FROM user_points WHERE user_id=$1',
      [req.user.id]
    );
    myPoints = mp?.points || 0;

    const { rows: rank } = await pool.query(`
      SELECT COUNT(*)::int + 1 as pos FROM user_points
      WHERE total_points > COALESCE((SELECT total_points FROM user_points WHERE user_id=$1),0)
    `, [req.user.id]);
    myPosition = rank[0]?.pos || 1;
  }

  const avgTicket = month.count > 0 ? parseFloat(month.value) / month.count : 0;

  res.json({
    today: { value: parseFloat(today.value), count: today.count },
    month: { value: parseFloat(month.value), count: month.count },
    avg_ticket: avgTicket,
    proposals: total,
    best_broker: bestBroker,
    top_table: topTable,
    my_points: myPoints,
    my_position: myPosition,
  });
});

// ─── BADGES ───────────────────────────────────────────────────────────────────
app.get('/api/badges', auth, async (req, res) => {
  const { rows: all } = await pool.query('SELECT * FROM badges ORDER BY condition_value ASC');
  const { rows: earned } = await pool.query('SELECT badge_id FROM user_badges WHERE user_id=$1', [req.user.id]);
  const earnedSet = new Set(earned.map(e => e.badge_id));
  res.json(all.map(b => ({ ...b, earned: earnedSet.has(b.id) })));
});

// ─── NOTIFICAÇÕES ─────────────────────────────────────────────────────────────
app.get('/api/notifications', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20',
    [req.user.id]
  );
  res.json(rows);
});

app.put('/api/notifications/:id/read', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET read=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

app.put('/api/notifications/read-all', auth, async (req, res) => {
  await pool.query('UPDATE notifications SET read=true WHERE user_id=$1', [req.user.id]);
  res.json({ ok: true });
});

// ─── METAS MENSAIS ────────────────────────────────────────────────────────────
app.get('/api/goals', auth, async (req, res) => {
  const now = new Date();
  const { rows } = await pool.query(
    'SELECT * FROM monthly_goals WHERE user_id=$1 AND month=$2 AND year=$3',
    [req.user.id, now.getMonth() + 1, now.getFullYear()]
  );
  res.json(rows[0] || null);
});

app.post('/api/goals', auth, adminOnly, async (req, res) => {
  const { user_id, month, year, target_points, target_proposals } = req.body;
  const { rows } = await pool.query(
    `INSERT INTO monthly_goals (user_id, month, year, target_points, target_proposals)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (user_id, month, year)
     DO UPDATE SET target_points=$4, target_proposals=$5
     RETURNING *`,
    [user_id, month, year, target_points || 0, target_proposals || 0]
  );
  res.json(rows[0]);
});

// ─── STREAK ───────────────────────────────────────────────────────────────────
app.get('/api/streak', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM user_streaks WHERE user_id=$1', [req.user.id]);
  res.json(rows[0] || { user_id: req.user.id, current_streak: 0, best_streak: 0 });
});

// ─── FRONTEND (produção) ──────────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

// ─── ERROR HANDLER (sempre retorna JSON) ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERRO]', err.message, err.stack);
  res.status(500).json({ error: err.message || 'Erro interno do servidor' });
});

// ─── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
console.log('DATABASE_URL definida:', !!process.env.DATABASE_URL);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  initDb().catch((err) => console.error('Erro ao inicializar banco:', err.message));
});
