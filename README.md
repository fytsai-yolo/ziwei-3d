# 紫微斗數 3D 命盤 (ziwei-3d)

A 3D Zi Wei Dou Shu (紫微斗數) chart explorer. Five chart layers — 本命 / 大限 / 流年 / 流月 / 流日 — are stacked as translucent floors of a cube (pure CSS 3D), aligned by earthly-branch position, with multi-school analysis tooling on top.

## Features

- **排盤引擎**: [iztro](https://github.com/SylarLong/iztro), validated palace-by-palace against a 文墨天機 reference chart
- **3D 疊宮**: drag to rotate, scroll to zoom, layer spacing/opacity/visibility controls; hover a palace to highlight its column through all five layers with a cross-layer summary
- **飛星/欽天 tooling** (`fly-engine.js`): 自化 (離心↓/向心↑), 飛宮四化, 四化匯聚統計, 來因宮, 10 格局 detection rules
- **飛化視覺化** (`arrows.js`): click a palace → its four flying arrows (祿/權/科/忌) drawn as SVG curves in that layer's 3D plane; click a layer center → that layer's 四化; 匯聚熱力 mode tints palace columns by incoming 忌/祿
- **流年 timeline** (`timeline.js` + `timeline-ui.js`): 120-year scrubber with 大限 bands and 11 rule-based 吉凶 flags per year; click a year to re-derive the whole stack
- **報告匯出** (`report.js`): print-friendly HTML report (格局 / 十二宮 / 四化匯聚 / 流年提要 / 分域綜述) with a mandatory research-and-entertainment disclaimer

## Run

```bash
npm install
npm run dev    # http://localhost:5173
npm test       # 6 node test suites (43 groups)
npm run build
```

## Disclaimer

All chart interpretation follows traditional Zi Wei Dou Shu rules and is provided **for research and entertainment purposes only** — not medical, financial, legal, or life advice.
