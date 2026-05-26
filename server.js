const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');
const { router: authRouter } = require('./routes/auth');
const usersRouter = require('./routes/users');
const specimensRouter = require('./routes/specimens');
const testsRouter = require('./routes/tests');

const app = express();
const PORT = process.env.PORT || 3000;

initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/specimens', specimensRouter);
app.use('/api/tests', testsRouter);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`  复合材料层间剪切强度测试平台`);
  console.log(`  服务器已启动: http://localhost:${PORT}`);
  console.log(`  默认管理员: admin / admin123`);
  console.log(`========================================\n`);
});
