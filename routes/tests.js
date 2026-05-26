const express = require('express');
const { get, all, run } = require('../database');
const { authenticateToken, requireAdmin } = require('./auth');

const router = express.Router();

function calculateShearStrength(peakLoad, width, thickness) {
  return (peakLoad * 0.75) / (width * thickness);
}

router.get('/', authenticateToken, async (req, res) => {
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

  try {
    const records = await all(sql, params);
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取试验列表错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/stats/summary', authenticateToken, async (req, res) => {
  try {
    const totalTests = await get('SELECT COUNT(*) as count FROM test_records');
    const totalSpecimens = await get('SELECT COUNT(*) as count FROM specimens');
    const avgStrength = await get('SELECT AVG(shear_strength) as avg FROM test_records');
    const maxStrength = await get('SELECT MAX(shear_strength) as max FROM test_records');

    const recentTests = await all(`
      SELECT tr.*, s.specimen_number, s.material_type
      FROM test_records tr
      JOIN specimens s ON tr.specimen_id = s.id
      ORDER BY tr.test_time DESC
      LIMIT 5
    `);

    const materialStats = await all(`
      SELECT s.material_type, 
             COUNT(*) as test_count,
             AVG(tr.shear_strength) as avg_strength,
             MAX(tr.shear_strength) as max_strength,
             MIN(tr.shear_strength) as min_strength
      FROM test_records tr
      JOIN specimens s ON tr.specimen_id = s.id
      GROUP BY s.material_type
      ORDER BY test_count DESC
    `);

    res.json({
      success: true,
      data: {
        summary: {
          total_tests: totalTests.count,
          total_specimens: totalSpecimens.count,
          avg_strength: Number((avgStrength.avg || 0).toFixed(4)),
          max_strength: Number((maxStrength.max || 0).toFixed(4))
        },
        recent_tests: recentTests,
        material_stats: materialStats
      }
    });
  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const record = await get(`
      SELECT tr.*, s.specimen_number, s.material_type, s.length, s.width, s.thickness,
             u.username, u.username as operator
      FROM test_records tr
      JOIN specimens s ON tr.specimen_id = s.id
      JOIN users u ON tr.user_id = u.id
      WHERE tr.id = ?
    `, [req.params.id]);

    if (!record) {
      return res.status(404).json({ success: false, message: '试验记录不存在' });
    }

    const dataPoints = await all('SELECT * FROM data_points WHERE test_record_id = ? ORDER BY timestamp', [req.params.id]);

    res.json({ success: true, data: { ...record, data_points: dataPoints } });
  } catch (error) {
    console.error('获取试验详情错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { specimen_id, peak_load, yield_load, yield_displacement, max_load, max_displacement, displacement_at_peak, data_points, remarks } = req.body;

  if (!specimen_id || peak_load === undefined || peak_load === null) {
    return res.status(400).json({ success: false, message: '请填写试样ID和峰值载荷' });
  }

  try {
    const specimen = await get('SELECT * FROM specimens WHERE id = ?', [specimen_id]);
    if (!specimen) {
      return res.status(404).json({ success: false, message: '试样不存在' });
    }

    const shear_strength = calculateShearStrength(peak_load, specimen.width, specimen.thickness);

    const result = await run(`
      INSERT INTO test_records (specimen_id, user_id, peak_load, shear_strength, 
                                  yield_load, yield_displacement, max_load, max_displacement, displacement_at_peak, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      specimen_id, req.user.id, peak_load, shear_strength,
      yield_load || null, yield_displacement || null,
      max_load || null, max_displacement || null,
      displacement_at_peak || null,
      remarks || null
    ]);

    const recordId = result.lastID;

    if (data_points && Array.isArray(data_points) && data_points.length > 0) {
      for (const point of data_points) {
        if (point.timestamp !== undefined && point.load !== undefined) {
          await run('INSERT INTO data_points (test_record_id, timestamp, load, displacement) VALUES (?, ?, ?, ?)', 
            [recordId, point.timestamp, point.load, point.displacement || null]);
        }
      }
    }

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
    console.error('创建试验记录错误:', error);
    res.status(500).json({ success: false, message: '创建试验记录失败' });
  }
});

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const record = await get('SELECT * FROM test_records WHERE id = ?', [id]);
    if (!record) {
      return res.status(404).json({ success: false, message: '试验记录不存在' });
    }

    await run('DELETE FROM test_records WHERE id = ?', [id]);
    res.json({ success: true, message: '试验记录删除成功' });
  } catch (error) {
    console.error('删除试验记录错误:', error);
    res.status(500).json({ success: false, message: '服务器内部错误' });
  }
});

module.exports = router;
