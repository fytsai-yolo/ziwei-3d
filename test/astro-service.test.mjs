// Node test for src/astro-service.js — expected values come from a direct iztro probe
// (probe.cjs), NOT from the module under test.
import assert from 'node:assert/strict';
import {
  BRANCH_GRID, MUTAGEN_KEYS, MUT_CLASS, LAYER_DEFS,
  buildChartData, defaultTargetDate,
} from '../src/astro-service.js';

let passed = 0;
function ok(name, fn) {
  fn();
  passed++;
  console.log('[PASS]', name);
}

ok('BRANCH_GRID covers all 12 branches with valid 4x4 rim positions', () => {
  const branches = '寅卯辰巳午未申酉戌亥子丑'.split('');
  assert.equal(Object.keys(BRANCH_GRID).length, 12);
  for (const b of branches) {
    const g = BRANCH_GRID[b];
    assert.ok(g, `missing ${b}`);
    assert.ok(g.row >= 1 && g.row <= 4 && g.col >= 1 && g.col <= 4);
    assert.ok(g.row === 1 || g.row === 4 || g.col === 1 || g.col === 4, `${b} not on rim`);
  }
  assert.deepEqual(BRANCH_GRID['巳'], { row: 1, col: 1 });
  assert.deepEqual(BRANCH_GRID['寅'], { row: 4, col: 1 });
  assert.deepEqual(BRANCH_GRID['亥'], { row: 4, col: 4 });
});

ok('constants', () => {
  assert.deepEqual(MUTAGEN_KEYS, ['祿', '權', '科', '忌']);
  assert.deepEqual(LAYER_DEFS.map(d => d.id), ['natal', 'decadal', 'yearly']);
  assert.equal(MUT_CLASS['忌'], 'mut-ji');
});

const data = buildChartData({
  solarDate: '2000-8-16', timeIndex: 2, gender: '女', targetDate: '2025-7-7 12:30',
});

ok('meta matches probe', () => {
  assert.equal(data.meta.chineseDate, '庚辰 甲申 丙午 庚寅');
  assert.equal(data.meta.fiveElementsClass, '木三局');
  assert.equal(data.meta.soul, '破軍');
  assert.equal(data.meta.body, '文昌');
});

ok('layer order and stem-branches match probe', () => {
  assert.deepEqual(data.layers.map(l => l.id), ['natal', 'decadal', 'yearly']);
  const sb = Object.fromEntries(data.layers.map(l => [l.id, l.stemBranch]));
  assert.equal(sb.natal, '庚辰');
  assert.equal(sb.decadal, '庚辰');
  assert.equal(sb.yearly, '乙巳');
});

const [natal, decadal, yearly] = data.layers;

ok('natal layer matches probe', () => {
  assert.equal(natal.lifeIndex, 4); // 命宮 at palaces[4] (午)
  assert.equal(natal.cells[4].branch, '午');
  assert.ok(natal.cells[4].majorStars.some(s => s.name === '紫微'));
  assert.equal(natal.cells[8].isBodyPalace, true); // 官祿 戌
  // birth-year (庚) sihua: 太陽祿 武曲權 太陰科 天同忌
  assert.deepEqual(natal.mutagenMap, { '祿': '太陽', '權': '武曲', '科': '太陰', '忌': '天同' });
  // palaces[0] = 財帛 in 寅 with 武曲(權) 天相; decadal range 43-52
  assert.equal(natal.cells[0].palaceName, '財帛');
  assert.deepEqual(natal.cells[0].decadalRange, [43, 52]);
  assert.equal(natal.cells[0].majorStars.find(s => s.name === '武曲').mutagen, '權');
  assert.deepEqual(natal.cells[0].grid, { row: 4, col: 1 });
  assert.equal(natal.cells[0].flowStars.length, 0);
});

ok('decadal layer matches probe', () => {
  assert.equal(decadal.lifeIndex, 2); // 大限命宮 at palaces[2] (辰)
  assert.equal(decadal.cells[2].isLifePalace, true);
  assert.equal(decadal.cells[0].palaceName, '夫妻'); // decadal palaceNames[0]
  assert.deepEqual(decadal.mutagenMap, { '祿': '太陽', '權': '武曲', '科': '太陰', '忌': '天同' });
  // flow stars at position 0: 運馬
  assert.deepEqual(decadal.cells[0].flowStars.map(s => s.name), ['運馬']);
  // mutagenHits at position 0 (natal 武曲天相 + 天馬): 武曲 is decadal 化權
  assert.deepEqual(decadal.cells[0].mutagenHits, [{ star: '武曲', key: '權' }]);
  assert.equal(decadal.cells[0].majorStars.length, 0);
});

ok('yearly layer matches probe', () => {
  assert.equal(yearly.lifeIndex, 3); // 流年命宮 at palaces[3] (巳)
  assert.equal(yearly.cells[3].palaceName, '命宮');
  assert.deepEqual(yearly.mutagenMap, { '祿': '天機', '權': '天梁', '科': '紫微', '忌': '太陰' });
  // palaces[3] 巳 has natal 天機 → yearly 化祿 hit
  assert.deepEqual(yearly.cells[3].mutagenHits, [{ star: '天機', key: '祿' }]);
  // palaces[9] 亥 has natal 太陰 → yearly 化忌 hit
  assert.deepEqual(yearly.cells[9].mutagenHits, [{ star: '太陰', key: '忌' }]);
});

ok('all layers have 12 index-aligned cells with grids', () => {
  for (const layer of data.layers) {
    assert.equal(layer.cells.length, 12);
    layer.cells.forEach((c, i) => {
      assert.equal(c.branchIndex, i);
      assert.deepEqual(c.grid, BRANCH_GRID[c.branch]);
      assert.equal(typeof c.palaceName, 'string');
      assert.ok(c.palaceName.length > 0);
    });
    assert.equal(layer.cells.filter(c => c.isLifePalace).length, 1);
  }
});

ok('input validation throws clear errors', () => {
  assert.throws(() => buildChartData({ solarDate: 'nope', timeIndex: 2, gender: '女', targetDate: '2025-7-7 12:30' }), /solarDate/);
  assert.throws(() => buildChartData({ solarDate: '2000-8-16', timeIndex: 13, gender: '女', targetDate: '2025-7-7 12:30' }), /timeIndex/);
  assert.throws(() => buildChartData({ solarDate: '2000-8-16', timeIndex: 2, gender: 'female', targetDate: '2025-7-7 12:30' }), /gender/);
  assert.throws(() => buildChartData({ solarDate: '2000-8-16', timeIndex: 2, gender: '女', targetDate: 'later' }), /targetDate/);
});

ok('defaultTargetDate format', () => {
  assert.match(defaultTargetDate(), /^\d{4}-\d{1,2}-\d{1,2} \d{2}:\d{2}$/);
});

console.log(`\nAll ${passed} test groups passed.`);
