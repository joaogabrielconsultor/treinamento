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
  if (req.user.role !== 'admin' && req.user.role !== 'master') return res.status(403).json({ error: 'Acesso negado' });
  next();
}
const MASTER_EMAIL = 'adm@rozesstartflow.com';
function masterOnly(req, res, next) {
  if (req.user.role !== 'master' && req.user.email !== MASTER_EMAIL) return res.status(403).json({ error: 'Acesso restrito ao master' });
  next();
}

// ─── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: 'Email ou senha incorretos' });
    if (user.archived_at) return res.status(403).json({ error: 'Usuário inativo. Entre em contato com o administrador.' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: 'Email ou senha incorretos' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, full_name: user.full_name }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role }, token });
  } catch {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email, full_name, role, pix_key, pix_key_type, created_at FROM users WHERE id = $1', [req.user.id]);
  res.json(rows[0] || null);
});

app.put('/api/profile', auth, async (req, res) => {
  const { full_name, email } = req.body;
  if (!full_name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email obrigatório' });
  try {
    const { rows } = await pool.query(
      'UPDATE users SET full_name=$1, email=$2 WHERE id=$3 RETURNING id, full_name, email, role, pix_key, pix_key_type',
      [full_name.trim(), email.trim().toLowerCase(), req.user.id]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Este email já está em uso' });
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

app.put('/api/profile/password', auth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Preencha todos os campos' });
  if (new_password.length < 6) return res.status(400).json({ error: 'Nova senha deve ter no mínimo 6 caracteres' });
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  const ok = await bcrypt.compare(current_password, rows[0].password_hash);
  if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });
  const hash = await bcrypt.hash(new_password, 10);
  await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
  res.json({ ok: true });
});

app.put('/api/profile/pix', auth, async (req, res) => {
  const { pix_key, pix_key_type } = req.body;
  const validTypes = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];
  if (pix_key_type && !validTypes.includes(pix_key_type)) return res.status(400).json({ error: 'Tipo de chave inválido' });
  await pool.query('UPDATE users SET pix_key = $1, pix_key_type = $2 WHERE id = $3', [pix_key || null, pix_key_type || null, req.user.id]);
  res.json({ ok: true });
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
  const showArchived = req.query.archived === 'true';
  const { rows } = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role, u.created_at, u.archived_at,
            u.loja_id, l.name AS loja_name,
            COUNT(e.id)::int AS enrollment_count
     FROM users u
     LEFT JOIN enrollments e ON e.user_id = u.id
     LEFT JOIN lojas l ON l.id = u.loja_id
     WHERE ${showArchived ? 'u.archived_at IS NOT NULL' : 'u.archived_at IS NULL'}
     GROUP BY u.id, l.name ORDER BY u.created_at DESC`
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
  const { email, password, full_name, role, loja_id } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha obrigatórios' });
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash, full_name, role, loja_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, full_name, role, loja_id, created_at',
      [email, hash, full_name || null, role || 'user', loja_id || null]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

app.put('/api/admin/users/:id/loja', auth, adminOnly, async (req, res) => {
  const { loja_id } = req.body;
  await pool.query('UPDATE users SET loja_id = $1 WHERE id = $2', [loja_id || null, req.params.id]);
  res.json({ ok: true });
});

// ─── ADMIN: ARCHIVE USER ──────────────────────────────────────────────────────
app.put('/api/admin/users/:id/archive', auth, adminOnly, async (req, res) => {
  if (req.user.email !== MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Apenas o administrador master pode arquivar usuários' });
  }
  const { rows: target } = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
  if (!target[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (target[0].email === MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'O administrador master não pode ser arquivado' });
  }
  await pool.query('UPDATE users SET archived_at = now() WHERE id = $1', [req.params.id]);
  res.json({ success: true });
});

// ─── ADMIN: UNARCHIVE USER ────────────────────────────────────────────────────
app.put('/api/admin/users/:id/unarchive', auth, adminOnly, async (req, res) => {
  if (req.user.email !== MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Apenas o administrador master pode reativar usuários' });
  }
  await pool.query('UPDATE users SET archived_at = NULL WHERE id = $1', [req.params.id]);
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

app.put('/api/admin/users/:id/profile', auth, adminOnly, async (req, res) => {
  const { full_name, email } = req.body;
  if (!full_name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  if (!email?.trim()) return res.status(400).json({ error: 'Email obrigatório' });
  const { rows: target } = await pool.query('SELECT email FROM users WHERE id = $1', [req.params.id]);
  if (!target[0]) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (target[0].email === MASTER_ADMIN_EMAIL && req.user.email !== MASTER_ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Sem permissão para editar o master admin' });
  }
  try {
    const { rows } = await pool.query(
      'UPDATE users SET full_name=$1, email=$2 WHERE id=$3 RETURNING id, full_name, email, role',
      [full_name.trim(), email.trim().toLowerCase(), req.params.id]
    );
    res.json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Este email já está em uso' });
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// ─── LOJAS ────────────────────────────────────────────────────────────────────
app.get('/api/admin/lojas', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.id, l.name, l.created_at,
           COUNT(u.id)::int AS user_count
    FROM lojas l
    LEFT JOIN users u ON u.loja_id = l.id AND u.archived_at IS NULL
    GROUP BY l.id ORDER BY l.name ASC
  `);
  res.json(rows);
});

app.get('/api/admin/lojas/all', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, name FROM lojas ORDER BY name ASC');
  res.json(rows);
});

app.post('/api/admin/lojas', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('INSERT INTO lojas (name) VALUES ($1) RETURNING *', [name.trim()]);
  res.json(rows[0]);
});

