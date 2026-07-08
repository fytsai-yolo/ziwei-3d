// jsdom test for src/merged-renderer.js — the flat 平面疊宮盤 view.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>');
globalThis.document = dom.window.document;

const { buildChartData } = await import('../src/astro-service.js');
const { buildTimeline } = await import('../src/timeline.js');
const { renderMergedChart } = await import('../src/merged-renderer.js');
const { renderLayer } = await import('../src/renderer.js');

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

// Target 2027: known 疊宮 fixture year (大限忌+生年忌 both at 財帛, 流年忌入大限命宮).
const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2027-7-2 12:00',
});
const tl = buildTimeline(chart);
const overlapHits = tl.years.find(e => e.year === 2027).overlap;
const el = renderMergedChart(chart, { overlapHits });

ok('root shape: .layer.merged-chart with 12 palaces + center', () => {
  assert.ok(el.classList.contains('layer'));
  assert.ok(el.classList.contains('merged-chart'));
  assert.equal(el.dataset.layerId, 'merged');
  assert.equal(el.querySelectorAll('.palace').length, 12);
  assert.equal(el.querySelectorAll('.layer-center').length, 1);
});

ok('natal content intact in each cell (stars, badges, 自化, foot)', () => {
  const mao = el.querySelector('.palace[data-branch-index="1"]'); // 命宮 卯
  assert.equal(mao.querySelector('.palace-name').textContent, '命宮');
  assert.ok(mao.querySelector('.badge.life'));
  assert.ok([...mao.querySelectorAll('.star.major')].some(s => s.textContent.includes('太陽')));
  assert.ok(mao.querySelector('.mut.selfmut')); // 天梁 ↓科/↑權 glyphs
  assert.match(mao.querySelector('.palace-foot').textContent, /5-14/);
  const you = el.querySelector('.palace[data-branch-index="7"]');
  assert.ok(you.querySelector('.badge.laiyin')); // 來因 酉
});

ok('overlay strip: 限/年 relabel tags with is-life marking', () => {
  // 2027, decade 25-34: 大限命宮 at 丑(11); 流年丁未: 流命 at 未(5).
  const chou = el.querySelector('.palace[data-branch-index="11"]');
  const dTag = chou.querySelector('.ltag-decadal');
  assert.equal(dTag.textContent, '限·命宮');
  assert.ok(dTag.classList.contains('is-life'));
  const wei = el.querySelector('.palace[data-branch-index="5"]');
  const yTag = wei.querySelector('.ltag-yearly');
  assert.equal(yTag.textContent, '年·命宮');
  assert.ok(yTag.classList.contains('is-life'));
  // Every cell has both tags
  el.querySelectorAll('.palace').forEach(p => {
    assert.ok(p.querySelector('.ltag-decadal'), 'missing 限 tag');
    assert.ok(p.querySelector('.ltag-yearly'), 'missing 年 tag');
  });
});

ok('flow stars carry layer-colored classes; mutagen hits carry 限·/年· prefixes', () => {
  assert.ok(el.querySelectorAll('.star.flow.flow-decadal').length > 0);
  assert.ok(el.querySelectorAll('.star.flow.flow-yearly').length > 0);
  const hitTexts = [...el.querySelectorAll('.mut-hit')].map(h => h.textContent);
  assert.ok(hitTexts.some(t => t.startsWith('限·')));
  assert.ok(hitTexts.some(t => t.startsWith('年·')));
});

ok('疊宮 overlap chips appear on their palaces with tooltips, ovlp0 excluded', () => {
  // 2027: direct hit 流年忌入大限命宮 at 丑(11) — expect a 疊 chip there.
  const chou = el.querySelector('.palace[data-branch-index="11"]');
  const chip = chou.querySelector('.ovlp-chip');
  assert.ok(chip, 'expected 疊 chip at 丑');
  assert.equal(chip.textContent, '疊');
  assert.ok(chip.title.includes('流年忌入大限命宮'));
  // ovlp0-tier hits must not create chips anywhere
  const allChips = [...el.querySelectorAll('.ovlp-chip')];
  assert.ok(allChips.every(c => !c.classList.contains('ovlp0')));
  // Hover-highlight wiring: every chip carries its palace geometry as data attributes
  assert.equal(chip.getAttribute('data-ovlp-palace'), '11');
  assert.ok(chip.getAttribute('data-ovlp-severity').startsWith('ovlp'));
  allChips.forEach(c => assert.ok(c.hasAttribute('data-ovlp-palace')));
});

ok('center: 疊宮 label + one 四化 row per layer', () => {
  const center = el.querySelector('.layer-center');
  assert.equal(center.querySelector('.layer-label').textContent, '疊宮');
  assert.equal(center.querySelectorAll('.center-row').length, 3);
  const natRow = center.querySelector('.center-row .ltag-natal');
  assert.match(natRow.textContent, /^本命 乙亥/);
});

ok('renderLayer compact mode strips chips but keeps labels and badges', () => {
  const yearly = chart.layers[2];
  const compactEl = renderLayer(yearly, { compact: true });
  assert.equal(compactEl.querySelectorAll('.palace').length, 12);
  assert.equal(compactEl.querySelectorAll('.star.flow').length, 0);
  assert.equal(compactEl.querySelectorAll('.mut-hit').length, 0);
  assert.ok(compactEl.querySelector('.badge.life'));
  assert.equal(compactEl.querySelectorAll('.palace-name').length, 12);
  // Full (default) mode unchanged
  const fullEl = renderLayer(yearly);
  assert.ok(fullEl.querySelectorAll('.star.flow').length > 0);
});

console.log(`\nAll ${passed} merged-renderer test groups passed.`);
