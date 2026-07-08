// Tests for the interpretation knowledge base: schema over ALL content, matcher fixtures
// against the reference chart, and year-text composition.
import assert from 'node:assert/strict';
import { buildChartData } from '../src/astro-service.js';
import { buildTimeline } from '../src/timeline.js';
import {
  validateEntries, matchPalaceKnowledge, matchPatternKnowledge, composeYearText,
} from '../src/kb-engine.js';
import { KB_ENTRIES, YEAR_TEMPLATES } from '../src/kb/index.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

ok('ALL content entries pass schema validation', () => {
  const errors = validateEntries(KB_ENTRIES);
  assert.deepEqual(errors, [], `validation errors:\n${errors.join('\n')}`);
  assert.equal(KB_ENTRIES.length, 218); // 168 star-palace + 39 sihua + 11 patterns
});

ok('validateEntries catches bad entries', () => {
  assert.ok(validateEntries([{ id: 'x', match: {}, text: 't', source: '現代通行', weight: 1 }])
    .some(e => e.includes('star')));
  assert.ok(validateEntries([{ id: 'x', match: { star: '紫微', typo: 1 }, text: 't', source: '現代通行', weight: 1 }])
    .some(e => e.includes('typo')));
  assert.ok(validateEntries([{ id: 'x', match: { star: '紫微' }, text: 't', source: '亂寫', weight: 1 }])
    .some(e => e.includes('source')));
  const dup = { id: 'x', match: { star: '紫微' }, text: 't', source: '現代通行', weight: 1 };
  assert.ok(validateEntries([dup, { ...dup }]).some(e => e.includes('duplicate')));
});

const chart = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});
const perPalace = matchPalaceKnowledge(chart, KB_ENTRIES);

ok('matcher: reference chart palaces get correct star-palace + sihua entries', () => {
  // 午(4) = 田宅, 紫微[科]: expects ziwei-tianzhai + sihua-ziwei-ke
  const wu = perPalace[4].map(e => e.id);
  assert.ok(wu.includes('ziwei-tianzhai'), `午 got: ${wu.join(',')}`);
  assert.ok(wu.includes('sihua-ziwei-ke'));
  assert.ok(!wu.includes('ziwei-minggong')); // palaceName condition respected
  // 卯(1) = 命宮, 太陽+天梁[權]
  const mao = perPalace[1].map(e => e.id);
  assert.ok(mao.includes('taiyang-minggong'));
  assert.ok(mao.includes('tianliang-minggong'));
  assert.ok(mao.includes('sihua-tianliang-quan'));
  // 亥(9) = 財帛, 太陰[忌]
  const hai = perPalace[9].map(e => e.id);
  assert.ok(hai.includes('taiyin-caibo'));
  assert.ok(hai.includes('sihua-taiyin-ji'));
  // weight sorting: sihua (3) before 財帛-tier star-palace (2)
  assert.ok(hai.indexOf('sihua-taiyin-ji') < hai.indexOf('taiyin-caibo'));
});

ok('matcher: every palace with a major star gets at least one entry; empty palaces get none from star rules', () => {
  const natal = chart.layers[0];
  natal.cells.forEach(cell => {
    const hits = perPalace[cell.branchIndex];
    if (cell.majorStars.length > 0) {
      assert.ok(hits.length > 0, `${cell.branch} ${cell.palaceName} has majors but no KB hits`);
    }
  });
  // 未(5) 官祿 and 酉(7) 遷移 are empty of major stars → only possible hits are minor-star
  // based (none exist in current content), so zero
  assert.equal(perPalace[5].length, 0);
  assert.equal(perPalace[7].length, 0);
});

ok('pattern knowledge matches detected 格局', () => {
  const hits = matchPatternKnowledge(chart, KB_ENTRIES);
  const ids = hits.map(h => h.entry.match.patternId).sort();
  assert.deepEqual(ids, ['lu-ma-jiao-chi', 'ri-zhao-lei-men', 'yang-liang-chang-lu'].sort());
  assert.ok(hits[0].pattern.name); // carries the chart pattern object
});

ok('generality: a different chart gets its own matches (KB is chart-agnostic)', () => {
  const other = buildChartData({
    solarDate: '2000-8-16', timeIndex: 2, gender: '女', targetDate: '2026-7-7 12:00',
  });
  const otherMatches = matchPalaceKnowledge(other, KB_ENTRIES);
  // 2000-8-16 chart: 紫微 in 午 = 命宮 → ziwei-minggong must match there
  const wu = otherMatches[4].map(e => e.id);
  assert.ok(wu.includes('ziwei-minggong'), `other chart 午 got: ${wu.join(',')}`);
});

ok('composeYearText: template composition + overlap-label fallback + 平', () => {
  const tl = buildTimeline(chart);
  const y2019 = tl.years.find(e => e.year === 2019);
  const text = composeYearText(y2019, YEAR_TEMPLATES);
  assert.ok(text.includes('流年忌入生年忌宮')); // template phrase
  assert.ok(text.includes('大限忌入流年命宮')); // overlap label fallback (chart-specific)
  assert.ok(text.includes('；'));
  const calm = tl.years.find(e => e.flags.length === 0);
  assert.equal(composeYearText(calm, YEAR_TEMPLATES), '平');
});

console.log(`\nAll ${passed} kb-engine test groups passed.`);
