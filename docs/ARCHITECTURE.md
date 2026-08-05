# 一流工作台 V2 - 架构文档

## 📐 总体架构

### 分层设计

```
┌─────────────────────────────────────────┐
│              Views (视图层)              │
│  DashboardView, BookmarksView, etc.     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           Components (组件层)            │
│  TaskList, BookmarkGrid, Modal, etc.    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            Services (服务层)             │
│  taskService, bookmarkService, etc.     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│              Core (核心层)               │
│    Store, Router, EventBus, etc.        │
└─────────────────────────────────────────┘
```

### 数据流

```
User Action → View → Service → Store → Middleware → localStorage
                ↑                 │
                └─────Subscribe───┘
```

---

## 🏗️ 核心层（Core）

### Store（状态管理器）

**职责**：
- 集中管理应用状态
- 发布-订阅模式
- 中间件系统

**API**：
```javascript
store.getState()              // 获取当前状态
store.setState(updater)       // 更新状态
store.subscribe(listener)     // 订阅状态变化
store.use(middleware)         // 注册中间件
```

**使用示例**：
```javascript
// 订阅状态变化
const unsubscribe = store.subscribe((state, prevState) => {
  console.log('State changed:', state);
});

// 更新状态
store.setState(state => ({
  ...state,
  tasks: [...state.tasks, newTask],
}));
```

### Router（路由系统）

**职责**：
- 管理 SPA 路由
- 视图切换
- 生命周期钩子

**API**：
```javascript
router.push(path)             // 导航到指定路径
router.replace(path)          // 替换当前路由
router.back()                 // 返回上一页
router.beforeEach(guard)      // 注册前置守卫
router.afterEach(hook)        // 注册后置钩子
```

**路由配置**：
```javascript
const router = new Router([
  {
    path: '/',
    name: 'dashboard',
    component: DashboardView,
    meta: { title: '仪表盘' },
  },
]);
```

### EventBus（事件总线）

**职责**：
- 跨组件通信
- 解耦组件依赖

**API**：
```javascript
eventBus.on(event, handler)   // 监听事件
eventBus.off(event, handler)  // 移除监听
eventBus.emit(event, data)    // 触发事件
```

### Middleware（中间件）

**内置中间件**：

1. **validatorMiddleware**：数据验证
2. **persistMiddleware**：持久化到 localStorage
3. **debouncedPersistMiddleware**：防抖持久化（150ms）
4. **loggerMiddleware**：开发日志

**自定义中间件**：
```javascript
const myMiddleware = (prevState, nextState) => {
  // 在这里处理状态变化
  return nextState;
};

store.use(myMiddleware);
```

---

## 🔧 服务层（Services）

### 设计原则

- **单一职责**：每个服务管理一种数据类型
- **无副作用**：不直接操作 DOM
- **与 Store 交互**：通过 Store 更新状态
- **数据验证**：在服务层验证输入

### taskService

```javascript
taskService.getAll()                    // 获取所有任务
taskService.getById(id)                 // 获取单个任务
taskService.add(taskData)               // 添加任务
taskService.update(id, updates)         // 更新任务
taskService.delete(id)                  // 删除任务
taskService.toggle(id)                  // 切换完成状态
taskService.clearCompleted()            // 清除已完成
taskService.search(query)               // 搜索任务
taskService.getStats()                  // 获取统计信息
```

### bookmarkService

```javascript
bookmarkService.getAll()                // 获取所有书签
bookmarkService.getById(id)             // 获取单个书签
bookmarkService.add(bookmarkData)       // 添加书签
bookmarkService.update(id, updates)     // 更新书签
bookmarkService.delete(id)              // 删除书签
bookmarkService.togglePin(id)           // 切换置顶
bookmarkService.getByCategory(cat)      // 按分类获取
bookmarkService.search(query)           // 搜索书签
bookmarkService.getStats()              // 获取统计信息
```

### habitService

```javascript
habitService.getAll()                   // 获取所有习惯
habitService.add(habitData)             // 添加习惯
habitService.update(id, updates)        // 更新习惯
habitService.delete(id)                 // 删除习惯
habitService.check(id, checked)         // 打卡/取消
habitService.calculateStreak(history)   // 计算连续天数
habitService.getStats()                 // 获取统计信息
```

