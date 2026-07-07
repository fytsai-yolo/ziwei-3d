// jsdom smoke test for src/renderer.js — verifies the DOM contract used by scene.js/main.js/style.css.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><body></body>');
globalThis.document = dom.window.document;

const { buildChartData } = await import('../src/astro-service.js');
const { renderLayer } = await import('../src/renderer.js');

const data = buildChartData({
  solarDate: '2000-8-16', timeIndex: 2, gender: '女', targetDate: '2025-7-7 12:30',
});

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

const natalEl = renderLayer(data.layers[0]);
const yearlyEl = renderLayer(data.layers[2]);

ok('layer element shape', () => {
  assert.equal(natalEl.className, 'layer');
  assert.equal(natalEl.dataset.layerId, 'natal');
  assert.equal(natalEl.querySelectorAll('.palace').length, 12);
  assert.equal(natalEl.querySelectorAll('.layer-center').length, 1);
});

ok('natal palace cell content (寅 財帛)', () => {
  const cell = natalEl.querySelector('.palace[data-branch-index="0"]');
  assert.ok(cell);
  assert.equal(cell.style.gridRow, '4');
  assert.equal(cell.style.gridColumn, '1');
  assert.equal(cell.querySelector('.stem-branch').textContent, '戊寅');
  assert.equal(cell.querySelector('.palace-name').textContent, '財帛');
  const majors = [...cell.querySelectorAll('.star.major')].map(e => e.textContent);
  assert.ok(majors.some(t => t.includes('武曲')));
  // 武曲 birth-year 化權 chip
  assert.ok(cell.querySelector('.mut.mut-quan'));
  assert.equal(cell.querySelector('.palace-foot').textContent, '絕 43-52');
});

ok('badges: 命 on natal life palace, 身 on body palace', () => {
  assert.ok(natalEl.querySelector('.palace[data-branch-index="4"] .badge.life'));
  assert.ok(natalEl.querySelector('.palace[data-branch-index="8"] .badge.body'));
});

ok('yearly layer: flow stars + mutagen hits + center legend', () => {
  const lifeCell = yearlyEl.querySelector('.palace[data-branch-index="3"]');
  assert.equal(lifeCell.querySelector('.palace-name').textContent, '命宮');
  assert.ok(lifeCell.querySelector('.badge.life'));
  const hit = lifeCell.querySelector('.mut-hit.mut-lu');
  assert.equal(hit.textContent, '天機祿');
  const flows = [...yearlyEl.querySelectorAll('.star.flow')].map(e => e.textContent);
  assert.ok(flows.includes('流祿'));
  const legend = [...yearlyEl.querySelectorAll('.layer-center .mutagen-legend .mut')].map(e => e.textContent);
  assert.deepEqual(legend, ['天機化祿', '天梁化權', '紫微化科', '太陰化忌']);
  const label = yearlyEl.querySelector('.layer-label').textContent;
  assert.equal(label, '流年');
  assert.equal(yearlyEl.querySelector('.layer-sub').textContent, '乙巳');
});

console.log(`\nAll ${passed} renderer test groups passed.`);
