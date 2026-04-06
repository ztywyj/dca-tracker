# 变更记录

## 2026-04-05
- 初始化 `DCA Tracker` 项目骨架（React 18 + Vite 结构）
- 添加 Tailwind CSS v3、Recharts、Lucide React 相关配置与依赖声明
- 创建 `src/components`、`src/hooks`、`src/utils` 目录与基础文件
- 实现 `App.jsx` 单页 Tab 切换路由，不使用 React Router
- 搭建深色金融风 UI 基础主题、字体与全局样式
- 封装 `localStorage` 读写、DCA/VA 计算与 Yahoo Finance 行情 hook
- 创建总览、本期操作、历史记录、设置四个页面组件初版
- 完整实现 `src/utils/vaCalc.js` 的 VA 定投目标值与建议买入逻辑
- 完整实现 `src/utils/dcaCalc.js` 的 DCA 每期投入与建议股数逻辑
- 重构 `src/utils/storage.js`，提供 plan/records 专用持久化方法
- 重构 `useQuote.js`，支持 Yahoo Finance 双端点、3秒超时与手动回退
- 实现 `Settings.jsx` 的完整计划创建/编辑表单与资产权重校验
- 实现 `OperationPanel.jsx` 的多资产价格录入、建议计算与记录提交流程
- 更新 `App.jsx`、`usePlan.js`、`useRecords.js` 以接入完整计划/记录流转
- 启动本地预览服务并接入新版 `Dashboard.jsx` 总览仪表盘
- 实现新版 `History.jsx`，支持标签筛选、展开详情与 CSV 导出
- 完成收尾工作：空状态直出设置页、统一金额格式、增强行情错误处理
- 新增 `vercel.json` 与 `README.md`，补齐 Vercel 部署与使用说明
- 优化 `vite.config.js`，对 React/Recharts/Lucide 进行手动分包
- 将自动行情源切换为 Twelve Data，接入 `.env` 环境变量与手动回退提示
- 细化 Twelve Data 拉取失败提示，区分缺少 ticker、超时、断网、无效 API Key、额度耗尽与错误 ticker 等原因