app.put('/api/admin/lojas/:id', auth, adminOnly, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('UPDATE lojas SET name = $1 WHERE id = $2 RETURNING *', [name.trim(), req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Loja não encontrada' });
  res.json(rows[0]);
});

app.delete('/api/admin/lojas/:id', auth, adminOnly, async (req, res) => {
  const { rows: check } = await pool.query('SELECT id FROM users WHERE loja_id = $1 AND archived_at IS NULL LIMIT 1', [req.params.id]);
  if (check.length > 0) return res.status(400).json({ error: 'Loja possui usuários ativos. Remova-os antes de excluir.' });
  await pool.query('DELETE FROM lojas WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── USUÁRIOS BANCO ────────────────────────────────────────────────────────────
app.get('/api/usuarios-banco', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, nome, descricao FROM usuarios_banco ORDER BY nome ASC');
  res.json(rows);
});

app.get('/api/admin/usuarios-banco', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ub.*, COUNT(p.id)::int as proposal_count
    FROM usuarios_banco ub
    LEFT JOIN proposals p ON p.usuario_banco_id = ub.id
    GROUP BY ub.id ORDER BY ub.nome ASC
  `);
  res.json(rows);
});

app.post('/api/admin/usuarios-banco', auth, adminOnly, async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('INSERT INTO usuarios_banco (nome, descricao) VALUES ($1,$2) RETURNING *', [nome.trim(), descricao?.trim() || '']);
  res.json(rows[0]);
});

app.put('/api/admin/usuarios-banco/:id', auth, adminOnly, async (req, res) => {
  const { nome, descricao } = req.body;
  if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query('UPDATE usuarios_banco SET nome=$1, descricao=$2 WHERE id=$3 RETURNING *', [nome.trim(), descricao?.trim() || '', req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Usuário banco não encontrado' });
  res.json(rows[0]);
});

app.delete('/api/admin/usuarios-banco/:id', auth, adminOnly, async (req, res) => {
  await pool.query('UPDATE proposals SET usuario_banco_id = NULL WHERE usuario_banco_id = $1', [req.params.id]);
  await pool.query('DELETE FROM usuarios_banco WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ─── CONTA EMPRESA ────────────────────────────────────────────────────────────
app.get('/api/admin/conta-empresa', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT l.id AS loja_id, l.name AS loja_name,
           COUNT(DISTINCT u.id)::int AS broker_count,
           COALESCE(SUM(
             CASE WHEN p.status = 'Paga' THEN
               ROUND(p.value * COALESCE(
                 (SELECT cr.comissao_empresa FROM commission_ranges cr
                  WHERE cr.financial_table_id = p.table_id
                    AND cr.min_value <= p.value AND (cr.max_value IS NULL OR cr.max_value >= p.value)
                  ORDER BY cr.min_value DESC LIMIT 1), ft.comissao_empresa, 0) / 100, 2)
             END
           ), 0)::numeric AS total_creditos,
           (COALESCE((
             SELECT SUM(cp.total_value) FROM commission_payments cp
             JOIN users pu ON pu.id = cp.user_id
             WHERE pu.loja_id = l.id
           ), 0) + COALESCE((
             SELECT SUM(d.valor) FROM despesas d WHERE d.loja_id = l.id
           ), 0))::numeric AS total_debitos,
           COALESCE(SUM(
             CASE WHEN p.status_comissao = 'Ag. Comissão' THEN
               ROUND(p.value * COALESCE(
                 (SELECT cr.comissao_corretor FROM commission_ranges cr
                  WHERE cr.financial_table_id = p.table_id
                    AND cr.min_value <= p.value AND (cr.max_value IS NULL OR cr.max_value >= p.value)
                  ORDER BY cr.min_value DESC LIMIT 1), ft.comissao_corretor, 0) / 100, 2)
             END
           ), 0)::numeric AS comissao_pendente
    FROM lojas l
    LEFT JOIN users u ON u.loja_id = l.id AND u.archived_at IS NULL
    LEFT JOIN proposals p ON p.user_id = u.id
    LEFT JOIN financial_tables ft ON ft.id = p.table_id
    GROUP BY l.id ORDER BY l.name ASC
  `);
  res.json(rows);
});

app.get('/api/admin/conta-empresa/:loja_id/extrato', auth, adminOnly, async (req, res) => {
  const { loja_id } = req.params;
  // Créditos: propostas pagas dessa loja
  const { rows: creditos } = await pool.query(`
    SELECT 'credito' AS type,
           p.id AS reference_id,
           p.proposal_number AS description_ref,
           u.full_name AS broker_name,
           ROUND(p.value * COALESCE(
             (SELECT cr.comissao_empresa FROM commission_ranges cr
              WHERE cr.financial_table_id = p.table_id
                AND cr.min_value <= p.value AND (cr.max_value IS NULL OR cr.max_value >= p.value)
              ORDER BY cr.min_value DESC LIMIT 1), ft.comissao_empresa, 0) / 100, 2) AS value,
           p.client_name,
           p.updated_at AS date
    FROM proposals p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN financial_tables ft ON ft.id = p.table_id
    WHERE u.loja_id = $1 AND p.status = 'Paga'
  `, [loja_id]);
  // Débitos: pagamentos de comissão feitos a corretores dessa loja
  const { rows: debitos } = await pool.query(`
    SELECT 'debito' AS type,
           'comissao' AS subtype,
           cp.id AS reference_id,
           NULL AS description_ref,
           u.full_name AS broker_name,
           cp.total_value AS value,
           NULL AS client_name,
           cp.created_at AS date
    FROM commission_payments cp
    JOIN users u ON u.id = cp.user_id
    WHERE u.loja_id = $1
  `, [loja_id]);
  // Débitos: despesas lançadas para essa loja
  const { rows: despesasRows } = await pool.query(`
    SELECT 'debito' AS type,
           'despesa' AS subtype,
           d.id AS reference_id,
           d.descricao AS description_ref,
           u.full_name AS broker_name,
           d.valor AS value,
           NULL AS client_name,
           d.created_at AS date
    FROM despesas d
    LEFT JOIN users u ON u.id = d.created_by
    WHERE d.loja_id = $1
  `, [loja_id]);
  const extrato = [...creditos, ...debitos, ...despesasRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(extrato);
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
  const { rows } = await pool.query('SELECT * FROM table_categories ORDER BY multiplier DESC, name ASC');
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
    ORDER BY ft.coeficiente DESC, ft.comissao_corretor DESC, ft.name ASC
  `, values);
  const isAdminUser = req.user.role === 'admin' || req.user.role === 'master';
  const result = isAdminUser ? rows : rows.map(({ comissao_empresa, ...rest }) => rest);
  res.json(result);
});

app.post('/api/financial-tables/import', auth, adminOnly, async (req, res) => {
  const items = req.body.rows;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Nenhum item' });
  const toFloat = v => parseFloat(String(v ?? '').replace(',', '.')) || 0;
  let imported = 0;
  let updated = 0;
  const errors = [];
  for (const item of items) {
    if (!item.name) { errors.push({ row: item.nome || '?', error: 'nome obrigatório' }); continue; }
    if (!item.bank_id) { errors.push({ row: item.nome || '?', error: `banco "${item.banco}" não encontrado` }); continue; }
    if (!item.convenio_id) { errors.push({ row: item.nome || '?', error: `convênio "${item.convenio}" não encontrado` }); continue; }
    if (!item.category_id) { errors.push({ row: item.nome || '?', error: `categoria "${item.categoria}" não encontrada` }); continue; }
    const rangeValues = [
      item.range_tipo_proposta || '',
      item.range_parceiro || '',
      item.range_expires_at || null,
      item.range_convenio_descricao || '',
      item.range_disponivel_para || 'todos',
      item.range_prazo_inicial ? parseInt(item.range_prazo_inicial) : null,
      item.range_prazo_final ? parseInt(item.range_prazo_final) : null,
      item.range_juros_inicial ? toFloat(item.range_juros_inicial) : null,
      item.range_juros_final ? toFloat(item.range_juros_final) : null,
      item.range_coef_inicial ? toFloat(item.range_coef_inicial) : null,
      item.range_coef_final ? toFloat(item.range_coef_final) : null,
      toFloat(item.range_comissao_empresa),
      toFloat(item.range_comissao_corretor),
    ];
    try {
      // Match preciso: nome+banco+convênio+comissao_empresa+comissao_corretor
      const csvEmpresa = toFloat(item.comissao_empresa);
      const csvCorretor = toFloat(item.comissao_corretor);
      let existing = await pool.query(
        `SELECT id FROM financial_tables
         WHERE name=$1 AND bank_id=$2 AND convenio_id=$3
           AND ROUND(comissao_empresa::numeric,4) = ROUND($4::numeric,4)
           AND ROUND(comissao_corretor::numeric,4) = ROUND($5::numeric,4)
         LIMIT 1`,
        [item.name, item.bank_id, item.convenio_id, csvEmpresa, csvCorretor]
      );
      // Fallback: se não achou pelo match preciso, tenta match só por nome+banco+convênio
      // mas só se houver exatamente UMA entrada (sem ambiguidade)
      if (existing.rows.length === 0) {
        const fallback = await pool.query(
          'SELECT id FROM financial_tables WHERE name=$1 AND bank_id=$2 AND convenio_id=$3',
          [item.name, item.bank_id, item.convenio_id]
        );
        if (fallback.rows.length === 1) existing = fallback;
      }
      let tableId;
      if (existing.rows.length > 0) {
        tableId = existing.rows[0].id;
        await pool.query(
          `UPDATE financial_tables SET
            category_id=$1, active=$2, comissao_empresa=$3, comissao_corretor=$4, coeficiente=$5,
            tipo_proposta=$6, parceiro=$7, expires_at=$8, convenio_descricao=$9, disponivel_para=$10,
            prazo_inicial=$11, prazo_final=$12, juros_inicial=$13, juros_final=$14, coef_inicial=$15, coef_final=$16
          WHERE id=$17`,
          [item.category_id,
           item.active !== 'false' && item.active !== false,
           csvEmpresa, csvCorretor, toFloat(item.coeficiente),
           ...rangeValues.slice(0, 11),
           tableId]
        );
        await pool.query('DELETE FROM commission_ranges WHERE financial_table_id=$1', [tableId]);
        updated++;
      } else {
        const { rows: tRows } = await pool.query(
          `INSERT INTO financial_tables (
            name, bank_id, convenio_id, category_id, active,
            comissao_empresa, comissao_corretor, coeficiente,
            tipo_proposta, parceiro, expires_at, convenio_descricao, disponivel_para,
            prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
          [item.name, item.bank_id, item.convenio_id, item.category_id,
           item.active !== 'false' && item.active !== false,
           toFloat(item.comissao_empresa), toFloat(item.comissao_corretor), toFloat(item.coeficiente),
           ...rangeValues.slice(0, 11)]
        );
        tableId = tRows[0].id;
        imported++;
      }
      await pool.query(`
        INSERT INTO commission_ranges (
          financial_table_id, tipo_proposta, parceiro, expires_at, convenio_descricao,
          disponivel_para, prazo_inicial, prazo_final, juros_inicial, juros_final,
          coef_inicial, coef_final, comissao_empresa, comissao_corretor,
          min_value, max_value, base_points
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
      `, [tableId, ...rangeValues, 0, null, 0]);
    } catch (err) {
      errors.push({ row: item.nome || '?', error: err.message });
    }
  }
  res.json({ imported, updated, errors });
});

