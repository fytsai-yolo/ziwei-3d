// Node tests for src/report.js and src/notes-data.js (no DOM needed — report is a string).
import assert from 'node:assert/strict';
import { buildChartData } from '../src/astro-service.js';
import { buildTimeline } from '../src/timeline.js';
import { getNotesForChart, chartKeyOf } from '../src/notes-data.js';
import { buildReportHTML, DISCLAIMER, esc } from '../src/report.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});
const timeline = buildTimeline(chart);
const notes = getNotesForChart(chart.meta);

ok('notes gating: matches the curated chart, null for any other chart', () => {
  assert.ok(notes, 'curated chart should get notes');
  assert.equal(chartKeyOf(chart.meta), '1995-11-17|未時|男');
  assert.equal(Object.keys(notes.years).length, 80); // 1999–2078
  assert.equal(notes.domains.length, 7);
  const other = buildChartData({
    solarDate: '2000-8-16', timeIndex: 2, gender: '女', targetDate: '2026-7-7 12:00',
  });
  assert.equal(getNotesForChart(other.meta), null);
});

const html = buildReportHTML({ chart, timeline, notes, generatedAt: '2026-07-08 12:00' });

ok('report contains all sections and key content', () => {
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  for (const s of ['紫微斗數命盤研究報告', '格局', '命盤十二宮', '四化匯聚', '流年提要', '分域綜述']) {
    assert.ok(html.includes(s), `missing section ${s}`);
  }
  assert.ok(html.includes('陽梁昌祿格'));
  assert.ok(html.includes('大限 25-34 夫妻')); // timeline subheader
  assert.ok(html.includes('忌×4')); // 財帛 confluence
  assert.ok(html.includes('三忌匯流命')); // 2019 curated note
  assert.ok(html.includes('乙酉 遷移【來因】') || html.includes('【來因】'));
});

ok('disclaimer always present, with and without notes', () => {
  assert.ok(html.includes(DISCLAIMER));
  const bare = buildReportHTML({ chart, timeline, notes: null, generatedAt: 'x' });
  assert.ok(bare.includes(DISCLAIMER));
  assert.ok(!bare.includes('分域綜述'), 'domains section must be omitted without notes');
  assert.ok(!bare.includes('三忌匯流命'), 'curated year notes must be omitted without notes');
});

ok('dynamic content is HTML-escaped', () => {
  assert.equal(esc(`<b a="x">&'</b>`), '&lt;b a=&quot;x&quot;&gt;&amp;&#39;&lt;/b&gt;');
  const evil = {
    chartKey: 'x',
    domains: [{ id: 'd', title: '<img src=x onerror=alert(1)>', text: '<script>alert(2)</script>' }],
    years: { 2019: '<script>alert(3)</script>' },
  };
  const attacked = buildReportHTML({ chart, timeline, notes: evil, generatedAt: 'x' });
  assert.ok(!attacked.includes('<script>alert'));
  assert.ok(!attacked.includes('<img src=x'));
  assert.ok(attacked.includes('&lt;script&gt;alert(3)&lt;/script&gt;'));
});

ok('all 120 timeline year rows render', () => {
  const rows = html.match(/<td>\d{4} [一-鿿]{2}<\/td>/g) || [];
  assert.equal(rows.length, 120);
});

console.log(`\nAll ${passed} report test groups passed.`);
