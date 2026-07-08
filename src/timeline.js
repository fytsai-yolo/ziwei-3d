import { STEM_MUTAGEN } from './fly-engine.js';
import { evaluateOverlap, flowingKuiYueFromStem } from './overlap-engine.js';

const STEMS = '甲乙丙丁戊己庚辛壬癸';
const BRANCHES = '子丑寅卯辰巳午未申酉戌亥';

// Helper to calculate stem, branch, and ganzhi from a year
function getGanzhi(year) {
  // The base year 4 AD (庚申) is used for calculation.
  // The problem context implies (Y - 4) % N gives the correct index.
  // JavaScript's % operator can return negative results for negative dividends,
  // so we adjust to ensure a positive index.
  const baseYearOffset = year - 4;
  const stemIndex = (baseYearOffset % 10 + 10) % 10;
  const branchIndex = (baseYearOffset % 12 + 12) % 12;

  const stem = STEMS[stemIndex];
  const branch = BRANCHES[branchIndex];
  return { stem, branch, ganzhi: stem + branch };
}

// Helper to locate a star by name in the cells
function locate(cells, starName, isAdjective = false) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (isAdjective) {
      if (cell.adjectiveStars && cell.adjectiveStars.includes(starName)) {
        return i;
      }
    } else {
      if (cell.majorStars && cell.majorStars.some(s => s.name === starName)) {
        return i;
      }
      if (cell.minorStars && cell.minorStars.some(s => s.name === starName)) {
        return i;
      }
    }
  }
  return null;
}

// Helper to determine the decadal information for a given nominal age (虛歲)
function decadalForXuSui(cells, xuSui) {
  for (const cell of cells) {
    if (cell.decadalRange && xuSui >= cell.decadalRange[0] && xuSui <= cell.decadalRange[1]) {
      return { palaceIndex: cell.branchIndex, palaceName: cell.palaceName, range: cell.decadalRange, stem: cell.stem };
    }
  }
  return null; // Represents '童限' (childhood)
}

// Severity weights for score calculation
const SEVERITY_WEIGHTS = {
  'bad2': -2,
  'bad1': -1,
  'good1': 1,
  'love': 1,
  'note': 0,
  // 疊宮 multi-layer overlap engine tiers (src/overlap-engine.js)
  'ovlp0': 0,
  'ovlp1': -1,
  'ovlp2': -2,
  'ovlp3': -3,
};

/**
 * Returns the numerical weight for a given severity.
 * @param {string} severity - The severity string (e.g., 'bad2', 'good1').
 * @returns {number} The weight, or 0 if severity is unknown.
 */
export function severityWeight(severity) {
  return SEVERITY_WEIGHTS[severity] || 0;
}

/**
 * Builds a timeline of 120 years from the birth year, with associated astrological flags and scores.
 * @param {object} chart - The main chart data object.
 * @returns {object} An object containing the birth year and an array of 120 year entries.
 */
