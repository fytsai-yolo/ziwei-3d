// Probe iztro's real runtime structure to base specs on facts.
const { astro } = require('iztro');

// Sample chart: 2000-08-16, 時辰 index 2 (寅時), female, zh-TW
const astrolabe = astro.bySolar('2000-8-16', 2, '女', true, 'zh-TW');

console.log('=== astrolabe top-level keys ===');
console.log(Object.keys(astrolabe));

console.log('\n=== astrolabe scalar fields ===');
const scalars = {};
for (const k of Object.keys(astrolabe)) {
  const v = astrolabe[k];
  if (typeof v !== 'object' || v === null) scalars[k] = v;
}
console.log(JSON.stringify(scalars, null, 2));

console.log('\n=== palaces[0] full ===');
console.log(JSON.stringify(astrolabe.palaces[0], null, 2));

console.log('\n=== palaces order (index: name / branch / stem) ===');
astrolabe.palaces.forEach((p, i) => {
  console.log(
    i,
    p.name,
    p.earthlyBranch,
    p.heavenlyStem,
    'body:' + p.isBodyPalace,
    'majors:' + p.majorStars.map((s) => s.name + (s.mutagen ? '(' + s.mutagen + ')' : '')).join(','),
  );
});

console.log('\n=== horoscope for 2025-7-7 12:30 ===');
const h = astrolabe.horoscope('2025-7-7 12:30');
console.log('horoscope keys:', Object.keys(h));

for (const scope of ['decadal', 'yearly', 'monthly', 'daily', 'hourly']) {
  const s = h[scope];
  if (!s) { console.log(scope, ': MISSING'); continue; }
  console.log('\n--- ' + scope + ' ---');
  console.log('keys:', Object.keys(s));
  console.log('index:', s.index, 'heavenlyStem:', s.heavenlyStem, 'earthlyBranch:', s.earthlyBranch);
  console.log('name:', s.name);
  console.log('palaceNames:', JSON.stringify(s.palaceNames));
  console.log('mutagen:', JSON.stringify(s.mutagen));
  if (s.stars) {
    console.log('stars (per palace):', JSON.stringify(s.stars.map((arr) => arr.map((x) => x.name + '/' + x.type))));
  } else {
    console.log('stars: none');
  }
  if (s.yearlyDecStar) console.log('yearlyDecStar keys:', Object.keys(s.yearlyDecStar));
}

console.log('\n=== decadal ranges per palace ===');
astrolabe.palaces.forEach((p, i) => console.log(i, p.name, JSON.stringify(p.decadal), 'ages:', JSON.stringify(p.ages)));
