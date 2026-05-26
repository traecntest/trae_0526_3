const express = require('express');
const { get, all, run } = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  const { search, material_type } = req.query;

  let sql = 'SELECT * FROM specimens WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (specimen_number LIKE ? OR material_type LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (material_type) {
    sql += ' AND material_type = ?';
    params.push(material_type);
  }

  sql += ' ORDER BY id DESC';

  try {
    const specimens = await all(sql, params);
    res.json({ success: true, data: specimens });
  } catch (error) {
    console.error('获取试样列表错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const specimen = await get('SELECT * FROM specimens WHERE id = ?', [req.params.id]);

    if (!specimen) {
      return res.status(404).json({ success: false, message: '试样不存在' });
    }

    res.json({ success: true, data: specimen });
  } catch (error) {
    console.error('获取试样详情错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { specimen_number, length, width, thickness, material_type, layer_count, description } = req.body;

  if (!specimen_number || !length || !width || !thickness || !material_type) {
    return res.status(400).json({ success: false, message: '请填写所有必填字段' });
  }

  try {
    const existing = await get('SELECT id FROM specimens WHERE specimen_number = ?', [specimen_number]);
    if (existing) {
      return res.status(400).json({ success: false, message: '试样编号已存在' });
    }

    const result = await run(`
      INSERT INTO specimens (specimen_number, length, width, thickness, material_type, layer_count, description)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [specimen_number, length, width, thickness, material_type, layer_count || null, description || null]);

    res.json({ 
      success: true, 
      message: '试样创建成功', 
      data: { id: result.lastID, specimen_number, material_type }
    });
  } catch (error) {
    console.error('创建试样错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { specimen_number, length, width, thickness, material_type, layer_count, description } = req.body;

  try {
    const specimen = await get('SELECT * FROM specimens WHERE id = ?', [id]);
    if (!specimen) {
      return res.status(404).json({ success: false, message: '试样不存在' });
    }

    if (specimen_number && specimen_number !== specimen.specimen_number) {
      const existing = await get('SELECT id FROM specimens WHERE specimen_number = ?', [specimen_number]);
      if (existing) {
        return res.status(400).json({ success: false, message: '试样编号已存在' });
      }
    }

    await run(`
      UPDATE specimens SET 
        specimen_number = COALESCE(?, specimen_number),
        length = COALESCE(?, length),
        width = COALESCE(?, width),
        thickness = COALESCE(?, thickness),
        material_type = COALESCE(?, material_type),
        layer_count = COALESCE(?, layer_count),
        description = COALESCE(?, description)
      WHERE id = ?
    `, [
      specimen_number || null,
      length || null,
      width || null,
      thickness || null,
      material_type || null,
      layer_count !== undefined ? layer_count : null,
      description !== undefined ? description : null,
      id
    ]);

    res.json({ success: true, message: '试样更新成功' });
  } catch (error) {
    console.error('更新试样错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const specimen = await get('SELECT * FROM specimens WHERE id = ?', [id]);
    if (!specimen) {
      return res.status(404).json({ success: false, message: '试样不存在' });
    }

    const testCount = await get('SELECT COUNT(*) as count FROM test_records WHERE specimen_id = ?', [id]);
    if (testCount.count > 0) {
      return res.status(400).json({ success: false, message: '该试样有关联的试验记录，无法删除' });
    }

    await run('DELETE FROM specimens WHERE id = ?', [id]);
    res.json({ success: true, message: '试样删除成功' });
  } catch (error) {
    console.error('删除试样错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
