#!/usr/bin/env node
// Validate data/experiences.geojson (static "places to go" layer).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const FILE = join(HERE, '..', 'data', 'experiences.geojson');
const KINDS = new Set(['paraglide','canyon','zipline','rafting','bike','cablecar',
  'bath','waterpark','zoo','aquarium','horse','golf','marina']);
const errors = [];
const warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);
const nonEmpty = v => typeof v === 'string' && v.trim() !== '';
const inGeorgia = (lon, lat) => lon >= 39 && lon <= 47.5 && lat >= 40.5 && lat <= 44;

let data;
try { data = JSON.parse(readFileSync(FILE, 'utf8')); }
catch (e) { console.error('FAIL: cannot read/parse', FILE, e.message); process.exit(1); }
if (!data || data.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
  console.error('FAIL: expected FeatureCollection with features[]'); process.exit(1);
}

const ids = new Set();
const names = new Map();
for (const [i, f] of data.features.entries()) {
  const w = `[${i}]`;
  if (!f || f.type !== 'Feature') { err(`${w}: not a Feature`); continue; }
  const g = f.geometry || {};
  if (g.type !== 'Point' || !Array.isArray(g.coordinates) || g.coordinates.length < 2) {
    err(`${w}: geometry must be Point`);
  } else {
    const [lon, lat] = g.coordinates;
    if (typeof lon !== 'number' || typeof lat !== 'number' || !inGeorgia(lon, lat)) {
      err(`${w}: coordinates outside Georgia / not numeric`);
    }
  }
  const p = f.properties || {};
  if (!KINDS.has(p.kind)) err(`${w}: unknown kind ${JSON.stringify(p.kind)}`);
  for (const k of ['name_ru','name_en','name_ka','addr_ru','desc_ru','desc_src',
                   'note_en','note_ka','desc_en','desc_ka','addr_en','addr_ka']) {
    if (!nonEmpty(p[k])) err(`${w}: missing ${k}`);
  }
  // i18n: en-поля не должны содержать кириллицу, ka-поля — должны быть на грузинской письменности.
  const CYR = /[\u0400-\u04FF]/;
  const GEO = /[\u10A0-\u10FF\u2D00-\u2D2F]/;
  for (const k of ['note_en','desc_en','addr_en','fee_en','name_en']) {
    if (nonEmpty(p[k]) && CYR.test(p[k])) err(`${w}: cyrillic in ${k}`);
  }
  for (const k of ['note_ka','desc_ka','addr_ka','fee_ka','name_ka']) {
    if (nonEmpty(p[k]) && !GEO.test(p[k])) err(`${w}: ${k} has no Georgian script`);
    if (nonEmpty(p[k]) && CYR.test(p[k])) err(`${w}: cyrillic in ${k}`);
  }
  if (p.minzoom != null && (typeof p.minzoom !== 'number' || p.minzoom < 0 || p.minzoom > 22)) {
    err(`${w}: minzoom must be 0..22`);
  }
  if (p.approx != null && typeof p.approx !== 'boolean') err(`${w}: approx must be boolean`);
  if (p.desc_scope != null && !['place','venue'].includes(p.desc_scope)) {
    err(`${w}: desc_scope must be place|venue`);
  }
  if (p.name_en) {
    const k = String(p.name_en).trim().toLowerCase();
    if (names.has(k)) warn(`${w}: duplicate name_en ${p.name_en} (also ${names.get(k)})`);
    else names.set(k, w);
  }
  const id = p.uid || `${p.kind}|${p.name_en}|${p.addr_ru}`;
  if (ids.has(id)) warn(`${w}: duplicate feature key ${id}`);
  ids.add(id);
}

const kinds = {};
for (const f of data.features) kinds[f.properties.kind] = (kinds[f.properties.kind] || 0) + 1;
console.log('EXPERIENCES VALIDATION');
console.log('features:', data.features.length, 'kinds:', JSON.stringify(kinds));
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log('  ! ' + w);
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  for (const e of errors) console.log('  x ' + e);
  console.log('\nRESULT: FAIL');
  process.exit(1);
}
console.log('\nRESULT: PASS');
