import { astro } from 'iztro';
import {
  computeSelfMutagen, computeFlyingMap, computeFlyIn,
  findLaiyinIndex, detectPatterns,
} from './fly-engine.js';

/**
 * Map from earthly-branch character to 1-based CSS grid position, the standard Zi Wei layout.
 */
export const BRANCH_GRID = {
  '巳':{row:1,col:1}, '午':{row:1,col:2}, '未':{row:1,col:3}, '申':{row:1,col:4},
  '辰':{row:2,col:1}, '酉':{row:2,col:4},
  '卯':{row:3,col:1}, '戌':{row:3,col:4},
  '寅':{row:4,col:1}, '丑':{row:4,col:2}, '子':{row:4,col:3}, '亥':{row:4,col:4}
};

/**
 * Keys for the four transformational stars (四化星).
 */
export const MUTAGEN_KEYS = ['祿', '權', '科', '忌'];

/**
 * CSS class names for the four transformational stars.
 */
export const MUT_CLASS = { '祿': 'mut-lu', '權': 'mut-quan', '科': 'mut-ke', '忌': 'mut-ji' };

/**
 * Definitions for the different chart layers (scopes).
 */
export const LAYER_DEFS = [
  { id: 'natal',   label: '本命' },
  { id: 'decadal', label: '大限' },
  { id: 'yearly',  label: '流年' },
];

/**
 * Generates the Zi Wei Dou Shu chart data for a given birth and target date.
 * @param {object} params
 * @param {string} params.solarDate - Birth solar date in 'YYYY-M-D' format (e.g., '2000-8-16').
 * @param {number} params.timeIndex - Birth time index (0-12).
 * @param {'男'|'女'} params.gender - Gender of the person.
 * @param {string} params.targetDate - Target date-time for horoscope calculations in 'YYYY-M-D HH:mm' format (e.g., '2025-7-7 12:30').
 * @returns {object} The structured chart data.
 * @throws {Error} If any input parameter is invalid.
 */
