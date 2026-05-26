const { run, get } = require('./database');
const bcrypt = require('bcryptjs');

async function generateTestData() {
  console.log('开始生成测试数据...\n');

  const testUsers = [
    { username: 'tester01', password: 'tester123', role: 'tester' },
    { username: 'tester02', password: 'tester123', role: 'tester' },
    { username: 'engineer', password: 'engineer123', role: 'admin' }
  ];

  for (const u of testUsers) {
    const existing = await get('SELECT id FROM users WHERE username = ?', [u.username]);
    if (!existing) {
      const hash = bcrypt.hashSync(u.password, 10);
      await run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [u.username, hash, u.role]);
      console.log(`✓ 创建用户: ${u.username} (${u.role})`);
    }
  }

  const specimens = [
    { specimen_number: 'CF-2024-001', length: 80, width: 15, thickness: 4, material_type: '碳纤维复合材料', layer_count: 16, description: '单向层压板' },
    { specimen_number: 'CF-2024-002', length: 80, width: 15, thickness: 4, material_type: '碳纤维复合材料', layer_count: 16, description: '单向层压板' },
    { specimen_number: 'CF-2024-003', length: 80, width: 15, thickness: 4, material_type: '碳纤维复合材料', layer_count: 16, description: '单向层压板' },
    { specimen_number: 'GF-2024-001', length: 80, width: 15, thickness: 5, material_type: '玻璃纤维复合材料', layer_count: 12, description: '正交层压板' },
    { specimen_number: 'GF-2024-002', length: 80, width: 15, thickness: 5, material_type: '玻璃纤维复合材料', layer_count: 12, description: '正交层压板' },
    { specimen_number: 'GF-2024-003', length: 80, width: 15, thickness: 5, material_type: '玻璃纤维复合材料', layer_count: 12, description: '正交层压板' },
    { specimen_number: 'KF-2024-001', length: 80, width: 15, thickness: 3, material_type: '芳纶纤维复合材料', layer_count: 20, description: '编织结构' },
    { specimen_number: 'KF-2024-002', length: 80, width: 15, thickness: 3, material_type: '芳纶纤维复合材料', layer_count: 20, description: '编织结构' }
  ];

  const specimenIds = [];
  for (const s of specimens) {
    const existing = await get('SELECT id FROM specimens WHERE specimen_number = ?', [s.specimen_number]);
    if (!existing) {
      const result = await run(
        'INSERT INTO specimens (specimen_number, length, width, thickness, material_type, layer_count, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [s.specimen_number, s.length, s.width, s.thickness, s.material_type, s.layer_count, s.description]
      );
      specimenIds.push(result.lastID);
      console.log(`✓ 创建试样: ${s.specimen_number}`);
    } else {
      specimenIds.push(existing.id);
    }
  }

  const testParams = [
    { specimenIndex: 0, userId: 2, peakLoad: 1250, yieldLoad: 980, yieldDisp: 0.15, maxDisp: 0.35, peakDisp: 0.28 },
    { specimenIndex: 1, userId: 2, peakLoad: 1320, yieldLoad: 1050, yieldDisp: 0.16, maxDisp: 0.38, peakDisp: 0.30 },
    { specimenIndex: 2, userId: 3, peakLoad: 1180, yieldLoad: 920, yieldDisp: 0.14, maxDisp: 0.33, peakDisp: 0.26 },
    { specimenIndex: 3, userId: 2, peakLoad: 890, yieldLoad: 680, yieldDisp: 0.12, maxDisp: 0.42, peakDisp: 0.35 },
    { specimenIndex: 4, userId: 3, peakLoad: 920, yieldLoad: 710, yieldDisp: 0.13, maxDisp: 0.45, peakDisp: 0.37 },
    { specimenIndex: 5, userId: 2, peakLoad: 875, yieldLoad: 665, yieldDisp: 0.11, maxDisp: 0.40, peakDisp: 0.33 },
    { specimenIndex: 6, userId: 3, peakLoad: 720, yieldLoad: 550, yieldDisp: 0.18, maxDisp: 0.52, peakDisp: 0.45 },
    { specimenIndex: 7, userId: 2, peakLoad: 750, yieldLoad: 580, yieldDisp: 0.19, maxDisp: 0.55, peakDisp: 0.48 }
  ];

  for (let i = 0; i < testParams.length; i++) {
    const p = testParams[i];
    const specimen = specimens[p.specimenIndex];

    const existingTest = await get('SELECT id FROM test_records WHERE specimen_id = ?', [specimenIds[p.specimenIndex]]);
    if (existingTest) continue;

    const shearStrength = (p.peakLoad * 0.75) / (specimen.width * specimen.thickness);

    const result = await run(`
      INSERT INTO test_records (specimen_id, user_id, peak_load, shear_strength, yield_load, yield_displacement, max_load, max_displacement, displacement_at_peak, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      specimenIds[p.specimenIndex],
      p.userId,
      p.peakLoad,
      shearStrength,
      p.yieldLoad,
      p.yieldDisp,
      p.peakLoad,
      p.maxDisp,
      p.peakDisp,
      `${specimen.material_type} - 试验 ${i + 1}`
    ]);

    const testId = result.lastID;
    const dataPoints = [];
    const numPoints = 100;

    for (let j = 0; j <= numPoints; j++) {
      const t = j / numPoints;
      let load, disp;

      if (t < 0.3) {
        load = p.yieldLoad * (t / 0.3);
        disp = p.yieldDisp * (t / 0.3);
      } else if (t < 0.75) {
        const plasticT = (t - 0.3) / 0.45;
        load = p.yieldLoad + (p.peakLoad - p.yieldLoad) * (1 - Math.exp(-plasticT * 3));
        disp = p.yieldDisp + (p.peakDisp - p.yieldDisp) * plasticT;
      } else {
        const softT = (t - 0.75) / 0.25;
        load = p.peakLoad * (1 - softT * 0.3);
        disp = p.peakDisp + (p.maxDisp - p.peakDisp) * softT;
      }

      load += (Math.random() - 0.5) * p.peakLoad * 0.02;

      dataPoints.push({
        timestamp: t * 120,
        load: Math.max(0, load),
        displacement: Math.max(0, disp)
      });
    }

    for (const point of dataPoints) {
      await run('INSERT INTO data_points (test_record_id, timestamp, load, displacement) VALUES (?, ?, ?, ?)',
        [testId, point.timestamp, point.load, point.displacement]);
    }

    console.log(`✓ 创建试验记录 #${testId}: ${specimen.specimen_number} - 剪切强度: ${shearStrength.toFixed(2)} MPa`);
  }

  console.log('\n========================================');
  console.log('测试数据生成完成!');
  console.log('========================================');
  console.log('测试账户:');
  console.log('  admin / admin123 (管理员)');
  console.log('  tester01 / tester123 (实验员)');
  console.log('  tester02 / tester123 (实验员)');
  console.log('  engineer / engineer123 (管理员)');
  console.log('========================================\n');

  process.exit(0);
}

generateTestData().catch(err => {
  console.error('生成测试数据失败:', err);
  process.exit(1);
});
