import { matchPalaceKnowledge, matchPatternKnowledge, composeYearText } from './kb-engine.js';
import { KB_ENTRIES, YEAR_TEMPLATES } from './kb/index.js';

export const DISCLAIMER ='本報告由程式依紫微斗數傳統命理規則自動生成，所有宮位解讀、格局判定與流年吉凶提示均屬傳統術數之推演，僅供學術研究與娛樂參考使用，不構成任何醫療、投資、法律或人生重大決策之依據。健康問題請以正規醫療檢查為準，財務決策請諮詢持牌專業人士。';

export function esc(s) {
  if (s === undefined || s === null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildReportHTML({ chart, timeline, notes, generatedAt }) {
  const genAt = generatedAt || new Date().toLocaleString('zh-TW');
  const meta = (chart && chart.meta) || {};
  const natal = (chart && chart.layers && chart.layers[0]) || {};
  const cells = natal.cells || [];

  // Create a quick lookup map for cells by branchIndex
  const cellMap = {};
  cells.forEach(c => {
    if (c.branchIndex !== undefined) {
      cellMap[c.branchIndex] = c;
    }
  });

  // A. Header Meta Info
  const metaRows = [];
  metaRows.push(['國曆', `${meta.solarDate || ''} ${meta.time || ''} ${meta.timeRange || ''}`.trim()]);
  metaRows.push(['農曆', meta.lunarDate || '']);
  metaRows.push(['四柱', meta.chineseDate || '']);
  metaRows.push(['性別', meta.gender || '']);
  metaRows.push(['五行局', meta.fiveElementsClass || '']);
  metaRows.push(['命主／身主', `${meta.soul || ''} / ${meta.body || ''}`]);
  metaRows.push(['星座／生肖', `${meta.sign || ''} / ${meta.zodiac || ''}`]);
  
  if (meta.laiyinIndex !== undefined && meta.laiyinIndex !== null) {
    const laiyinCell = cellMap[meta.laiyinIndex];
    if (laiyinCell) {
      metaRows.push(['來因宮', `${laiyinCell.branch || ''}${laiyinCell.palaceName || ''}`]);
    }
  }
  metaRows.push(['產生時間', genAt]);

  let metaTableHtml = '<table class="meta-table">';
  for (let i = 0; i < metaRows.length; i += 2) {
    metaTableHtml += '<tr>';
    metaTableHtml += `<td class="label">${esc(metaRows[i][0])}</td><td class="value">${esc(metaRows[i][1])}</td>`;
    if (i + 1 < metaRows.length) {
      metaTableHtml += `<td class="label">${esc(metaRows[i+1][0])}</td><td class="value">${esc(metaRows[i+1][1])}</td>`;
    } else {
      metaTableHtml += '<td class="label"></td><td class="value"></td>';
    }
    metaTableHtml += '</tr>';
  }
  metaTableHtml += '</table>';

  // B. Patterns — enriched with knowledge-base texts (source-labeled)
  const patterns = chart.patterns || [];
  const kbPatternHits = matchPatternKnowledge(chart, KB_ENTRIES);
  const kbPatternById = new Map(kbPatternHits.map(h => [h.entry.match.patternId, h.entry]));
  let patternsHtml = '<h2>格局</h2>';
  if (patterns.length === 0) {
    patternsHtml += '<p>無明顯成格。</p>';
  } else {
    patternsHtml += '<ul>';
    patterns.forEach(p => {
      const palNames = (p.palaces || []).map(idx => {
        const c = cellMap[idx];
        return c ? c.palaceName : '';
      }).filter(Boolean).join('、');
      let line = `<li><b>${esc(p.name)}</b>：${esc(p.note)}（${esc(palNames)}）`;
      const kbEntry = kbPatternById.get(p.id);
      if (kbEntry) {
        line += `<br><span class="kb-text">${esc(kbEntry.text)}<span class="kb-src">〔${esc(kbEntry.source)}〕</span></span>`;
      }
      line += '</li>';
      patternsHtml += line;
    });
    patternsHtml += '</ul>';
  }

  // C. Twelve Palaces
  const sortedCells = [...cells].sort((a, b) => (a.branchIndex || 0) - (b.branchIndex || 0));
  let cellsTableHtml = '<h2>命盤十二宮</h2>';
  cellsTableHtml += '<table><thead><tr>';
  cellsTableHtml += '<th style="width: 18%;">宮位</th>';
  cellsTableHtml += '<th style="width: 32%;">主星</th>';
  cellsTableHtml += '<th style="width: 20%;">輔星</th>';
  cellsTableHtml += '<th style="width: 18%;">自化</th>';
  cellsTableHtml += '<th style="width: 12%;">大限</th>';
  cellsTableHtml += '</tr></thead><tbody>';

  sortedCells.forEach(cell => {
    // Palace Name Column
    let palLabel = `${cell.stem || ''}${cell.branch || ''} ${cell.palaceName || ''}`;
    if (cell.isLifePalace) palLabel += '【命】';
    if (cell.isBodyPalace) palLabel += '【身】';
    if (cell.branchIndex === meta.laiyinIndex) palLabel += '【來因】';

    // Major Stars
    const majors = (cell.majorStars || []).map(star => {
      let s = star.name || '';
      if (star.brightness) s += `[${star.brightness}]`;
      if (star.mutagen) s += `（生年${star.mutagen}）`;
      return s;
    }).join('、') || '—';

    // Minor Stars
    const minors = (cell.minorStars || []).map(star => {
      let s = star.name || '';
      if (star.brightness) s += `[${star.brightness}]`;
      if (star.mutagen) s += `（生年${star.mutagen}）`;
      return s;
    }).join('、') || '—';

    // Self hits
    const selfs = (cell.selfHits || []).map(hit => {
      const arrow = hit.kind === 'out' ? '↓' : '↑';
      return `${hit.star || ''}${arrow}${hit.key || ''}`;
    }).join('、') || '—';

    // Decadal range
    const range = cell.decadalRange ? `${cell.decadalRange[0]}–${cell.decadalRange[1]}` : '—';

    cellsTableHtml += '<tr>';
    cellsTableHtml += `<td><b>${esc(palLabel)}</b></td>`;
    cellsTableHtml += `<td>${esc(majors)}</td>`;
    cellsTableHtml += `<td>${esc(minors)}</td>`;
    cellsTableHtml += `<td>${esc(selfs)}</td>`;
    cellsTableHtml += `<td>${esc(range)}</td>`;
    cellsTableHtml += '</tr>';
  });
  cellsTableHtml += '</tbody></table>';

  // C2. 宮位釋義 — knowledge-base interpretations per palace, source-labeled (any chart)
  const kbPerPalace = matchPalaceKnowledge(chart, KB_ENTRIES);
  let kbHtml = '<h2>宮位釋義</h2>';
  const kbSections = [];
  sortedCells.forEach(cell => {
    const hits = kbPerPalace[cell.branchIndex] || [];
    if (hits.length === 0) return;
    let block = `<h3>${esc(cell.stem)}${esc(cell.branch)} ${esc(cell.palaceName)}</h3><ul>`;
    hits.forEach(entry => {
      block += `<li>${esc(entry.text)}<span class="kb-src">〔${esc(entry.source)}〕</span></li>`;
    });
    block += '</ul>';
    kbSections.push(block);
  });
  if (kbSections.length === 0) {
    kbHtml += '<p>本命盤主星分佈無對應釋義條目。</p>';
  } else {
    kbHtml += kbSections.join('');
  }

  // D. Four Mutagen Confluences
  const confluenceLines = [];
  const flyIn = (chart.flying && chart.flying.flyIn) || [];
  for (let i = 0; i < 12; i++) {
    const cell = cellMap[i];
    if (!cell) continue;
    const flyCell = flyIn[i] || {};
    const jis = flyCell['忌'] || [];
    const lus = flyCell['祿'] || [];

    const meetsJi = jis.length >= 2;
    const meetsLu = lus.length >= 2;

    if (meetsJi || meetsLu) {
      const parts = [];
      if (meetsJi) {
        const jiSources = jis.map(x => {
          const fromName = x.from === 'birth' ? '生年' : (cellMap[x.from] ? cellMap[x.from].palaceName : '');
          return `${fromName}${x.star || ''}`;
        }).join('、');
        parts.push(`忌×${jis.length}（${jiSources}）`);
      }
      if (meetsLu) {
        const luSources = lus.map(x => {
          const fromName = x.from === 'birth' ? '生年' : (cellMap[x.from] ? cellMap[x.from].palaceName : '');
          return `${fromName}${x.star || ''}`;
        }).join('、');
        parts.push(`祿×${lus.length}（${luSources}）`);
      }
      confluenceLines.push(`<li><b>${esc(cell.branch)} ${esc(cell.palaceName)}</b>：${esc(parts.join('／'))}</li>`);
    }
  }

  let confluenceHtml = '<h2>四化匯聚</h2>';
  if (confluenceLines.length === 0) {
    confluenceHtml += '<p>無顯著匯聚。</p>';
  } else {
    confluenceHtml += '<ul>' + confluenceLines.join('') + '</ul>';
  }

  // D2. 疊宮大事記 — headline multi-layer overlap events only (severity above 'ovlp0'),
  // the full detail (including lower-severity 三方 notes) still appears per-row in 流年提要.
  const overlapYears = (timeline && timeline.years ? timeline.years : [])
    .filter(item => (item.overlap || []).some(h => h.severity !== 'ovlp0'));
  let overlapHtml = '<h2>疊宮大事記</h2>';
  if (overlapYears.length === 0) {
    overlapHtml += '<p>本命盤在推算範圍內無顯著跨層疊宮事件。</p>';
  } else {
    overlapHtml += '<ul>';
    overlapYears.forEach(item => {
      const headline = (item.overlap || [])
        .filter(h => h.severity !== 'ovlp0')
        .map(h => h.label)
        .join('、');
      overlapHtml += `<li><b>${esc(item.year)} ${esc(item.ganzhi || '')}</b>（虛${esc(item.xuSui)}）：${esc(headline)}</li>`;
    });
    overlapHtml += '</ul>';
  }

  // E. Timeline
  let timelineHtml = '<h2>流年提要</h2>';
  if (!timeline || !timeline.years || timeline.years.length === 0) {
    timelineHtml += '<p>無流年數據。</p>';
  } else {
    timelineHtml += '<table><thead><tr>';
    timelineHtml += '<th style="width: 15%;">年份</th>';
    timelineHtml += '<th style="width: 10%;">虛歲</th>';
    timelineHtml += '<th style="width: 15%;">流命</th>';
    timelineHtml += '<th style="width: 30%;">提示</th>';
    timelineHtml += '<th style="width: 30%;">備註</th>';
    timelineHtml += '</tr></thead><tbody>';

    let currentDecKey = null;
    timeline.years.forEach(item => {
      const dec = item.decadal;
      const decKey = dec ? `${dec.palaceIndex}-${dec.range[0]}-${dec.range[1]}` : 'tong-xian';
      
      if (decKey !== currentDecKey) {
        currentDecKey = decKey;
        const subtext = dec ? `大限 ${dec.range[0]}-${dec.range[1]} ${dec.palaceName || ''}` : '童限';
        timelineHtml += `<tr class="tl-sub"><td colspan="5">${esc(subtext)}</td></tr>`;
      }

      const flowCell = cellMap[item.flowLifeIndex];
      const flowLifeStr = flowCell ? `${flowCell.branch || ''}${flowCell.palaceName || ''}` : '—';
      // 提示: rule-composed from flag templates (chart-agnostic); 備註: personal notes only
      const flagsStr = composeYearText(item, YEAR_TEMPLATES);
      const noteText = (notes && notes.years && notes.years[item.year]) ? notes.years[item.year] : '';

      let rowClass = '';
      if (item.score <= -2) {
        rowClass = ' class="r-bad2"';
      } else if (item.score === -1) {
        rowClass = ' class="r-bad1"';
      } else if (item.score >= 1) {
        rowClass = ' class="r-good"';
      }

      timelineHtml += `<tr${rowClass}>`;
      timelineHtml += `<td>${esc(item.year)} ${esc(item.ganzhi || '')}</td>`;
      timelineHtml += `<td>${esc(item.xuSui)}</td>`;
      timelineHtml += `<td>${esc(flowLifeStr)}</td>`;
      timelineHtml += `<td>${esc(flagsStr)}</td>`;
      timelineHtml += `<td>${esc(noteText)}</td>`;
      timelineHtml += '</tr>';
    });
    timelineHtml += '</tbody></table>';
  }

  // F. Domains
  let domainsHtml = '';
  if (notes && notes.domains && Array.isArray(notes.domains)) {
    domainsHtml += '<h2>分域綜述</h2>';
    notes.domains.forEach(dom => {
      domainsHtml += `<h3>${esc(dom.title)}</h3><p>${esc(dom.text)}</p>`;
    });
  }

  // HTML structure assembly
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <title>紫微斗數命盤研究報告</title>
  <style>
    body {
      max-width: 960px;
      margin: auto;
      padding: 24px;
      font-family: "Microsoft JhengHei", "Noto Sans TC", sans-serif;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.7;
      font-size: 14px;
    }
    h1 {
      text-align: center;
      letter-spacing: .2em;
      margin-bottom: 20px;
    }
    h2 {
      border-bottom: 2px solid #333;
      padding-bottom: 4px;
      margin-top: 2em;
    }
    h3 {
      margin-top: 1.5em;
      margin-bottom: 0.5em;
      color: #2b2b2b;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    th, td {
      border: 1px solid #bbb;
      padding: 6px 10px;
      font-size: 12px;
      text-align: left;
    }
    th {
      background: #f0ede4;
      font-weight: bold;
    }
    .meta-table {
      border: none;
      margin-bottom: 20px;
    }
    .meta-table tr, .meta-table td {
      border: none;
      background: transparent;
      padding: 6px 8px;
      font-size: 13px;
    }
    .meta-table td.label {
      font-weight: bold;
      color: #555;
      width: 15%;
    }
    .meta-table td.value {
      width: 35%;
    }
    .tl-sub td {
      background: #e8e2d0;
      font-weight: bold;
      font-size: 13px;
    }
    .r-bad2 td { background: #fbe3e8; }
    .r-bad1 td { background: #fdf1f3; }
    .r-good td { background: #e9f7ee; }
    ul {
      padding-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    .kb-text { color: #444; font-size: 13px; }
    .kb-src { color: #999; font-size: 11px; margin-left: 4px; }
    footer {
      margin-top: 3em;
      padding-top: 1.5em;
      border-top: 1px solid #999;
      font-size: 12px;
      color: #555;
      text-align: justify;
    }
    @media print {
      body { padding: 0; }
      h2 { page-break-after: avoid; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>紫微斗數命盤研究報告</h1>
  ${metaTableHtml}
  <p style="font-size: 12px; color: #666; margin-top: -10px; margin-bottom: 20px;">（研究／娛樂用途）</p>

  ${patternsHtml}
  ${cellsTableHtml}
  ${kbHtml}
  ${confluenceHtml}
  ${overlapHtml}
  ${timelineHtml}
  ${domainsHtml}

  <footer>
    <p>${esc(DISCLAIMER)}</p>
  </footer>
</body>
</html>`;
}
