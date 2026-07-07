// Helper for star lists within a palace object
const allStars = (palace) => {
  return palace.majorStarNames.concat(palace.otherStarNames);
};

// Helper for effective major stars (借宮 borrowing)
const effectiveMajors = (palaces, i) => {
  if (palaces[i].majorStarNames.length > 0) {
    return palaces[i].majorStarNames;
  }
  // If no major stars, borrow from the opposite palace
  return palaces[oppositeIndex(i)].majorStarNames;
};

export const STEM_MUTAGEN = {
  '甲': { '祿': '廉貞', '權': '破軍', '科': '武曲', '忌': '太陽' },
  '乙': { '祿': '天機', '權': '天梁', '科': '紫微', '忌': '太陰' },
  '丙': { '祿': '天同', '權': '天機', '科': '文昌', '忌': '廉貞' },
  '丁': { '祿': '太陰', '權': '天同', '科': '天機', '忌': '巨門' },
  '戊': { '祿': '貪狼', '權': '太陰', '科': '右弼', '忌': '天機' },
  '己': { '祿': '武曲', '權': '貪狼', '科': '天梁', '忌': '文曲' },
  '庚': { '祿': '太陽', '權': '武曲', '科': '太陰', '忌': '天同' },
  '辛': { '祿': '巨門', '權': '太陽', '科': '文曲', '忌': '文昌' },
  '壬': { '祿': '天梁', '權': '紫微', '科': '左輔', '忌': '武曲' },
  '癸': { '祿': '破軍', '權': '巨門', '科': '太陰', '忌': '貪狼' },
};

export const MUTAGEN_KEYS = ['祿', '權', '科', '忌'];

/**
 * Computes the index of the palace opposite to the given index.
 * @param {number} i - The current palace index (0-11).
 * @returns {number} The opposite palace index.
 */
export function oppositeIndex(i) {
  return (i + 6) % 12;
}

/**
 * Computes the indices of the three-fang four-zheng (三方四正) palaces for a given index.
 * Includes the given palace itself, two trine palaces, and the opposite palace.
 * @param {number} i - The central palace index (0-11).
 * @returns {number[]} An array of 4 palace indices: [self, trine1, trine2, opposite].
 */
export function sanFangSiZheng(i) {
  return [i, (i + 4) % 12, (i + 8) % 12, (i + 6) % 12];
}

/**
 * Detects self-mutagenesis (自化) for each palace.
 * @param {Array<Object>} palaces - Array of 12 palace objects.
 * @returns {Array<Array<Object>>} An array of 12 arrays, where each inner array contains
 *   objects describing self-mutagen hits for that palace:
 *   `{ star: string, key: '祿'|'權'|'科'|'忌', kind: 'out' | 'in' }`.
 */
export function computeSelfMutagen(palaces) {
  const selfMutagens = Array(12).fill(null).map(() => []);

  for (let i = 0; i < 12; i++) {
    const palaceI = palaces[i];
    const oppositePalaceI = palaces[oppositeIndex(i)];
    const palaceIAllStars = allStars(palaceI);

    // 'out' (離心自化 ↓): The palace's own stem transforms a star sitting in itself.
    const outMutagens = STEM_MUTAGEN[palaceI.stem];
    for (const key of MUTAGEN_KEYS) {
      const targetStar = outMutagens[key];
      if (palaceIAllStars.includes(targetStar)) {
        selfMutagens[i].push({ star: targetStar, key: key, kind: 'out' });
      }
    }

    // 'in' (向心自化 ↑): The opposite palace's stem transforms a star sitting in this palace.
    const inMutagens = STEM_MUTAGEN[oppositePalaceI.stem];
    for (const key of MUTAGEN_KEYS) {
      const targetStar = inMutagens[key];
      if (palaceIAllStars.includes(targetStar)) {
        selfMutagens[i].push({ star: targetStar, key: key, kind: 'in' });
      }
    }
  }
  return selfMutagens;
}

