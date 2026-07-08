# DCA Tracker — 个人定投记录与复盘工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue.svg)](https://vitejs.dev/)
[![Runtime](https://img.shields.io/badge/Runtime-Node%20%2B%20Express-4b9.svg)](https://nodejs.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Docker-2496ED.svg)](https://www.docker.com/)

一款面向个人投资记录与复盘的定投追踪工具，支持 **VA 价值平均** 与 **DCA 定额** 两种策略，支持多计划并行管理、历史记录修订、全量备份导入导出，以及 Docker / NAS 场景下的本地文件持久化。

---

## ✨ 功能特性

- **双策略支持**：支持 `DCA 定额` 与 `VA 价值平均`
- **双预算模式**：支持固定总预算分期投完，也支持无限定投持续执行
- **多计划管理**：可创建、切换、删除多个计划
- **全局总览**：除单计划总览外，新增跨计划的全局视角，便于查看总投入、总市值与近期待执行计划
- **本期操作面板**：按资产给出建议买入金额、建议股数、建议下次定投时间，并支持实际执行回填
- **再平衡记录**：支持以再平衡方式记录负股数或调仓，不推进下一次 VA 节奏
- **历史台账管理**：支持筛选、展开、编辑、删除记录，也支持导出 CSV
- **全量备份导入导出**：历史页可直接导入 / 导出全部计划与全部历史记录，不再受“必须先创建计划”限制
- **Docker / NAS 持久化**：正式部署时数据保存在服务端文件中，适合 NAS 长期运行
- **自动备份与损坏恢复**：每次写入自动生成备份，发现主数据文件损坏时自动切换到最近备份
- **页面内访问认证**：可通过环境变量开启密码认证，适合暴露到外网时做基础保护
- **可安装 PWA**：支持安装到桌面或主屏幕，保留更接近应用的使用体验
- **主题系统**：日间与夜间各 6 套主题，可分别记住偏好

---

## 📸 功能页面

| 页面 | 说明 |
|------|------|
| **全局** | 汇总所有计划的总投入、总市值、整体状态与近期待执行计划 |
| **总览** | 查看当前计划的预算推进、组合轨迹、仓位结构和关键指标 |
| **本期操作** | 录入价格、确认建议股数、记录实际执行，并标记正常执行 / 主动低配 / 暂停 / 再平衡 |
| **历史** | 查看、编辑、删除各期记录，导入 / 导出完整备份，导出 CSV |
| **设置** | 配置策略、预算、频率、标的权重、主题和数据存储信息 |

---

## 🧱 运行模式

应用目前支持两种运行方式：

### 1. Docker / 服务端文件存储模式

这是正式部署的推荐方式。

- 数据保存在服务端文件中
- 默认主数据文件为 `dca-data.json`
- 自动备份目录为 `backups/`
- 支持通过卷挂载把数据存到 NAS 指定目录
- 支持服务端 Twelve Data 代理与页面密码认证

### 2. 前端开发兼容模式

当你仅执行：

```bash
npm run dev
```

应用会回退到浏览器 `localStorage` 存储，方便前端调试。

注意：

- 这种模式适合开发，不适合正式长期使用
- 换浏览器、清缓存或重装浏览器都可能导致数据丢失
- 历史页可以导出完整 JSON 备份，迁移到 Docker 模式后再导入

---

## 🚀 快速开始

### 本地前端开发

```bash
git clone https://github.com/Fe1ix-deng/dca-tracker.git
cd dca-tracker
npm install
npm run dev
```

如果希望局域网其他设备访问测试页：

```bash
npm run dev -- --host
```

### 本地模拟正式运行

```bash
npm install
npm run build
npm start
```

如需本地测试自动行情：

```powershell
$env:TWELVE_DATA_KEY="your_api_key_here"
npm run build
npm start
```

---

## 🐳 Docker 部署

### 方式一：使用 `docker compose`

1. 复制环境变量示例文件：

```bash
cp .env.example .env
```

2. 根据你的环境修改 `.env`：

```env
APP_PORT=3000
DCA_TRACKER_DATA_PATH=/volume1/docker/dca-tracker
TWELVE_DATA_KEY=your_api_key_here
APP_PASSWORD=change_me
AUTH_IDLE_TIMEOUT_HOURS=720
AUTH_SESSION_SECRET=replace_with_a_long_random_secret
```

3. 启动：

```bash
docker compose up -d --build
```

4. 打开：

```text
http://NAS_IP:3000
```

### 方式二：直接使用 `docker run`

```bash
docker build -t dca-tracker:latest .

docker run -d \
  --name dca-tracker \
  -p 3000:3000 \
  -e DATA_DIR=/data \
  -e TWELVE_DATA_KEY=your_api_key_here \
  -e APP_PASSWORD=change_me \
  -e AUTH_IDLE_TIMEOUT_HOURS=720 \
  -e AUTH_SESSION_SECRET=replace_with_a_long_random_secret \
  -v /volume1/docker/dca-tracker:/data \
  --restart unless-stopped \
  dca-tracker:latest
```

说明：

- `-v /volume1/docker/dca-tracker:/data` 决定 NAS 上的实际保存路径
- `-e DATA_DIR=/data` 决定容器内部使用哪个目录保存数据
- 不配置 `TWELVE_DATA_KEY` 也可以使用，只是自动获取价格会回退到手动输入
- 设置了 `APP_PASSWORD` 后，会自动启用页面内登录认证

---

## ⚙️ 环境变量

| 变量名 | 用途 | 默认值 |
| --- | --- | --- |
| `APP_PORT` | `docker compose` 暴露到宿主机的端口 | `3000` |
| `PORT` | Node 服务监听端口 | `3000` |
| `DATA_DIR` | 容器内数据目录 | `/data` |
| `DCA_TRACKER_DATA_PATH` | `docker compose` 挂载到宿主机的实际目录 | `./data` |
| `TWELVE_DATA_KEY` | Twelve Data API Key，可选 | 空 |
| `APP_PASSWORD` | 页面访问密码；留空表示不启用认证 | 空 |
| `AUTH_IDLE_TIMEOUT_HOURS` | 空闲多久后要求重新登录 | `720` |
| `AUTH_SESSION_SECRET` | 会话签名密钥，建议使用长随机字符串 | 空 |

注意：

- 现在使用的是服务端环境变量 `TWELVE_DATA_KEY`，不再使用前端构建时注入的 `VITE_TWELVE_DATA_KEY`
- `.env.example` 主要给 `docker compose` 做变量替换参考，不是前端打包注入文件
- 如果准备暴露到外网，建议同时使用 HTTPS 反向代理，并配置独立的 `AUTH_SESSION_SECRET`

---

## 💾 数据存储、备份与恢复

服务端文件存储具备以下行为：

- 首次启动会自动创建 `dca-data.json`
- 每次写入会自动生成备份
- 默认保留最近 `20` 份备份
- 如果主数据文件损坏，会自动切换到最近一份可用备份
- 设置页会显示当前存储目录、主数据文件、备份目录、备份数量和恢复状态

浏览器本地模式下：

- 数据仍保存在 `localStorage`
- 不会启用服务端自动备份
- 你会看到“尚未备份数据”的提醒横幅
- 建议定期在历史页导出 JSON 备份

---

## 🔐 外网访问建议

如果你准备把这个应用暴露到外网，建议至少做这几件事：

1. 设置 `APP_PASSWORD`
2. 设置独立且足够长的 `AUTH_SESSION_SECRET`
3. 使用 HTTPS 反向代理
4. 把数据目录挂载到可靠的本地磁盘或 NAS 共享盘

当前的认证是页面内登录页，不是浏览器原生弹窗认证；验证一次后，会在较长空闲时间后才重新要求登录。

---

## 📱 PWA 与安装

当前分支已支持 PWA：

- 提供 `manifest.webmanifest`
- 注册 Service Worker
- 支持安装到桌面或主屏幕
- 适合在手机、平板或桌面浏览器中以“应用”方式使用

注意：

- 是否出现“安装”入口，和浏览器支持情况、访问协议、缓存状态有关
- 正式环境建议通过 HTTP 局域网或 HTTPS 访问，以获得更稳定的安装体验

---

## 📖 使用说明

详细操作说明请参阅 **[使用说明.md](./使用说明.md)**，其中包含：

- 如何创建第一份计划
- VA 与 DCA 的使用差异
- 固定预算与无限定投的区别
- 本期操作页各字段含义
- 再平衡记录方式
- 历史记录修订与备份迁移

---

## 🪟 Windows 开发机部署到 Linux NAS

推荐两种方式：

### 方案 A：直接在 NAS 上构建

适合 NAS 已安装 Docker / Container Manager 的场景。

1. 把整个项目文件夹复制到 NAS
2. 在 NAS 上进入项目目录
3. 配置 `.env` 或在图形界面中填环境变量
4. 执行：

```bash
docker compose up -d --build
```

优点：

- 最省事
- 不用处理跨平台镜像
- 后续改代码后可直接在 NAS 重新构建

### 方案 B：在 Windows 先构建 Linux 镜像，再传到 NAS

适合你想先在本地出镜像再上传。

1. 先确认 NAS CPU 架构：

- Intel / AMD 通常使用 `linux/amd64`
- ARM NAS 通常使用 `linux/arm64`

2. 本地构建对应 Linux 镜像：

```bash
docker buildx build --platform linux/amd64 -t dca-tracker:latest --load .
```

如果 NAS 是 ARM，把 `linux/amd64` 改成 `linux/arm64`。

3. 导出镜像：

```bash
docker save -o dca-tracker-linux.tar dca-tracker:latest
```

4. 把 `dca-tracker-linux.tar` 传到 NAS

5. 在 NAS 上导入：

```bash
docker load -i dca-tracker-linux.tar
```

6. 再使用 `docker run` 或 `docker compose` 启动，并挂载数据目录

---

## 🧪 测试

```bash
npm test
```

---

## 🛠️ 技术栈

- **前端**：React 18 + Vite
- **样式**：Tailwind CSS
- **图表**：Recharts
- **服务端**：Node.js + Express
- **数据存储**：浏览器 `localStorage` / 服务端文件存储
- **行情接口**：Twelve Data
- **部署**：Docker

---

## 🔄 从旧版本迁移

如果你之前使用的是纯浏览器本地版本：

- 旧数据仍可在历史页导出完整 JSON
- Docker 部署后可直接在历史页导入 JSON
- 导入后，后续数据会自动保存到 NAS 挂载目录

如果你只是换设备或换浏览器：

- 只要你手里还有导出的 JSON 备份，就可以完整恢复计划和历史记录

---

## ⚠️ 免责声明

- 本工具仅用于个人记录、复盘与计划管理
- 不构成任何投资建议
- 自动行情仅供辅助，实际下单前请自行确认价格与交易规则

---

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
