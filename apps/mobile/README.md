# React Native Mobile App

`apps/mobile` 现在已经从 Expo 骨架切换为纯 React Native CLI 工程。

## 当前状态

- 原生工程目录已经接入：`android/`、`ios/`
- 业务页面继续沿用当前 `src/` 目录组织
- 当前保留的是最小移动端骨架，方便后续按 React Native 方式继续开发

## 启动

在仓库根目录执行：

```bash
yarn install
yarn dev:mobile
```

Android：

```bash
yarn workspace @yunjian/mobile android
```

iOS：

```bash
yarn workspace @yunjian/mobile ios
```

首次迁移到 Yarn 后，建议先清一次 Metro 缓存：

```bash
yarn workspace @yunjian/mobile start --reset-cache
```

## 目录说明

- `src/app/`: 当前保留的页面入口占位
- `src/features/`: 业务模块
- `src/components/`: 基础 UI 组件
- `src/lib/`: 后续 API / 工具层入口
- `src/store/`: 后续状态管理入口
- `src/theme/`: 基础设计 token

## 后续建议

- 先确定导航方案，再继续扩展多页面结构
- 再逐步接回 API、状态管理与业务流
- 优先按 RN CLI 原生工程规范维护 Android 和 iOS 配置
