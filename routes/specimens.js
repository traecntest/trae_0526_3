const express = require('express');
const { db } = require('../database');
const { authenticateToken } = require('./auth');

const router = express.Router();

router.get('/', authenticateToken, (req, res) => {
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

  const specimens = db.prepare(sql).all(...params);
  res.json({ success: true, data: specimens });
});

router.get('/:id', authenticateToken, (req, res) => {
  const specimen = db.prepare('SELECT * FROM specimens WHERE id = ?').get(req.params.id);

  if (!specimen) {
    return res.status(404).json({ success: false, message: '试样不存在' });
  }

  res.json({ success: true, data: specimen });
});

router.post('/', authenticateToken, (req, res) => {
  const { specimen_number, length, width, thickness, material_type, layer_count, description } = req.body;

  if (!specimen_number || !length || !width || !thickness || !material_type) {
    return res.status(400).json({ success: false, message: '请填写所有必填字段' });
  }

  const existing = db.prepare('SELECT id FROM specimens WHERE specimen_number = ?').get(specimen_number);
  if (existing) {
    return res.status(400).json({ success: false, message: '试样编号已存在' });
  }

  const result = db.prepare(`
    INSERT INTO specimens (specimen_number, length, width, thickness, material_type, layer_count, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(specimen_number, length, width, thickness, material_type, layer_count || null, description || null);

  res.json({ 
    success: true, 
    message: '试样创建成功', 
    data: { id: result.lastInsertRowid, specimen_number, material_type }
  });
});

router.put('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { specimen_number, length, width, thickness, material_type, layer_count, description } = req.body;

  const specimen = db.prepare('SELECT * FROM specimens WHERE id = ?').get(id);
  if (!specimen) {
    return res.status(404).json({ success: false, message: '试样不存在' });
  }

  if (specimen_number && specimen_number !== specimen.specimen_number) {
    const existing = db.prepare('SELECT id FROM specimens WHERE specimen_number = ?').get(specimen_number);
    if (existing) {
      return res.status(400).json({ success: false, message: '试样编号已存在' });
    }
  }

  db.prepare(`
    UPDATE specimens SET 
      specimen_number = COALESCE(?, specimen_number),
      length = COALESCE(?, length),
      width = COALESCE(?, width),
      thickness = COALESCE(?, thickness),
      material_type = COALESCE(?, material_type),
      layer_count = COALESCE(?, layer_count),
      description = COALESCE(?, description)
    WHERE id = ?
  `).run(
    specimen_number || null,
    length || null,
    width || null,
    thickness || null,
    material_type || null,
    layer_count !== undefined ? layer_count : null,
    description !== undefined ? description : null,
    id
  );

  res.json({ success: true, message: '试样更新成功' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const { id } = req.params;

  const specimen = db.prepare('SELECT * FROM specimens WHERE id = ?').get(id);
  if (!specimen) {
    return res.status(404).json({ success: false, message: '试样不存在' });
  }

  const testCount = db.prepare('SELECT COUNT(*) as count FROM test_records WHERE specimen_id = ?').get(id);
  if (testCount.count > 0) {
    return res.status(400).json({ success: false, message: '该试样有关联的试验记录，无法删除' });
  }

  db.prepare('DELETE FROM specimens WHERE id = ?').run(id);
  res.json({ success: true, message: '试样删除成功' });
});

module.exports = router;
