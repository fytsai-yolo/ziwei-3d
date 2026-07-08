import { buildChartData, defaultTargetDate, LAYER_DEFS, MUT_CLASS, MUTAGEN_KEYS } from './astro-service.js';
import { renderLayer } from './renderer.js';
import { Scene } from './scene.js';
import { createFlyOverlay } from './arrows.js';
import { buildTimeline, yearSummary } from './timeline.js';
import { renderTimeline } from './timeline-ui.js';
import { getNotesForChart } from './notes-data.js';
import { buildReportHTML } from './report.js';
import { renderMergedChart } from './merged-renderer.js';
import { matchPalaceKnowledge, composeYearText } from './kb-engine.js';
import { KB_ENTRIES, YEAR_TEMPLATES } from './kb/index.js';

let scene;
let chartData = null; // Stores the latest chart data
let overlays = new Map(); // layerId -> fly overlay controller
let flyMode = 'select'; // 'none' | 'select' | 'heat'
let timelineCtl = null; // {setSelected} from renderTimeline
let timelineKey = null; // birth inputs the current timeline was built for
let currentTimeline = null; // buildTimeline() result for the current chart
let viewMode = 'flat'; // 'flat' (merged 2D 疊宮盤, default) | '3d' (exploded stack)
let mergedOverlay = null; // fly-arrow overlay attached to the merged chart
let kbPerPalace = null; // matchPalaceKnowledge result for the current chart
const infoPanel = document.getElementById('info-panel');
const metaPanel = document.getElementById('meta');

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
 * Formats a Date object into 'YYYY-MM-DD' string for date input fields.
 * @param {Date} date
 * @returns {string}
 */
function formatDateForInput(date) {
    // Build from local date parts; toISOString() would shift the date in non-UTC timezones.
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object into 'HH:mm' string for time input fields.
 * @param {Date} date
 * @returns {string}
 */
function formatTimeForInput(date) {
    return date.toTimeString().slice(0, 5);
}

/**
 * Converts 'YYYY-MM-DD' to 'YYYY-M-D' (strips leading zeros from month/day).
 * @param {string} dateString
 * @returns {string}
 */
function formatDate(dateString) {
    const [year, month, day] = dateString.split('-');
    return `${parseInt(year, 10)}-${parseInt(month, 10)}-${parseInt(day, 10)}`;
}

/**
 * Converts 'YYYY-MM-DDTHH:mm' to 'YYYY-M-D HH:mm' (strips leading zeros).
 * @param {string} dateTimeString
 * @returns {string}
 */
function formatDateTime(dateTimeString) {
    const [datePart, timePart] = dateTimeString.split('T');
    return `${formatDate(datePart)} ${timePart}`;
}

/** Populates the #layer-toggles div with checkboxes for each layer. */
function fillLayerToggles() {
    const layerTogglesDiv = document.getElementById('layer-toggles');
    layerTogglesDiv.innerHTML = ''; // Clear existing content
    LAYER_DEFS.forEach(def => {
        const label = _createElement('label');
        const checkbox = _createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = true; // All layers visible by default
        checkbox.dataset.layerId = def.id;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(def.label));
        layerTogglesDiv.appendChild(label);
    });
}

/** Sets default values for the chart input form. */
function setDefaultFormValues() {
    document.getElementById('birth-date').value = '2000-08-16';
    document.getElementById('time-index').value = '2';
    document.getElementById('gender').value = '女';

    // Set target-date to current datetime
    const now = new Date();
    document.getElementById('target-date').value = `${formatDateForInput(now)}T${formatTimeForInput(now)}`;
}

/** Finds which palace (branchIndex) holds a star on the natal layer, or null. */
function starBranchIndex(starName) {
    if (!chartData || !starName) return null;
    const cell = chartData.layers[0].cells.find(c =>
        c.majorStars.some(s => s.name === starName) || c.minorStars.some(s => s.name === starName));
    return cell ? cell.branchIndex : null;
}

function clearAllArrows() {
    overlays.forEach(ov => ov.clear());
    if (mergedOverlay) mergedOverlay.clear();
}

/** Overlap-engine hits for the year currently selected on the timeline. */
function currentYearOverlapHits() {
    if (!currentTimeline) return [];
    const y = parseInt(document.getElementById('target-date').value.slice(0, 4), 10);
    const entry = currentTimeline.years.find(e => e.year === y);
    return entry ? (entry.overlap || []) : [];
}

