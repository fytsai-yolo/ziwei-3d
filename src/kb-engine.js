/**
 * Zi Wei Dou Shu (紫微斗數) Knowledge Base Matcher and Validator Engine.
 *
 * NOTE ON DESIGN:
 * A RETE-style pattern matching network was considered and rejected for this engine.
 * While RETE provides optimal execution costs for large, dynamic, and frequently churning
 * fact bases by maintaining a stateful network of joint conditions, a Zi Wei Dou Shu natal
 * chart is a small, immutable set of facts (exactly 12 static palaces and a tiny set of
 * detected overall patterns). Batch-evaluating a thousand rules against these 12 static
 * cells using a naive, stateless loop completes in single-digit milliseconds in modern JS engines.
 * The performance bottleneck of this system lies entirely in text quality and data curation,
 * not matching execution speed. Therefore, simplicity and statelessness are prioritized.
 */

export const KB_SOURCES = ['古籍', '現代通行', 'AI生成待核'];
export const KB_PALACE_NAMES = ['命宮', '兄弟', '夫妻', '子女', '財帛', '疾厄', '遷移', '僕役', '官祿', '田宅', '福德', '父母'];
// Whitelist of star names usable in match.star / match.withStars — catches romanized
// or misspelled names in generated content (has actually happened twice).
export const KB_STAR_NAMES = [
  '紫微', '天機', '太陽', '武曲', '天同', '廉貞', '天府', '太陰', '貪狼', '巨門', '天相', '天梁', '七殺', '破軍',
  '文昌', '文曲', '左輔', '右弼', '天魁', '天鉞', '祿存', '天馬', '擎羊', '陀羅', '火星', '鈴星', '地空', '地劫',
];

/**
 * Validates a batch of knowledge base entries against the database schema constraints.
 * @param {Array} entries - The array of knowledge base entries to validate.
 * @returns {string[]} An array of human-readable validation error messages. Empty means valid.
 */
export function validateEntries(entries) {
  if (!Array.isArray(entries)) {
    return ['Input entries must be an array.'];
  }

  const errors = [];
  const ids = new Set();
  const recognizedMatchKeys = ['star', 'palaceName', 'branch', 'brightness', 'mutagen', 'withStars', 'patternId'];

  entries.forEach((entry, idx) => {
    const path = `entries[${idx}] (ID: ${entry?.id || 'unknown'})`;

    if (!entry || typeof entry !== 'object') {
      errors.push(`${path}: Entry must be an object.`);
      return;
    }

    // ID validation
    if (!entry.id || typeof entry.id !== 'string') {
      errors.push(`${path}: "id" must be a non-empty string.`);
    } else {
      if (ids.has(entry.id)) {
        errors.push(`${path}: duplicate ID "${entry.id}".`);
      }
      ids.add(entry.id);
    }

    // Text validation
    if (!entry.text || typeof entry.text !== 'string') {
      errors.push(`${path}: "text" must be a non-empty string.`);
    }

    // Source validation
    if (!KB_SOURCES.includes(entry.source)) {
      errors.push(`${path}: "source" must be one of: ${KB_SOURCES.join(', ')}.`);
    }

    // Weight validation
    if (!Number.isInteger(entry.weight) || entry.weight < 1 || entry.weight > 3) {
      errors.push(`${path}: "weight" must be an integer between 1 and 3.`);
    }

    // Match validation
    if (!entry.match || typeof entry.match !== 'object') {
      errors.push(`${path}: "match" must be an object.`);
      return;
    }

    const matchKeys = Object.keys(entry.match);
    if (matchKeys.length === 0) {
      errors.push(`${path}: "match" object cannot be empty.`);
    }

    matchKeys.forEach(key => {
      if (!recognizedMatchKeys.includes(key)) {
        errors.push(`${path}: unknown match condition key "${key}".`);
      }
    });

    const m = entry.match;

    if (m.palaceName && !KB_PALACE_NAMES.includes(m.palaceName)) {
      errors.push(`${path}: "palaceName" must be one of: ${KB_PALACE_NAMES.join(', ')}.`);
    }

    if (m.star && !KB_STAR_NAMES.includes(m.star)) {
      errors.push(`${path}: "star" value "${m.star}" is not a known star name.`);
    }
    if (m.withStars && m.withStars.some(s => !KB_STAR_NAMES.includes(s))) {
      errors.push(`${path}: "withStars" contains an unknown star name.`);
    }

    if (m.mutagen && !['祿', '權', '科', '忌'].includes(m.mutagen)) {
      errors.push(`${path}: "mutagen" must be one of '祿', '權', '科', '忌'.`);
    }

    if (m.patternId && m.star) {
      errors.push(`${path}: "patternId" and "star" are mutually exclusive.`);
    }

    if (!m.patternId && !m.star) {
      errors.push(`${path}: either "star" or "patternId" must be present (anchored rule).`);
    }
  });

  return errors;
}