app.post('/api/financial-tables', auth, adminOnly, async (req, res) => {
  const { name, bank_id, convenio_id, category_id, active, comissao_empresa, comissao_corretor, coeficiente,
    tipo_proposta, parceiro, expires_at, convenio_descricao, disponivel_para,
    prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final } = req.body;
  if (!name) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows } = await pool.query(
    `INSERT INTO financial_tables
      (name, bank_id, convenio_id, category_id, active, comissao_empresa, comissao_corretor, coeficiente,
       tipo_proposta, parceiro, expires_at, convenio_descricao, disponivel_para,
       prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING *`,
    [name, bank_id||null, convenio_id||null, category_id||null, active!==false, comissao_empresa||0, comissao_corretor||0, coeficiente||0,
     tipo_proposta||null, parceiro||null, expires_at||null, convenio_descricao||null, disponivel_para||'todos',
     prazo_inicial||null, prazo_final||null, juros_inicial||null, juros_final||null, coef_inicial||null, coef_final||null]
  );
  res.json(rows[0]);
});

app.put('/api/financial-tables/:id', auth, adminOnly, async (req, res) => {
  const { name, bank_id, convenio_id, category_id, active, comissao_empresa, comissao_corretor, coeficiente,
    tipo_proposta, parceiro, expires_at, convenio_descricao, disponivel_para,
    prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final } = req.body;
  const fields = { name, bank_id, convenio_id, category_id, active, comissao_empresa, comissao_corretor, coeficiente,
    tipo_proposta, parceiro, expires_at, convenio_descricao, disponivel_para,
    prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final };
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
    'SELECT * FROM scoring_rules WHERE table_id=$1 ORDER BY min_value DESC',
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

// ─── FAIXAS DE COMISSÃO ───────────────────────────────────────────────────────
app.get('/api/commission-ranges', auth, async (req, res) => {
  const { table_id } = req.query;
  const params = [];
  const where = table_id ? (params.push(table_id), 'WHERE cr.financial_table_id = $1') : '';
  const { rows } = await pool.query(`
    SELECT cr.*,
      tc.name as category_name, tc.multiplier as category_multiplier,
      ft.name as table_name,
      b.name as bank_name,
      cv.name as convenio_name
    FROM commission_ranges cr
    LEFT JOIN table_categories tc ON tc.id = cr.category_id
    LEFT JOIN financial_tables ft ON ft.id = cr.financial_table_id
    LEFT JOIN banks b ON b.id = ft.bank_id
    LEFT JOIN convenios cv ON cv.id = ft.convenio_id
    ${where}
    ORDER BY cr.created_at DESC, cr.min_value DESC
  `, params);
  res.json(rows);
});

app.post('/api/commission-ranges/import', auth, adminOnly, async (req, res) => {
  const items = req.body.rows;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Nenhum item' });
  let imported = 0;
  const errors = [];
  for (const item of items) {
    if (!item.financial_table_id) { errors.push({ row: item.tabela_nome || '?', error: 'tabela não encontrada' }); continue; }
    try {
      await pool.query(`
        INSERT INTO commission_ranges (
          financial_table_id, tipo_proposta, expires_at, convenio_descricao, parceiro,
          prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final,
          comissao_empresa, comissao_corretor, disponivel_para,
          category_id, min_value, max_value, base_points, multiplier
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
      `, [
        item.financial_table_id,
        item.tipo_proposta || '',
        item.expires_at || null,
        item.convenio_descricao || '',
        item.parceiro || '',
        item.prazo_inicial ? parseInt(item.prazo_inicial) : null,
        item.prazo_final ? parseInt(item.prazo_final) : null,
        item.juros_inicial ? parseFloat(item.juros_inicial) : null,
        item.juros_final ? parseFloat(item.juros_final) : null,
        item.coef_inicial ? parseFloat(item.coef_inicial) : null,
        item.coef_final ? parseFloat(item.coef_final) : null,
        parseFloat(item.comissao_empresa) || 0,
        parseFloat(item.comissao_corretor) || 0,
        item.disponivel_para || 'todos',
        item.category_id || null,
        parseFloat(item.min_value) || 0,
        item.max_value ? parseFloat(item.max_value) : null,
        parseInt(item.base_points) || 0,
        item.multiplier ? parseFloat(item.multiplier) : null,
      ]);
      imported++;
    } catch (err) {
      errors.push({ row: item.tabela_nome || '?', error: err.message });
    }
  }
  res.json({ imported, errors });
});

app.post('/api/commission-ranges', auth, adminOnly, async (req, res) => {
  const {
    financial_table_id, tipo_proposta, expires_at, convenio_descricao, parceiro,
    prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final,
    comissao_empresa, comissao_corretor, disponivel_para,
    category_id, min_value, max_value, base_points, multiplier
  } = req.body;
  if (!financial_table_id) return res.status(400).json({ error: 'financial_table_id obrigatório' });
  const { rows } = await pool.query(`
    INSERT INTO commission_ranges (
      financial_table_id, tipo_proposta, expires_at, convenio_descricao, parceiro,
      prazo_inicial, prazo_final, juros_inicial, juros_final, coef_inicial, coef_final,
      comissao_empresa, comissao_corretor, disponivel_para,
      category_id, min_value, max_value, base_points, multiplier
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *
  `, [
    financial_table_id, tipo_proposta||'', expires_at||null, convenio_descricao||'', parceiro||'',
    prazo_inicial||null, prazo_final||null, juros_inicial||null, juros_final||null,
    coef_inicial||null, coef_final||null,
    comissao_empresa||0, comissao_corretor||0, disponivel_para||'todos',
    category_id||null, min_value||0, max_value||null, base_points||0, multiplier||null
  ]);
  res.json(rows[0]);
});

app.put('/api/commission-ranges/:id', auth, adminOnly, async (req, res) => {
  const fields = [
    'tipo_proposta','expires_at','convenio_descricao','parceiro',
    'prazo_inicial','prazo_final','juros_inicial','juros_final','coef_inicial','coef_final',
    'comissao_empresa','comissao_corretor','disponivel_para',
    'category_id','min_value','max_value','base_points','multiplier'
  ];
  const updates = [];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f] === '' ? null : req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'Nenhum campo' });
  values.push(req.params.id);
  const { rows } = await pool.query(`UPDATE commission_ranges SET ${updates.join(', ')} WHERE id=$${i} RETURNING *`, values);
  res.json(rows[0]);
});