/** Rebuilds the flat merged 疊宮盤 (default view). */
function rebuildMergedChart() {
    const flatView = document.getElementById('flat-view');
    flatView.replaceChildren();
    mergedOverlay = null;
    if (!chartData) return;
    const mergedEl = renderMergedChart(chartData, { overlapHits: currentYearOverlapHits() });
    const grids = chartData.layers[0].cells.map(c => c.grid);
    mergedOverlay = createFlyOverlay(grids);
    mergedEl.appendChild(mergedOverlay.el);
    flatView.appendChild(mergedEl);
}

/** Switches between the flat merged chart and the exploded 3D stack. */
function setViewMode(mode, animate = true) {
    viewMode = mode;
    const viewportEl = document.getElementById('viewport');
    const btn = document.getElementById('view-toggle');
    const stack = viewportEl.querySelector('.stack');
    const targetSpacing = Number(document.getElementById('spacing').value);
    if (mode === '3d') {
        viewportEl.classList.remove('mode-flat');
        btn.textContent = '收合 2D';
        if (animate && stack) {
            // Start flat-and-face-on, then lift apart — the transition teaches the layering.
            scene.setRotation(0, 0);
            scene.setSpacing(0);
            stack.classList.add('animating');
            requestAnimationFrame(() => requestAnimationFrame(() => {
                scene.setRotation(-60, 45);
                scene.setSpacing(targetSpacing);
                setTimeout(() => stack.classList.remove('animating'), 900);
            }));
        }
    } else {
        btn.textContent = '展開 3D';
        if (animate && stack) {
            stack.classList.add('animating');
            scene.setRotation(0, 0);
            scene.setSpacing(0);
            setTimeout(() => {
                stack.classList.remove('animating');
                viewportEl.classList.add('mode-flat');
                scene.setRotation(-60, 45);
                scene.setSpacing(targetSpacing);
            }, 850);
        } else {
            viewportEl.classList.add('mode-flat');
        }
    }
}

/** Tints every palace column by its incoming 忌 (red) / 祿 (gold) count from the flyIn index. */
function applyHeatmap() {
    if (!chartData) return;
    const flyIn = chartData.flying.flyIn;
    const natalCells = chartData.layers[0].cells;
    const sourceName = (from) => from === 'birth' ? '生年' : natalCells[from].palaceName;
    document.querySelectorAll('#viewport .palace').forEach(el => {
        const i = parseInt(el.dataset.branchIndex, 10);
        const ji = flyIn[i]['忌'];
        const lu = flyIn[i]['祿'];
        const shadows = [];
        if (ji.length > 0) shadows.push(`inset 0 0 ${8 + ji.length * 7}px rgba(224, 53, 85, ${Math.min(0.16 * ji.length, 0.6)})`);
        if (lu.length > 0) shadows.push(`inset 0 0 ${6 + lu.length * 6}px rgba(255, 215, 0, ${Math.min(0.12 * lu.length, 0.5)})`);
        el.style.boxShadow = shadows.join(', ');
        const parts = [];
        if (ji.length) parts.push(`忌×${ji.length}（${ji.map(r => `${sourceName(r.from)}${r.star}`).join('、')}）`);
        if (lu.length) parts.push(`祿×${lu.length}（${lu.map(r => `${sourceName(r.from)}${r.star}`).join('、')}）`);
        if (parts.length) el.title = parts.join('；'); else el.removeAttribute('title');
    });
}

function clearHeatmap() {
    document.querySelectorAll('#viewport .palace').forEach(el => {
        el.style.boxShadow = '';
        el.removeAttribute('title');
    });
}

/** Rebuilds the year timeline strip when birth inputs changed; keeps selection in sync. */
function refreshTimeline() {
    const key = `${chartData.meta.solarDate}|${chartData.meta.time}|${chartData.meta.gender}`;
    if (key !== timelineKey) {
        timelineKey = key;
        currentTimeline = buildTimeline(chartData);
        timelineCtl = renderTimeline(document.getElementById('timeline'), currentTimeline, {
            onSelect: (year) => {
                // Jump the horoscope target to mid-year (safely inside that lunar year)
                document.getElementById('target-date').value = `${year}-07-02T12:00`;
                rebuild();
            },
        });
    }
    const targetYear = parseInt(document.getElementById('target-date').value.slice(0, 4), 10);
    if (timelineCtl && !Number.isNaN(targetYear)) timelineCtl.setSelected(targetYear);
    updateYearPanel(Number.isNaN(targetYear) ? null : targetYear);
}