### weatherService

```javascript
weatherService.fetch(city)              // 获取天气
weatherService.getCurrent()             // 获取当前天气
weatherService.isExpired()              // 检查是否过期
weatherService.refreshIfNeeded(city)    // 自动刷新
```

### searchService

```javascript
searchService.search(query)             // 全局搜索
searchService.searchTasks(query)        // 搜索任务
searchService.searchBookmarks(query)    // 搜索书签
searchService.searchHabits(query)       // 搜索习惯
searchService.getSuggestions(query, n)  // 获取搜索建议
```

---

## 🎨 组件层（Components）

### 组件基类

```javascript
class Component {
  constructor(props) {
    this.props = props;
    this.element = null;
  }

  render() {
    // 返回 DOM 元素
  }

  update(newProps) {
    // 更新组件
  }

  destroy() {
    // 清理资源
  }

  createElement(tag, attrs, ...children) {
    // 创建 DOM 元素的辅助方法
  }
}
```

### 基础组件

**Toast（通知）**：
```javascript
Toast.show(message, type)
Toast.success(message)
Toast.error(message)
Toast.warning(message)
Toast.info(message)
```

**Modal（对话框）**：
```javascript
const modal = new Modal({
  title: '标题',
  content: contentElement,
  footer: footerElement,
  onClose: () => {},
});

modal.open();
modal.close();
```

### 业务组件

- **TaskItem**：单个任务项
- **TaskList**：任务列表容器
- **BookmarkCard**：单个书签卡片
- **BookmarkGrid**：书签网格容器
- **HabitTracker**：习惯打卡组件
- **Calendar**：日历组件
- **Weather**：天气组件
- **SearchBar**：全局搜索框

---

## 📱 视图层（Views）

### 视图基类

```javascript
class BaseView {
  render() {
    // 返回 DOM 元素
  }

  destroy() {
    // 清理订阅和事件监听
  }

  subscribe(listener) {
    // 订阅 Store 变化
  }

  $(selector) {
    // 简化 DOM 查询
  }

  $$(selector) {
    // 查询多个元素
  }
}
```

### 视图列表

1. **DashboardView**：仪表盘
   - 任务管理
   - 笔记编辑
   - 快速统计

2. **BookmarksView**：书签管理
   - 网格/列表视图
   - 分类筛选
   - 搜索功能

3. **StatsView**：数据统计
   - 统计卡片
   - 图表展示

4. **SettingsView**：设置
   - 主题切换
   - 数据导入/导出
   - 系统信息

---

## 🗂️ 数据模型

### State 结构

```javascript
{
  // 用户数据
  bookmarks: Bookmark[],
  tasks: Task[],
  habits: Habit[],
  sources: Source[],
  notes: Note,

  // UI 状态
  ui: {
    activeView: string,
    theme: 'light' | 'dark' | 'auto',
    sidebarCollapsed: boolean,
    selectedDate: string | null,
    searchQuery: string,
    filters: {
      bookmarkCategory: string,
      taskStatus: string,
    },
  },

  // 运行时状态
  weather: Weather | null,

  // 历史记录
  history: {
    undoStack: Action[],
    redoStack: Action[],
  },

  // 元数据
  meta: {
    version: string,
    lastSync: Date | null,
    installDate: Date,
  },
}
```

### 实体模型

**Task（任务）**：
```typescript
interface Task {
  id: string
  title: string
  description?: string
  priority: 'high' | 'normal' | 'low'
  status: 'todo' | 'done'
  dueDate?: Date
  tags: string[]
  createdAt: Date
  completedAt?: Date
}
```

**Bookmark（书签）**：
```typescript
interface Bookmark {
  id: string
  title: string
  url: string
  category: string
  description?: string
  favicon?: string
  tags: string[]
  isPinned: boolean
  createdAt: Date
}
```

**Habit（习惯）**：
```typescript
interface Habit {
  id: string
  title: string
  description?: string
  frequency: 'daily' | 'weekly' | 'custom'
  history: Date[]
  streak: number
  createdAt: Date
}
```

---

## 🔄 数据流详解

### 1. 用户操作 → 更新状态

