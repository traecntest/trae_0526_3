const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'test_platform.db');
const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function initDatabase() {
  const initSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'tester',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS specimens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specimen_number TEXT UNIQUE NOT NULL,
      length REAL NOT NULL,
      width REAL NOT NULL,
      thickness REAL NOT NULL,
      material_type TEXT NOT NULL,
      layer_count INTEGER,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS test_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      specimen_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      peak_load REAL NOT NULL,
      shear_strength REAL NOT NULL,
      yield_load REAL,
      yield_displacement REAL,
      max_load REAL,
      max_displacement REAL,
      displacement_at_peak REAL,
      test_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      remarks TEXT,
      FOREIGN KEY (specimen_id) REFERENCES specimens(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS data_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      test_record_id INTEGER NOT NULL,
      timestamp REAL NOT NULL,
      load REAL NOT NULL,
      displacement REAL,
      FOREIGN KEY (test_record_id) REFERENCES test_records(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_data_points_test_id ON data_points(test_record_id);
    CREATE INDEX IF NOT EXISTS idx_test_records_specimen_id ON test_records(specimen_id);
    CREATE INDEX IF NOT EXISTS idx_test_records_user_id ON test_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_test_records_test_time ON test_records(test_time);
  `;

  db.serialize(async () => {
    db.exec('PRAGMA foreign_keys = ON');
    
    const statements = initSQL.split(';').filter(s => s.trim());
    for (const sql of statements) {
      await run(sql);
    }

    const adminCheck = await get('SELECT COUNT(*) as count FROM users WHERE username = ?', ['admin']);
    if (adminCheck.count === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', ['admin', hash, 'admin']);
      console.log('默认管理员账户已创建: admin / admin123');
    }
  });
}

module.exports = { db, run, get, all, initDatabase };
