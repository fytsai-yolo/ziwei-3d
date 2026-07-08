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
 * Traces the 祿隨忌走 chain: the palace holding the birth-year 化祿 star commits its
 * resources wherever its own stem's 化忌 flies; that palace's 忌 carries it onward.
 * Following the 忌 flights from the 生年祿 palace shows where the natal blessing is
 * ultimately spent. The walk stops at a self-flight, a revisited palace (cycle), a
 * missing target, or maxHops.
 * @param {Array<Object>} palaces - The 12 fly-engine palace objects.
 * @param {string} yearStem - Birth year stem.
 * @param {Object} flyingMap - computeFlyingMap() result (map[i][key] = {star, toIndex}).
 * @param {number} [maxHops=4]
 * @returns {{luStar: string, startIndex: number, steps: Array<{from:number,to:number,star:string}>, endIndex: number, cycle: boolean}|null}
 *   null when the birth 祿 star is not found in the chart.
 */
export function traceLuSuiJi(palaces, yearStem, flyingMap, maxHops = 4) {
  const luStar = STEM_MUTAGEN[yearStem]['祿'];
  let startIndex = null;
  for (let i = 0; i < 12; i++) {
    if (allStars(palaces[i]).includes(luStar)) {
      startIndex = i;
      break;
    }
  }
  if (startIndex === null) return null;

  const steps = [];
  const visited = new Set([startIndex]);
  let cur = startIndex;
  let cycle = false;
  for (let hop = 0; hop < maxHops; hop++) {
    const ji = flyingMap[cur]['忌'];
    if (!ji || ji.toIndex === null || ji.toIndex === cur) break; // no flight or 自化忌 stops here
    steps.push({ from: cur, to: ji.toIndex, star: ji.star });
    if (visited.has(ji.toIndex)) {
      cycle = true; // the 忌 returns into the chain — energy circulates, stop
      break;
    }
    visited.add(ji.toIndex);
    cur = ji.toIndex;
  }
  const endIndex = steps.length > 0 ? steps[steps.length - 1].to : startIndex;
  return { luStar, startIndex, steps, endIndex, cycle };
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

  // k) id 'ma-tou-dai-jian', name '馬頭帶箭格': 擎羊坐命於午宮.
  if (palaces[lifeIndex].branch === '午' && allStars(palaces[lifeIndex]).includes('擎羊')) {
    patterns.push({
      id: 'ma-tou-dai-jian',
      name: '馬頭帶箭格',
      palaces: [lifeIndex],
      note: '威震邊疆，利武職與外地開創，先勞後成',
    });
  }

  // l/m) 日月並明 / 日月反背: brightness of 太陽/太陰 across the chart.
  //    並明: both 廟/旺 AND both within the Life Palace's 三方四正.
  //    反背: both 陷/不 (chart-wide condition, no 三方 requirement).
  const sunIdx = findStarPalaceIndex('太陽');
  const moonIdx = findStarPalaceIndex('太陰');
  if (sunIdx !== null && moonIdx !== null) {
    const sunBright = (palaces[sunIdx].majorStarBrightness || {})['太陽'];
    const moonBright = (palaces[moonIdx].majorStarBrightness || {})['太陰'];
    const strong = (b) => b === '廟' || b === '旺';
    const weak = (b) => b === '陷' || b === '不';
    if (strong(sunBright) && strong(moonBright) && LIFE3.includes(sunIdx) && LIFE3.includes(moonIdx)) {
      patterns.push({
        id: 'ri-yue-bing-ming',
        name: '日月並明格',
        palaces: getUniqueSortedIndices([sunIdx, moonIdx]),
        note: '日月皆旺照命，表裡俱佳，貴人與聲望兩全',
      });
    }
    if (weak(sunBright) && weak(moonBright)) {
      patterns.push({
        id: 'ri-yue-fan-bei',
        name: '日月反背格',
        palaces: getUniqueSortedIndices([sunIdx, moonIdx]),
        note: '日月俱陷，早年多辛勞，宜離鄉背井自立更生',
      });
    }
  }

  // n) id 'jun-chen-qing-hui', name '君臣慶會格':
  //    紫微守命，左輔右弼皆於命宮三方四正會照.
  if (palaces[lifeIndex].majorStarNames.includes('紫微')
      && ['左輔', '右弼'].every(s => LIFE3.some(i => allStars(palaces[i]).includes(s)))) {
    patterns.push({
      id: 'jun-chen-qing-hui',
      name: '君臣慶會格',
      palaces: getUniqueSortedIndices(LIFE3.filter(i =>
        palaces[i].majorStarNames.includes('紫微')
        || allStars(palaces[i]).includes('左輔') || allStars(palaces[i]).includes('右弼'))),
      note: '帝座得輔弼相隨，領導格局，得眾人之助',
    });
  }

  // o) id 'fu-xiang-chao-yuan', name '府相朝垣格':
  //    天府、天相皆於命宮三方四正（不借宮）.
  const fuIdx = findStarPalaceIndex('天府');
  const xiangIdx = findStarPalaceIndex('天相');
  if (fuIdx !== null && xiangIdx !== null && LIFE3.includes(fuIdx) && LIFE3.includes(xiangIdx)
      && palaces[fuIdx].majorStarNames.includes('天府') && palaces[xiangIdx].majorStarNames.includes('天相')) {
    patterns.push({
      id: 'fu-xiang-chao-yuan',
      name: '府相朝垣格',
      palaces: getUniqueSortedIndices([fuIdx, xiangIdx]),
      note: '衣祿之神朝命，一生食祿無虧，職場有靠',
    });
  }

  // p) id 'san-qi-jia-hui', name '三奇加會格':
  //    生年化祿、化權、化科三吉化皆在命宮三方四正.
  const sanQiIndices = ['祿', '權', '科']
    .map(k => findStarPalaceIndex(STEM_MUTAGEN[yearStem][k]));
  if (sanQiIndices.every(i => i !== null && LIFE3.includes(i))) {
    patterns.push({
      id: 'san-qi-jia-hui',
      name: '三奇加會格',
      palaces: getUniqueSortedIndices(sanQiIndices),
      note: '祿權科三奇會命，才具、機遇與名聲齊備',
    });
  }

  // q) id 'ming-lu-an-lu', name '明祿暗祿格':
  //    命宮見祿存（或生年化祿），其六合宮見生年化祿（或祿存）.
  const LIU_HE = {
    '子': '丑', '丑': '子', '寅': '亥', '亥': '寅', '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰', '巳': '申', '申': '巳', '午': '未', '未': '午',
  };
  const anIndex = palaces.findIndex(p => p.branch === LIU_HE[palaces[lifeIndex].branch]);
  if (anIndex !== -1) {
    const lifeStars = allStars(palaces[lifeIndex]);
    const anStars = allStars(palaces[anIndex]);
    if ((lifeStars.includes('祿存') && anStars.includes(birthLu))
        || (lifeStars.includes(birthLu) && anStars.includes('祿存'))) {
      patterns.push({
        id: 'ming-lu-an-lu',
        name: '明祿暗祿格',
        palaces: getUniqueSortedIndices([lifeIndex, anIndex]),
        note: '明祿坐命暗祿相合，錦上添花，多隱性助力',
      });
    }
  }

  // r) id 'huo-ling-jia-ming', name '火鈴夾命':
  //    火星、鈴星分居命宮左右兩鄰宮.
  const prevIdx = (lifeIndex + 11) % 12;
  const nextIdx = (lifeIndex + 1) % 12;
  const prevStars = allStars(palaces[prevIdx]);
  const nextStars = allStars(palaces[nextIdx]);
  if ((prevStars.includes('火星') && nextStars.includes('鈴星'))
      || (prevStars.includes('鈴星') && nextStars.includes('火星'))) {
    patterns.push({
      id: 'huo-ling-jia-ming',
      name: '火鈴夾命',
      palaces: getUniqueSortedIndices([prevIdx, lifeIndex, nextIdx]),
      note: '二火夾身，心緒易躁，宜以專業技能疏導其銳氣',
    });
  }

  return patterns;
}
