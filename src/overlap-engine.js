import { STEM_MUTAGEN, oppositeIndex, sanFangSiZheng } from './fly-engine.js';

export const LUCUN_BRANCH = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子'
};

export const SHA_STARS = ['擎羊', '陀羅', '火星', '鈴星', '地空', '地劫'];

export const BRANCH_ORDER = '寅卯辰巳午未申酉戌亥子丑';

export function flowingShaFromStem(stem) {
  const branch = LUCUN_BRANCH[stem];
  if (!branch) return { qingYangIndex: null, tuoLuoIndex: null };
  const lucunBranchIndex = BRANCH_ORDER.indexOf(branch);
  if (lucunBranchIndex === -1) return { qingYangIndex: null, tuoLuoIndex: null };
  const qingYangIndex = (lucunBranchIndex + 1) % 12;
  const tuoLuoIndex = (lucunBranchIndex + 11) % 12;
  return { qingYangIndex, tuoLuoIndex };
}

export function locateStar(natalCells, starName) {
  if (!natalCells || !starName) return null;
  for (let i = 0; i < natalCells.length; i++) {
    const cell = natalCells[i];
    const inMajor = (cell.majorStars || []).some(s => s.name === starName);
    const inMinor = (cell.minorStars || []).some(s => s.name === starName);
    if (inMajor || inMinor) {
      return cell.branchIndex;
    }
  }
  return null;
}

