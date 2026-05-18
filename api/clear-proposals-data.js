const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false,
});

async function clearData() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ordem correta para evitar violação de FK
    await client.query('DELETE FROM user_badges');
    await client.query('DELETE FROM user_streaks');
    await client.query('DELETE FROM user_points');
    await client.query('DELETE FROM commission_payments');
    await client.query('DELETE FROM withdrawal_requests');
    await client.query('DELETE FROM notifications');
    await client.query('DELETE FROM proposals');

    await client.query('COMMIT');
    console.log('Dados limpos com sucesso:');
    console.log('  ✓ proposals');
    console.log('  ✓ withdrawal_requests');
    console.log('  ✓ commission_payments');
    console.log('  ✓ user_points');
    console.log('  ✓ user_badges');
    console.log('  ✓ user_streaks');
    console.log('  ✓ notifications');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro — rollback feito:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

clearData();
