// Fixture tests for src/overlap-engine.js, hand-verified against the user's real reference
// chart (male, solar 1995-11-17 未時) by direct computation before delegating the spec.
import assert from 'node:assert/strict';
import { buildChartData } from '../src/astro-service.js';
import { buildTimeline } from '../src/timeline.js';
import {
  LUCUN_BRANCH, BRANCH_ORDER, flowingShaFromStem, locateStar, evaluateOverlap,
} from '../src/overlap-engine.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});
const natal = chart.layers[0];
const cells = natal.cells;
const tl = buildTimeline(chart);
const byYear = (y) => tl.years.find((e) => e.year === y);
const overlapIds = (y) => byYear(y).overlap.map((f) => f.id);

ok('LUCUN_BRANCH full 10-stem coverage matches verified table', () => {
  assert.deepEqual(LUCUN_BRANCH, {
    '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
    '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
  });
  assert.equal(BRANCH_ORDER, '寅卯辰巳午未申酉戌亥子丑');
});

ok('flowingShaFromStem: 擎羊=祿+1, 陀羅=祿-1 for all 10 stems', () => {
  const expect = {
    '甲': [1, 11], '乙': [2, 0], '丙': [4, 2], '丁': [5, 3], '戊': [4, 2],
    '己': [5, 3], '庚': [7, 5], '辛': [8, 6], '壬': [10, 8], '癸': [11, 9],
  };
  for (const [stem, [qy, tl2]] of Object.entries(expect)) {
    const { qingYangIndex, tuoLuoIndex } = flowingShaFromStem(stem);
    assert.equal(qingYangIndex, qy, `${stem} 擎羊`);
    assert.equal(tuoLuoIndex, tl2, `${stem} 陀羅`);
  }
});

ok('locateStar finds natal major/minor star positions, null when absent', () => {
  assert.equal(locateStar(cells, '太陰'), 9); // 財帛丁亥
  assert.equal(locateStar(cells, '文曲'), 9); // 財帛's minor star
  assert.equal(locateStar(cells, '巨門'), 11); // 夫妻己丑
  assert.equal(locateStar(cells, '不存在的星'), null);
});

ok('Fixture 1 (2007 丁亥): 大限忌(文曲)入流年命宮(財帛) direct hit, severity ovlp2', () => {
  const hits = byYear(2007).overlap;
  const direct = hits.find((h) => h.id === 'direct-decadal-into-year');
  assert.ok(direct, '大限忌入流年命宮 flag missing');
  assert.equal(direct.palaceIndex, 9);
  assert.equal(direct.severity, 'ovlp2');
  assert.equal(direct.hasBonus, false);
  assert.match(direct.label, /^大限忌入流年命宮\(財帛\)/);
});

ok('Fixture 2 (1999 己卯): acute-converge via 生年 only (decadalStem===yearStem excluded), severity ovlp1', () => {
  const hits = byYear(1999).overlap;
  const acute = hits.find((h) => h.id === 'acute-converge');
  assert.ok(acute, 'acute-converge flag missing');
  assert.equal(acute.palaceIndex, 9);
  assert.equal(acute.severity, 'ovlp1');
  assert.match(acute.label, /^流年忌\(文曲\)疊生年忌 於 財帛/);
});

ok('Fixture 3 (童限, xuSui 1-4): decadal-dependent rules skip cleanly, no throw', () => {
  for (const y of [1995, 1996, 1997, 1998]) {
    const entry = byYear(y);
    assert.equal(entry.decadal, null);
    assert.doesNotThrow(() => entry.overlap);
  }
  // Birth year itself: yearStem === birthStem, so acute-converge's distinct-stem guard
  // must suppress the trivial self-match.
  assert.deepEqual(byYear(1995).overlap, []);
});

ok('evaluateOverlap does not mutate natalCells', () => {
  const before = JSON.stringify(cells);
  evaluateOverlap({
    birthStem: chart.meta.yearStem, decadalStem: '己', decadalLifeIndex: 1,
    yearStem: '丁', flowLifeIndex: 9,
  }, cells);
  assert.equal(JSON.stringify(cells), before);
});

ok('SFSZ-tier flags never escalate severity even with a bonus co-star', () => {
  // 2001 辛巳: 運陀羅(己→午→巳=index3) lands in SFSZ, and natal 巳=福德/身宮 has 鈴星 ->
  // a bonus-eligible palace, but since the flag id starts with 'sfsz-' it must stay 'ovlp0'.
  const hits = byYear(2001).overlap;
  const shaHit = hits.find((h) => h.id === 'sfsz-decadal-sha-in-year' && h.palaceIndex === 3);
  assert.ok(shaHit, 'expected 運陀羅入流年三方(福德) flag at palaceIndex 3');
  assert.equal(shaHit.severity, 'ovlp0');
  assert.match(shaHit.label, /鈴星同宮/);
  assert.match(shaHit.label, /含身宮/);
});

ok('overlap flags feed into score via SEVERITY_WEIGHTS (ovlp2 = -2)', () => {
  // 2007 also carries the pre-existing 'lu-in-flow-life' (+1) rule, netting the score to -1 —
  // confirm the overlap flag itself is present with the right severity rather than asserting
  // on the aggregate score, which depends on unrelated rules too.
  const entry = byYear(2007);
  assert.ok(entry.flags.some((f) => f.id === 'direct-decadal-into-year' && f.severity === 'ovlp2'));
  assert.equal(entry.score, 1 - 2); // +1 (lu-in-flow-life) + -2 (direct hit) + 0*3 (sfsz tiers)
});

console.log(`\nAll ${passed} overlap-engine test groups passed.`);
