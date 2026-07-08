import { MUT_CLASS, MUTAGEN_KEYS } from './astro-service.js';

/**
 * Creates a DOM element with classes and optional text content safely.
 */
function el(tag, classes, text) {
  const element = document.createElement(tag);
  if (classes) {
    if (Array.isArray(classes)) {
      classes.forEach(c => { if (c) element.classList.add(c); });
    } else if (typeof classes === 'string') {
      classes.split(' ').forEach(c => { if (c) element.classList.add(c); });
    }
  }
  if (text !== undefined && text !== null) {
    element.textContent = text;
  }
  return element;
}

/**
 * Creates a star span with optional brightness, mutagens, and self-hits.
 */
function createStarSpan(star, isMajor, selfHits) {
  const starSpan = el('span', `star ${isMajor ? 'major' : 'minor'}`);
  starSpan.appendChild(document.createTextNode(star.name));

  if (star.brightness !== undefined && star.brightness !== null && star.brightness !== '') {
    starSpan.appendChild(el('sub', 'bright', star.brightness));
  }

  if (star.mutagen) {
    const mutClass = MUT_CLASS[star.mutagen] || '';
    starSpan.appendChild(el('i', `mut ${mutClass}`, star.mutagen));
  }

  const relatedSelfHits = (selfHits || []).filter(sh => sh.star === star.name);
  relatedSelfHits.forEach(sh => {
    const mutClass = MUT_CLASS[sh.key] || '';
    const glyph = sh.kind === 'out' ? '↓' : '↑';
    starSpan.appendChild(el('i', `mut selfmut ${mutClass}`, `${glyph}${sh.key}`));
  });

  return starSpan;
}

/**
 * Renders the merged (stacked) 2D chart layer.
 * 
 * @param {Object} chart - The pre-calculated chart data containing layers
 * @param {Object} opts - Optional parameters, e.g., overlapHits
 * @returns {HTMLElement} Detached DOM element representing the merged chart
 */
