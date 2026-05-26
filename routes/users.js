const express = require('express');
const bcrypt = require('bcryptjs');
const { get, all, run } = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await all(`
      SELECT id, username, role, created_at 
      FROM users 
      ORDER BY id
    `);

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
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

  try {
    const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const result = await run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hash, role]);

    res.json({ success: true, message: '用户创建成功', data: { id: result.lastID, username, role } });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { role, password } = req.body;

  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    if (role) {
      const validRoles = ['admin', 'tester'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: '无效的用户角色' });
      }
      await run('UPDATE users SET role = ? WHERE id = ?', [role, id]);
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ success: false, message: '密码长度至少6位' });
      }
      const hash = bcrypt.hashSync(password, 10);
      await run('UPDATE users SET password = ? WHERE id = ?', [hash, id]);
    }

    res.json({ success: true, message: '用户更新成功' });
  } catch (error) {
    console.error('更新用户错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ success: false, message: '不能删除当前登录用户' });
  }

  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }

    const testCount = await get('SELECT COUNT(*) as count FROM test_records WHERE user_id = ?', [id]);
    if (testCount.count > 0) {
      return res.status(400).json({ success: false, message: '该用户有关联的试验记录，无法删除' });
    }

    await run('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