/** Shows the selected year's flags and (when this is the curated chart) the hand-written note. */
function updateYearPanel(year) {
    const panel = document.getElementById('year-panel');
    panel.replaceChildren();
    if (!chartData || !currentTimeline || year === null) return;
    const entry = currentTimeline.years.find(e => e.year === year);
    if (!entry) return;

    panel.appendChild(_createElement('div', 'year-title', yearSummary(entry).split('｜')[0]));
    const decadalText = entry.decadal
        ? `大限 ${entry.decadal.range[0]}-${entry.decadal.range[1]} ${entry.decadal.palaceName}`
        : '童限';
    panel.appendChild(_createElement('div', 'year-decadal', decadalText));
    if (entry.flags.length > 0) {
        const flagsRow = _createElement('div', 'year-flags');
        entry.flags.forEach(f => {
            flagsRow.appendChild(_createElement('span', ['yflag', `yflag-${f.severity}`], f.label));
        });
        panel.appendChild(flagsRow);
    }
    // Rule-composed year text (works for any chart) …
    const composed = composeYearText(entry, YEAR_TEMPLATES);
    if (composed !== '平') {
        panel.appendChild(_createElement('div', 'year-note', composed));
    }
    // … plus the hand-written note, clearly labeled, only for the curated chart
    const notes = getNotesForChart(chartData.meta);
    const note = notes && notes.years[year];
    if (note) {
        const personal = _createElement('div', ['year-note', 'personal']);
        personal.appendChild(_createElement('span', ['kb-source', 'kb-src-personal'], '個人解讀'));
        personal.appendChild(document.createTextNode(note));
        panel.appendChild(personal);
    }
}

/** Re-applies the current fly-mode visuals (after rebuild or mode switch). */
function applyFlyMode() {
    clearAllArrows();
    clearHeatmap();
    if (flyMode === 'heat') applyHeatmap();
}

/** Rebuilds the entire chart, updates the scene, and info panels. */
function rebuild() {
    infoPanel.classList.remove('error');
    infoPanel.textContent = ''; // Clear previous error/info

    const birthDateInput = document.getElementById('birth-date').value;
    const timeIndexInput = document.getElementById('time-index').value;
    const genderInput = document.getElementById('gender').value;
    const targetDateInput = document.getElementById('target-date').value;

    const solarDate = formatDate(birthDateInput);
    const timeIndex = parseInt(timeIndexInput, 10);
    const gender = genderInput;
    const targetDate = formatDateTime(targetDateInput);

    try {
        chartData = buildChartData({ solarDate, timeIndex, gender, targetDate });
        kbPerPalace = matchPalaceKnowledge(chartData, KB_ENTRIES);

        // Render layers and pass to scene (natal layer is at index 0, so it's bottom).
        // 大限/流年 layers render compact in 3D — their detail lives in the merged 2D view.
        const layerElements = chartData.layers.map(layer =>
            renderLayer(layer, { compact: layer.id !== 'natal' }));
        scene.setLayers(layerElements);

        // One fly-arrow SVG overlay per layer (grid geometry is shared across layers)
        overlays = new Map();
        const grids = chartData.layers[0].cells.map(c => c.grid);
        chartData.layers.forEach((layer, i) => {
            const ov = createFlyOverlay(grids);
            layerElements[i].appendChild(ov.el);
            overlays.set(layer.id, ov);
        });
        refreshTimeline();
        rebuildMergedChart(); // after refreshTimeline: overlap chips need the selected year
        applyFlyMode();

        // Re-apply current spacing, opacity, and visibility from UI controls
        const spacingInput = document.getElementById('spacing');
        scene.setSpacing(Number(spacingInput.value));

        const opacityInput = document.getElementById('opacity');
        scene.setOpacity(Number(opacityInput.value) / 100);

        document.querySelectorAll('#layer-toggles input[type="checkbox"]').forEach(checkbox => {
            scene.setLayerVisible(checkbox.dataset.layerId, checkbox.checked);
        });

        // Update #meta information
        const meta = chartData.meta;
        metaPanel.textContent = '';
        let metaLine = `${meta.solarDate}（農曆 ${meta.lunarDate}）${meta.time} ${meta.timeRange}｜${meta.gender}｜${meta.fiveElementsClass}｜命主 ${meta.soul}｜身主 ${meta.body}`;
        const laiyinCell = meta.laiyinIndex != null ? chartData.layers[0].cells[meta.laiyinIndex] : null;
        if (laiyinCell) {
            metaLine += `｜來因 ${laiyinCell.branch}${laiyinCell.palaceName}`;
        }
        metaPanel.appendChild(_createElement('div', 'meta-line', metaLine));
        if (chartData.patterns && chartData.patterns.length > 0) {
            metaPanel.appendChild(_createElement('div', 'meta-patterns',
                `格局：${chartData.patterns.map(p => p.name).join('、')}`));
        }

        // If a branch was pinned before rebuild, re-apply the highlight and update info panel
        const pinnedIndex = scene.getPinnedBranchIndex();
        if (pinnedIndex !== null) {
            scene.highlight(pinnedIndex);
            updateInfoPanel(pinnedIndex);
        } else {
            updateInfoPanel(null); // Show hint text
        }

    } catch (error) {
        console.error("Error building chart data:", error);
        metaPanel.textContent = ''; // Clear meta on error
        chartData = null; // Clear chartData on error
        scene.setLayers([]); // Clear scene layers on error
        // clearPin() dispatches branch-select which rewrites the info panel,
        // so set the error message only after the scene is cleared.
        scene.clearPin();
        infoPanel.classList.add('error');
        infoPanel.textContent = `生成命盤失敗: ${error.message || error}`;
    }
}

