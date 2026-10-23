# Muse 版说明（P(doom) MV · 720p）

本仓库是上游 [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video) 的 fork，在其基础上做 Muse 版本改版。原曲 `audio/pdoom.mp3` 与全部时间对齐数据（`data/`）未改动。

## 改了什么（相对上游的全部差异）

- **真分数 720p 渲染**：`app/src/engine/scale.ts`、`app/scripts/render.ts` 放开分数倍率，`--scale 0.6667` 即以 1280×720 物理分辨率真渲染（不是 1080p 缩放），构图与 1080p 一致。SCALE ≤ 1 时着色器与自适应采样走 1x 代码路径（`app/src/engine/glsl/common.ts`、`post.ts`、`engine.ts`、`gl.ts`）。
- **Claude → Muse**：原片中唯一出现 “Claude” 的画面是 prompt 场景 token 概率分布里的候选词，已改为 Muse（`app/src/scenes/prompt-data.ts`）。
- **Muse 形象入片**：全身奶油色毛茸茸小人（圆头连身、宽大椭圆脸盘、黑圆眼带圆点高光、小弧线嘴、粉腮红、短手短脚）重绘为代码矢量绘制函数（`app/src/scenes/_motifs.ts`），接入 dense 段（全身翻滚替换原圆盘，`dense-askew.ts`）与 ilya 段（笔记本盖贴纸，`ilya-room.ts`）；`shoggoth-glsl.ts` 本轮仅配合 SCALE 改动，其 X 光机制暂保留原圆盘脸。
- **Linux 渲染适配**：`render.ts` 的 Chrome 选取顺序与 ANGLE/SwiftShader 参数已适配 Linux 无 GPU 环境（上游默认是 macOS + 真 Chrome）。在带 GPU 的机器上同样可跑，且会快得多。

## 本地渲染

依赖：[bun](https://bun.sh)、Google Chrome（或 playwright 的 Chromium）、带 libx264 的 ffmpeg。

```sh
cd app
bun install
# 预览（浏览器打开 http://localhost:5173 ，可加 ?t=23&scale=0.6667）
bunx vite
# 720p 正式渲染
bun scripts/render.ts video --scale 0.6667 --samples auto --shutter 0.2 --out ../out/pdoom-muse-720p.mp4
```

注意：`--samples auto` 的自适应多采样在重场景（如 shoggoth 的光线步进）非常吃 GPU；无独显时整片渲染极慢，可先用 `--samples 4` 出快速草稿确认卡点与画音同步，再决定整片策略。

## 没进这个仓库的东西

- `out/` 下的渲染产物（样片 mp4、测试帧 png）：按上游 `.gitignore` 本就不入库。
- `app/node_modules/`：`bun install` 还原。
- `assets/` 里的 Muse 形象参考图（webp）：形象已矢量化进代码，渲染不依赖该图；同目录两个 json 是生成记录，一并提交在本仓库中。
