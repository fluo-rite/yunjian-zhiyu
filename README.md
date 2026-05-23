# 云笺智语

云笺智语项目的 monorepo 仓库。

## 技术栈

- 移动端：React Native CLI、TypeScript
- 后端：Python、FastAPI、uv

## 仓库结构

- `apps/mobile/`: React Native 移动端应用
- `apps/server/`: FastAPI 后端服务
- `develop_doc/`: 项目说明、设计文档和开发资料

## 环境要求

- Node.js 20+
- pnpm 10+
- Python 3.12+
- uv
- Android Studio / Android SDK（Android 调试需要）
- Xcode（iOS 调试需要）

## 安装依赖

移动端依赖安装在 `apps/mobile` 目录下执行。

在 `D:\code\yunjian-zhiyu\apps\mobile` 中运行：

```bash
pnpm install
```

后端依赖安装在 `apps/server` 目录下执行。

在 `D:\code\yunjian-zhiyu\apps\server` 中运行：

```bash
uv sync
```

## 环境配置

开始开发前，先为后端创建 `.env`：

在 `D:\code\yunjian-zhiyu\apps\server` 中运行：

```bash
Copy-Item .env.example .env
```

移动端当前通过 [apps/mobile/app.config.json](D:/code/yunjian-zhiyu/apps/mobile/app.config.json) 读取 API 运行时配置。

## 启动开发服务

### 启动后端

在仓库根目录 `D:\code\yunjian-zhiyu` 中运行：

```bash
pnpm dev:server
```

这条命令会把 FastAPI 启动在 `0.0.0.0:8000`。

### 启动 ARQ Worker

如果要联调聊天流式生成链路，还需要在另一个终端启动 ARQ Worker。

在 `D:\code\yunjian-zhiyu\apps\server` 中运行：

```bash
uv run arq app.workers.arq_worker.WorkerSettings
```

### 启动 Metro

在仓库根目录 `D:\code\yunjian-zhiyu` 中运行：

```bash
pnpm dev:mobile
```

如果 Metro 缓存异常，建议清一次缓存：

在 `D:\code\yunjian-zhiyu\apps\mobile` 中运行：

```bash
pnpm start --reset-cache
```

## 运行移动端应用

### Android

在 `D:\code\yunjian-zhiyu\apps\mobile` 中运行：

```bash
pnpm android
```

### iOS

在 `D:\code\yunjian-zhiyu\apps\mobile` 中运行：

```bash
pnpm ios
```

## Android 真机调试

让 Android 真机访问电脑上运行的后端，通常有两种方式。

### 方式一：USB + `adb reverse`

这是最推荐的方式，配置简单，也通常能规避 Windows 防火墙和局域网入站限制。

1. 用 USB 连接手机，并打开开发者模式和 USB 调试。
2. 在任意终端运行：

```bash
adb reverse tcp:8000 tcp:8000
```

3. 把 [apps/mobile/app.config.json](D:/code/yunjian-zhiyu/apps/mobile/app.config.json) 里的 `developmentBaseUrl` 设置为：

```json
"http://127.0.0.1:8000/api/v1"
```

4. 重启 Metro，并重新运行 App。

### 方式二：局域网 IP 直连

当你不方便使用 `adb reverse` 时，可以改用局域网 IP。

1. 确保手机和电脑连接在同一个局域网。
2. 确保后端通过 `0.0.0.0:8000` 暴露服务：

```bash
pnpm dev:server
```

3. 找到电脑的局域网 IP，例如 `192.168.1.23`。
4. 把 [apps/mobile/app.config.json](D:/code/yunjian-zhiyu/apps/mobile/app.config.json) 里的 `developmentBaseUrl` 设置为：

```json
"http://192.168.1.23:8000/api/v1"
```

5. 重启 Metro，并重新运行 App。

如果这种方式不通，优先排查：

- Windows 防火墙是否拦截 `8000`
- 手机和电脑是否真的在同一网络
- 后端是否已经成功启动

## 连通性验证

先不要急着测登录注册，建议先在手机浏览器里验证后端连通性。

### 使用 `adb reverse` 时

打开：

```text
http://127.0.0.1:8000/health
```

### 使用局域网 IP 时

把 `127.0.0.1` 替换成你的电脑局域网 IP，例如：

```text
http://192.168.1.23:8000/health
```

预期返回：

```json
{"status":"ok"}
```

## 常用命令

在仓库根目录 `D:\code\yunjian-zhiyu` 中运行：

```bash
pnpm dev:mobile
pnpm dev:server
pnpm lint:mobile
pnpm lint:server
pnpm test:server
pnpm check
```
