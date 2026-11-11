# JasShared

GT、JasBlog、JasBlogEditor 共用的数据合同、内容展示和 Agent 基础机制。

五个包分别维护版本，通过 GitHub Release 的 npm 压缩包分发。应用只依赖已构建的安装包，不需要检出本仓库。

```sh
npm ci
npm run build
npm test
npm run check:boundaries
npm run pack
```

包的内部依赖在打包时转换成固定 Release URL；React 等宿主运行时使用 peerDependencies。发布产物不包含创作内容和本地配置。

模块归属、Agent 执行和数据迁移见 [架构说明](docs/architecture.md)，实施与验证见 [迁移记录](docs/migration.md)。

当前五包版本为 0.2.0，删除接口、行为修复与回归范围见 [清理记录](docs/cleanup.md)。

内容宿主显式导入 `@jas/content-ui/styles.css` 与 `@jas/graph-ui/styles.css`。单独使用图谱只需后者；导航、图片、主题和滚动由 ContentHostProvider 注入。
