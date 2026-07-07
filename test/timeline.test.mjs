// Timeline rule tests. Fixtures derived from the user's reference chart and the
// hand-worked flow-year analysis (乙年雙忌, 2019 三忌, 紅鸞/天喜 years, …).
import assert from 'node:assert/strict';
import { buildChartData } from '../src/astro-service.js';
import { buildTimeline, severityWeight, yearSummary } from '../src/timeline.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});
const tl = buildTimeline(chart);
const byYear = (y) => tl.years.find(e => e.year === y);
const flagIds = (y) => byYear(y).flags.map(f => f.id).sort();

ok('shape: 120 years from 1995, correct 干支/虛歲', () => {
  assert.equal(tl.birthYear, 1995);
  assert.equal(tl.years.length, 120);
  assert.deepEqual(
    [tl.years[0].ganzhi, tl.years[0].xuSui], ['乙亥', 1]);
  assert.equal(byYear(2026).ganzhi, '丙午');
  assert.equal(byYear(2026).xuSui, 32);
});

ok('大限 bands: 童限 1-4, then 5-14 命宮 … 45-54 財帛', () => {
  assert.equal(byYear(1995).decadal, null);
  assert.equal(byYear(1998).decadal, null);
  assert.deepEqual(byYear(1999).decadal.range, [5, 14]);
  assert.equal(byYear(1999).decadal.palaceName, '命宮');
  assert.deepEqual(byYear(2019).decadal.range, [25, 34]);
  assert.equal(byYear(2019).decadal.palaceName, '夫妻');
  assert.equal(byYear(2039).decadal.palaceName, '財帛');
});

ok('2019 己亥: 年忌入生年忌宮 + 年忌入流命 (三忌匯, score -3)', () => {
  assert.deepEqual(flagIds(2019), ['ji-in-life', 'ji-into-birth-ji'].sort());
  assert.equal(byYear(2019).score, -3);
});

ok('2025 乙巳: 年忌疊生年忌 + 沖流命, but 天機年祿坐流命 (mixed year, score -2)', () => {
  assert.deepEqual(flagIds(2025), ['ji-chong-life', 'ji-stack-birth', 'lu-in-flow-life'].sort());
  assert.equal(byYear(2025).score, -2);
});

ok('2026 丙午: 年忌疊自化忌 (廉貞, score -2)', () => {
  assert.deepEqual(flagIds(2026), ['ji-stack-self']);
  assert.equal(byYear(2026).score, -2);
});

ok('戊 years: 年忌入身宮 (天機忌入巳)', () => {
  assert.ok(flagIds(2018).includes('ji-in-body')); // 戊戌
  assert.ok(flagIds(2028).includes('ji-in-body')); // 戊申
});

ok('庚/壬 years: 年祿入命宮 (太陽祿/天梁祿入卯)', () => {
  assert.ok(flagIds(2020).includes('lu-in-natal-life')); // 庚子
  assert.ok(flagIds(2032).includes('lu-in-natal-life')); // 壬子
  // 2011 辛卯: 巨門祿→丑 not 卯, but 流命=卯; 文昌忌入卯 not flagged (rules only track 流命/身/生年忌)
  assert.ok(!flagIds(2011).includes('lu-in-natal-life'));
});

ok('桃花 years: 2024 紅鸞坐流命, 2030 天喜坐流命', () => {
  assert.ok(flagIds(2024).includes('hongluan')); // 甲辰
  assert.ok(flagIds(2030).includes('tianxi'));   // 庚戌
  assert.ok(!flagIds(2023).includes('hongluan'));
});

ok('流命疊大限命: 2010 庚寅 (大限15-24在兄弟寅)', () => {
  assert.ok(flagIds(2010).includes('stack-decadal-life'));
  assert.equal(severityWeight('note'), 0);
});

ok('yearSummary format', () => {
  const s = yearSummary(byYear(2026));
  assert.equal(s, '2026 丙午（虛32）｜大限 25-34 夫妻｜年忌疊自化忌');
  const calm = tl.years.find(e => e.flags.length === 0);
  assert.match(yearSummary(calm), /｜平$/);
});

console.log(`\nAll ${passed} timeline test groups passed.`);