app.delete('/api/commission-ranges/:id', auth, adminOnly, async (req, res) => {
  await pool.query('DELETE FROM commission_ranges WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// ─── HELPER: calcula pontos de uma proposta ────────────────────────────────────
async function calcPoints(tableId, value) {
  if (!tableId) return 0;

  // Prioridade 1: faixas de comissão (commission_ranges)
  const { rows: cr } = await pool.query(`
    SELECT cr.base_points,
           COALESCE(cr.multiplier, tc.multiplier, 1) as multiplier
    FROM commission_ranges cr
    LEFT JOIN table_categories tc ON tc.id = cr.category_id
    WHERE cr.financial_table_id = $1
      AND cr.min_value <= $2
      AND (cr.max_value IS NULL OR cr.max_value >= $2)
    ORDER BY cr.min_value DESC LIMIT 1
  `, [tableId, value]);
  if (cr[0] && cr[0].base_points > 0) {
    return Math.round(cr[0].base_points * (parseFloat(cr[0].multiplier) || 1));
  }

  // Fallback: scoring_rules legado
  const { rows: rules } = await pool.query(`
    SELECT sr.points, COALESCE(tc.multiplier, 1) as multiplier
    FROM scoring_rules sr
    JOIN financial_tables ft ON ft.id = sr.table_id
    LEFT JOIN table_categories tc ON tc.id = ft.category_id
    WHERE sr.table_id = $1
      AND sr.min_value <= $2
      AND (sr.max_value IS NULL OR sr.max_value >= $2)
    ORDER BY sr.min_value DESC LIMIT 1
  `, [tableId, value]);
  if (!rules[0]) return 0;
  return Math.round(rules[0].points * (parseFloat(rules[0].multiplier) || 1));
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
  const isAdmin = req.user.role === 'admin' || req.user.role === 'master';
  const { bank, bank_id, table_id, convenio, convenio_id, product, product_id, status, start_date, end_date, user_id, loja_id, search, min_value, max_value, tipo_proposta, only_paid, no_commission, locked } = req.query;
  const conditions = [];
  const values = [];
  let i = 1;
  if (!isAdmin) { conditions.push(`p.user_id = $${i++}`); values.push(req.user.id); }
  else if (user_id) { conditions.push(`p.user_id = $${i++}`); values.push(user_id); }
  else if (loja_id) { conditions.push(`u.loja_id = $${i++}`); values.push(loja_id); }
  if (bank_id)    { conditions.push(`p.bank_id = $${i++}`);        values.push(bank_id); }
  else if (bank)  { conditions.push(`p.bank ILIKE $${i++}`);       values.push(`%${bank}%`); }
  if (table_id)   { conditions.push(`p.table_id = $${i++}`);       values.push(table_id); }
  if (convenio_id){ conditions.push(`p.convenio_id = $${i++}`);    values.push(convenio_id); }
  else if (convenio){ conditions.push(`p.convenio ILIKE $${i++}`); values.push(`%${convenio}%`); }
  if (product_id) { conditions.push(`p.product_id = $${i++}`);     values.push(product_id); }
  else if (product){ conditions.push(`p.product ILIKE $${i++}`);   values.push(`%${product}%`); }
  if (status)     { conditions.push(`p.status = $${i++}`);         values.push(status); }
  if (start_date) { conditions.push(`p.created_at >= $${i++}`);    values.push(start_date); }
  if (end_date)   { conditions.push(`p.created_at <= $${i++}`);    values.push(end_date + ' 23:59:59'); }
  if (search)     { conditions.push(`(p.client_name ILIKE $${i} OR p.proposal_number ILIKE $${i} OR u.full_name ILIKE $${i} OR u.email ILIKE $${i})`); values.push(`%${search}%`); i++; }
  if (min_value)  { conditions.push(`p.value >= $${i++}`);         values.push(parseFloat(min_value)); }
  if (max_value)  { conditions.push(`p.value <= $${i++}`);         values.push(parseFloat(max_value)); }
  if (tipo_proposta) { conditions.push(`p.tipo_proposta ILIKE $${i++}`); values.push(`%${tipo_proposta}%`); }
  if (only_paid === 'true') { conditions.push(`p.status = 'Paga'`); }
  if (no_commission === 'true') { conditions.push(`p.status_comissao IS NULL AND p.status = 'Paga'`); }
  if (locked === 'true')  { conditions.push(`p.allow_broker_edit = false`); }
  if (locked === 'false') { conditions.push(`p.allow_broker_edit = true`); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT p.*, u.full_name as user_name, u.email as user_email,
           ft.name as table_name, tc.name as category_name,
           b.name as bank_name, cv.name as convenio_name, pr.name as product_name,
           COALESCE(
             (SELECT cr.comissao_corretor FROM commission_ranges cr
              WHERE cr.financial_table_id = p.table_id
                AND cr.min_value <= p.value
                AND (cr.max_value IS NULL OR cr.max_value >= p.value)
              ORDER BY cr.min_value DESC LIMIT 1),
             ft.comissao_corretor, 0
           ) as comissao_corretor_pct,
           COALESCE(p.comissao_corretor_override,
             ROUND(p.value * COALESCE(
               (SELECT cr.comissao_corretor FROM commission_ranges cr
                WHERE cr.financial_table_id = p.table_id
                  AND cr.min_value <= p.value
                  AND (cr.max_value IS NULL OR cr.max_value >= p.value)
                ORDER BY cr.min_value DESC LIMIT 1),
               ft.comissao_corretor, 0
             ) / 100, 2)
           ) as comissao_valor,
           COALESCE(p.comissao_empresa_override,
             ROUND(p.value * COALESCE(ft.comissao_empresa, 0) / 100, 2)
           ) as comissao_empresa_valor,
           ub.id as usuario_banco_id, ub.nome as usuario_banco_nome
    FROM proposals p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN financial_tables ft ON ft.id = p.table_id
    LEFT JOIN table_categories tc ON tc.id = ft.category_id
    LEFT JOIN banks b ON b.id = p.bank_id
    LEFT JOIN convenios cv ON cv.id = p.convenio_id
    LEFT JOIN products pr ON pr.id = p.product_id
    LEFT JOIN usuarios_banco ub ON ub.id = p.usuario_banco_id
    ${where}
    ORDER BY p.value DESC, p.created_at DESC
  `, values);
  res.json(rows);
});

app.post('/api/proposals', auth, async (req, res) => {
  const { proposal_number, value, product, product_id, bank, convenio, table_id, bank_id, convenio_id, client_name, client_cpf, client_phone, created_at } = req.body;
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
  // Resolve coeficiente da tabela financeira (nunca vem do corretor)
  let coeficiente = 0;
  if (table_id) {
    const { rows: [tbl] } = await pool.query('SELECT coeficiente FROM financial_tables WHERE id=$1', [table_id]);
    if (tbl) coeficiente = parseFloat(tbl.coeficiente) || 0;
  }
  // Corretor sempre cria como Digitada
  const proposalDate = created_at ? new Date(created_at) : new Date();
  const { body: reqBody } = req;
  const usuario_banco_id = reqBody.usuario_banco_id || null;
  const { rows } = await pool.query(
    `INSERT INTO proposals (user_id, proposal_number, value, product, product_id, bank, convenio, table_id, bank_id, convenio_id, client_name, client_cpf, client_phone, coeficiente, status, created_at, usuario_banco_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'Digitada',$15,$16) RETURNING *`,
    [req.user.id, proposal_number, value, productName, product_id||null, bank||'', convenio||'', table_id||null, bank_id||null, convenio_id||null, client_name, client_cpf, client_phone, coeficiente, proposalDate, usuario_banco_id]
  );
  res.json(rows[0]);
});

app.patch('/api/admin/proposals/:id/toggle-edit', auth, adminOnly, async (req, res) => {
  const { rows: [p] } = await pool.query(
    'UPDATE proposals SET allow_broker_edit = NOT allow_broker_edit WHERE id=$1 RETURNING id, allow_broker_edit',
    [req.params.id]
  );
  if (!p) return res.status(404).json({ error: 'Proposta não encontrada' });
  res.json(p);
});

app.put('/api/proposals/:id', auth, async (req, res) => {
  const isAdmin = req.user.role === 'admin' || req.user.role === 'master';
  const { rows: [existing] } = await pool.query('SELECT * FROM proposals WHERE id=$1', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Proposta não encontrada' });
  if (!isAdmin && existing.user_id !== req.user.id) return res.status(403).json({ error: 'Acesso negado' });

  // Corretor só pode editar se admin liberou
  if (!isAdmin && !existing.allow_broker_edit) {
    return res.status(403).json({ error: 'Edição não liberada pelo administrador' });
  }
  // Corretor não pode alterar status ou campos de comissão
  if (!isAdmin && req.body.status !== undefined) {
    return res.status(403).json({ error: 'Apenas o administrador pode alterar o status da proposta' });
  }

  const brokerFields = ['proposal_number','value','product','product_id','bank','convenio','table_id','bank_id','convenio_id','client_name','client_cpf','client_phone','created_at','usuario_banco_id'];
  const adminFields = [...brokerFields, 'status', 'allow_broker_edit', 'comissao_corretor_override', 'comissao_empresa_override'];
  const masterFields = [...adminFields, 'user_id'];
  const isMaster = req.user.role === 'master' || req.user.email === 'adm@rozesstartflow.com';
  const fields = isMaster ? masterFields : isAdmin ? adminFields : brokerFields;

  // Normaliza overrides de comissão: string vazia = null (limpa override)
  if (req.body.comissao_corretor_override === '') req.body.comissao_corretor_override = null;
  if (req.body.comissao_empresa_override === '') req.body.comissao_empresa_override = null;

  const updates = ['updated_at = now()'];
  const values = [];
  let i = 1;
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
  }

  // Coeficiente: admin pode enviar valor manual; caso contrário auto-calcula da tabela
  if (isAdmin && req.body.coeficiente !== undefined && req.body.coeficiente !== '') {
    updates.push(`coeficiente = $${i++}`);
    values.push(parseFloat(req.body.coeficiente) || 0);
  } else if (req.body.table_id !== undefined) {
    const newTableId = req.body.table_id;
    if (newTableId) {
      const { rows: [tbl] } = await pool.query('SELECT coeficiente FROM financial_tables WHERE id=$1', [newTableId]);
      updates.push(`coeficiente = $${i++}`);
      values.push(tbl ? (parseFloat(tbl.coeficiente) || 0) : 0);
    } else {
      updates.push(`coeficiente = $${i++}`);
      values.push(0);
    }
  }
  values.push(req.params.id);

  const { rows: [updated] } = await pool.query(
    `UPDATE proposals SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  );

  // Controla status_comissao automaticamente
  if (isAdmin && req.body.status === 'Paga' && existing.status !== 'Paga') {
    await pool.query("UPDATE proposals SET status_comissao = 'Ag. Comissão' WHERE id = $1", [updated.id]);
    updated.status_comissao = 'Ag. Comissão';
  }
  if (isAdmin && existing.status === 'Paga' && req.body.status && req.body.status !== 'Paga') {
    await pool.query('UPDATE proposals SET status_comissao = NULL WHERE id = $1', [updated.id]);
    updated.status_comissao = null;
  }

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

app.delete('/api/proposals/:id', auth, masterOnly, async (req, res) => {
  const { rows: [p] } = await pool.query('SELECT id FROM proposals WHERE id=$1', [req.params.id]);
  if (!p) return res.status(404).json({ error: 'Proposta não encontrada' });
  await pool.query('DELETE FROM proposals WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.post('/api/proposals/bulk-delete', auth, masterOnly, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'Nenhum id informado' });
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  await pool.query(`DELETE FROM proposals WHERE id IN (${placeholders})`, ids);
  res.json({ ok: true, deleted: ids.length });
});

// ─── IMPORTAÇÃO CSV DE PROPOSTAS ─────────────────────────────────────────────
app.post('/api/admin/proposals/import', auth, adminOnly, async (req, res) => {
  const rows = req.body.rows;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Nenhuma linha' });

  function parseDate(val) {
    if (!val || !val.trim()) return new Date();
    const v = val.trim();
    if (/^\d{5}$/.test(v)) return new Date((parseInt(v) - 25569) * 86400 * 1000);
    const m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`);
    return new Date();
  }

  function parseValue(val) {
    if (!val) return 0;
    return parseFloat(String(val).replace(/\./g, '').replace(',', '.')) || 0;
  }

  function mapStatus(esteira) {
    // salva o valor bruto do CSV, removendo apenas o caractere de encoding no início (ex: °Proposta Paga)
    const raw = (esteira || '').replace(/^[^\w\dÀ-ÿ]+/, '').trim();
    return raw || 'Digitada';
  }

  // cache de lookups para evitar N+1
  const userCache = {};
  const bankCache = {};
  const convenioCache = {};
  const tableCache = {};

  async function lookupUser(name) {
    if (!name) return null;
    const k = name.trim().toLowerCase();
    if (k in userCache) return userCache[k];
    const { rows: r } = await pool.query(`SELECT id FROM users WHERE LOWER(TRIM(full_name)) = $1 LIMIT 1`, [k]);
    userCache[k] = r[0]?.id || null;
    return userCache[k];
  }

  async function lookupBank(name) {
    if (!name) return null;
    const k = name.trim().toLowerCase();
    if (k in bankCache) return bankCache[k];
    const { rows: r } = await pool.query(`SELECT id FROM banks WHERE LOWER(TRIM(name)) = $1 LIMIT 1`, [k]);
    bankCache[k] = r[0]?.id || null;
    return bankCache[k];
  }

  async function lookupConvenio(name) {
    if (!name) return null;
    const k = name.trim().toLowerCase();
    if (k in convenioCache) return convenioCache[k];
    const { rows: r } = await pool.query(`SELECT id FROM convenios WHERE LOWER(TRIM(name)) = $1 LIMIT 1`, [k]);
    convenioCache[k] = r[0]?.id || null;
    return convenioCache[k];
  }

  async function lookupTable(name, bank_id, convenio_id) {
    if (!name) return null;
    const k = `${name}|${bank_id}|${convenio_id}`.toLowerCase();
    if (k in tableCache) return tableCache[k];
    const { rows: r } = await pool.query(
      `SELECT id FROM financial_tables WHERE LOWER(TRIM(name)) = $1 LIMIT 1`, [name.trim().toLowerCase()]
    );
    tableCache[k] = r[0]?.id || null;
    return tableCache[k];
  }

  const productCache = {};
  async function lookupProduct(name) {
    if (!name) return null;
    const k = name.trim().toLowerCase();
    if (k in productCache) return productCache[k];
    const { rows: r } = await pool.query(`SELECT id FROM products WHERE LOWER(TRIM(name)) = $1 LIMIT 1`, [k]);
    productCache[k] = r[0]?.id || null;
    return productCache[k];
  }

  let imported = 0, updated = 0;
  const errors = [];

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const row of rows) {
    try {
      const proposalNumber = (row.proposta || '').trim();
      if (!proposalNumber) { errors.push({ row: row.proposta, error: 'Número de proposta vazio' }); continue; }

      const rowId        = (row.id || '').trim();
      const clientName   = (row.nome_cliente || '').trim();
      const clientCpf    = (row.cpf || '').trim();
      const value        = parseValue(row.valor);
      const createdAt    = parseDate(row.data_digitacao);
      const updatedAt    = row.data_status?.trim() ? parseDate(row.data_status) : null;
      const status       = mapStatus(row.esteira || row.situacao);
      const productText  = (row.tipo || '').trim();
      const situacao     = (row.situacao || '').trim();
      const bankText     = (row.banco || '').trim();
      const convenioText = (row.convenio || '').trim();
      const tableText    = (row.tabela || '').trim();

      const userId     = await lookupUser(row.corretor);
      const bankId     = await lookupBank(bankText);
      const convenioId = await lookupConvenio(convenioText);
      const tableId    = await lookupTable(tableText, bankId, convenioId);
      const productId  = await lookupProduct(productText);

      const useIdMatch = rowId && UUID_RE.test(rowId);

      let existingId = null;
      if (useIdMatch) {
        const { rows: r } = await pool.query('SELECT id FROM proposals WHERE id = $1', [rowId]);
        existingId = r[0]?.id || null;
      } else {
        const { rows: r } = await pool.query(
          'SELECT id FROM proposals WHERE proposal_number = $1 AND client_cpf = $2',
          [proposalNumber, clientCpf]
        );
        existingId = r[0]?.id || null;
      }

      if (existingId) {
        await pool.query(
          `UPDATE proposals SET
            client_name=$1, client_cpf=$2, value=$3, bank=$4, convenio=$5, table_id=$6,
            bank_id=$7, convenio_id=$8, status=$9, created_at=$10,
            updated_at=COALESCE($11, now()),
            tipo_proposta=$12, product=$13, product_id=$14, proposal_number=$16
           WHERE id=$15`,
          [clientName, clientCpf, value, bankText, convenioText, tableId,
           bankId, convenioId, status, createdAt, updatedAt, situacao,
           productText, productId, existingId, proposalNumber]
        );
        if (userId) await pool.query('UPDATE proposals SET user_id=$1 WHERE id=$2', [userId, existingId]);
        updated++;
      } else {
        const uid = userId || req.user.id;
        const insertId = (useIdMatch && rowId) ? rowId : undefined;
        if (insertId) {
          await pool.query(
            `INSERT INTO proposals
              (id, user_id, proposal_number, value, product, product_id, bank, convenio, table_id, bank_id, convenio_id,
               client_name, client_cpf, client_phone, status, created_at, updated_at, tipo_proposta)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'',$14,$15,COALESCE($17,now()),$16)`,
            [insertId, uid, proposalNumber, value, productText, productId, bankText, convenioText, tableId,
             bankId, convenioId, clientName, clientCpf, status, createdAt, situacao, updatedAt]
          );
        } else {
          await pool.query(
            `INSERT INTO proposals
              (user_id, proposal_number, value, product, product_id, bank, convenio, table_id, bank_id, convenio_id,
               client_name, client_cpf, client_phone, status, created_at, updated_at, tipo_proposta)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'',$13,$14,COALESCE($16,now()),$15)`,
            [uid, proposalNumber, value, productText, productId, bankText, convenioText, tableId,
             bankId, convenioId, clientName, clientCpf, status, createdAt, situacao, updatedAt]
          );
        }
        imported++;
      }
    } catch (err) {
      errors.push({ row: row.proposta, error: err.message });
    }
  }

  res.json({ imported, updated, errors });
});

// ─── PROPOSAL STATUSES ────────────────────────────────────────────────────────
app.get('/api/proposal-statuses', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM proposal_statuses ORDER BY order_index, name');
  res.json(rows);
});

app.post('/api/admin/proposal-statuses', auth, adminOnly, async (req, res) => {
  const { name, color, order_index } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });
  const { rows: [s] } = await pool.query(
    'INSERT INTO proposal_statuses (name, color, order_index) VALUES ($1,$2,$3) RETURNING *',
    [name.trim(), color || 'blue', order_index ?? 99]
  );
  res.json(s);
});

app.put('/api/admin/proposal-statuses/:id', auth, adminOnly, async (req, res) => {
  const { name, color, order_index } = req.body;
  const { rows: [s] } = await pool.query(
    'UPDATE proposal_statuses SET name=$1, color=$2, order_index=$3 WHERE id=$4 RETURNING *',
    [name, color, order_index, req.params.id]
  );
  if (!s) return res.status(404).json({ error: 'Status não encontrado' });
  res.json(s);
});

app.delete('/api/admin/proposal-statuses/:id', auth, adminOnly, async (req, res) => {
  const { rows: [s] } = await pool.query('SELECT * FROM proposal_statuses WHERE id=$1', [req.params.id]);
  if (!s) return res.status(404).json({ error: 'Status não encontrado' });
  if (s.is_system) return res.status(400).json({ error: 'Status do sistema não pode ser excluído' });
  const { rows: using } = await pool.query('SELECT COUNT(*) FROM proposals WHERE status=$1', [s.name]);
  if (parseInt(using[0].count) > 0) return res.status(400).json({ error: `${using[0].count} proposta(s) usam esse status` });
  await pool.query('DELETE FROM proposal_statuses WHERE id=$1', [req.params.id]);
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
  const isAdmin = req.user.role === 'admin' || req.user.role === 'master';
  const { corretor_id, bank, period, status, date_from, date_to, date_field } = req.query;

  const params = [];
  const extraFilters = [];

  if (!isAdmin) {
    params.push(req.user.id);
    extraFilters.push(`p.user_id = $${params.length}`);
  } else if (corretor_id) {
    params.push(corretor_id);
    extraFilters.push(`p.user_id = $${params.length}`);
  }

  if (bank) {
    params.push(bank);
    extraFilters.push(`p.bank = $${params.length}`);
  }

  if (status) {
    params.push(status);
    extraFilters.push(`p.status = $${params.length}`);
  }

  const col = date_field === 'updated_at' ? 'p.updated_at' : 'p.created_at';
  if (date_from) {
    params.push(date_from);
    extraFilters.push(`${col}::date >= $${params.length}`);
  }
  if (date_to) {
    params.push(date_to);
    extraFilters.push(`${col}::date <= $${params.length}`);
  }

  const baseWhere = extraFilters.length ? `AND ${extraFilters.join(' AND ')}` : '';

  let periodFilter = '';
  if (period === 'today') {
    periodFilter = `AND date_trunc('day', p.created_at) = date_trunc('day', now())`;
  } else if (period === 'week') {
    periodFilter = `AND p.created_at >= date_trunc('week', now())`;
  } else if (period === 'month' || !period) {
    periodFilter = `AND date_trunc('month', p.created_at) = date_trunc('month', now())`;
  }

  const todayParams = [...params];
  todayParams.push(true);
  const { rows: [today] } = await pool.query(
    `SELECT COALESCE(SUM(value),0)::numeric as value, COUNT(*)::int as count
     FROM proposals p WHERE status='Paga'
     AND date_trunc('day', p.created_at) = date_trunc('day', now()) ${baseWhere}`,
    params
  );
  const { rows: [month] } = await pool.query(
    `SELECT COALESCE(SUM(value),0)::numeric as value, COUNT(*)::int as count
     FROM proposals p WHERE status='Paga'
     AND date_trunc('month', p.created_at) = date_trunc('month', now()) ${baseWhere}`,
    params
  );
  const { rows: [periodData] } = await pool.query(
    `SELECT COALESCE(SUM(value),0)::numeric as value, COUNT(*)::int as count
     FROM proposals p WHERE status='Paga' ${periodFilter} ${baseWhere}`,
    params
  );
  const { rows: [total] } = await pool.query(
    `SELECT COUNT(*)::int as total_proposals,
            COUNT(*) FILTER (WHERE status='Paga')::int as paid,
            COUNT(*) FILTER (WHERE status='Em análise')::int as in_analysis,
            COUNT(*) FILTER (WHERE status='Aprovada')::int as approved,
            COUNT(*) FILTER (WHERE status='Digitada')::int as typed,
            COUNT(*) FILTER (WHERE status='Cancelada')::int as cancelled
     FROM proposals p WHERE 1=1 ${baseWhere}`,
    params
  );

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

  let myCommissionTotal = 0;
  if (!isAdmin) {
    const { rows: [comm] } = await pool.query(`
      SELECT COALESCE(SUM(
        p.value * COALESCE(
          (SELECT cr.comissao_corretor FROM commission_ranges cr
           WHERE cr.financial_table_id = p.table_id
             AND cr.min_value <= p.value
             AND (cr.max_value IS NULL OR cr.max_value >= p.value)
           ORDER BY cr.min_value DESC LIMIT 1),
          ft.comissao_corretor, 0
        ) / 100
      ), 0)::numeric as total
      FROM proposals p
      LEFT JOIN financial_tables ft ON ft.id = p.table_id
      WHERE p.status = 'Paga' AND p.user_id = $1
    `, [req.user.id]);
    myCommissionTotal = parseFloat(comm?.total || 0);
  }

  const avgTicket = periodData.count > 0 ? parseFloat(periodData.value) / periodData.count : 0;

  res.json({
    today: { value: parseFloat(today.value), count: today.count },
    month: { value: parseFloat(month.value), count: month.count },
    period: { value: parseFloat(periodData.value), count: periodData.count },
    avg_ticket: avgTicket,
    proposals: total,
    best_broker: bestBroker,
    top_table: topTable,
    my_points: myPoints,
    my_position: myPosition,
    my_commission_total: myCommissionTotal,
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

// ─── CONTA CORRENTE ───────────────────────────────────────────────────────────
const contaCorrenteSelect = `
  SELECT p.id, p.proposal_number, p.value, p.status, p.status_comissao,
         p.client_name, p.client_cpf, p.bank, p.created_at, p.updated_at,
         u.id as user_id, u.full_name as user_name, u.email as user_email,
         ft.name as table_name,
         ub.id as usuario_banco_id, ub.nome as usuario_banco_nome,
         COALESCE(
           (SELECT cr.comissao_corretor FROM commission_ranges cr
            WHERE cr.financial_table_id = p.table_id
              AND cr.min_value <= p.value
              AND (cr.max_value IS NULL OR cr.max_value >= p.value)
            ORDER BY cr.min_value DESC LIMIT 1),
           ft.comissao_corretor, 0
         ) as comissao_corretor_pct,
         COALESCE(p.comissao_corretor_override,
           ROUND(p.value * COALESCE(
             (SELECT cr.comissao_corretor FROM commission_ranges cr
              WHERE cr.financial_table_id = p.table_id
                AND cr.min_value <= p.value
                AND (cr.max_value IS NULL OR cr.max_value >= p.value)
              ORDER BY cr.min_value DESC LIMIT 1),
             ft.comissao_corretor, 0
           ) / 100, 2)
         ) as comissao_valor,
         COALESCE(p.comissao_empresa_override,
           ROUND(p.value * COALESCE(ft.comissao_empresa, 0) / 100, 2)
         ) as comissao_empresa_valor
  FROM proposals p
  JOIN users u ON u.id = p.user_id
  LEFT JOIN financial_tables ft ON ft.id = p.table_id
  LEFT JOIN usuarios_banco ub ON ub.id = p.usuario_banco_id
`;

// Visão do corretor
app.get('/api/conta-corrente', auth, async (req, res) => {
  const { rows } = await pool.query(
    `${contaCorrenteSelect} WHERE p.user_id = $1 AND p.status_comissao IS NOT NULL ORDER BY p.updated_at DESC`,
    [req.user.id]
  );
  const pending = rows.filter(r => r.status_comissao === 'Ag. Comissão');
  const paid    = rows.filter(r => r.status_comissao === 'Comissão Paga');
  const paid_value = paid.reduce((a, b) => a + parseFloat(b.comissao_valor || 0), 0);
  const [{ rows: [req_total] }, { rows: [prod_month] }] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(amount),0) as total, COUNT(*)::int as count
       FROM withdrawal_requests WHERE user_id=$1 AND status != 'Recusado'`,
      [req.user.id]
    ),
    pool.query(
      `SELECT COALESCE(SUM(p.value),0) as total, COUNT(*)::int as count
       FROM proposals p
       WHERE p.user_id=$1 AND p.status='Paga'
         AND DATE_TRUNC('month', p.created_at) = DATE_TRUNC('month', NOW())`,
      [req.user.id]
    ),
  ]);
  const available_balance = Math.max(0, paid_value - parseFloat(req_total.total));
  res.json({
    proposals: rows,
    summary: {
      pending_count: pending.length,
      pending_value: pending.reduce((a, b) => a + parseFloat(b.comissao_valor || 0), 0),
      paid_count: paid.length,
      paid_value,
      available_balance,
      total_withdrawn: parseFloat(req_total.total),
      withdrawn_count: req_total.count,
      production_month: parseFloat(prod_month.total),
      production_month_count: prod_month.count,
    }
  });
});

// Corretor: listar suas solicitações de saque
app.get('/api/conta-corrente/saques', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT wr.*, r.full_name as reviewed_by_name FROM withdrawal_requests wr
     LEFT JOIN users r ON r.id = wr.reviewed_by
     WHERE wr.user_id = $1 ORDER BY wr.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Corretor: criar solicitação de saque
app.post('/api/conta-corrente/saque', auth, async (req, res) => {
  const amt = parseFloat(req.body.amount);
  if (!amt || amt <= 0) return res.status(400).json({ error: 'Valor inválido' });
  // Calcular disponível
  const { rows: [paid] } = await pool.query(
    `SELECT COALESCE(SUM(ROUND(p.value * COALESCE(
       (SELECT cr.comissao_corretor FROM commission_ranges cr
        WHERE cr.financial_table_id = p.table_id
          AND cr.min_value <= p.value AND (cr.max_value IS NULL OR cr.max_value >= p.value)
        ORDER BY cr.min_value DESC LIMIT 1),
       ft.comissao_corretor, 0) / 100, 2)), 0) as paid_value
     FROM proposals p LEFT JOIN financial_tables ft ON ft.id = p.table_id
     WHERE p.user_id = $1 AND p.status_comissao = 'Comissão Paga'`,
    [req.user.id]
  );
  const { rows: [already] } = await pool.query(
    `SELECT COALESCE(SUM(amount),0) as total FROM withdrawal_requests WHERE user_id=$1 AND status != 'Recusado'`,
    [req.user.id]
  );
  const available = parseFloat(paid.paid_value) - parseFloat(already.total);
  if (Math.round(amt * 100) > Math.round(available * 100)) return res.status(400).json({ error: `Valor excede o disponível (R$ ${available.toFixed(2)})` });
  await pool.query(`INSERT INTO withdrawal_requests (user_id, amount) VALUES ($1,$2)`, [req.user.id, amt]);
  const { rows: [me] } = await pool.query(`SELECT full_name FROM users WHERE id=$1`, [req.user.id]);
  const { rows: admins } = await pool.query(`SELECT id FROM users WHERE role IN ('admin','master') AND archived_at IS NULL`);
  for (const a of admins) {
    await pool.query(`INSERT INTO notifications (user_id, message) VALUES ($1,$2)`,
      [a.id, `${me.full_name || 'Corretor'} solicitou saque de R$ ${amt.toFixed(2)}`]);
  }
  res.json({ ok: true });
});

// Admin: listar todas as solicitações de saque
app.get('/api/admin/saques', auth, adminOnly, async (req, res) => {
  const { loja_id } = req.query;
  const conditions = [];
  const values = [];
  if (loja_id) { conditions.push(`u.loja_id = $${values.length + 1}`); values.push(loja_id); }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await pool.query(`
    SELECT wr.*, u.full_name as user_name, u.email as user_email,
           u.pix_key, u.pix_key_type, r.full_name as reviewed_by_name
    FROM withdrawal_requests wr
    JOIN users u ON u.id = wr.user_id
    LEFT JOIN users r ON r.id = wr.reviewed_by
    ${where}
    ORDER BY CASE WHEN wr.status='Pendente' THEN 0 ELSE 1 END, wr.created_at DESC
  `, values);
  res.json(rows);
});

// Admin: atualizar status de solicitação de saque
app.patch('/api/admin/saques/:id', auth, adminOnly, async (req, res) => {
  const { status, notes } = req.body;
  if (!['Aprovado','Pago','Recusado'].includes(status)) return res.status(400).json({ error: 'Status inválido' });
  const { rows: [wr] } = await pool.query(
    `UPDATE withdrawal_requests SET status=$1, notes=COALESCE($2,notes), reviewed_by=$3, reviewed_at=now(), updated_at=now()
     WHERE id=$4 RETURNING *`,
    [status, notes || null, req.user.id, req.params.id]
  );
  if (!wr) return res.status(404).json({ error: 'Solicitação não encontrada' });
  const msgs = { 'Aprovado': 'Sua solicitação de saque foi aprovada!', 'Pago': 'Seu saque foi pago! Verifique sua conta PIX.', 'Recusado': 'Sua solicitação de saque não foi aprovada.' };
  await pool.query(`INSERT INTO notifications (user_id, message) VALUES ($1,$2)`, [wr.user_id, msgs[status]]);
  res.json({ ok: true });
});

// Admin: listar despesas
app.get('/api/admin/despesas', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.*, l.name as loja_name, u.full_name as created_by_name
    FROM despesas d
    LEFT JOIN lojas l ON l.id = d.loja_id
    LEFT JOIN users u ON u.id = d.created_by
    ORDER BY d.data DESC, d.created_at DESC
  `);
  res.json(rows);
});

// Admin: criar despesa
app.post('/api/admin/despesas', auth, adminOnly, async (req, res) => {
  const { loja_id, descricao, valor, data } = req.body;
  if (!descricao || !valor) return res.status(400).json({ error: 'Descrição e valor são obrigatórios' });
  const { rows: [d] } = await pool.query(
    `INSERT INTO despesas (loja_id, descricao, valor, data, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [loja_id || null, descricao.trim(), parseFloat(valor), data || new Date().toISOString().split('T')[0], req.user.id]
  );
  res.json(d);
});

// Admin: saldo por loja (empresa recebida - despesas)
app.get('/api/admin/despesas/saldo-lojas', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      l.id as loja_id,
      l.name as loja_name,
      COALESCE(emp.total_recebido, 0) as total_empresa_recebido,
      COALESCE(desp.total_despesas, 0) as total_despesas,
      COALESCE(emp.total_recebido, 0) - COALESCE(desp.total_despesas, 0) as saldo
    FROM lojas l
    LEFT JOIN (
      SELECT u.loja_id,
        SUM(CASE WHEN p.comissao_empresa_override IS NOT NULL THEN p.comissao_empresa_override
                 ELSE COALESCE(p.comissao_empresa_valor, 0) END) as total_recebido
      FROM proposals p
      JOIN users u ON u.id = p.user_id
      WHERE p.status_comissao = 'Comissão Paga' AND u.loja_id IS NOT NULL
      GROUP BY u.loja_id
    ) emp ON emp.loja_id = l.id
    LEFT JOIN (
      SELECT loja_id, SUM(valor) as total_despesas
      FROM despesas
      WHERE loja_id IS NOT NULL
      GROUP BY loja_id
    ) desp ON desp.loja_id = l.id
    ORDER BY l.name ASC
  `);
  res.json(rows);
});

// Visão do admin — resumo por corretor + lista completa
app.get('/api/admin/conta-corrente', auth, adminOnly, async (req, res) => {
  const { user_id, status_comissao, loja_id, usuario_banco_id } = req.query;

  const conditions = ['p.status_comissao IS NOT NULL'];
  const values = [];
  let i = 1;
  if (user_id) { conditions.push(`p.user_id = $${i++}`); values.push(user_id); }
  if (status_comissao) { conditions.push(`p.status_comissao = $${i++}`); values.push(status_comissao); }
  if (loja_id) { conditions.push(`u.loja_id = $${i++}`); values.push(loja_id); }
  if (usuario_banco_id) { conditions.push(`p.usuario_banco_id = $${i++}`); values.push(usuario_banco_id); }
  const where = 'WHERE ' + conditions.join(' AND ');

  const { rows: proposals } = await pool.query(
    `${contaCorrenteSelect} ${where} ORDER BY p.updated_at DESC`,
    values
  );

  const brokerConditions = ['p.status_comissao IS NOT NULL'];
  const brokerValues = [];
  let bi = 1;
  if (loja_id) { brokerConditions.push(`u.loja_id = $${bi++}`); brokerValues.push(loja_id); }
  if (usuario_banco_id) { brokerConditions.push(`p.usuario_banco_id = $${bi++}`); brokerValues.push(usuario_banco_id); }
  const brokerWhere = 'WHERE ' + brokerConditions.join(' AND ');

  const { rows: brokerSummary } = await pool.query(`
    SELECT u.id as user_id, u.full_name as user_name, u.email as user_email,
           u.pix_key, u.pix_key_type,
           COUNT(*) FILTER (WHERE p.status_comissao = 'Comissão Paga')::int as pending_count,
           GREATEST(
             COALESCE(SUM(COALESCE(p.comissao_corretor_override,
               ROUND(p.value * COALESCE(
                 (SELECT cr.comissao_corretor FROM commission_ranges cr
                  WHERE cr.financial_table_id = p.table_id
                    AND cr.min_value <= p.value AND (cr.max_value IS NULL OR cr.max_value >= p.value)
                  ORDER BY cr.min_value DESC LIMIT 1), ft.comissao_corretor, 0) / 100, 2)
             )) FILTER (WHERE p.status_comissao = 'Comissão Paga'), 0)
             - COALESCE(MAX(wr_paid.total_paid), 0),
             0
           )::numeric as pending_value,
           COALESCE(MAX(wr_paid.count_paid), 0)::int as paid_count,
           COALESCE(MAX(wr_paid.total_paid), 0)::numeric as paid_value,
           COALESCE(SUM(COALESCE(p.comissao_empresa_override,
             ROUND(p.value * COALESCE(ft.comissao_empresa, 0) / 100, 2))
           ) FILTER (WHERE p.status_comissao = 'Ag. Comissão'), 0)::numeric as empresa_pending_value,
           COALESCE(SUM(COALESCE(p.comissao_empresa_override,
             ROUND(p.value * COALESCE(ft.comissao_empresa, 0) / 100, 2))
           ) FILTER (WHERE p.status_comissao = 'Comissão Paga'), 0)::numeric as empresa_paid_value
    FROM proposals p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN financial_tables ft ON ft.id = p.table_id
    LEFT JOIN (
      SELECT user_id, SUM(amount)::numeric as total_paid, COUNT(*)::int as count_paid
      FROM withdrawal_requests WHERE status = 'Pago'
      GROUP BY user_id
    ) wr_paid ON wr_paid.user_id = u.id
    ${brokerWhere}
    GROUP BY u.id, u.full_name, u.email
    ORDER BY pending_value DESC
  `, brokerValues);

  // Resumo por usuario_banco — respeita filtros de loja e usuario_banco
  const ubConditions = ['p.status_comissao IS NOT NULL'];
  const ubValues = [];
  let ui = 1;
  if (loja_id) { ubConditions.push(`u.loja_id = $${ui++}`); ubValues.push(loja_id); }
  if (usuario_banco_id) { ubConditions.push(`p.usuario_banco_id = $${ui++}`); ubValues.push(usuario_banco_id); }
  const ubWhere = 'WHERE ' + ubConditions.join(' AND ');

  const { rows: ubSummary } = await pool.query(`
    SELECT ub.id as usuario_banco_id, ub.nome as usuario_banco_nome,
           COUNT(*) FILTER (WHERE p.status_comissao = 'Ag. Comissão')::int as pending_count,
           COALESCE(SUM(COALESCE(p.comissao_corretor_override,
             ROUND(p.value * COALESCE(ft.comissao_corretor, 0) / 100, 2))
           ) FILTER (WHERE p.status_comissao = 'Ag. Comissão'), 0)::numeric as pending_value,
           COUNT(*) FILTER (WHERE p.status_comissao = 'Comissão Paga')::int as paid_count,
           COALESCE(SUM(COALESCE(p.comissao_corretor_override,
             ROUND(p.value * COALESCE(ft.comissao_corretor, 0) / 100, 2))
           ) FILTER (WHERE p.status_comissao = 'Comissão Paga'), 0)::numeric as paid_value,
           COALESCE(SUM(COALESCE(p.comissao_empresa_override,
             ROUND(p.value * COALESCE(ft.comissao_empresa, 0) / 100, 2))
           ) FILTER (WHERE p.status_comissao = 'Ag. Comissão'), 0)::numeric as empresa_pending_value,
           COALESCE(SUM(COALESCE(p.comissao_empresa_override,
             ROUND(p.value * COALESCE(ft.comissao_empresa, 0) / 100, 2))
           ) FILTER (WHERE p.status_comissao = 'Comissão Paga'), 0)::numeric as empresa_paid_value
    FROM proposals p
    JOIN users u ON u.id = p.user_id
    LEFT JOIN financial_tables ft ON ft.id = p.table_id
    JOIN usuarios_banco ub ON ub.id = p.usuario_banco_id
    ${ubWhere}
    GROUP BY ub.id, ub.nome
    ORDER BY ub.nome ASC
  `, ubValues);

  res.json({ proposals, brokers: brokerSummary, usuariosBanco: ubSummary });
});

// Marcar propostas como comissão paga
app.post('/api/admin/conta-corrente/pay', auth, adminOnly, async (req, res) => {
  const { proposal_ids, notes } = req.body;
  if (!Array.isArray(proposal_ids) || proposal_ids.length === 0) {
    return res.status(400).json({ error: 'Nenhuma proposta selecionada' });
  }
  const placeholders = proposal_ids.map((_, idx) => `$${idx + 1}`).join(',');
  await pool.query(
    `UPDATE proposals SET status_comissao = 'Comissão Paga', updated_at = now() WHERE id IN (${placeholders})`,
    proposal_ids
  );
  // Registra pagamento por corretor
  const { rows: affected } = await pool.query(
    `SELECT p.user_id,
            COALESCE(SUM(ROUND(p.value * COALESCE(
              (SELECT cr.comissao_corretor FROM commission_ranges cr
               WHERE cr.financial_table_id = p.table_id
                 AND cr.min_value <= p.value AND (cr.max_value IS NULL OR cr.max_value >= p.value)
               ORDER BY cr.min_value DESC LIMIT 1), ft.comissao_corretor, 0) / 100, 2)), 0)::numeric as total_value,
            COUNT(*)::int as proposal_count
     FROM proposals p LEFT JOIN financial_tables ft ON ft.id = p.table_id
     WHERE p.id IN (${placeholders}) GROUP BY p.user_id`,
    proposal_ids
  );
  for (const row of affected) {
    await pool.query(
      'INSERT INTO commission_payments (user_id, total_value, proposal_count, notes, paid_by) VALUES ($1,$2,$3,$4,$5)',
      [row.user_id, row.total_value, row.proposal_count, notes || '', req.user.id]
    );
  }
  res.json({ ok: true, updated: proposal_ids.length });
});

// Excluir pagamento de comissão (saída) — somente master
app.delete('/api/admin/commission-payments/:id', auth, masterOnly, async (req, res) => {
  const { rows: [cp] } = await pool.query('SELECT id FROM commission_payments WHERE id=$1', [req.params.id]);
  if (!cp) return res.status(404).json({ error: 'Registro não encontrado' });
  await pool.query('DELETE FROM commission_payments WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Excluir múltiplos pagamentos (bulk) — somente master
app.post('/api/admin/commission-payments/bulk-delete', auth, masterOnly, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'IDs obrigatórios' });
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  await pool.query(`DELETE FROM commission_payments WHERE id IN (${placeholders})`, ids);
  res.json({ ok: true, deleted: ids.length });
});

// Histórico de pagamentos de comissão
app.get('/api/admin/conta-corrente/payments', auth, adminOnly, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT cp.*, u.full_name as user_name, u.email as user_email,
           pb.full_name as paid_by_name
    FROM commission_payments cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN users pb ON pb.id = cp.paid_by
    ORDER BY cp.created_at DESC
    LIMIT 100
  `);
  res.json(rows);
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