export function renderMergedChart(chart, opts = {}) {
  const root = el('div', 'layer merged-chart');
  root.setAttribute('data-layer-id', 'merged');

  if (!chart || !chart.layers || chart.layers.length === 0) {
    return root;
  }

  const natal = chart.layers[0];
  const decadal = chart.layers[1];
  const yearly = chart.layers[2];

  // Map cells by branchIndex for clean index-aligned lookups across layers
  const natalCells = [];
  const decadalCells = [];
  const yearlyCells = [];

  if (natal && natal.cells) {
    natal.cells.forEach(c => { natalCells[c.branchIndex] = c; });
  }
  if (decadal && decadal.cells) {
    decadal.cells.forEach(c => { decadalCells[c.branchIndex] = c; });
  }
  if (yearly && yearly.cells) {
    yearly.cells.forEach(c => { yearlyCells[c.branchIndex] = c; });
  }

  // Render 12 palace cells based on natal cell positions
  for (let i = 0; i < 12; i++) {
    const cell = natalCells[i];
    if (!cell) continue;

    const decadalCell = decadalCells[i];
    const yearlyCell = yearlyCells[i];

    const palaceDiv = el('div', 'palace');
    palaceDiv.setAttribute('data-branch-index', cell.branchIndex.toString());
    palaceDiv.style.gridRow = cell.grid.row;
    palaceDiv.style.gridColumn = cell.grid.col;

    // 1. Head Row
    const headDiv = el('div', 'palace-head');
    headDiv.appendChild(el('span', 'stem-branch', `${cell.stem}${cell.branch}`));
    headDiv.appendChild(el('span', 'palace-name', cell.palaceName));

    if (cell.isLifePalace) {
      headDiv.appendChild(el('span', 'badge life', '命'));
    }
    if (cell.isBodyPalace) {
      headDiv.appendChild(el('span', 'badge body', '身'));
    }
    if (natal.laiyinIndex === cell.branchIndex) {
      headDiv.appendChild(el('span', 'badge laiyin', '因'));
    }
    palaceDiv.appendChild(headDiv);

    // 2. Stars Grid/List
    const starsDiv = el('div', 'stars');
    const majorStars = cell.majorStars || [];
    majorStars.forEach(star => {
      starsDiv.appendChild(createStarSpan(star, true, cell.selfHits));
    });

    const minorStars = cell.minorStars || [];
    minorStars.forEach(star => {
      starsDiv.appendChild(createStarSpan(star, false, cell.selfHits));
    });

    const adjStars = cell.adjectiveStars || [];
    adjStars.forEach(adjName => {
      starsDiv.appendChild(el('span', 'star adj', adjName));
    });
    palaceDiv.appendChild(starsDiv);

    // 3. Overlay Strip
    const overlayStrip = el('div', 'overlay-strip');

    // a) Relabel tags
    if (decadalCell) {
      const isLife = decadalCell.isLifePalace ? ' is-life' : '';
      overlayStrip.appendChild(el('span', `ltag ltag-decadal${isLife}`, `限·${decadalCell.palaceName}`));
    }
    if (yearlyCell) {
      const isLife = yearlyCell.isLifePalace ? ' is-life' : '';
      overlayStrip.appendChild(el('span', `ltag ltag-yearly${isLife}`, `年·${yearlyCell.palaceName}`));
    }

    // b) Flow stars
    if (decadalCell && decadalCell.flowStars) {
      decadalCell.flowStars.forEach(fs => {
        overlayStrip.appendChild(el('span', 'star flow flow-decadal', fs.name));
      });
    }
    if (yearlyCell && yearlyCell.flowStars) {
      yearlyCell.flowStars.forEach(fs => {
        overlayStrip.appendChild(el('span', 'star flow flow-yearly', fs.name));
      });
    }

    // c) Mutagen hits
    if (decadalCell && decadalCell.mutagenHits) {
      decadalCell.mutagenHits.forEach(hit => {
        const mClass = MUT_CLASS[hit.key] || '';
        overlayStrip.appendChild(el('span', `mut-hit ${mClass}`, `限·${hit.star}${hit.key}`));
      });
    }
    if (yearlyCell && yearlyCell.mutagenHits) {
      yearlyCell.mutagenHits.forEach(hit => {
        const mClass = MUT_CLASS[hit.key] || '';
        overlayStrip.appendChild(el('span', `mut-hit ${mClass}`, `年·${hit.star}${hit.key}`));
      });
    }

    // d) Palace overlap hits
    const overlapHits = opts.overlapHits || [];
    overlapHits.forEach(entry => {
      if (entry.palaceIndex === cell.branchIndex && entry.severity !== 'ovlp0') {
        const chip = el('span', `ovlp-chip ${entry.severity}`, '疊');
        chip.setAttribute('title', entry.label || '');
        // Hover-highlight wiring: main.js reads these to glow the event's palaces
        chip.setAttribute('data-ovlp-palace', entry.palaceIndex.toString());
        chip.setAttribute('data-ovlp-severity', entry.severity);
        if (entry.relatedIndex !== null && entry.relatedIndex !== undefined) {
          chip.setAttribute('data-ovlp-related', entry.relatedIndex.toString());
          chip.setAttribute('data-ovlp-link', entry.id.startsWith('oppose') ? '沖' : '入');
        }
        overlayStrip.appendChild(chip);
      }
    });

    palaceDiv.appendChild(overlayStrip);

    // 4. Footer Row
    const changsheng = cell.changsheng12 || '';
    let rangeText = '';
    if (cell.decadalRange && Array.isArray(cell.decadalRange) && cell.decadalRange.length === 2) {
      rangeText = `${cell.decadalRange[0]}-${cell.decadalRange[1]}`;
    }

    const footParts = [];
    if (changsheng) footParts.push(changsheng);
    if (rangeText) footParts.push(rangeText);

    palaceDiv.appendChild(el('div', 'palace-foot', footParts.join(' ')));

    root.appendChild(palaceDiv);
  }

  // Render Central Info Cell
  const centerDiv = el('div', 'layer-center');
  centerDiv.style.gridRow = '2 / span 2';
  centerDiv.style.gridColumn = '2 / span 2';

  centerDiv.appendChild(el('div', 'layer-label', '疊宮'));

  chart.layers.forEach(layer => {
    if (!layer) return;
    const rowDiv = el('div', 'center-row');
    rowDiv.appendChild(el('span', `ltag ltag-${layer.id}`, `${layer.label} ${layer.stemBranch}`));

    if (layer.mutagenMap) {
      MUTAGEN_KEYS.forEach(key => {
        const starName = layer.mutagenMap[key];
        if (starName) {
          const mClass = MUT_CLASS[key] || '';
          rowDiv.appendChild(el('span', `mut ${mClass}`, `${starName}${key}`));
        }
      });
    }
    centerDiv.appendChild(rowDiv);
  });

  root.appendChild(centerDiv);

  return root;
}
