const express = require('express');
const pool = require('../db');
const { sanitizeIdentifier } = require('../utils/sanitize');
const router = express.Router();

// CREATE
router.post('/create', async (req, res) => {
  const userId = req.user.userId;
  const client = await pool.connect();
  try {
    // Get the user's email
    const userResult = await pool.query('SELECT email FROM users WHERE id=$1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const email = userResult.rows[0].email;
    const emailPrefix = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');

    // Database name = exactly what user provides (or "default" if none given)
    const rawName = req.body.name ? req.body.name : 'default';
    const dbName = sanitizeIdentifier(rawName.toLowerCase());

    // Owner/user role stays fixed per-user, regardless of how many databases they create
    const dbUser = sanitizeIdentifier(`user_${emailPrefix}`);

    // Check if this exact database name is already taken (since names are no longer auto-prefixed, collisions across users are possible)
    const existing = await pool.query('SELECT * FROM databases WHERE db_name=$1', [dbName]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Database name "${dbName}" is already taken` });
    }

    // Create the role only if it doesn't already exist (since it's shared across this user's databases)
    const dbPass = Math.random().toString(36).slice(-12);
    const roleCheck = await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [dbUser]);
    if (roleCheck.rows.length === 0) {
      await client.query(`CREATE USER ${dbUser} WITH PASSWORD '${dbPass}'`);
    }

    await client.query(`CREATE DATABASE ${dbName} OWNER ${dbUser}`);

    await pool.query(
      'INSERT INTO databases (owner_id, db_name, db_user) VALUES ($1, $2, $3)',
      [userId, dbName, dbUser]
    );
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'create_database', JSON.stringify({ dbName })]
    );

    res.status(201).json({
      dbName,
      dbUser,
      connectionString: `postgresql://${dbUser}:${dbPass}@${process.env.PG_HOST}:${process.env.PG_PORT}/${dbName}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// LIST
router.get('/', async (req, res) => {
  const result = await pool.query(
    'SELECT id, db_name, db_user, status, created_at FROM databases WHERE owner_id=$1 ORDER BY created_at DESC',
    [req.user.userId]
  );
  res.json(result.rows);
});


// USAGE STATS
router.get('/:dbName/usage', async (req, res) => {
  const userId = req.user.userId;
  try {
    const dbName = sanitizeIdentifier(req.params.dbName);

    const owned = await pool.query(
      'SELECT * FROM databases WHERE db_name=$1 AND owner_id=$2',
      [dbName, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(403).json({ error: 'Not your database' });
    }

    const sizeResult = await pool.query(
      `SELECT pg_size_pretty(pg_database_size($1)) as size`,
      [dbName]
    );
    const connResult = await pool.query(
      `SELECT count(*) FROM pg_stat_activity WHERE datname = $1`,
      [dbName]
    );

    res.json({
      dbName,
      size: sizeResult.rows[0].size,
      activeConnections: parseInt(connResult.rows[0].count, 10)
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete('/:dbName', async (req, res) => {
  const userId = req.user.userId;
  const client = await pool.connect();
  try {
    const dbName = sanitizeIdentifier(req.params.dbName);

    const owned = await pool.query(
      'SELECT * FROM databases WHERE db_name=$1 AND owner_id=$2',
      [dbName, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(403).json({ error: 'Not your database' });
    }

    await client.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
      [dbName]
    );
    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await client.query(`DROP USER IF EXISTS ${owned.rows[0].db_user}`);

    await pool.query('UPDATE databases SET status=$1 WHERE db_name=$2', ['deleted', dbName]);
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'delete_database', JSON.stringify({ dbName })]
    );

    res.json({ message: 'Database deleted' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// RESET PASSWORD
router.post('/:dbName/reset-password', async (req, res) => {
  const userId = req.user.userId;
  const client = await pool.connect();
  try {
    const dbName = sanitizeIdentifier(req.params.dbName);

    const owned = await pool.query(
      'SELECT * FROM databases WHERE db_name=$1 AND owner_id=$2',
      [dbName, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(403).json({ error: 'Not your database' });
    }

    const newPass = Math.random().toString(36).slice(-12);
    await client.query(`ALTER USER ${owned.rows[0].db_user} WITH PASSWORD '${newPass}'`);

    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'reset_password', JSON.stringify({ dbName })]
    );

    res.json({
      dbUser: owned.rows[0].db_user,
      connectionString: `postgresql://${owned.rows[0].db_user}:${newPass}@${process.env.PG_HOST}:${process.env.PG_PORT}/${dbName}`
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;