export function buildTimeline(chart) {
  const birthYear = parseInt(chart.meta.solarDate.split('-')[0], 10);
  const natal = chart.layers[0];
  const cells = natal.cells;

  // Precompute natal-layer specific data for efficiency.
  // mutagenMap values are plain star-name strings.
  const birthJiStar = natal.mutagenMap['忌'];
  const birthJiIndex = locate(cells, birthJiStar);

  const hongLuanIndex = locate(cells, '紅鸞', true); // Adjective star
  const tianXiIndex = locate(cells, '天喜', true);   // Adjective star

  const years = [];

  // Iterate from birthYear to birthYear + 79 (虛歲 1 to 80)
  for (let Y = birthYear; Y < birthYear + 80; Y++) {
    const xuSui = Y - birthYear + 1;
    const { stem, branch, ganzhi } = getGanzhi(Y);

    const decadal = decadalForXuSui(cells, xuSui);

    // flowLifeIndex: branchIndex of the palace whose branch matches the current year's branch
    const flowLifeCell = cells.find(c => c.branch === branch);
    const flowLifeIndex = flowLifeCell ? flowLifeCell.branchIndex : null;

    const yearJiStarName = STEM_MUTAGEN[stem]['忌'];
    const jiIdx = locate(cells, yearJiStarName);

    const yearLuStarName = STEM_MUTAGEN[stem]['祿'];
    const luIdx = locate(cells, yearLuStarName);

    const flags = [];
    let score = 0;

    // Helper to add a flag and update the score
    const addFlag = (id, label, severity) => {
      flags.push({ id, label, severity });
      score += severityWeight(severity);
    };

    // --- Apply rules in the specified order ---

    // 1. 年忌疊生年忌 (Annual Ji stacks with Natal Ji)
    if (yearJiStarName === birthJiStar) {
      addFlag('ji-stack-birth', '年忌疊生年忌', 'bad2');
    }
    // 2. 年忌入生年忌宮 (Annual Ji enters Natal Ji Palace)
    else if (yearJiStarName !== birthJiStar && jiIdx !== null && jiIdx === birthJiIndex) {
      addFlag('ji-into-birth-ji', '年忌入生年忌宮', 'bad2');
    }
    // 3. 年忌疊自化忌 (Annual Ji stacks with Self-Mutating Ji)
    if (jiIdx !== null && cells[jiIdx].selfHits && cells[jiIdx].selfHits.some(h => h.key === '忌')) {
      addFlag('ji-stack-self', '年忌疊自化忌', 'bad2');
    }
    // 4. 年忌入流命 (Annual Ji enters Flowing Life Palace)
    if (jiIdx === flowLifeIndex) {
      addFlag('ji-in-life', '年忌入流命', 'bad1');
    }
    // 5. 年忌沖流命 (Annual Ji clashes Flowing Life Palace)
    if (jiIdx !== null && flowLifeIndex !== null && (jiIdx + 6) % 12 === flowLifeIndex) {
      addFlag('ji-chong-life', '年忌沖流命', 'bad1');
    }
    // 6. 年忌入身宮 (Annual Ji enters Body Palace)
    if (jiIdx === chart.meta.bodyPalaceIndex) {
      addFlag('ji-in-body', '年忌入身宮', 'bad1');
    }
    // 7. 年祿入命宮 (Annual Lu enters Natal Life Palace)
    if (luIdx === natal.lifeIndex) {
      addFlag('lu-in-natal-life', '年祿入命宮', 'good1');
    }
    // 8. 年祿入流命 (Annual Lu enters Flowing Life Palace)
    if (luIdx === flowLifeIndex) {
      addFlag('lu-in-flow-life', '年祿入流命', 'good1');
    }
    // 9. 紅鸞坐流命 (Hong Luan sits in Flowing Life Palace)
    if (flowLifeIndex !== null && hongLuanIndex !== null && flowLifeIndex === hongLuanIndex) {
      addFlag('hongluan', '紅鸞坐流命', 'love');
    }
    // 10. 天喜坐流命 (Tian Xi sits in Flowing Life Palace)
    if (flowLifeIndex !== null && tianXiIndex !== null && flowLifeIndex === tianXiIndex) {
      addFlag('tianxi', '天喜坐流命', 'love');
    }
    // 11. 流命疊大限命 (Flowing Life overlaps Decadal Life)
    if (decadal !== null && flowLifeIndex !== null && flowLifeIndex === decadal.palaceIndex) {
      addFlag('stack-decadal-life', '流命疊大限命', 'note');
    }
    // 12. 流魁鉞坐流命 (flowing 天魁/天鉞 in the Flowing Life Palace — 貴人年).
    // KUIYUE_BRANCH is the classical 天乙貴人 table, empirically verified against iztro.
    const kuiYue = flowingKuiYueFromStem(stem);
    if (flowLifeIndex !== null
        && (flowLifeIndex === kuiYue.tianKuiIndex || flowLifeIndex === kuiYue.tianYueIndex)) {
      addFlag('kuiyue-in-flow-life', '流魁鉞坐流命', 'good1');
    }

    // 疊宮 multi-layer (生年/大限/流年) 四化 convergence — see src/overlap-engine.js
    const overlapHits = evaluateOverlap({
      birthStem: chart.meta.yearStem,
      decadalStem: decadal ? decadal.stem : null,
      decadalLifeIndex: decadal ? decadal.palaceIndex : null,
      yearStem: stem,
      flowLifeIndex,
    }, cells);
    overlapHits.forEach((h) => addFlag(h.id, h.label, h.severity));

    years.push({
      year: Y,
      xuSui,
      stem,
      branch,
      ganzhi,
      decadal,
      flowLifeIndex,
      flags,
      overlap: overlapHits,
      score,
    });
  }

  return { birthYear, years };
}

/**
 * Generates a human-readable summary string for a given year entry.
 * Used for tooltips or captions.
 * @param {object} entry - A year entry object from the timeline.
 * @returns {string} The formatted summary string.
 */
export function yearSummary(entry) {
  const decadalText = entry.decadal
    ? `大限 ${entry.decadal.range[0]}-${entry.decadal.range[1]} ${entry.decadal.palaceName}`
    : '童限';
  const flagsText = entry.flags.length > 0
    ? entry.flags.map(f => f.label).join('、')
    : '平'; // '平' means 'peaceful' or 'normal' when no flags

  return `${entry.year} ${entry.ganzhi}（虛${entry.xuSui}）｜${decadalText}｜${flagsText}`;
}
