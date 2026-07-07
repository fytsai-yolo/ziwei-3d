// jsdom test for src/arrows.js using the user's reference chart's real flying map.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>');
globalThis.document = dom.window.document;

const { buildChartData, MUTAGEN_KEYS } = await import('../src/astro-service.js');
const { createFlyOverlay, KEY_COLORS, KEY_SUFFIX } = await import('../src/arrows.js');

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});
const grids = chart.layers[0].cells.map(c => c.grid);
const lifeIdx = chart.layers[0].lifeIndex;
const flights = MUTAGEN_KEYS.map(key => ({
  key,
  star: chart.flying.map[lifeIdx][key].star,
  toIndex: chart.flying.map[lifeIdx][key].toIndex,
}));

ok('overlay element shape (svg, defs with 4 markers, empty marks group)', () => {
  const ov = createFlyOverlay(grids);
  assert.equal(ov.el.tagName.toLowerCase(), 'svg');
  assert.equal(ov.el.getAttribute('class'), 'fly-overlay');
  assert.equal(ov.el.getAttribute('viewBox'), '0 0 560 560');
  assert.equal(ov.el.querySelectorAll('defs marker').length, 4);
  assert.equal(ov.el.querySelector('.fly-marks').children.length, 0);
});

ok('命宮 four flights: source ring + 4 paths + 4 labels, self-flight uses arc loop', () => {
  const ov = createFlyOverlay(grids);
  ov.drawPalaceFlights(lifeIdx, flights);
  const marks = ov.el.querySelector('.fly-marks');
  assert.equal(marks.querySelectorAll('circle').length, 1); // source ring
  const paths = [...marks.querySelectorAll('path')];
  assert.equal(paths.length, 4);
  const texts = [...marks.querySelectorAll('text')].map(t => t.textContent);
  assert.deepEqual(texts.sort(), ['武曲祿', '貪狼權', '天梁科', '文曲忌'].sort());
  // 天梁科 is a self-flight (己卯 → 天梁 in 卯) → its path is an arc (A command), others are Q curves
  const keyed = Object.fromEntries(paths.map(p => [p.querySelector('title').textContent, p]));
  assert.match(keyed['天梁化科'].getAttribute('d'), /A/);
  assert.match(keyed['文曲化忌'].getAttribute('d'), /Q/);
  // stroke colors match the mutagen palette
  assert.equal(keyed['武曲化祿'].getAttribute('stroke'), KEY_COLORS['祿']);
  assert.equal(keyed['文曲化忌'].getAttribute('stroke'), KEY_COLORS['忌']);
  // every path uses this overlay's own marker
  paths.forEach(p => assert.match(p.getAttribute('marker-end'), /^url\(#fly-arrow-(lu|quan|ke|ji)-\d+\)$/));
});

ok('clear() empties marks but keeps markers', () => {
  const ov = createFlyOverlay(grids);
  ov.drawPalaceFlights(lifeIdx, flights);
  ov.clear();
  assert.equal(ov.el.querySelector('.fly-marks').children.length, 0);
  assert.equal(ov.el.querySelectorAll('defs marker').length, 4);
});

ok('drawCenterFlights: gold dot + one arrow per located 生年四化 star', () => {
  const ov = createFlyOverlay(grids);
  const natal = chart.layers[0];
  const locate = (star) => {
    const c = natal.cells.find(c =>
      c.majorStars.some(s => s.name === star) || c.minorStars.some(s => s.name === star));
    return c ? c.branchIndex : null;
  };
  const targets = MUTAGEN_KEYS.map(key => ({
    key, star: natal.mutagenMap[key], toIndex: locate(natal.mutagenMap[key]),
  }));
  ov.drawCenterFlights(targets);
  const marks = ov.el.querySelector('.fly-marks');
  assert.equal(marks.querySelectorAll('circle').length, 1); // center dot
  assert.equal(marks.querySelectorAll('path').length, 4); // 機祿/梁權/紫科/陰忌 all locatable
});

ok('null toIndex is skipped; marker ids unique across overlays', () => {
  const ov1 = createFlyOverlay(grids);
  const ov2 = createFlyOverlay(grids);
  ov1.drawPalaceFlights(0, [{ key: '祿', star: '不存在', toIndex: null }]);
  assert.equal(ov1.el.querySelector('.fly-marks').querySelectorAll('path').length, 0);
  const ids1 = [...ov1.el.querySelectorAll('marker')].map(m => m.id);
  const ids2 = [...ov2.el.querySelectorAll('marker')].map(m => m.id);
  assert.equal(new Set([...ids1, ...ids2]).size, 8);
  for (const suffix of Object.values(KEY_SUFFIX)) {
    assert.ok(ids1.some(id => id.includes(`-${suffix}-`)));
  }
});

console.log(`\nAll ${passed} arrows test groups passed.`);
