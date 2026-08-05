# 一流工作台 V2

> 一个轻量级的个人生产力工具，零依赖、模块化、易扩展

## ✨ 特性

- ✅ **零依赖**：纯 Vanilla JavaScript，无需构建工具
- ✅ **模块化**：ES Modules，清晰的分层架构
- ✅ **类型安全**：完整的 JSDoc 注释
- ✅ **响应式**：自研状态管理系统
- ✅ **离线优先**：PWA + localStorage
- ✅ **轻量级**：~10KB gzipped

## 🚀 快速开始

### 启动开发服务器

```bash
# Python
python -m http.server 8080

# Node.js
npx http-server -p 8080

# PHP
php -S localhost:8080
```

### 访问应用

打开浏览器访问：`http://localhost:8080/index-v2.html`

## 📦 功能模块

### ✅ 核心功能（已完成）

- **任务管理**
  - ✓ 添加/删除任务
  - ✓ 完成状态切换
  - ✓ 优先级设置（高/普通/低）
  - ✓ 实时统计

- **书签管理**
  - ✓ 添加/删除书签
  - ✓ 分类管理
  - ✓ 置顶功能
  - ✓ 实时搜索
  - ✓ Favicon 自动获取

- **习惯打卡**
  - ✓ 添加/删除习惯
  - ✓ 每日打卡
  - ✓ 连续天数统计
  - ✓ 最近7天可视化

- **笔记功能**
  - ✓ 草稿笔记
  - ✓ 自动保存（650ms 防抖）
  - ✓ Markdown 支持（计划中）

- **天气显示**
  - ✓ 实时天气
  - ✓ 自动刷新（1小时）
  - ✓ 多城市支持

- **统计视图**
  - ✓ 数据概览卡片
  - ✓ 分类分布图
  - ✓ 优先级统计

- **设置**
  - ✓ 主题切换（浅色/深色/自动）
  - ✓ 数据导出/导入
  - ✓ 数据清空

### 🚧 进行中

- ⏳ 编辑功能（任务、书签、习惯）
- ⏳ 拖拽排序
- ⏳ 撤销/重做
- ⏳ 全局搜索（Ctrl+K）

## 🏗️ 架构

### 目录结构

```
src/
├── core/              # 核心层
│   ├── Store.js       # 状态管理
│   ├── Router.js      # 路由系统
│   ├── EventBus.js    # 事件总线
│   ├── middlewares.js # 中间件
│   └── migration.js   # 数据迁移
│
├── services/          # 服务层
│   ├── taskService.js
│   ├── bookmarkService.js
│   ├── habitService.js
│   ├── weatherService.js
│   └── searchService.js
│
├── components/        # 组件层
│   ├── base/          # 基础组件
│   │   ├── Component.js
│   │   ├── Toast.js
│   │   └── Modal.js
│   ├── TaskItem.js
│   ├── TaskList.js
│   ├── BookmarkCard.js
│   ├── BookmarkGrid.js
│   ├── HabitTracker.js
│   ├── Calendar.js
│   ├── Weather.js
│   └── SearchBar.js
│
├── views/             # 视图层
│   ├── BaseView.js
│   ├── DashboardView.js
│   ├── BookmarksView.js
│   ├── StatsView.js
│   └── SettingsView.js
│
├── utils/             # 工具函数
│   └── helpers.js
│
├── app.js             # 应用入口
├── store.js           # Store 实例
└── router.js          # 路由配置
```

### 技术栈

- **语言**：JavaScript (ES6+)
- **模块系统**：ES Modules
- **状态管理**：自研 Store（Redux-like）
- **路由**：History API
- **组件**：组件工厂模式
- **样式**：CSS
- **存储**：localStorage
- **PWA**：Service Worker

## 📖 文档

- [架构文档](docs/ARCHITECTURE.md) - 完整的技术架构说明
- [代码审查报告](CODE_REVIEW.md) - 代码质量评估
- [发布报告](RELEASE_REPORT.md) - V2.0.0 发布详情

## 🔧 开发

### 添加新功能

1. **定义数据模型**（在 `store.js` 中）
2. **创建 Service**（在 `services/` 中）
3. **创建 Component**（在 `components/` 中）
4. **创建/更新 View**（在 `views/` 中）
5. **更新路由**（在 `router.js` 中）

### 调试

打开浏览器控制台，访问全局变量：

```javascript
// 查看当前状态
window.__STATE__()

// 访问 Store
window.__STORE__.getState()
window.__STORE__.setState({ /* ... */ })
```

## 📊 数据格式

### 导出格式

```json
{
  "bookmarks": [...],
  "tasks": [...],
  "habits": [...],
  "notes": {...},
  "ui": {...},
  "weather": {...},
  "meta": {
    "version": "2.0.0",
    "exportDate": "2026-08-05T..."
  }
}
```

### 导入

在设置页面选择导出的 JSON 文件即可导入。

## 🎯 性能

- ✅ 首屏加载 < 1s
- ✅ 防抖保存（150ms）
- ✅ 懒加载组件
- ✅ 事件委托
- ✅ 数据缓存

## 🔒 隐私

- ✅ 所有数据存储在本地（localStorage）
- ✅ 无服务器依赖
- ✅ 无数据收集
- ✅ 无第三方追踪

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可

MIT License

---

**版本**：2.0.0  
**更新时间**：2026-08-05  
**作者**：duyiliu
