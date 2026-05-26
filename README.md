# 复合材料层间剪切强度测试平台

## 项目简介

这是一个面向企业实验室的桌面级单机应用，用于复合材料层间剪切强度试验的数据管理。系统采用 Node.js + Express + SQLite 技术栈，支持多用户登录、试验数据录入、自动计算剪切强度、数据可视化等功能。

## 功能特性

### 后端功能
- RESTful API 接口设计
- JWT 用户认证
- bcrypt 密码加密
- SQL 注入防护
- 用户权限管理（管理员/实验员）

### 前端功能
- 登录页面
- 数据仪表盘
- 试样信息管理
- 新建试验记录
- 历史数据查询
- Canvas 载荷-位移曲线可视化

### 数据表设计
1. **用户表** - 用户信息与角色
2. **试样信息表** - 试样编号、几何尺寸、材料类型
3. **试验记录表** - 峰值载荷、剪切强度、试验时间
4. **原始数据点表** - 时序数据（时间戳、载荷、位移）

## 环境要求

- Node.js 16.x 或更高版本
- npm 或 yarn 包管理器
- 无外网环境可使用离线安装包

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务

```bash
npm start
```

### 3. 访问应用

打开浏览器访问：`http://localhost:3000`

### 4. 默认账户

- **用户名**: `admin`
- **密码**: `admin123`

## 项目结构

```
composite-shear-test-platform/
├── server.js              # 服务器入口
├── database.js            # 数据库初始化
├── package.json           # 项目配置
├── routes/                # 路由目录
│   ├── auth.js           # 认证路由
│   ├── users.js          # 用户管理
│   ├── specimens.js      # 试样管理
│   └── tests.js          # 试验管理
└── public/               # 前端静态文件
    ├── index.html        # 登录页
    ├── dashboard.html    # 仪表盘
    ├── new-test.html     # 新建试验
    ├── specimens.html    # 试样管理
    ├── history.html      # 历史查询
    ├── visualization.html # 数据可视化
    ├── users.html        # 用户管理
    ├── css/style.css     # 样式文件
    └── js/               # JavaScript 文件
        ├── api.js        # API 封装
        └── layout.js     # 布局工具
```

## API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息
- `POST /api/auth/change-password` - 修改密码

### 用户管理（管理员）
- `GET /api/users` - 获取用户列表
- `POST /api/users` - 创建用户
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 试样管理
- `GET /api/specimens` - 获取试样列表
- `POST /api/specimens` - 创建试样
- `PUT /api/specimens/:id` - 更新试样
- `DELETE /api/specimens/:id` - 删除试样

### 试验管理
- `GET /api/tests` - 获取试验列表
- `GET /api/tests/:id` - 获取试验详情
- `POST /api/tests` - 创建试验
- `DELETE /api/tests/:id` - 删除试验
- `GET /api/tests/stats/summary` - 统计摘要

## 剪切强度计算公式

```
τ = (0.75 × P_max) / (b × h)
```

其中：
- τ - 层间剪切强度 (MPa)
- P_max - 峰值载荷 (N)
- b - 试样宽度 (mm)
- h - 试样厚度 (mm)

## 数据安全

- 密码使用 bcrypt 哈希存储
- 使用参数化查询防止 SQL 注入
- JWT Token 认证机制
- 管理员权限保护

## 注意事项

1. 首次启动会自动创建 SQLite 数据库文件 `test_platform.db`
2. 建议定期备份数据库文件
3. 修改默认管理员密码以确保安全
4. 系统设计为单机使用，请勿暴露到公网

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)
- **前端**: 原生 HTML5 + JavaScript + CSS
- **认证**: JWT + bcryptjs
- **图表**: Canvas API 原生绘制

## 离线部署

1. 在有网络的机器上执行 `npm install`
2. 将整个项目目录（包含 node_modules）复制到目标机器
3. 在目标机器上执行 `npm start`

## 许可证

MIT License
