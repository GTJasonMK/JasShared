# JasShared

公共模块仅通过 package.json 的 exports 提供接口，不依赖应用源码、配置或工作区。

- graph-core、content-core、agent-core 不引用 React、DOM、Node 文件系统、Next、Tauri 或 Zustand。
- graph-ui、content-ui 通过数据、回调和展示上下文接入宿主，不读写应用状态。
- 运行 `npm test`、`npm run build`、`npm run check:boundaries`，发布前验证真实安装包。
- 使用 `npm run pack` 生成 Release 安装包，内部依赖固定到对应 Release URL。
- 所有创作内容、应用数据和凭据保留在应用侧，公开夹具使用人工构造的数据。
