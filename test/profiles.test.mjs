// Tests for src/profiles.js — localStorage-backed saved charts (storage injected).
import assert from 'node:assert/strict';
import { loadProfiles, saveProfile, deleteProfile } from '../src/profiles.js';

let passed = 0;
function ok(name, fn) { fn(); passed++; console.log('[PASS]', name); }

function stubStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

const P = { name: '本人', solarDate: '1995-11-17', timeIndex: 7, gender: '男' };

ok('empty storage loads as []', () => {
  assert.deepEqual(loadProfiles(stubStorage()), []);
});

ok('save + load round-trip; upsert replaces same name', () => {
  const s = stubStorage();
  saveProfile(s, P);
  saveProfile(s, { name: '媽媽', solarDate: '1968-03-02', timeIndex: 4, gender: '女' });
  assert.equal(loadProfiles(s).length, 2);
  saveProfile(s, { ...P, timeIndex: 8 }); // upsert
  const list = loadProfiles(s);
  assert.equal(list.length, 2);
  assert.equal(list.find(p => p.name === '本人').timeIndex, 8);
});

ok('delete removes only the named profile', () => {
  const s = stubStorage();
  saveProfile(s, P);
  saveProfile(s, { name: '媽媽', solarDate: '1968-03-02', timeIndex: 4, gender: '女' });
  const after = deleteProfile(s, '本人');
  assert.equal(after.length, 1);
  assert.equal(after[0].name, '媽媽');
});

ok('invalid input throws; corrupted storage loads as []', () => {
  const s = stubStorage();
  assert.throws(() => saveProfile(s, { ...P, name: '  ' }), /name/);
  assert.throws(() => saveProfile(s, { ...P, solarDate: '95-1-1' }), /solarDate/);
  assert.throws(() => saveProfile(s, { ...P, timeIndex: 99 }), /timeIndex/);
  assert.throws(() => saveProfile(s, { ...P, gender: 'M' }), /gender/);
  const bad = stubStorage();
  bad.setItem('ziwei-profiles-v1', '{not json');
  assert.deepEqual(loadProfiles(bad), []);
  bad.setItem('ziwei-profiles-v1', JSON.stringify([{ name: 'x' }, P, 42]));
  assert.deepEqual(loadProfiles(bad), [P]); // malformed entries filtered out
});

console.log(`\nAll ${passed} profiles test groups passed.`);
