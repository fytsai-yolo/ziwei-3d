// Fly-engine tests. Ground truth: the user's 文墨天機 reference chart
// (male, solar 1995-11-17 未時), whose printout marks every 自化 (↓離心/↑向心),
// the 來因宮 (乙酉遷移), and whose stem table we verified mark-by-mark.
import assert from 'node:assert/strict';
import { buildChartData } from '../src/astro-service.js';
import {
  STEM_MUTAGEN, oppositeIndex, sanFangSiZheng,
  computeSelfMutagen, computeFlyingMap, computeFlyIn, findLaiyinIndex, detectPatterns,
} from '../src/fly-engine.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});
const natal = chart.layers[0];
// Rebuild the fly-engine input from natal cells (same mapping astro-service uses)
const fePalaces = natal.cells.map((c) => ({
  index: c.branchIndex,
  stem: c.stem,
  branch: c.branch,
  palaceName: c.palaceName,
  isLifePalace: c.isLifePalace,
  isBodyPalace: c.isBodyPalace,
  majorStarNames: c.majorStars.map((s) => s.name),
  otherStarNames: c.minorStars.map((s) => s.name),
}));
const byBranch = (b) => natal.cells.find((c) => c.branch === b);

ok('STEM_MUTAGEN spot checks (中州 table incl. 戊右弼科)', () => {
  assert.deepEqual(STEM_MUTAGEN['乙'], { '祿': '天機', '權': '天梁', '科': '紫微', '忌': '太陰' });
  assert.deepEqual(STEM_MUTAGEN['戊'], { '祿': '貪狼', '權': '太陰', '科': '右弼', '忌': '天機' });
  assert.deepEqual(STEM_MUTAGEN['癸'], { '祿': '破軍', '權': '巨門', '科': '太陰', '忌': '貪狼' });
  assert.equal(oppositeIndex(1), 7);
  assert.deepEqual(sanFangSiZheng(1), [1, 5, 9, 7]);
});

ok('自化: every ↓/↑ mark in the 文墨 chart is reproduced', () => {
  const norm = (hits) => hits.map((h) => `${h.star}${h.kind === 'out' ? '↓' : '↑'}${h.key}`).sort();
  const expected = {
    '寅': ['右弼↓科', '武曲↑科'],
    '卯': ['天梁↓科', '天梁↑權'],
    '辰': [],
    '巳': ['天機↑科'],
    '午': ['紫微↓權'],
    '未': [],
    '申': ['破軍↓權'],
    '酉': [],
    '戌': ['廉貞↓忌'],
    '亥': ['太陰↓祿', '文曲↑科'],
    '子': ['貪狼↓祿', '左輔↑科'],
    '丑': ['巨門↑權'],
  };
  for (const [branch, marks] of Object.entries(expected)) {
    assert.deepEqual(norm(byBranch(branch).selfHits), marks.sort(), `branch ${branch}`);
  }
});

ok('飛宮四化: 命宮己卯 four flights', () => {
  const map = chart.flying.map;
  const lifeIdx = byBranch('卯').branchIndex;
  const flights = map[lifeIdx];
  assert.deepEqual(flights['祿'], { star: '武曲', toIndex: byBranch('寅').branchIndex });
  assert.deepEqual(flights['權'], { star: '貪狼', toIndex: byBranch('子').branchIndex });
  assert.deepEqual(flights['科'], { star: '天梁', toIndex: lifeIdx }); // self-flight
  assert.deepEqual(flights['忌'], { star: '文曲', toIndex: byBranch('亥').branchIndex });
});

ok('匯聚: 四忌匯財帛(亥) — from 命(卯), 遷移(酉), 夫妻(丑), 生年', () => {
  const flyIn = chart.flying.flyIn;
  const hai = byBranch('亥').branchIndex;
  const jiSources = flyIn[hai]['忌'].map((r) => r.from).sort();
  const expect = [byBranch('卯').branchIndex, byBranch('酉').branchIndex, byBranch('丑').branchIndex, 'birth']
    .sort();
  assert.deepEqual(jiSources, expect);
});

ok('匯聚: 祿權科會命(卯)', () => {
  const flyIn = chart.flying.flyIn;
  const mao = byBranch('卯').branchIndex;
  const froms = (key) => flyIn[mao][key].map((r) => r.from).sort();
  // 祿: 父母庚辰 太陽祿, 田宅壬午 天梁祿
  assert.deepEqual(froms('祿'), [byBranch('辰').branchIndex, byBranch('午').branchIndex].sort());
  // 權: 福德辛巳 太陽權, 遷移乙酉 天梁權, 生年乙 天梁權
  assert.deepEqual(froms('權'),
    [byBranch('巳').branchIndex, byBranch('酉').branchIndex, 'birth'].sort());
  // 科: 疾厄丙戌 文昌科, 命宮己卯 天梁科(self), 夫妻己丑 天梁科
  assert.deepEqual(froms('科'),
    [byBranch('戌').branchIndex, byBranch('卯').branchIndex, byBranch('丑').branchIndex].sort());
});

ok('來因宮 = 乙酉(遷移), and meta carries it', () => {
  const you = byBranch('酉').branchIndex;
  assert.equal(findLaiyinIndex(fePalaces, '乙'), you);
  assert.equal(chart.meta.laiyinIndex, you);
  assert.equal(chart.meta.yearStem, '乙');
  assert.equal(chart.meta.bodyPalaceIndex, byBranch('巳').branchIndex);
  assert.equal(natal.laiyinIndex, you);
});

ok('格局: hits 陽梁昌祿/祿馬交馳/日照雷門; strict 機月同梁 correctly absent', () => {
  const ids = chart.patterns.map((p) => p.id).sort();
  assert.deepEqual(ids, ['lu-ma-jiao-chi', 'ri-zhao-lei-men', 'yang-liang-chang-lu'].sort());
  const ylcl = chart.patterns.find((p) => p.id === 'yang-liang-chang-lu');
  // 卯 holds 陽梁昌祿 physically; empty 酉 also qualifies via 借宮 borrowing of 卯's majors.
  assert.deepEqual(ylcl.palaces, [byBranch('卯').branchIndex, byBranch('酉').branchIndex].sort());
  const lmjc = chart.patterns.find((p) => p.id === 'lu-ma-jiao-chi');
  assert.deepEqual(lmjc.palaces, [byBranch('巳').branchIndex]); // 天機生年祿+天馬同宮於身宮
});

ok('pure functions do not mutate input', () => {
  const snapshot = JSON.stringify(fePalaces);
  computeSelfMutagen(fePalaces);
  const map = computeFlyingMap(fePalaces);
  computeFlyIn(map, '乙', fePalaces);
  findLaiyinIndex(fePalaces, '乙');
  detectPatterns({ palaces: fePalaces, lifeIndex: 1, bodyIndex: 3, yearStem: '乙' });
  assert.equal(JSON.stringify(fePalaces), snapshot);
});

ok('命無正曜 detection (synthetic: empty life palace)', () => {
  const synth = fePalaces.map((p) => ({ ...p, majorStarNames: [...p.majorStarNames], otherStarNames: [...p.otherStarNames] }));
  const you = synth.findIndex((p) => p.branch === '酉'); // empty palace
  const hits = detectPatterns({ palaces: synth, lifeIndex: you, bodyIndex: you, yearStem: '乙' });
  assert.ok(hits.some((p) => p.id === 'ming-wu-zheng-yao'));
});

console.log(`\nAll ${passed} fly-engine test groups passed.`);
