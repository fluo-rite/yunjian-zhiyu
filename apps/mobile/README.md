# React Native 移动端

`apps/mobile` 是云笺智语的 React Native CLI 移动端工程。

## 安装依赖

所有移动端依赖命令都在 `apps/mobile` 目录下执行。

在 `D:\code\yunjian-zhiyu\apps\mobile` 中运行：

```bash
pnpm install
```

## 启动 Metro

在 `D:\code\yunjian-zhiyu\apps\mobile` 中运行：

```bash
pnpm start
```

如果缓存有问题，建议清缓存后重新启动：

```bash
pnpm start --reset-cache
```

## 运行应用

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

## 后端要求

移动端默认依赖本机 `8000` 端口上的 FastAPI 服务。

你可以在仓库根目录启动后端：

在 `D:\code\yunjian-zhiyu` 中运行：

```bash
pnpm dev:server
```

## API 地址配置

移动端运行时 API 配置文件是 [app.config.json](D:/code/yunjian-zhiyu/apps/mobile/app.config.json)。

开发环境通常会使用下面两种地址之一：

- `http://127.0.0.1:8000/api/v1`
- `http://<你的局域网IP>:8000/api/v1`

## Android 真机调试

### 推荐方式：USB + `adb reverse`

这是 Android 真机调试最简单稳定的方式。

1. 用 USB 连接手机，并确保已经开启 USB 调试。
2. 运行：

```bash
adb reverse tcp:8000 tcp:8000
```

3. 把 [app.config.json](D:/code/yunjian-zhiyu/apps/mobile/app.config.json) 里的 `developmentBaseUrl` 设置为：

```json
"http://127.0.0.1:8000/api/v1"
```

4. 重启 Metro，并重新运行 App。

### 备用方式：局域网 IP

如果不使用 `adb reverse`，可以改用局域网直连。

1. 确保后端已经启动在 `0.0.0.0:8000`。
2. 确保手机和电脑在同一个局域网。
3. 把 `developmentBaseUrl` 设置成你电脑的局域网 IP，例如：

```json
"http://192.168.1.23:8000/api/v1"
```

4. 重启 Metro，并重新运行 App。

## 连通性验证

在测试登录注册前，建议先在手机浏览器中验证连通性。

### 使用 `adb reverse` 时

打开：

```text
http://127.0.0.1:8000/health
```

### 使用局域网 IP 时

打开：

```text
http://<你的局域网IP>:8000/health
```

预期返回：

```json
{"status":"ok"}
```

## 当前实现说明

- 已接入 React Query 作为服务端状态基础层
- 已接通鉴权本地持久化
- 会话列表和聊天详情已经接入真实后端接口
- 流式聊天事件已经通过移动端 stream 层接通

## 主要目录

- `android/`: Android 原生工程
- `ios/`: iOS 原生工程
- `src/components/`: 通用 UI 组件
- `src/config/`: 运行时配置辅助
- `src/features/`: 按业务拆分的功能模块
- `src/lib/`: API、query、storage、stream 等基础能力
- `src/navigation/`: 导航结构
- `src/store/`: Redux 鉴权状态
- `src/theme/`: 设计 token
