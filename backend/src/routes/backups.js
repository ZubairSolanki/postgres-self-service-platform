const express = require('express');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const { sanitizeIdentifier } = require('../utils/sanitize');
const router = express.Router();

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// CREATE BACKUP
router.post('/:dbName', async (req, res) => {
  const userId = req.user.userId;
  const dbName = sanitizeIdentifier(req.params.dbName);

  const owned = await pool.query(
    'SELECT * FROM databases WHERE db_name=$1 AND owner_id=$2',
    [dbName, userId]
  );
  if (owned.rows.length === 0) {
    return res.status(403).json({ error: 'Not your database' });
  }

 const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const formattedDate = `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
const fileName = `${dbName}_${formattedDate}.sql`;

  const filePath = path.join(BACKUP_DIR, fileName);

  const args = [
    '-h', process.env.PG_HOST,
    '-U', process.env.PG_ADMIN_USER,
    '-p', process.env.PG_PORT,
    '-f', filePath,
    dbName
  ];

  execFile('pg_dump', args, { env: { ...process.env, PGPASSWORD: process.env.PG_ADMIN_PASSWORD } }, async (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    try {
      await pool.query(
        'INSERT INTO backups (database_id, file_name) VALUES ($1, $2)',
        [owned.rows[0].id, fileName]
      );
      await pool.query(
        'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
        [userId, 'backup_database', JSON.stringify({ dbName, fileName })]
      );
      res.status(201).json({ message: 'Backup created', fileName });
    } catch (dbErr) {
      res.status(500).json({ error: dbErr.message });
    }
  });
});

// LIST BACKUPS for a database
router.get('/:dbName', async (req, res) => {
  const userId = req.user.userId;
  const dbName = sanitizeIdentifier(req.params.dbName);

  const result = await pool.query(
    `SELECT b.id, b.file_name, b.created_at 
     FROM backups b 
     JOIN databases d ON b.database_id = d.id 
     WHERE d.db_name=$1 AND d.owner_id=$2 
     ORDER BY b.created_at DESC`,
    [dbName, userId]
  );
  res.json(result.rows);
});

// RESTORE from a backup file
router.post('/:dbName/restore/:fileName', async (req, res) => {
  const userId = req.user.userId;
  const dbName = sanitizeIdentifier(req.params.dbName);
  const fileName = req.params.fileName;

  const owned = await pool.query(
    'SELECT * FROM databases WHERE db_name=$1 AND owner_id=$2',
    [dbName, userId]
  );
  if (owned.rows.length === 0) {
    return res.status(403).json({ error: 'Not your database' });
  }

  const backupCheck = await pool.query(
    'SELECT * FROM backups WHERE database_id=$1 AND file_name=$2',
    [owned.rows[0].id, fileName]
  );
  if (backupCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Backup not found for this database' });
  }

  const filePath = path.join(BACKUP_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file missing on disk' });
  }

  const args = [
    '-h', process.env.PG_HOST,
    '-U', process.env.PG_ADMIN_USER,
    '-p', process.env.PG_PORT,
    '-d', dbName,
    '-f', filePath
  ];

  execFile('psql', args, { env: { ...process.env, PGPASSWORD: process.env.PG_ADMIN_PASSWORD } }, async (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr || err.message });
    }
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, details) VALUES ($1, $2, $3)',
      [userId, 'restore_database', JSON.stringify({ dbName, fileName })]
    );
    res.json({ message: 'Restore complete' });
  });
});

// DOWNLOAD a backup file
router.get('/:dbName/download/:fileName', async (req, res) => {
  const userId = req.user.userId;
  const dbName = sanitizeIdentifier(req.params.dbName);
  const fileName = req.params.fileName;

  const owned = await pool.query(
    'SELECT * FROM databases WHERE db_name=$1 AND owner_id=$2',
    [dbName, userId]
  );
  if (owned.rows.length === 0) {
    return res.status(403).json({ error: 'Not your database' });
  }

  const backupCheck = await pool.query(
    'SELECT * FROM backups WHERE database_id=$1 AND file_name=$2',
    [owned.rows[0].id, fileName]
  );
  if (backupCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Backup not found for this database' });
  }

  const filePath = path.join(BACKUP_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Backup file missing on disk' });
  }

  res.download(filePath, fileName);
});

module.exports = router;