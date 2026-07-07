import { MUT_CLASS } from './astro-service.js';

/**
 * Helper to create a DOM element safely.
 * @param {string} tag The HTML tag name.
 * @param {string|string[]} [classList=[]] CSS classes to add.
 * @param {string} [text=''] Text content for the element.
 * @returns {HTMLElement} The created element.
 */
function _createElement(tag, classList = [], text = '') {
    const el = document.createElement(tag);
    if (Array.isArray(classList) && classList.length > 0) {
        el.classList.add(...classList);
    } else if (typeof classList === 'string' && classList) {
        el.classList.add(classList);
    }
    if (text) {
        el.textContent = text;
    }
    return el;
}

/**
 * Appends 自化 glyphs (↓ 離心 / ↑ 向心) to a star chip for any selfHits on that star.
 * @param {HTMLElement} starSpan The star's <span>.
 * @param {string} starName The star name to match.
 * @param {Array<{star:string,key:string,kind:'out'|'in'}>} selfHits The cell's selfHits.
 */
function _appendSelfMutagen(starSpan, starName, selfHits) {
    selfHits.filter(h => h.star === starName).forEach(hit => {
        const arrow = hit.kind === 'out' ? '↓' : '↑';
        starSpan.appendChild(_createElement('i', ['mut', 'selfmut', MUT_CLASS[hit.key]], `${arrow}${hit.key}`));
    });
}

/**
 * Renders a single chart layer into a detached DOM element.
 * @param {object} layer - The layer data object.
 * @returns {HTMLElement} The created layer DOM element.
 */
export function renderLayer(layer) {
    const layerEl = _createElement('div', 'layer');
    layerEl.dataset.layerId = layer.id;

    // Render palace cells
    layer.cells.forEach(cell => {
        const palaceEl = _createElement('div', 'palace');
        palaceEl.dataset.branchIndex = cell.branchIndex;
        palaceEl.style.gridRow = cell.grid.row;
        palaceEl.style.gridColumn = cell.grid.col;

        // Palace head
        const palaceHead = _createElement('div', 'palace-head');
        palaceHead.appendChild(_createElement('span', 'stem-branch', `${cell.stem}${cell.branch}`));
        palaceHead.appendChild(_createElement('span', 'palace-name', cell.palaceName));
        if (cell.isLifePalace) {
            palaceHead.appendChild(_createElement('span', ['badge', 'life'], '命'));
        }
        if (cell.isBodyPalace) {
            palaceHead.appendChild(_createElement('span', ['badge', 'body'], '身'));
        }
        if (layer.laiyinIndex === cell.branchIndex) {
            palaceHead.appendChild(_createElement('span', ['badge', 'laiyin'], '因'));
        }
        palaceEl.appendChild(palaceHead);

        // Stars section
        const starsDiv = _createElement('div', 'stars');
        if (layer.id === 'natal') {
            cell.majorStars.forEach(star => {
                const starSpan = _createElement('span', ['star', 'major'], star.name);
                if (star.brightness) {
                    starSpan.appendChild(_createElement('sub', 'bright', star.brightness));
                }
                if (star.mutagen) {
                    starSpan.appendChild(_createElement('i', ['mut', MUT_CLASS[star.mutagen]], star.mutagen));
                }
                _appendSelfMutagen(starSpan, star.name, cell.selfHits || []);
                starsDiv.appendChild(starSpan);
            });
            cell.minorStars.forEach(star => {
                const starSpan = _createElement('span', ['star', 'minor'], star.name);
                if (star.brightness) { // Only if non-empty
                    starSpan.appendChild(_createElement('sub', 'bright', star.brightness));
                }
                _appendSelfMutagen(starSpan, star.name, cell.selfHits || []);
                starsDiv.appendChild(starSpan);
            });
            cell.adjectiveStars.forEach(name => {
                starsDiv.appendChild(_createElement('span', ['star', 'adj'], name));
            });
        } else { // Horoscope layers (flow stars and mutagen hits)
            cell.flowStars.forEach(star => {
                starsDiv.appendChild(_createElement('span', ['star', 'flow'], star.name));
            });
            cell.mutagenHits.forEach(hit => {
                starsDiv.appendChild(_createElement('span', ['mut-hit', MUT_CLASS[hit.key]], `${hit.star}${hit.key}`));
            });
        }
        palaceEl.appendChild(starsDiv);

        // Palace foot
        const palaceFoot = _createElement('div', 'palace-foot');
        if (layer.id === 'natal') {
            let footContent = '';
            if (cell.changsheng12) {
                footContent += cell.changsheng12;
            }
            if (cell.decadalRange && cell.decadalRange.length === 2) {
                if (footContent) footContent += ' ';
                footContent += `${cell.decadalRange[0]}-${cell.decadalRange[1]}`;
            }
            palaceFoot.textContent = footContent;
        }
        palaceEl.appendChild(palaceFoot);

        layerEl.appendChild(palaceEl);
    });

    // Render center area
    const layerCenter = _createElement('div', 'layer-center');
    layerCenter.style.gridRow = '2 / span 2';
    layerCenter.style.gridColumn = '2 / span 2';

    layerCenter.appendChild(_createElement('div', 'layer-label', layer.label));
    layerCenter.appendChild(_createElement('div', 'layer-sub', layer.stemBranch));

    const mutagenLegend = _createElement('div', 'mutagen-legend');
    ['祿', '權', '科', '忌'].forEach(key => {
        if (layer.mutagenMap[key]) {
            mutagenLegend.appendChild(_createElement('span', ['mut', MUT_CLASS[key]], `${layer.mutagenMap[key]}化${key}`));
        }
    });
    layerCenter.appendChild(mutagenLegend);

    layerEl.appendChild(layerCenter);

    return layerEl;
}