export function buildChartData({ solarDate, timeIndex, gender, targetDate }) {
  // 1. Input Validation
  if (!solarDate || typeof solarDate !== 'string' || !/^\d{4}-\d{1,2}-\d{1,2}$/.test(solarDate)) {
    throw new Error('Invalid solarDate format. Expected "YYYY-M-D".');
  }
  if (typeof timeIndex !== 'number' || timeIndex < 0 || timeIndex > 12 || !Number.isInteger(timeIndex)) {
    throw new Error('Invalid timeIndex. Expected an integer between 0 and 12.');
  }
  if (!gender || (gender !== '男' && gender !== '女')) {
    throw new Error('Invalid gender. Expected "男" or "女".');
  }
  if (!targetDate || typeof targetDate !== 'string' || !/^\d{4}-\d{1,2}-\d{1,2}\s\d{2}:\d{2}$/.test(targetDate)) {
    throw new Error('Invalid targetDate format. Expected "YYYY-M-D HH:mm".');
  }

  // Generate astrolabe and horoscope using iztro
  const astrolabe = astro.bySolar(solarDate, timeIndex, gender, true, 'zh-TW');
  const h = astrolabe.horoscope(targetDate);

  // Fly-engine inputs: palace stems + star names, index-aligned with astrolabe.palaces
  const yearStem = astrolabe.chineseDate.split(' ')[0][0];
  const fePalaces = astrolabe.palaces.map((p, i) => ({
    index: i,
    stem: p.heavenlyStem,
    branch: p.earthlyBranch,
    palaceName: p.name,
    isLifePalace: p.name === '命宮',
    isBodyPalace: p.isBodyPalace,
    majorStarNames: p.majorStars.map((s) => s.name),
    otherStarNames: p.minorStars.map((s) => s.name),
  }));
  const selfMutagen = computeSelfMutagen(fePalaces);
  const flyingMap = computeFlyingMap(fePalaces);
  const flyIn = computeFlyIn(flyingMap, yearStem, fePalaces);
  const laiyinIndex = findLaiyinIndex(fePalaces, yearStem);
  const bodyPalaceIndex = fePalaces.findIndex((p) => p.isBodyPalace);

  // 2. Construct meta object
  const meta = {
    yearStem,
    laiyinIndex,
    bodyPalaceIndex,
    gender: astrolabe.gender,
    solarDate: astrolabe.solarDate,
    lunarDate: astrolabe.lunarDate,
    chineseDate: astrolabe.chineseDate,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    sign: astrolabe.sign,
    zodiac: astrolabe.zodiac,
    soul: astrolabe.soul,
    body: astrolabe.body,
    fiveElementsClass: astrolabe.fiveElementsClass,
  };

  // 3. Construct layers array
  const layers = [];

  // --- NATAL Layer ---
  const natalLifeIndex = astrolabe.palaces.findIndex(p => p.name === '命宮');
  const natalMutagenMap = { '祿': null, '權': null, '科': null, '忌': null };
  // Scan all natal stars to find birth-year sihua (mutagen property)
  astrolabe.palaces.forEach(palace => {
    palace.majorStars.concat(palace.minorStars).forEach(star => {
      if (star.mutagen && MUTAGEN_KEYS.includes(star.mutagen)) {
        natalMutagenMap[star.mutagen] = star.name;
      }
    });
  });

  const natalCells = astrolabe.palaces.map((palace, i) => {
    const branch = palace.earthlyBranch;
    return {
      branchIndex: i,
      branch: branch,
      stem: palace.heavenlyStem,
      grid: BRANCH_GRID[branch],
      palaceName: palace.name,
      isLifePalace: palace.name === '命宮',
      isBodyPalace: palace.isBodyPalace,
      majorStars: palace.majorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen })),
      minorStars: palace.minorStars.map(s => ({ name: s.name, brightness: s.brightness || '', mutagen: '' })),
      adjectiveStars: palace.adjectiveStars.map(s => s.name),
      changsheng12: palace.changsheng12,
      decadalRange: palace.decadal.range,
      selfHits: selfMutagen[i], // 自化: [{star, key, kind: 'out'|'in'}]
      flowStars: [], // Natal layer has no flowing stars
      mutagenHits: [] // Natal layer has no flowing mutagen hits
    };
  });

  layers.push({
    id: 'natal',
    label: '本命',
    stemBranch: astrolabe.chineseDate.split(' ')[0], // First pillar of Chinese date
    lifeIndex: natalLifeIndex,
    laiyinIndex,
    mutagenMap: natalMutagenMap,
    cells: natalCells,
  });

  // --- HOROSCOPE Layers (Decadal, Yearly, Monthly, Daily) ---
  const horoscopeScopes = [
    { scope: h.decadal, id: 'decadal', label: '大限' },
    { scope: h.yearly, id: 'yearly', label: '流年' },
  ];

  horoscopeScopes.forEach(({ scope, id, label }) => {
    const currentMutagenMap = {
      '祿': scope.mutagen[0] || null,
      '權': scope.mutagen[1] || null,
      '科': scope.mutagen[2] || null,
      '忌': scope.mutagen[3] || null,
    };

    const currentCells = astrolabe.palaces.map((palace, i) => {
      const branch = palace.earthlyBranch;
      const mutagenHits = [];
      const allNatalStarsInPalace = palace.majorStars.concat(palace.minorStars);

      // Determine which natal stars in this palace are affected by this scope's stem's sihua
      MUTAGEN_KEYS.forEach((key, kIndex) => {
        const scopeMutagenStarName = scope.mutagen[kIndex];
        if (scopeMutagenStarName) { // If a star is designated for this sihua key
          if (allNatalStarsInPalace.some(s => s.name === scopeMutagenStarName)) {
            mutagenHits.push({ star: scopeMutagenStarName, key: key });
          }
        }
      });

      return {
        branchIndex: i,
        branch: branch,
        stem: palace.heavenlyStem,
        grid: BRANCH_GRID[branch],
        palaceName: scope.palaceNames[i], // This scope's palace name at this position
        isLifePalace: i === scope.index,
        isBodyPalace: false, // Only natal has a body palace designation
        majorStars: [], minorStars: [], adjectiveStars: [], // These layers don't carry natal star data here
        changsheng12: '', decadalRange: null, // These layers don't carry these specific natal properties
        selfHits: [],
        flowStars: (scope.stars && scope.stars[i]) ? scope.stars[i].map(st => ({ name: st.name, type: st.type })) : [],
        mutagenHits: mutagenHits
      };
    });

    layers.push({
      id: id,
      label: label,
      stemBranch: scope.heavenlyStem + scope.earthlyBranch,
      lifeIndex: scope.index,
      mutagenMap: currentMutagenMap,
      cells: currentCells,
    });
  });

  // 4. Fly-engine analysis attached at chart level
  const patterns = detectPatterns({
    palaces: fePalaces,
    lifeIndex: natalLifeIndex,
    bodyIndex: bodyPalaceIndex,
    yearStem,
  });

  return { meta, layers, flying: { map: flyingMap, flyIn }, patterns };
}

/**
 * Returns the current local date-time formatted as 'YYYY-M-D HH:mm'.
 * Month and day are not zero-padded, but hours and minutes are.
 * @returns {string} Current date-time string.
 */
export function defaultTargetDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() is 0-indexed
  const day = now.getDate();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}
