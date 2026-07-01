# DCA Tracker

一个用于记录和复盘定投计划的应用，支持 `VA` 和 `DCA` 两种策略、多计划管理、历史导入导出，以及 Docker / NAS 场景下的本地文件持久化。

现在的默认部署方式是：

- 前端由 Vite 构建
- Node 服务负责提供运行时配置、行情代理和文件存储
- 数据保存到 Docker 挂载目录
- 自动保留最近备份，并在主数据文件损坏时自动回滚到最近有效备份

## 当前功能

- 支持 `VA 定投` 和 `DCA 定额`
- 支持多计划并存和计划切换
- 历史页可以直接导入 / 导出备份
- 支持一键导入 / 导出全部计划和全部历史
- 支持删除当前计划
- Docker / NAS 部署时自动改为文件存储
- 可通过 Docker 环境变量配置 `TWELVE_DATA_KEY`
- 可通过页面内密码认证保护外网访问

## 数据存储方式

应用支持两种运行模式：

- `Docker / 服务端模式`
  数据保存在服务端文件中，默认位于容器内的 `DATA_DIR` 目录，主数据文件为 `dca-data.json`，备份保存在 `backups/` 子目录。
- `前端开发兼容模式`
  如果只运行 `npm run dev`，则回退到浏览器 `localStorage`，方便前端开发，但不适合作为正式持久化方案。

正式部署到 NAS 时，建议始终使用 Docker 模式。

## Docker 快速开始

### 方式一：使用 compose

1. 复制示例环境变量文件：

```bash
cp .env.example .env
```

2. 按需修改 `.env`：

```env
APP_PORT=3000
DCA_TRACKER_DATA_PATH=/volume1/docker/dca-tracker
TWELVE_DATA_KEY=your_api_key_here
APP_PASSWORD=change_me
AUTH_IDLE_TIMEOUT_HOURS=720
AUTH_SESSION_SECRET=replace_with_a_long_random_secret
```

3. 启动容器：

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
- `-e DATA_DIR=/data` 决定容器内部使用哪个目录存储数据
- 不配置 `TWELVE_DATA_KEY` 也可以正常使用，只是自动获取价格会回退为手动输入

## 环境变量

| 变量名 | 用途 | 默认值 |
| --- | --- | --- |
| `APP_PORT` | compose 暴露到宿主机的端口 | `3000` |
| `DATA_DIR` | 容器内数据目录 | `/data` |
| `DCA_TRACKER_DATA_PATH` | compose 挂载到宿主机的实际目录 | `./data` |
| `TWELVE_DATA_KEY` | Twelve Data API Key，可选 | 空 |
| `APP_PASSWORD` | 页面访问密码；留空表示不启用认证 | 空 |
| `AUTH_IDLE_TIMEOUT_HOURS` | 空闲多久后要求重新登录 | `720` |
| `AUTH_SESSION_SECRET` | 会话签名密钥，建议设置为长随机字符串 | 空 |
| `PORT` | Node 服务监听端口 | `3000` |

注意：

- `TWELVE_DATA_KEY` 现在只需要配置在 Docker / 服务端环境中，不再打包进前端。
- `.env.example` 主要是给 `docker compose` 做变量替换参考，不是前端构建时注入用。
- 只要设置了 `APP_PASSWORD`，应用就会自动启用页面内登录页和长时会话。
- 如果你准备暴露到外网，建议同时使用 HTTPS 反向代理，并设置独立的 `AUTH_SESSION_SECRET`。

## 自动备份与损坏恢复

服务端文件存储具备以下特性：

- 首次启动会自动创建 `dca-data.json`
- 每次写入会自动生成备份
- 默认保留最近 `20` 份备份
- 如果主数据文件损坏，会自动切换到最近一份可用备份
- 应用界面会显示当前存储目录、数据文件、备份目录和恢复状态

## Windows 开发机部署到 Linux NAS，需要做什么

推荐有两条路。

### 方案 A：最省事，直接在 NAS 上构建

适合 NAS 已经装好 Docker / Container Manager。

1. 把整个项目文件夹复制到 NAS。
2. 在 NAS 上进入项目目录。
3. 按 `.env.example` 或 NAS 图形界面配置环境变量。
4. 执行：

```bash
docker compose up -d --build
```

优点：

- 不用管跨平台镜像
- 改完代码后直接在 NAS 重新构建即可

### 方案 B：在 Windows 先构建 Linux 镜像，再传到 NAS

适合你想在本地先出镜像，再上传。

1. 先确认 NAS CPU 架构：

- Intel / AMD 一般用 `linux/amd64`
- 新一些 ARM NAS 一般用 `linux/arm64`

2. 在 Windows 上构建对应 Linux 镜像：

```bash
docker buildx build --platform linux/amd64 -t dca-tracker:latest --load .
```

如果你的 NAS 是 ARM，把 `linux/amd64` 换成 `linux/arm64`。

3. 导出镜像：

```bash
docker save -o dca-tracker-linux.tar dca-tracker:latest
```

4. 把 `dca-tracker-linux.tar` 传到 NAS。

5. 在 NAS 上导入：

```bash
docker load -i dca-tracker-linux.tar
```

6. 然后再用 `docker run` 或 `docker compose` 启动，并挂载数据目录。

## 本地开发

### 仅前端开发

```bash
npm install
npm run dev
```

此模式下使用浏览器 `localStorage`。

### 本地模拟 Docker / 服务端模式

```bash
npm install
npm run build
npm start
```

如果你想本地测试自动行情：

PowerShell：

```powershell
$env:TWELVE_DATA_KEY="your_api_key_here"
npm run build
npm start
```

## 测试

```bash
npm test
```

## 技术栈

- React 18
- Vite
- Express
- Twelve Data
- Docker

## 迁移说明

如果你之前是纯浏览器模式：

- 旧数据仍可通过历史页导出 JSON
- Docker 部署后可直接在历史页导入 JSON
- 导入后后续数据会自动保存在 NAS 挂载目录中

## License

MIT
