# DCA Tracker

一个基于 React + Vite 构建的个人定投追踪 Web App，支持 VA 定投与 DCA 定额策略，使用 `localStorage` 持久化数据，无需后端数据库。

## 本地运行

1. 复制 `.env.example` 为 `.env`
2. 填入你自己的 Twelve Data API Key
3. 运行：

```bash
npm install && npm run dev
```

## 部署到 Vercel

1. 将项目 push 到 GitHub
2. 在 Vercel 导入该仓库
3. Framework 选择 `Vite`
4. 在 Vercel 的 `Environment Variables` 中添加：`VITE_TWELVE_DATA_KEY`
5. 保持默认设置，一键部署

项目根目录已包含 `vercel.json`，用于确保单页应用路由重写到 `index.html`。

## 行情 API 说明

自动获取行情使用 Twelve Data API：

- 前端通过 `import.meta.env.VITE_TWELVE_DATA_KEY` 读取 API Key
- 若接口失败、额度用尽或 ticker 不存在，会自动回退为手动输入价格
- 不会阻断主流程

## 环境变量

本地请在项目根目录创建 `.env`：

```bash
VITE_TWELVE_DATA_KEY=your_twelve_data_key
```

请确保 `.env` 不要提交到 GitHub。