export function evaluateOverlap({ birthStem, decadalStem, decadalLifeIndex, yearStem, flowLifeIndex }, natalCells) {
  const yearJiStarName = STEM_MUTAGEN[yearStem]?.['忌'];
  const yearJi = yearJiStarName ? locateStar(natalCells, yearJiStarName) : null;

  // Locate yearLu as required by setup list (even if not explicitly tested in named rules)
  const yearLuStarName = STEM_MUTAGEN[yearStem]?.['祿'];
  const yearLu = yearLuStarName ? locateStar(natalCells, yearLuStarName) : null;

  const birthJiStarName = STEM_MUTAGEN[birthStem]?.['忌'];
  const birthJi = birthJiStarName ? locateStar(natalCells, birthJiStarName) : null;

  const decadalJiStarName = decadalStem ? STEM_MUTAGEN[decadalStem]?.['忌'] : null;
  const decadalJi = decadalJiStarName ? locateStar(natalCells, decadalJiStarName) : null;

  const yearSha = flowingShaFromStem(yearStem);
  const decadalSha = decadalStem ? flowingShaFromStem(decadalStem) : null;

  const flags = [];

  // RULE "acute-converge"
  const matchBirth = birthStem !== yearStem && birthJi !== null && birthJi === yearJi;
  const matchDecade = decadalStem !== null && decadalStem !== yearStem && decadalJi !== null && decadalJi === yearJi;

  if (yearJi !== null && (matchBirth || matchDecade)) {
    const sources = [];
    if (matchBirth) sources.push('生年');
    if (matchDecade) sources.push('大限');
    const isDouble = matchBirth && matchDecade && (birthStem !== decadalStem);
    flags.push({
      id: 'acute-converge',
      label: `流年忌(${yearJiStarName})疊${sources.join('+')}忌 於 ${natalCells[yearJi].palaceName}`,
      severity: isDouble ? 'ovlp2' : 'ovlp1',
      palaceIndex: yearJi,
      hasBonus: false
    });
  }

  // RULE "direct-year-into-decadal"
  if (decadalLifeIndex !== null && yearJi !== null && yearJi === decadalLifeIndex) {
    flags.push({
      id: 'direct-year-into-decadal',
      label: `流年忌入大限命宮(${natalCells[decadalLifeIndex].palaceName})`,
      severity: 'ovlp2',
      palaceIndex: decadalLifeIndex,
      hasBonus: false
    });
  }

  // RULE "direct-decadal-into-year"
  if (decadalJi !== null && decadalJi === flowLifeIndex) {
    flags.push({
      id: 'direct-decadal-into-year',
      label: `大限忌入流年命宮(${natalCells[flowLifeIndex].palaceName})`,
      severity: 'ovlp2',
      palaceIndex: flowLifeIndex,
      hasBonus: false
    });
  }

  // RULE "sfsz-year-ji-in-decadal"
  if (decadalLifeIndex !== null) {
    const sfsz = sanFangSiZheng(decadalLifeIndex);
    if (yearJi !== null && yearJi !== decadalLifeIndex && sfsz.includes(yearJi)) {
      flags.push({
        id: 'sfsz-year-ji-in-decadal',
        label: `流年忌入大限三方(${natalCells[yearJi].palaceName})`,
        severity: 'ovlp0',
        palaceIndex: yearJi,
        hasBonus: false
      });
    }
  }

  // RULE "sfsz-year-sha-in-decadal"
  if (decadalLifeIndex !== null) {
    const sfsz = sanFangSiZheng(decadalLifeIndex);
    if (yearSha.qingYangIndex !== null && sfsz.includes(yearSha.qingYangIndex)) {
      flags.push({
        id: 'sfsz-year-sha-in-decadal',
        label: `流年擎羊入大限三方(${natalCells[yearSha.qingYangIndex].palaceName})`,
        severity: 'ovlp0',
        palaceIndex: yearSha.qingYangIndex,
        hasBonus: false
      });
    }
    if (yearSha.tuoLuoIndex !== null && sfsz.includes(yearSha.tuoLuoIndex)) {
      flags.push({
        id: 'sfsz-year-sha-in-decadal',
        label: `流年陀羅入大限三方(${natalCells[yearSha.tuoLuoIndex].palaceName})`,
        severity: 'ovlp0',
        palaceIndex: yearSha.tuoLuoIndex,
        hasBonus: false
      });
    }
  }

  // RULE "sfsz-decadal-ji-in-year"
  if (decadalStem !== null && flowLifeIndex !== null) {
    const sfsz = sanFangSiZheng(flowLifeIndex);
    if (decadalJi !== null && decadalJi !== flowLifeIndex && sfsz.includes(decadalJi)) {
      flags.push({
        id: 'sfsz-decadal-ji-in-year',
        label: `大限忌入流年三方(${natalCells[decadalJi].palaceName})`,
        severity: 'ovlp0',
        palaceIndex: decadalJi,
        hasBonus: false
      });
    }
  }

  // RULE "sfsz-decadal-sha-in-year"
  if (decadalStem !== null && flowLifeIndex !== null && decadalSha !== null) {
    const sfsz = sanFangSiZheng(flowLifeIndex);
    if (decadalSha.qingYangIndex !== null && sfsz.includes(decadalSha.qingYangIndex)) {
      flags.push({
        id: 'sfsz-decadal-sha-in-year',
        label: `運擎羊入流年三方(${natalCells[decadalSha.qingYangIndex].palaceName})`,
        severity: 'ovlp0',
        palaceIndex: decadalSha.qingYangIndex,
        hasBonus: false
      });
    }
    if (decadalSha.tuoLuoIndex !== null && sfsz.includes(decadalSha.tuoLuoIndex)) {
      flags.push({
        id: 'sfsz-decadal-sha-in-year',
        label: `運陀羅入流年三方(${natalCells[decadalSha.tuoLuoIndex].palaceName})`,
        severity: 'ovlp0',
        palaceIndex: decadalSha.tuoLuoIndex,
        hasBonus: false
      });
    }
  }

  // RULE "oppose-year-chong-decadal"
  if (decadalLifeIndex !== null && yearJi !== null && yearJi === oppositeIndex(decadalLifeIndex)) {
    flags.push({
      id: 'oppose-year-chong-decadal',
      label: `流年忌沖大限命宮`,
      severity: 'ovlp1',
      palaceIndex: yearJi,
      hasBonus: false
    });
  }

  // RULE "oppose-decadal-chong-year"
  if (decadalStem !== null && flowLifeIndex !== null && decadalJi !== null && decadalJi === oppositeIndex(flowLifeIndex)) {
    flags.push({
      id: 'oppose-decadal-chong-year',
      label: `大限忌沖流年命宮`,
      severity: 'ovlp1',
      palaceIndex: decadalJi,
      hasBonus: false
    });
  }

  // Apply "C bonus" descriptive texts and severity escalation
  for (const flag of flags) {
    const cell = natalCells[flag.palaceIndex];
    if (!cell) continue;

    const shaHere = SHA_STARS.filter(name =>
      (cell.minorStars || []).some(m => m.name === name)
    );
    const selfJi = (cell.selfHits || []).some(h => h.key === '忌');
    const isBody = !!cell.isBodyPalace;

    if (shaHere.length > 0) {
      flag.label += `（+${shaHere.join('')}同宮）`;
    }
    if (selfJi) {
      flag.label += `（+自化忌）`;
    }
    if (isBody) {
      flag.label += `（含身宮）`;
    }

    flag.hasBonus = (shaHere.length > 0 || selfJi);

    // Only escalate non-sfsz flags if hasBonus is true
    if (!flag.id.startsWith('sfsz-') && flag.hasBonus) {
      if (flag.severity === 'ovlp1') {
        flag.severity = 'ovlp2';
      } else if (flag.severity === 'ovlp2') {
        flag.severity = 'ovlp3';
      }
    }
  }

  return flags;
}