/**
 * Computes the "flying map", showing where each palace's stem transforms its four stars to.
 * @param {Array<Object>} palaces - Array of 12 palace objects.
 * @returns {Array<Object>} An array of 12 objects, where each object represents a source palace
 *   and contains properties for '祿', '權', '科', '忌', indicating the transformed star
 *   and its target palace index. `toIndex` is null if the star is not found.
 *   Example: `{ '祿': {star:'廉貞', toIndex: 5}, ... }`
 */
export function computeFlyingMap(palaces) {
  const flyingMap = Array(12).fill(null).map(() => ({}));

  for (let i = 0; i < 12; i++) {
    const sourceStem = palaces[i].stem;
    const mutagens = STEM_MUTAGEN[sourceStem];

    for (const key of MUTAGEN_KEYS) {
      const starToLocate = mutagens[key];
      let toIndex = null;
      for (let j = 0; j < 12; j++) { // Search all palaces for the transformed star
        if (allStars(palaces[j]).includes(starToLocate)) {
          toIndex = j;
          break;
        }
      }
      flyingMap[i][key] = { star: starToLocate, toIndex: toIndex };
    }
  }
  return flyingMap;
}

/**
 * Computes incoming transformations (飛入) for each palace, from other palaces and the birth year stem.
 * @param {Array<Object>} flyingMap - The result of computeFlyingMap.
 * @param {string} yearStem - The heavenly stem of the birth year (e.g., '甲').
 * @param {Array<Object>} palaces - Array of 12 palace objects.
 * @returns {Array<Object>} An array of 12 objects. Each object represents a target palace
 *   and contains properties for '祿', '權', '科', '忌', where each property is an array
 *   of incoming flights: `{ from: number|'birth', star: string }`.
 */
export function computeFlyIn(flyingMap, yearStem, palaces) {
  const flyIn = Array(12).fill(null).map(() => (
    MUTAGEN_KEYS.reduce((acc, key) => { acc[key] = []; return acc; }, {})
  ));

  // Palace-stem flights: Iterate through the flyingMap to find incoming flights
  for (let fromIndex = 0; fromIndex < 12; fromIndex++) {
    for (const key of MUTAGEN_KEYS) {
      const flight = flyingMap[fromIndex][key];
      if (flight.toIndex !== null) {
        flyIn[flight.toIndex][key].push({ from: fromIndex, star: flight.star });
      }
    }
  }

  // Birth-year stem flights: Locate the birth-year's four transformed stars
  const birthMutagens = STEM_MUTAGEN[yearStem];
  for (const key of MUTAGEN_KEYS) {
    const birthStar = birthMutagens[key];
    let toIndex = null;
    for (let j = 0; j < 12; j++) { // Search all palaces for the birth-year transformed star
      if (allStars(palaces[j]).includes(birthStar)) {
        toIndex = j;
        break;
      }
    }
    if (toIndex !== null) {
      flyIn[toIndex][key].push({ from: 'birth', star: birthStar });
    }
  }
  return flyIn;
}

/**
 * Finds the Laiyin Palace (來因宮) index based on the birth year stem.
 * @param {Array<Object>} palaces - Array of 12 palace objects.
 * @param {string} yearStem - The heavenly stem of the birth year (e.g., '甲').
 * @returns {number|null} The index of the Laiyin Palace, or null if none found.
 */
export function findLaiyinIndex(palaces, yearStem) {
  const candidates = [];
  for (let i = 0; i < 12; i++) {
    if (palaces[i].stem === yearStem) {
      candidates.push(i);
    }
  }

  if (candidates.length === 0) {
    return null;
  }
  if (candidates.length === 1) {
    return candidates[0];
  }

  // Two candidates: apply preference rule
  // "when two palaces match prefer the one whose branch is NOT one of 寅卯子丑"
  const branchesToAvoidForPreference = ['寅', '卯', '子', '丑'];
  for (const index of candidates) {
    if (!branchesToAvoidForPreference.includes(palaces[index].branch)) {
      return index; // Found the preferred one
    }
  }

  // If both candidates have branches in branchesToAvoid (e.g., for yearStem '甲' or '乙'),
  // the rule doesn't provide a unique preference. Return the first matching palace.
  return candidates[0];
}

