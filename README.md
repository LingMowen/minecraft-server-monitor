# ⛏️ Minecraft 服务器监控面板

一个现代化的 Minecraft 服务器远程监控面板，支持实时监控多个服务器状态、玩家趋势图表、延迟监控和管理后台。

![Minecraft Monitor](https://img.shields.io/badge/Minecraft-Monitor-purple)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)

## ✨ 功能特性

### 📊 服务器监控
- 实时监控多个 Minecraft 服务器状态
- 显示在线玩家数、最大玩家数、服务器版本
- 服务器延迟实时监控
- 在线玩家列表显示

### 📈 数据可视化
- 玩家趋势图表（支持 1小时/1天/1周/1月 时间范围）
- 延迟趋势图表（支持 1小时/1天/1周/1月 时间范围）
- TPS（服务器Tick）趋势图表（支持 1小时/1天/1周/1月 时间范围，每个图表独立选择）
- 最多玩家记录统计（今日/本周/本月）
- 历史数据持久化存储

### 💾 数据管理（管理员）
- 导出历史数据（支持 JSON/CSV 格式）
- 导入历史数据（JSON 格式）
- 数据备份（保存到服务器）

### 🎨 现代化界面
- 响应式设计，支持移动端
- 深色/浅色主题切换
- 流畅的动画效果
- 卡片式服务器展示

### 🔐 管理后台
- JWT 身份认证
- 服务器添加/编辑/删除
- 管理员密码修改
- 配置持久化保存
- **数据导出/导入/备份**
- **关于面板**（版本信息、检查更新）

## 🛠️ 技术栈

### 后端
- **Node.js** + **Express** - Web 服务器
- **TypeScript** - 类型安全
- **WebSocket** - 实时通信
- **JWT** - 身份认证

### 前端
- **React** + **TypeScript** - UI 框架
- **Recharts** - 数据可视化
- **CSS Variables** - 主题系统

### 协议
- **Minecraft Server Query Protocol** (端口 25565) - 服务器状态查询

## 📦 安装

### 前置要求
- Node.js 18+
- npm 或 yarn

### 克隆项目
```bash
git clone https://github.com/你的用户名/minecraft-monitor.git
cd minecraft-monitor
```

### 安装依赖
```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

### 配置
编辑 `config.json` 文件：
```json
{
  "servers": [
    {
      "id": "server-1",
      "name": "我的服务器",
      "host": "mc.example.com",
      "port": 25565
    }
  ],
  "web": {
    "port": 3002,
    "username": "admin",
    "password": "your-password"
  }
}
```

## 🚀 启动

### 开发模式
```bash
# 启动后端 (在 server 目录)
npm run dev

# 构建并启动前端 (在 client 目录)
npm run build
```

### 生产模式
```bash
# 构建后端
cd server
npm run build
npm start

# 构建前端
cd ../client
npm run build
```

访问 `http://localhost:3002` 查看面板。

## 📖 使用说明

### 查看服务器状态
- 主页面显示所有已添加的服务器卡片
- 点击服务器卡片查看详细信息
- 弹窗显示玩家趋势、延迟趋势、最多玩家记录等

### 管理后台
1. 点击右上角「登录」按钮
2. 输入管理员账号密码（默认：admin / admin123）
3. 登录后可添加/编辑/删除服务器
4. 在「系统设置」中修改密码

### 数据管理（管理员）
1. 登录后进入「管理后台」
2. 点击「数据管理」标签页
3. 可进行以下操作：
   - 导出数据：选择服务器、格式、时间范围，点击导出
   - 导入数据：选择服务器、选择JSON文件导入
   - 数据备份：点击创建备份，备份文件保存到服务器

### 时间范围选择
- 玩家趋势和延迟趋势图表支持切换时间范围
- 可选择：1小时、1天、1周、1月
- 数据自动聚合显示

## 📁 项目结构

```
minecraft-monitor/
├── config.json          # 配置文件
├── server/              # 后端代码
│   ├── src/
│   │   ├── api/         # API 路由
│   │   ├── middleware/  # 认证中间件
│   │   ├── query/       # Minecraft 查询协议
│   │   ├── websocket/   # WebSocket 处理
│   │   └── serverManager.ts  # 服务器管理
│   └── package.json
├── client/              # 前端代码
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── services/    # API 服务
│   │   └── App.tsx      # 主应用
│   └── package.json
└── README.md
```

## 🔒 安全建议

1. **修改默认密码**：首次使用后立即修改 `config.json` 中的默认密码
2. **使用 HTTPS**：生产环境建议配置 HTTPS
3. **限制访问**：建议配置防火墙规则限制访问 IP

## 📝 更新日志

### v1.2.0
- 新增 TPS（服务器Tick）趋势图表
- 图表时间范围独立选择（每个图表可设置不同时间范围）
- 管理后台新增「关于」面板（版本信息、检查更新）
- 优化界面样式和滚动条

### v1.1.0
- 新增数据导出功能（支持 JSON/CSV 格式）
- 新增数据导入功能
- 新增数据备份功能
- 管理后台新增「数据管理」标签页

### v1.0.0
- 初始版本发布
- 支持多服务器监控
- 玩家/延迟趋势图表
- 管理后台功能
- 深色/浅色主题

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ for Minecraft