/**
 * Matches palace-anchored knowledge base entries against the computed chart.
 * Returns an array of size 12 indexed by cell branchIndex.
 * @param {Object} chart - The computed chart object containing cells.
 * @param {Array} entries - KB entry array.
 * @returns {Array[]} An array of length 12 containing arrays of matched entries sorted by weight DESC, then ID ASC.
 */
export function matchPalaceKnowledge(chart, entries) {
  const result = Array.from({ length: 12 }, () => []);

  if (!chart || !chart.layers || !chart.layers[0] || !Array.isArray(chart.layers[0].cells)) {
    return result;
  }

  const cells = chart.layers[0].cells;

  for (const cell of cells) {
    const branchIdx = cell.branchIndex;
    if (branchIdx === undefined || branchIdx < 0 || branchIdx >= 12) {
      continue;
    }

    const matchedEntries = [];

    for (const entry of entries) {
      // Pattern-anchored entries are ignored for individual palace-matching
      if (entry.match.patternId) {
        continue;
      }

      let isMatch = true;
      let matchedStar = null;

      // 1. Star presence validation
      if (entry.match.star) {
        const major = cell.majorStars || [];
        const minor = cell.minorStars || [];
        matchedStar = major.find(s => s.name === entry.match.star) || 
                      minor.find(s => s.name === entry.match.star);
        if (!matchedStar) {
          isMatch = false;
        }
      }

      if (!isMatch) continue;

      // 2. Palace name constraint
      if (entry.match.palaceName && cell.palaceName !== entry.match.palaceName) {
        isMatch = false;
      }

      if (!isMatch) continue;

      // 3. Branch constraint
      if (entry.match.branch && cell.branch !== entry.match.branch) {
        isMatch = false;
      }

      if (!isMatch) continue;

      // 4. Brightness constraint
      if (entry.match.brightness) {
        if (!matchedStar || !entry.match.brightness.includes(matchedStar.brightness)) {
          isMatch = false;
        }
      }

      if (!isMatch) continue;

      // 5. Mutagen constraint
      if (entry.match.mutagen) {
        if (!matchedStar || matchedStar.mutagen !== entry.match.mutagen) {
          isMatch = false;
        }
      }

      if (!isMatch) continue;

      // 6. Secondary presence constraints (withStars)
      if (entry.match.withStars) {
        const presentStarNames = new Set([
          ...(cell.majorStars || []).map(s => s.name),
          ...(cell.minorStars || []).map(s => s.name),
          ...(cell.adjectiveStars || [])
        ]);
        const hasAllSecondary = entry.match.withStars.every(starName => presentStarNames.has(starName));
        if (!hasAllSecondary) {
          isMatch = false;
        }
      }

      if (isMatch) {
        matchedEntries.push(entry);
      }
    }

    // Sort: highest weight first; fallback to alphabetical ID comparison for deterministic ordering
    matchedEntries.sort((a, b) => {
      if (b.weight !== a.weight) {
        return b.weight - a.weight;
      }
      return a.id.localeCompare(b.id);
    });

    result[branchIdx] = matchedEntries;
  }

  return result;
}

/**
 * Matches pattern-anchored knowledge base entries against global chart patterns.
 * @param {Object} chart - The computed chart object.
 * @param {Array} entries - KB entry array.
 * @returns {Array} List of matching pattern objects combined with their KB text: { entry, pattern }
 */
export function matchPatternKnowledge(chart, entries) {
  if (!chart || !chart.patterns || !Array.isArray(chart.patterns)) {
    return [];
  }

  const matches = [];

  for (const entry of entries) {
    if (entry.match && entry.match.patternId) {
      const activePattern = chart.patterns.find(p => p.id === entry.match.patternId);
      if (activePattern) {
        matches.push({
          entry,
          pattern: activePattern
        });
      }
    }
  }

  return matches.sort((a, b) => b.entry.weight - a.entry.weight);
}

/**
 * Composes a single-line text description summarizing active yearly flags.
 * @param {Object} yearEntry - Timeline year object containing flags.
 * @param {Object} templates - Key-value map pairing stable flag IDs with standard short phrases.
 * @returns {string} The formatted combined string.
 */
export function composeYearText(yearEntry, templates) {
  if (!yearEntry || !Array.isArray(yearEntry.flags) || yearEntry.flags.length === 0) {
    return '平';
  }

  const outputPhrases = [];

  for (const flag of yearEntry.flags) {
    const templatePhrase = templates[flag.id];
    const finalPhrase = templatePhrase !== undefined ? templatePhrase : flag.label;

    if (finalPhrase && !outputPhrases.includes(finalPhrase)) {
      outputPhrases.push(finalPhrase);
    }
  }

  return outputPhrases.length > 0 ? outputPhrases.join('；') : '平';
}
