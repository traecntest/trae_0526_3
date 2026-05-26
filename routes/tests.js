const express = require('express');
const { db } = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

function calculateShearStrength(peakLoad, width, thickness) {
  return (peakLoad * 0.75) / (width * thickness);
}

router.get('/', authenticateToken, (req, res) => {
  const { specimen_id, user_id, start_date, end_date } = req.query;

  let sql = `
    SELECT tr.*, s.specimen_number, s.material_type, s.length, s.width, s.thickness,
           u.username, u.username as operator
    FROM test_records tr
    JOIN specimens s ON tr.specimen_id = s.id
    JOIN users u ON tr.user_id = u.id
    WHERE 1=1
  `;
  const params = [];

  if (specimen_id) {
    sql += ' AND tr.specimen_id = ?';
    params.push(specimen_id);
  }

  if (user_id) {
    sql += ' AND tr.user_id = ?';
    params.push(user_id);
  }

  if (start_date) {
    sql += ' AND tr.test_time >= ?';
    params.push(start_date);
  }

  if (end_date) {
    sql += ' AND tr.test_time <= ?';
    params.push(end_date);
  }

  sql += ' ORDER BY tr.test_time DESC';

  const records = db.prepare(sql).all(...params);
  res.json({ success: true, data: records });
});

router.get('/:id', authenticateToken, (req, res) => {
  const record = db.prepare(`
    SELECT tr.*, s.specimen_number, s.material_type, s.length, s.width, s.thickness,
           u.username, u.username as operator
    FROM test_records tr
    JOIN specimens s ON tr.specimen_id = s.id
    JOIN users u ON tr.user_id = u.id
    WHERE tr.id = ?
  `).get(req.params.id);

  if (!record) {
    return res.status(404).json({ success: false, message: '试验记录不存在' });
  }

  const dataPoints = db.prepare('SELECT * FROM data_points WHERE test_record_id = ? ORDER BY timestamp').all(req.params.id);

  res.json({ success: true, data: { ...record, data_points: dataPoints } });
});

router.post('/', authenticateToken, (req, res) => {
  const { specimen_id, peak_load, yield_load, yield_displacement, max_load, max_displacement, displacement_at_peak, data_points, remarks } = req.body;

  if (!specimen_id || peak_load === undefined || peak_load === null) {
    return res.status(400).json({ success: false, message: '请填写试样ID和峰值载荷' });
  }

  const specimen = db.prepare('SELECT * FROM specimens WHERE id = ?').get(specimen_id);
  if (!specimen) {
    return res.status(404).json({ success: false, message: '试样不存在' });
  }

  const shear_strength = calculateShearStrength(peak_load, specimen.width, specimen.thickness);

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO test_records (specimen_id, user_id, peak_load, shear_strength, 
                                  yield_load, yield_displacement, max_load, max_displacement, displacement_at_peak, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      specimen_id, req.user.id, peak_load, shear_strength,
      yield_load || null, yield_displacement || null,
      max_load || null, max_displacement || null,
      displacement_at_peak || null,
      remarks || null
    );

    if (data_points && Array.isArray(data_points) && data_points.length > 0) {
      const insertPoint = db.prepare('INSERT INTO data_points (test_record_id, timestamp, load, displacement) VALUES (?, ?, ?, ?)');
      for (const point of data_points) {
        if (point.timestamp !== undefined && point.load !== undefined) {
          insertPoint.run(result.lastInsertRowid, point.timestamp, point.load, point.displacement || null);
        }
      }
    }

    return result.lastInsertRowid;
  });

  try {
    const recordId = tx();
    res.json({ 
      success: true, 
      message: '试验记录创建成功', 
      data: { 
        id: recordId, 
        shear_strength,
        specimen_number: specimen.specimen_number
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '创建试验记录失败' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { id } = req.params;

  const record = db.prepare('SELECT * FROM test_records WHERE id = ?').get(id);
  if (!record) {
    return res.status(404).json({ success: false, message: '试验记录不存在' });
  }

  db.prepare('DELETE FROM test_records WHERE id = ?').run(id);
  res.json({ success: true, message: '试验记录删除成功' });
});

router.get('/stats/summary', authenticateToken, (req, res) => {
  const totalTests = db.prepare('SELECT COUNT(*) as count FROM test_records').get().count;
  const totalSpecimens = db.prepare('SELECT COUNT(*) as count FROM specimens').get().count;
  const avgStrength = db.prepare('SELECT AVG(shear_strength) as avg FROM test_records').get().avg || 0;
  const maxStrength = db.prepare('SELECT MAX(shear_strength) as max FROM test_records').get().max || 0;

  const recentTests = db.prepare(`
    SELECT tr.*, s.specimen_number, s.material_type
    FROM test_records tr
    JOIN specimens s ON tr.specimen_id = s.id
    ORDER BY tr.test_time DESC
    LIMIT 5
  `).all();

  const materialStats = db.prepare(`
    SELECT s.material_type, 
           COUNT(*) as test_count,
           AVG(tr.shear_strength) as avg_strength,
           MAX(tr.shear_strength) as max_strength,
           MIN(tr.shear_strength) as min_strength
    FROM test_records tr
    JOIN specimens s ON tr.specimen_id = s.id
    GROUP BY s.material_type
    ORDER BY test_count DESC
  `).all();

  res.json({
    success: true,
    data: {
      summary: {
        total_tests: totalTests,
        total_specimens: totalSpecimens,
        avg_strength: Number(avgStrength.toFixed(4)),
        max_strength: Number(maxStrength.toFixed(4))
      },
      recent_tests: recentTests,
      material_stats: materialStats
    }
  });
});

module.exports = router;
