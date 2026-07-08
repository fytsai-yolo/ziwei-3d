// Tests for src/fly-reader.js — layered 疊宮 readings for flying 四化 arrows.
import assert from 'node:assert/strict';
import { buildChartData } from '../src/astro-service.js';
import { palaceNamesAt, composeFlightReading, composeFinalParagraph } from '../src/fly-reader.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});

ok('palaceNamesAt returns the three layer names of a physical palace', () => {
  for (let i = 0; i < 12; i++) {
    const names = palaceNamesAt(chart, i);
    assert.equal(names.natal, chart.layers[0].cells[i].palaceName);
    assert.equal(names.decadal, chart.layers[1].cells[i].palaceName);
    assert.equal(names.yearly, chart.layers[2].cells[i].palaceName);
    assert.ok(names.natal && names.decadal && names.yearly);
  }
});

ok('normal flight: sentence carries 年 source, 年 target, 限 channel, 本命 landing', () => {
  // Use the real flying map so the fixture is a genuine flight of this chart.
  const fromIndex = 0;
  const flight = chart.flying.map[fromIndex]['祿'];
  assert.notEqual(flight.toIndex, null);
  const src = palaceNamesAt(chart, fromIndex);
  const tgt = palaceNamesAt(chart, flight.toIndex);
  const r = composeFlightReading(chart, { fromIndex, key: '祿', star: flight.star, toIndex: flight.toIndex });
  assert.equal(r.key, '祿');
  assert.ok(r.title.includes(`年${src.yearly}化祿`), r.title);
  assert.ok(r.title.includes(flight.star));
  if (flight.toIndex !== fromIndex) {
    assert.ok(r.title.includes(`年${tgt.yearly}`));
    assert.ok(r.text.includes(`大限${tgt.decadal}`));
    assert.ok(r.text.includes(`本命${tgt.natal}`));
    assert.ok(r.text.includes('資源與機遇'));
  }
});

ok('all four keys compose with key-specific advice', () => {
  const advice = { '祿': '主動經營', '權': '防強求', '科': '貴人斡旋', '忌': '宜守不宜攻' };
  for (const key of ['祿', '權', '科', '忌']) {
    const flight = chart.flying.map[5][key];
    const r = composeFlightReading(chart, { fromIndex: 5, key, star: flight.star, toIndex: flight.toIndex });
    if (r && flight.toIndex !== 5) {
      assert.ok(r.text.includes(advice[key]), `${key}: ${r.text}`);
    }
  }
});

ok('self-flight composes the 入本宮 concentration reading', () => {
  const src = palaceNamesAt(chart, 3);
  const r = composeFlightReading(chart, { fromIndex: 3, key: '忌', star: '巨門', toIndex: 3 });
  assert.ok(r.title.includes('入本宮'));
  assert.ok(r.text.includes(`本命${src.natal}`));
  assert.ok(r.text.includes('自生自受'));
});

ok('missing target returns null', () => {
  assert.equal(composeFlightReading(chart, { fromIndex: 0, key: '科', star: 'x', toIndex: null }), null);
  assert.equal(composeFinalParagraph(chart, { fromIndex: 0, key: '科', star: 'x', toIndex: null }), null);
});

ok('最終解盤: fluent paragraph carries actor, field, channel, pool + citations', () => {
  const fromIndex = 0;
  const flight = chart.flying.map[fromIndex]['祿'];
  const p = composeFinalParagraph(chart, { fromIndex, key: '祿', star: flight.star, toIndex: flight.toIndex });
  assert.ok(p, 'expected a paragraph');
  const src = palaceNamesAt(chart, fromIndex);
  const tgt = palaceNamesAt(chart, flight.toIndex);
  assert.ok(p.startsWith('今年，'), p);
  assert.ok(p.includes(`年${src.yearly}化祿`), p);
  if (flight.toIndex !== fromIndex) {
    assert.ok(p.includes(`入年${tgt.yearly}`), p);
    assert.ok(p.includes(`（大限${tgt.decadal}）`), p);
    assert.ok(p.includes(`（本命${tgt.natal}）`), p);
    assert.ok(p.includes('帶來利益'), p);
  }
  assert.ok(p.endsWith('。'));
});

ok('最終解盤: every palace × every key composes without throwing (full-coverage lexicon)', () => {
  for (let i = 0; i < 12; i++) {
    for (const key of ['祿', '權', '科', '忌']) {
      const flight = chart.flying.map[i][key];
      const p = composeFinalParagraph(chart, { fromIndex: i, key, star: flight.star, toIndex: flight.toIndex });
      if (flight.toIndex !== null) {
        assert.ok(typeof p === 'string' && p.length > 20, `${i}/${key} produced: ${p}`);
        assert.ok(!p.includes('{'), `unresolved template slot in ${i}/${key}: ${p}`);
        assert.ok(!p.includes('undefined'), `undefined leaked into ${i}/${key}: ${p}`);
      }
    }
  }
});

ok('最終解盤: self-flight gets the 自聚本宮 paragraph', () => {
  const p = composeFinalParagraph(chart, { fromIndex: 3, key: '忌', star: '巨門', toIndex: 3 });
  assert.ok(p.includes('自聚本宮'), p);
  assert.ok(p.includes('不假外求'), p);
});

console.log(`\nAll ${passed} fly-reader test groups passed.`);
