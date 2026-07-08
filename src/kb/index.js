// Aggregates all knowledge-base content modules into one entry list.
// Content is Gemini-generated in reviewed batches; every entry carries a provenance
// `source` label ('古籍' | '現代通行' | 'AI生成待核') — displayed in the UI so readers
// can tell classical canon from modern convention from unreviewed generation.
import { STAR_PALACE_A } from './star-palace-a.js';
import { STAR_PALACE_B } from './star-palace-b.js';
import { STAR_PALACE_C } from './star-palace-c.js';
import { STAR_PALACE_D } from './star-palace-d.js';
import { SIHUA } from './sihua.js';
import { SIHUA_PALACE } from './sihua-palace.js';
import { PATTERNS } from './patterns.js';
import { CLASSICS } from './classics.js';
import { AUX_PALACE_A } from './aux-palace-a.js';
import { AUX_PALACE_B } from './aux-palace-b.js';
import { SHA_PALACE } from './sha-palace.js';
import { KONGJIE_PALACE } from './kongjie-palace.js';
import { DUO_STARS } from './duo-stars.js';
import { BRIGHTNESS } from './brightness.js';

export { YEAR_TEMPLATES } from './year-templates.js';

export const KB_ENTRIES = [
  ...STAR_PALACE_A,
  ...STAR_PALACE_B,
  ...STAR_PALACE_C,
  ...STAR_PALACE_D,
  ...AUX_PALACE_A,
  ...AUX_PALACE_B,
  ...SHA_PALACE,
  ...KONGJIE_PALACE,
  ...DUO_STARS,
  ...BRIGHTNESS,
  ...SIHUA,
  ...SIHUA_PALACE,
  ...PATTERNS,
  ...CLASSICS,
];
