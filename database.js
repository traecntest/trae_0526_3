const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'test_platform.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
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
  `);

  const adminCheck = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
  if (adminCheck.count === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
    console.log('默认管理员账户已创建: admin / admin123');
  }
}

module.exports = { db, initDatabase };
