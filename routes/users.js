const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, username, role, created_at 
    FROM users 
    ORDER BY id
  `).all();

  res.json({ success: true, data: users });
});

router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: '用户名和密码不能为空' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: '密码长度至少6位' });
  }

  const validRoles = ['admin', 'tester'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: '无效的用户角色' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(400).json({ success: false, message: '用户名已存在' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, hash, role);

  res.json({ success: true, message: '用户创建成功', data: { id: result.lastInsertRowid, username, role } });
});

router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { role, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  if (role) {
    const validRoles = ['admin', 'tester'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: '无效的用户角色' });
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
  }

  if (password) {
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少6位' });
    }
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, id);
  }

  res.json({ success: true, message: '用户更新成功' });
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: '不能删除当前登录用户' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }

  const testCount = db.prepare('SELECT COUNT(*) as count FROM test_records WHERE user_id = ?').get(id);
  if (testCount.count > 0) {
    return res.status(400).json({ success: false, message: '该用户有关联的试验记录，无法删除' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true, message: '用户删除成功' });
});

module.exports = router;
