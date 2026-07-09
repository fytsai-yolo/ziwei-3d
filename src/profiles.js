// Saved chart profiles (birth data only) in localStorage. Pure functions over an
// injected Storage-like object so tests can pass a plain stub.
const KEY = 'ziwei-profiles-v1';

/** @returns {Array<{name:string, solarDate:string, timeIndex:number, gender:string}>} */
export function loadProfiles(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(p => p && typeof p.name === 'string' && p.name
      && typeof p.solarDate === 'string' && Number.isInteger(p.timeIndex)
      && (p.gender === '男' || p.gender === '女'));
  } catch {
    return [];
  }
}

/** Upserts by name (trimmed). Returns the updated list. Throws on invalid input. */
export function saveProfile(storage, profile) {
  const name = (profile.name || '').trim();
  if (!name) throw new Error('profile name is required');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.solarDate || '')) throw new Error('invalid solarDate');
  if (!Number.isInteger(profile.timeIndex) || profile.timeIndex < 0 || profile.timeIndex > 12) {
    throw new Error('invalid timeIndex');
  }
  if (profile.gender !== '男' && profile.gender !== '女') throw new Error('invalid gender');
  const list = loadProfiles(storage).filter(p => p.name !== name);
  list.push({ name, solarDate: profile.solarDate, timeIndex: profile.timeIndex, gender: profile.gender });
  list.sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'));
  storage.setItem(KEY, JSON.stringify(list));
  return list;
}

/** Removes by name. Returns the updated list. */
export function deleteProfile(storage, name) {
  const list = loadProfiles(storage).filter(p => p.name !== name);
  storage.setItem(KEY, JSON.stringify(list));
  return list;
}