/**
 * Detects specific Zi Wei Dou Shu patterns (格局).
 * @param {Object} params - Object containing chart data.
 * @param {Array<Object>} params.palaces - Array of 12 palace objects.
 * @param {number} params.lifeIndex - The index of the Life Palace (命宮).
 * @param {number} params.bodyIndex - The index of the Body Palace (身宮).
 * @param {string} params.yearStem - The heavenly stem of the birth year (e.g., '甲').
 * @returns {Array<Object>} An array of detected patterns. Each pattern object:
 *   `{ id: string, name: string, palaces: number[], note: string }`.
 */
export function detectPatterns({ palaces, lifeIndex, bodyIndex, yearStem }) {
  const patterns = [];
  const birthLu = STEM_MUTAGEN[yearStem]['祿'];
  const LIFE3 = sanFangSiZheng(lifeIndex); // San Fang Si Zheng of the Life Palace

  // Helper to find index of a star across all palaces
  const findStarPalaceIndex = (starName) => {
    for (let i = 0; i < 12; i++) {
      if (allStars(palaces[i]).includes(starName)) {
        return i;
      }
    }
    return null;
  };

  // Helper to get unique and sorted indices
  const getUniqueSortedIndices = (indices) => [...new Set(indices)].sort((a, b) => a - b);

  // a) id 'yang-liang-chang-lu', name '陽梁昌祿格':
  //    太陽 AND 天梁 both appear in effectiveMajors of some palace in LIFE3,
  //    AND '文昌' appears in allStars of some palace in LIFE3,
  //    AND '祿存' appears in allStars of some palace in LIFE3.
  let hasYangLiang = false;
  let hasWenChang = false;
  let hasLuCun = false;
  const yangLiangIndices = new Set();
  const wenChangIndices = new Set();
  const luCunIndices = new Set();

  for (const pIndex of LIFE3) {
    const effMajors = effectiveMajors(palaces, pIndex);
    const currentPalaceAllStars = allStars(palaces[pIndex]);

    if (effMajors.includes('太陽') && effMajors.includes('天梁')) {
      hasYangLiang = true;
      yangLiangIndices.add(pIndex);
    }
    if (currentPalaceAllStars.includes('文昌')) {
      hasWenChang = true;
      wenChangIndices.add(pIndex);
    }
    if (currentPalaceAllStars.includes('祿存')) {
      hasLuCun = true;
      luCunIndices.add(pIndex);
    }
  }
  if (hasYangLiang && hasWenChang && hasLuCun) {
    patterns.push({
      id: 'yang-liang-chang-lu',
      name: '陽梁昌祿格',
      palaces: getUniqueSortedIndices([...yangLiangIndices, ...wenChangIndices, ...luCunIndices]),
      note: '利考試、學術、公職與專業資格',
    });
  }

  // b) id 'ji-yue-tong-liang', name '機月同梁格':
  //    天機, 太陰, 天同, 天梁 ALL appear within the union of effectiveMajors over LIFE3.
  const allLife3EffectiveMajors = new Set();
  const jiYueTongLiangPalaceIndices = new Set();
  for (const pIndex of LIFE3) {
    effectiveMajors(palaces, pIndex).forEach(star => allLife3EffectiveMajors.add(star));
    jiYueTongLiangPalaceIndices.add(pIndex);
  }
  const jiYueTongLiangStars = ['天機', '太陰', '天同', '天梁'];
  if (jiYueTongLiangStars.every(star => allLife3EffectiveMajors.has(star))) {
    patterns.push({
      id: 'ji-yue-tong-liang',
      name: '機月同梁格',
      palaces: getUniqueSortedIndices([...jiYueTongLiangPalaceIndices]),
      note: '宜機構幕僚、研究、教育等安定專業',
    });
  }

  // c) id 'sha-po-lang', name '殺破狼格':
  //    七殺, 破軍, 貪狼 all within union of effectiveMajors over LIFE3.
  const allLife3EffectiveMajorsForSPL = new Set();
  const shaPoLangPalaceIndices = new Set();
  for (const pIndex of LIFE3) {
    effectiveMajors(palaces, pIndex).forEach(star => allLife3EffectiveMajorsForSPL.add(star));
    shaPoLangPalaceIndices.add(pIndex);
  }
  const shaPoLangStars = ['七殺', '破軍', '貪狼'];
  if (shaPoLangStars.every(star => allLife3EffectiveMajorsForSPL.has(star))) {
    patterns.push({
      id: 'sha-po-lang',
      name: '殺破狼格',
      palaces: getUniqueSortedIndices([...shaPoLangPalaceIndices]),
      note: '人生多開創與變動',
    });
  }

  // d) id 'lu-ma-jiao-chi', name '祿馬交馳':
  //    Some palace p where allStars contains 天馬 AND (祿存 in allStars(p) OR birthLu in allStars(p)),
  //    AND p is lifeIndex, bodyIndex, or in LIFE3.
  const luMaPalaces = new Set();
  let luMaHit = false;
  for (let pIndex = 0; pIndex < 12; pIndex++) { // Check all palaces
    const currentPalaceAllStars = allStars(palaces[pIndex]);
    if (currentPalaceAllStars.includes('天馬') && (currentPalaceAllStars.includes('祿存') || currentPalaceAllStars.includes(birthLu))) {
      if (pIndex === lifeIndex || pIndex === bodyIndex || LIFE3.includes(pIndex)) {
        luMaHit = true;
        luMaPalaces.add(pIndex);
      }
    }
  }
  if (luMaHit) {
    patterns.push({
      id: 'lu-ma-jiao-chi',
      name: '祿馬交馳',
      palaces: getUniqueSortedIndices([...luMaPalaces]),
      note: '動中求財，利外地發展',
    });
  }

  // e) id 'huo-tan' / 'ling-tan', name '火貪格' / '鈴貪格':
  //    A palace in LIFE3 whose allStars+effectiveMajors contain 貪狼 together with
  //    火星 (火貪) or 鈴星 (鈴貪) in the SAME palace.
  const hitHuoTan = { status: false, indices: new Set() };
  const hitLingTan = { status: false, indices: new Set() };
  for (const pIndex of LIFE3) {
    // Union of all stars and effective majors for the *current* palace
    const starsInThisPalace = new Set([...allStars(palaces[pIndex]), ...effectiveMajors(palaces, pIndex)]);
    if (starsInThisPalace.has('貪狼')) {
      if (starsInThisPalace.has('火星')) {
        hitHuoTan.status = true;
        hitHuoTan.indices.add(pIndex);
      }
      if (starsInThisPalace.has('鈴星')) {
        hitLingTan.status = true;
        hitLingTan.indices.add(pIndex);
      }
    }
  }
  if (hitHuoTan.status) {
    patterns.push({
      id: 'huo-tan',
      name: '火貪格',
      palaces: getUniqueSortedIndices([...hitHuoTan.indices]),
      note: '橫發之象，防橫破',
    });
  }
  if (hitLingTan.status) {
    patterns.push({
      id: 'ling-tan',
      name: '鈴貪格',
      palaces: getUniqueSortedIndices([...hitLingTan.indices]),
      note: '橫發之象，防橫破',
    });
  }

  // f) id 'shi-zhong-yin-yu', name '石中隱玉格':
  //    巨門 in effectiveMajors(lifeIndex) AND palaces[lifeIndex].branch is 子 or 午.
  const effMajorsLife = effectiveMajors(palaces, lifeIndex);
  const lifePalaceBranch = palaces[lifeIndex].branch;
  if (effMajorsLife.includes('巨門') && (lifePalaceBranch === '子' || lifePalaceBranch === '午')) {
    patterns.push({
      id: 'shi-zhong-yin-yu',
      name: '石中隱玉格',
      palaces: [lifeIndex],
      note: '大器晚成',
    });
  }

  // g) id 'ri-zhao-lei-men', name '日照雷門格':
  //    太陽 in palaces[lifeIndex].majorStarNames AND palaces[lifeIndex].branch === '卯'.
  if (palaces[lifeIndex].majorStarNames.includes('太陽') && palaces[lifeIndex].branch === '卯') {
    patterns.push({
      id: 'ri-zhao-lei-men',
      name: '日照雷門格',
      palaces: [lifeIndex],
      note: '光明磊落，早年得志',
    });
  }

  // h) id 'shuang-lu-chao-yuan', name '雙祿朝垣格':
  //    祿存 located in some palace of LIFE3 AND birthLu located in some (possibly different) palace of LIFE3.
  let hasLuCunInLife3 = false;
  let hasBirthLuInLife3 = false;
  const shuangLuPalaceIndices = new Set();

  for (const pIndex of LIFE3) {
    const currentPalaceAllStars = allStars(palaces[pIndex]);
    if (currentPalaceAllStars.includes('祿存')) {
      hasLuCunInLife3 = true;
      shuangLuPalaceIndices.add(pIndex);
    }
    if (currentPalaceAllStars.includes(birthLu)) {
      hasBirthLuInLife3 = true;
      shuangLuPalaceIndices.add(pIndex);
    }
  }
  if (hasLuCunInLife3 && hasBirthLuInLife3) {
    patterns.push({
      id: 'shuang-lu-chao-yuan',
      name: '雙祿朝垣格',
      palaces: getUniqueSortedIndices([...shuangLuPalaceIndices]),
      note: '財官雙美',
    });
  }

  // i) id 'yang-tuo-jia-ji', name '羊陀夾忌':
  //    Let j = index of palace containing the birth-year 忌 star (STEM_MUTAGEN[yearStem]['忌']).
  //    Hit if 擎羊 is in allStars of palace (j+1)%12 and 陀羅 in allStars of (j+11)%12,
  //    or vice versa.
  const yearJiStar = STEM_MUTAGEN[yearStem]['忌'];
  const jiIndex = findStarPalaceIndex(yearJiStar);

  if (jiIndex !== null) {
    const prevPalaceIndex = (jiIndex + 11) % 12; // (j-1 + 12) % 12
    const nextPalaceIndex = (jiIndex + 1) % 12;
    const prevPalaceStars = allStars(palaces[prevPalaceIndex]);
    const nextPalaceStars = allStars(palaces[nextPalaceIndex]);

    const prevHasQingYang = prevPalaceStars.includes('擎羊');
    const nextHasTuoLuo = nextPalaceStars.includes('陀羅');
    const prevHasTuoLuo = prevPalaceStars.includes('陀羅');
    const nextHasQingYang = nextPalaceStars.includes('擎羊');

    if ((prevHasQingYang && nextHasTuoLuo) || (prevHasTuoLuo && nextHasQingYang)) {
      patterns.push({
        id: 'yang-tuo-jia-ji',
        name: '羊陀夾忌',
        palaces: getUniqueSortedIndices([prevPalaceIndex, jiIndex, nextPalaceIndex]),
        note: '生年忌受夾，該宮事項多阻',
      });
    }
  }

  // j) id 'ming-wu-zheng-yao', name '命無正曜':
  //    palaces[lifeIndex].majorStarNames is empty.
  if (palaces[lifeIndex].majorStarNames.length === 0) {
    patterns.push({
      id: 'ming-wu-zheng-yao',
      name: '命無正曜',
      palaces: [lifeIndex],
      note: '借對宮安身，個性具可塑性',
    });
  }

  return patterns;
}