/**
 * Updates the info panel with cross-layer details for a selected branch.
 * @param {number|null} branchIndex The index of the branch to display info for, or null to show hint.
 */
function updateInfoPanel(branchIndex) {
    infoPanel.innerHTML = '';
    infoPanel.classList.remove('error');

    if (branchIndex === null || !chartData) {
        infoPanel.textContent = '將滑鼠移到宮位上查看跨層資訊，點擊可釘選。';
        return;
    }

    const natalLayer = chartData.layers[0];
    const natalCell = natalLayer.cells[branchIndex];

    const header = _createElement('div', 'info-header', `${natalCell.stem}${natalCell.branch} 宮`);
    infoPanel.appendChild(header);

    // Iterate layers from TOP to BOTTOM (yearly first)
    // LAYER_DEFS order: natal, decadal, yearly — reverse to show yearly first.
    const reversedLayers = [...chartData.layers].reverse();

    reversedLayers.forEach(layer => {
        const cell = layer.cells[branchIndex];
        const infoRow = _createElement('div', 'info-row');

        const infoLayer = _createElement('span', 'info-layer', `${layer.label} ${layer.stemBranch}`);
        infoRow.appendChild(infoLayer);

        let palaceNameText = cell.palaceName;
        if (cell.isLifePalace) palaceNameText += '（命）';
        const infoPalace = _createElement('span', 'info-palace', palaceNameText);
        infoRow.appendChild(infoPalace);

        const infoStars = _createElement('div', 'info-stars');
        if (layer.id === 'natal') {
            cell.majorStars.forEach(star => {
                const starSpan = _createElement('span', 'star-name', star.name);
                if (star.brightness) { // brightness can be an empty string, which is falsy
                    const brightSub = _createElement('sub', 'bright', star.brightness);
                    starSpan.appendChild(brightSub);
                }
                infoStars.appendChild(starSpan);
            });
            cell.minorStars.forEach(star => {
                const starSpan = _createElement('span', 'star-name', star.name);
                if (star.brightness) {
                    const brightSub = _createElement('sub', 'bright', star.brightness);
                    starSpan.appendChild(brightSub);
                }
                infoStars.appendChild(starSpan);
            });
            cell.adjectiveStars.forEach(starName => {
                infoStars.appendChild(_createElement('span', 'star-name', starName));
            });
        } else { // Horoscope layers (flow stars and mutagen hits)
            cell.flowStars.forEach(star => {
                infoStars.appendChild(_createElement('span', 'star-name', star.name));
            });
            cell.mutagenHits.forEach(hit => {
                const hitSpan = _createElement('span', ['mut-hit-info', MUT_CLASS[hit.key]], `${hit.star}化${hit.key}`);
                infoStars.appendChild(hitSpan);
            });
        }
        infoRow.appendChild(infoStars);
        infoPanel.appendChild(infoRow);
    });

    // 釋義: knowledge-base interpretations for this palace, with provenance badges
    const kbHits = kbPerPalace ? (kbPerPalace[branchIndex] || []) : [];
    if (kbHits.length > 0) {
        infoPanel.appendChild(_createElement('div', 'kb-title', '釋義'));
        kbHits.slice(0, 6).forEach(entry => {
            const row = _createElement('div', 'kb-entry');
            row.appendChild(_createElement('span', ['kb-source', `kb-src-${entry.source === '古籍' ? 'classic' : entry.source === '現代通行' ? 'modern' : 'ai'}`], entry.source));
            row.appendChild(document.createTextNode(entry.text));
            infoPanel.appendChild(row);
        });
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    fillLayerToggles();
    setDefaultFormValues();

    scene = new Scene(document.getElementById('viewport'));

    rebuild(); // Initial chart rendering

    // Event listeners for form inputs and controls
    document.getElementById('chart-form').addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission
        rebuild();
    });

    document.getElementById('apply-target').addEventListener('click', () => {
        rebuild();
    });

    document.getElementById('spacing').addEventListener('input', (e) => {
        scene.setSpacing(Number(e.target.value));
    });

    document.getElementById('opacity').addEventListener('input', (e) => {
        scene.setOpacity(Number(e.target.value) / 100);
    });

    document.getElementById('layer-toggles').addEventListener('change', (e) => {
        if (e.target.matches('input[type="checkbox"]')) {
            scene.setLayerVisible(e.target.dataset.layerId, e.target.checked);
        }
    });

    // Custom event listener from the Scene class for branch selection changes
    document.getElementById('viewport').addEventListener('branch-select', (e) => {
        updateInfoPanel(e.detail.branchIndex);
        // Draw the clicked palace's four flights on the layer that was clicked
        if (flyMode !== 'select' || e.detail.source !== 'click') return;
        clearAllArrows();
        const { branchIndex, layerId } = e.detail;
        if (branchIndex === null || !layerId || !chartData) return;
        const ov = layerId === 'merged' ? mergedOverlay : overlays.get(layerId);
        if (!ov) return;
        const flights = MUTAGEN_KEYS.map(key => ({
            key,
            star: chartData.flying.map[branchIndex][key].star,
            toIndex: chartData.flying.map[branchIndex][key].toIndex,
        }));
        ov.drawPalaceFlights(branchIndex, flights);
    });

    // Click on a layer's center: draw that layer's own 四化 (生年 for natal, 限/流 otherwise)
    document.getElementById('viewport').addEventListener('center-select', (e) => {
        if (flyMode !== 'select' || !chartData) return;
        clearAllArrows();
        // Merged chart's center shows the natal 生年四化.
        const isMerged = e.detail.layerId === 'merged';
        const layer = isMerged ? chartData.layers[0] : chartData.layers.find(l => l.id === e.detail.layerId);
        const ov = isMerged ? mergedOverlay : overlays.get(e.detail.layerId);
        if (!layer || !ov) return;
        const targets = MUTAGEN_KEYS
            .filter(key => layer.mutagenMap[key])
            .map(key => ({ key, star: layer.mutagenMap[key], toIndex: starBranchIndex(layer.mutagenMap[key]) }));
        ov.drawCenterFlights(targets);
    });

    // Fly-mode radio switch
    document.getElementById('fly-mode').addEventListener('change', (e) => {
        if (e.target.name === 'fly-mode') {
            flyMode = e.target.value;
            applyFlyMode();
        }
    });

    // Flat ↔ 3D view toggle
    document.getElementById('view-toggle').addEventListener('click', () => {
        setViewMode(viewMode === 'flat' ? '3d' : 'flat');
    });

    // 雜曜 visibility (hidden by default — biggest text-noise contributor)
    document.getElementById('adj-toggle').addEventListener('change', (e) => {
        document.getElementById('app').classList.toggle('show-adj', e.target.checked);
    });

    // Export a print-friendly report in a new tab
    document.getElementById('export-report').addEventListener('click', () => {
        if (!chartData || !currentTimeline) return;
        const html = buildReportHTML({
            chart: chartData,
            timeline: currentTimeline,
            notes: getNotesForChart(chartData.meta),
        });
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
    });
});
