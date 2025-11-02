# Electron Vue 应用

一个使用 Electron、Vue 3 和 TypeScript 构建的现代桌面应用程序。

## 技术栈

- **Electron** - 跨平台桌面应用程序框架
- **Vue 3** - 渐进式 JavaScript 框架，支持组合式 API
- **TypeScript** - JavaScript 的类型化超集
- **Vite** - 下一代前端构建工具
- **electron-vite** - 专为 Electron 应用设计的构建工具
- **electron-builder** - 打包和构建可分发 Electron 应用的完整解决方案

## 项目结构

```
├── src/
│   ├── main/          # Electron 主进程
│   ├── preload/       # Electron 预加载脚本
│   └── renderer/      # Vue 3 渲染进程
│       ├── src/
│       │   ├── components/
│       │   ├── App.vue
│       │   ├── main.ts
│       │   └── style.css
│       └── index.html
├── build/             # 构建资源（图标等）
├── dist/              # 编译后的渲染进程
├── dist-electron/     # 编译后的主进程和预加载脚本
└── release/           # 打包后的应用程序
```

## 快速开始

### 前置要求

- Node.js (>= 18.18.0 或 >= 20.0.0)
- npm 或 yarn

### 安装

```bash
npm install
```

### 开发

启动支持热重载的开发服务器：

```bash
npm run dev
```

此命令将会：
- 构建并监听主进程和预加载脚本的变化
- 启动 Vite 开发服务器用于渲染进程
- 启动 Electron 应用程序

### 构建

构建生产环境应用程序：

```bash
npm run build
```

此命令将会：
- 对代码进行类型检查
- 构建所有进程
- 使用 electron-builder 打包应用程序

仅构建不打包（用于测试）：

```bash
npm run build:only
```

### 其他脚本

```bash
# 类型检查
npm run typecheck

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 安全性

本应用程序遵循 Electron 安全最佳实践：

- **上下文隔离（Context Isolation）**：已启用，防止渲染进程直接访问 Node.js API
- **沙箱（Sandbox）**：为渲染进程配置了隔离环境
- **Node 集成（Node Integration）**：在渲染进程中已禁用
- **预加载脚本（Preload Scripts）**：用于向渲染进程暴露有限的、受控的 API
- **CSP（内容安全策略）**：建议在生产环境中使用

## 许可证

MIT
