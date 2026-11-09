# Orbital Sweep · 球体扫雷

一个使用 Three.js、TypeScript 和 Vite 实现的完整球体扫雷游戏。棋盘由细分二十面体的对偶网格生成，标准难度包含 12 个五边形和 150 个六边形。

在线访问：[GitHub Pages](https://typeofnan.github.io/3D-Minesweeper/)

## 玩法

- 首次点击及其相邻格保证安全。
- 左键揭开格子；空白区域会自动连锁展开。
- 右键标记或取消标记地雷。
- 已揭开的数字周围旗帜数量正确时，再次点击数字可联动揭开其余邻格。
- 揭开全部安全格获胜，踩中地雷失败。

## 操作

- 拖动：无极旋转球体，可连续跨越南北极。
- 左键：揭开格子或执行数字联动。
- 右键：插旗/取消旗帜。
- 滚轮：缩放视角。
- 右上角：切换简单、标准、极限、噩梦、深渊难度或重新开始。

## 开发

```bash
pnpm install
pnpm dev
```

测试和生产构建：

```bash
pnpm test
pnpm run build
```

完整质量检查：

```bash
pnpm check
```

## GitHub Pages

推送到 `main` 分支后，`.github/workflows/pages.yml` 会依次执行格式检查、ESLint、测试和生产构建；全部通过后将 `dist` 部署到 GitHub Pages。

首次部署前，需要在 GitHub 仓库的 **Settings → Pages → Build and deployment → Source** 中选择 **GitHub Actions**。
