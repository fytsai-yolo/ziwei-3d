// Cross-check iztro output against the user's 文墨天機 reference chart.
// Birth: solar 1995-11-17, 未時 (timeIndex 7), male. True solar time 13:26 is still 未時.
import { buildChartData } from '../src/astro-service.js';

const data = buildChartData({
  solarDate: '1995-11-17', timeIndex: 7, gender: '男', targetDate: '2026-7-7 12:00',
});

console.log('meta:', JSON.stringify(data.meta, null, 2));
const natal = data.layers[0];
for (const c of natal.cells) {
  console.log(
    `${c.stem}${c.branch} ${c.palaceName}${c.isLifePalace ? '[命]' : ''}${c.isBodyPalace ? '[身]' : ''}`,
    '| major:', c.majorStars.map(s => `${s.name}[${s.brightness}]${s.mutagen ? '(' + s.mutagen + ')' : ''}`).join(' '),
    '| minor:', c.minorStars.map(s => s.name).join(' '),
    '| adj:', c.adjectiveStars.join(' '),
    '| 大限:', c.decadalRange.join('~'),
  );
}
