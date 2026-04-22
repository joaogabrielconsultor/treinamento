require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');
const path = require('path');
const fs = require('fs');
const pool = require('./db');

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 2 * 1024 * 1024 * 1024 } }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = process.env.JWT_SECRET;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

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
async function initDb() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(sql);
    console.log('Banco de dados inicializado com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err.message);
  }
}

const PORT = process.env.PORT || 3001;
initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando na porta ${PORT}`));
});