```
User clicks "Add Task"
  ↓
View calls taskService.add(data)
  ↓
Service validates and calls store.setState()
  ↓
Store applies middlewares
  ↓
Middleware persists to localStorage
  ↓
Store notifies subscribers
  ↓
View re-renders
```

### 2. 订阅模式

```javascript
// 在 View 中订阅状态变化
class MyView extends BaseView {
  constructor() {
    super();
    
    this.unsubscribe = store.subscribe((state, prevState) => {
      if (state.tasks !== prevState.tasks) {
        this.updateTaskList();
      }
    });
  }

  destroy() {
    this.unsubscribe();
  }
}
```

---

## ⚡ 性能优化

### 1. 防抖与节流

- **localStorage 保存**：150ms 防抖
- **搜索输入**：300ms 防抖
- **笔记自动保存**：650ms 防抖

### 2. 懒加载

- 路由级代码分割（ES Modules）
- 组件按需加载

### 3. 事件委托

```javascript
// 使用事件委托减少监听器数量
container.addEventListener('click', (e) => {
  const target = e.target.closest('.task-item');
  if (target) {
    // 处理点击
  }
});
```

### 4. 数据缓存

- 天气数据缓存 1 小时
- 避免重复 API 请求

---

## 🔒 安全考虑

### 1. XSS 防护

```javascript
// 使用 textContent 而非 innerHTML
element.textContent = userInput;

// 或使用 createElement
const div = document.createElement('div');
div.textContent = userInput;
```

### 2. URL 验证

```javascript
function validateUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### 3. 数据验证

所有用户输入在服务层进行验证：

```javascript
function validateTask(task) {
  const errors = [];
  
  if (!task.title?.trim()) {
    errors.push('标题不能为空');
  }
  
  if (task.priority && !['high', 'normal', 'low'].includes(task.priority)) {
    errors.push('无效的优先级');
  }
  
  return errors;
}
```

---

## 🧪 测试策略

### 单元测试

```javascript
// 测试 Service
describe('taskService', () => {
  it('should add a task', () => {
    const task = taskService.add({ title: 'Test' });
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test');
  });
});
```

### 集成测试

```javascript
// 测试 Store + Service
describe('Task workflow', () => {
  it('should persist task to localStorage', () => {
    taskService.add({ title: 'Test' });
    const saved = localStorage.getItem('yiliu.home.state.v2');
    expect(JSON.parse(saved).tasks).toHaveLength(1);
  });
});
```

---

## 📚 扩展指南

### 添加新功能

1. **定义数据模型**（如果需要）
2. **创建 Service**：实现业务逻辑
3. **创建 Component**：实现 UI 组件
4. **创建/更新 View**：集成功能
5. **更新路由**（如果需要）
6. **添加测试**

### 示例：添加标签功能

```javascript
// 1. Service
const tagService = {
  getAll() { /* ... */ },
  add(tag) { /* ... */ },
  delete(tag) { /* ... */ },
};

// 2. Component
class TagCloud extends Component {
  render() { /* ... */ }
}

// 3. 在 View 中使用
this.tagCloud = new TagCloud({
  tags: tagService.getAll(),
  onSelect: (tag) => this.filterByTag(tag),
});
```

---

## 🎯 最佳实践

### 1. 命名规范

- **文件名**：PascalCase（组件/类），camelCase（工具函数）
- **类名**：PascalCase
- **变量/函数**：camelCase
- **常量**：UPPER_SNAKE_CASE

### 2. 代码组织

```
- 一个文件一个类/组件
- 相关功能放在同一目录
- 导出使用 default（单一导出）或命名导出（多个工具函数）
```

### 3. 错误处理

```javascript
try {
  taskService.add(data);
  Toast.success('添加成功');
} catch (error) {
  Toast.error('添加失败：' + error.message);
  console.error(error);
}
```

### 4. 资源清理

```javascript
class MyView extends BaseView {
  constructor() {
    super();
    this.unsubscribe = store.subscribe(this.handleChange);
    this.timerId = setInterval(this.update, 1000);
  }

  destroy() {
    this.unsubscribe();
    clearInterval(this.timerId);
    super.destroy();
  }
}
```

---

**更新时间**：2026-08-05  
**版本**：2.0.0
