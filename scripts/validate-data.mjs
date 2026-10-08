#!/usr/bin/env node
// AMG Stage 0 data validator. Dependency-free ESM.
// Usage: node scripts/validate-data.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..', 'data');

const errors = [];
const warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);

const LANGS = ['ru', 'en', 'ka'];
const ID_RE = {
  site: /^site-\d{4,}$/,
  amg: /^amg-\d{4,}$/,
  artist: /^artist-\d{4,}$/,
  src: /^src-\d{4,}$/,
};
const ENUM = {
  artworkType: ['mural', 'street_art', 'mosaic', 'monument', 'sculpture', 'installation', 'architectural_art', 'monumental_art', 'artifact', 'other'],
  status: ['active', 'removed', 'damaged', 'replaced', 'uncertain'],
  precision: ['exact', 'building', 'street', 'approximate'],
  access: ['public', 'courtyard', 'restricted', 'private', 'ticket_required', 'permission_required'],
  origin: ['manual', 'osm', 'commons', 'partner'],
  sourceType: ['official', 'artist', 'festival', 'wiki', 'media', 'map', 'catalog', 'other'],
  // Public-source roles. Existing roles kept for backward compatibility; new roles are additive.
  siteRole: ['location', 'identity', 'description', 'object_page', 'festival', 'museum', 'tourism', 'catalog', 'coordinates'],
  artworkRole: ['identity', 'location', 'artist', 'year', 'photo', 'description', 'object_page', 'festival', 'museum', 'tourism', 'catalog', 'coordinates'],
  artistType: ['person', 'collective'],
  mediaRole: ['photo', 'portrait', 'detail', 'panorama'],
  mediaDepicts: ['site', 'artwork'],
};
// Reusable-media license allowlist (Wikimedia Commons scope).
const LICENSE_ALLOW = ['CC0', 'Public domain', 'CC BY 2.0', 'CC BY 3.0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0', 'CC BY-SA 4.0'];
// Plausibility window for Georgia data; also catches swapped [lat,lng].
const GEO = { minLng: 39.0, maxLng: 47.5, minLat: 40.5, maxLat: 44.0 };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNonEmptyStr = v => typeof v === 'string' && v.trim() !== '';

function loadJSON(name) {
  try {
    return JSON.parse(readFileSync(join(DATA, name), 'utf8'));
  } catch (e) {
    err(`[${name}] cannot read/parse JSON: ${e.message}`);
    return null;
  }
}

function checkId(id, kind, where) {
  if (typeof id !== 'string') { err(`${where}: id must be a string`); return false; }
  if (!ID_RE[kind].test(id)) { err(`${where}: invalid id "${id}" (expected ${kind}-NNNN)`); return false; }
  return true;
}

function checkEnum(value, list, where) {
  if (!list.includes(value)) err(`${where}: invalid value ${JSON.stringify(value)}; allowed: ${list.join(', ')}`);
}

function checkLocalized(value, where, required) {
  if (value === undefined || value === null) {
    if (required) err(`${where}: required localized field is missing`);
    return;
  }
  if (!isObj(value)) { err(`${where}: must be an object {ru,en,ka}`); return; }
  for (const k of Object.keys(value)) {
    if (!LANGS.includes(k)) err(`${where}: unknown language key "${k}"`);
    else if (typeof value[k] !== 'string') err(`${where}.${k}: must be a string`);
  }
  if (required && !Object.values(value).some(isNonEmptyStr)) {
    err(`${where}: required field needs at least one non-empty language`);
  }
}

function checkUpdated(value, where) {
  if (!isNonEmptyStr(value) || !DATE_RE.test(value)) err(`${where}: "updated" must be YYYY-MM-DD`);
}

function checkRefSources(sources, allowedRoles, sourceIds, where) {
  if (!Array.isArray(sources)) { err(`${where}.sources: must be an array`); return; }
  const seen = new Set();
  sources.forEach((s, i) => {
    const w = `${where}.sources[${i}]`;
    if (!isObj(s)) { err(`${w}: must be an object {id,role}`); return; }
    if (typeof s.id !== 'string' || !ID_RE.src.test(s.id)) err(`${w}: invalid source id ${JSON.stringify(s.id)}`);
    else if (!sourceIds.has(s.id)) err(`${w}: source "${s.id}" not found in sources.json`);
    checkEnum(s.role, allowedRoles, `${w}.role`);
    const pair = s.id + '|' + s.role;
    if (seen.has(pair)) warn(`${w}: duplicate source/role pair ${s.id}/${s.role}`);
    seen.add(pair);
  });
}

function checkUrl(value, where, required) {
  if (value === undefined || value === null) {
    if (required) err(`${where}: required URL missing`);
    return;
  }
  if (!isNonEmptyStr(value)) { err(`${where}: must be a non-empty URL string`); return; }
  try {
    const u = new URL(value);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') err(`${where}: URL must use http(s)`);
  } catch { err(`${where}: invalid URL ${JSON.stringify(value)}`); }
}

// Optional media[] on SITE properties and ARTWORK objects.
// Media may be absent, may contain several items, and must not require "photo".
function checkMedia(media, sourceIds, where) {
  if (media === undefined) return;
  if (!Array.isArray(media)) { err(`${where}.media: must be an array`); return; }
  media.forEach((m, i) => {
    const w = `${where}.media[${i}]`;
    if (!isObj(m)) { err(`${w}: must be an object`); return; }
    if (typeof m.source_id !== 'string' || !ID_RE.src.test(m.source_id)) err(`${w}.source_id: invalid source id ${JSON.stringify(m.source_id)}`);
    else if (!sourceIds.has(m.source_id)) err(`${w}.source_id: "${m.source_id}" not found in sources.json`);
    checkEnum(m.role, ENUM.mediaRole, `${w}.role`);
    checkEnum(m.depicts, ENUM.mediaDepicts, `${w}.depicts`);
    checkUrl(m.url, `${w}.url`, true);
    checkUrl(m.direct_url, `${w}.direct_url`, false);
    checkUrl(m.license_url, `${w}.license_url`, false);
    if (m.author !== undefined && !isNonEmptyStr(m.author)) err(`${w}.author: must be a non-empty string`);
    if (m.credit !== undefined && !isNonEmptyStr(m.credit)) err(`${w}.credit: must be a non-empty string`);
    if (m.captured_at !== undefined && !isNonEmptyStr(m.captured_at)) err(`${w}.captured_at: must be a non-empty string`);
    if (m.license !== undefined) {
      if (!isNonEmptyStr(m.license)) err(`${w}.license: must be a non-empty string`);
      else if (!LICENSE_ALLOW.includes(m.license)) err(`${w}.license: ${JSON.stringify(m.license)} not in allowlist: ${LICENSE_ALLOW.join(', ')}`);
    }
    if (m.attribution_required !== undefined && typeof m.attribution_required !== 'boolean') err(`${w}.attribution_required: must be a boolean`);
  });
}

const cities = loadJSON('cities.json');
const sources = loadJSON('sources.json');
const artists = loadJSON('artists.json');
const sites = loadJSON('sites.geojson');
const artworks = loadJSON('artworks.json');

const sourceIds = new Set();
const artistIds = new Set();
const siteIds = new Set();
const artworkIds = new Set();
const allIds = new Set();
function trackUnique(id, where) {
  if (allIds.has(id)) err(`${where}: duplicate id "${id}"`);
  allIds.add(id);
}

// --- cities.json ---
if (cities !== null) {
  if (!isObj(cities)) err('[cities.json] must be an object keyed by city code');
  else for (const [code, val] of Object.entries(cities)) {
    if (!/^[a-z][a-z0-9_-]*$/.test(code)) err(`[cities.json] bad city code "${code}"`);
    if (!isObj(val)) { err(`[cities.json] "${code}" must be an object {ru,en,ka}`); continue; }
    checkLocalized(val, `[cities.json] ${code}`, true);
  }
}

// --- sources.json ---
if (Array.isArray(sources)) {
  sources.forEach((s, i) => {
    const w = `[sources.json][${i}]`;
    if (!isObj(s)) { err(`${w}: must be an object`); return; }
    if (checkId(s.id, 'src', w)) { trackUnique(s.id, w); sourceIds.add(s.id); }
    checkEnum(s.type, ENUM.sourceType, `${w}.type`);
    if (!isNonEmptyStr(s.title)) err(`${w}.title: required non-empty string`);
    if (!isNonEmptyStr(s.url)) err(`${w}.url: required non-empty string`);
    checkUpdated(s.updated, w);
  });
} else if (sources !== null) err('[sources.json] must be an array');

// --- artists.json ---
if (Array.isArray(artists)) {
  artists.forEach((a, i) => {
    const w = `[artists.json][${i}]`;
    if (!isObj(a)) { err(`${w}: must be an object`); return; }
    if (checkId(a.id, 'artist', w)) { trackUnique(a.id, w); artistIds.add(a.id); }
    if (!isNonEmptyStr(a.name)) err(`${w}.name: required non-empty string`);
    if (a.aliases !== undefined && (!Array.isArray(a.aliases) || !a.aliases.every(isNonEmptyStr))) {
      err(`${w}.aliases: must be an array of non-empty strings`);
    }
    if (a.type !== undefined) checkEnum(a.type, ENUM.artistType, `${w}.type`);
    checkEnum(a.origin, ENUM.origin, `${w}.origin`);
    checkUpdated(a.updated, w);
  });
} else if (artists !== null) err('[artists.json] must be an array');

// --- sites.geojson ---
if (sites !== null) {
  if (!isObj(sites) || sites.type !== 'FeatureCollection' || !Array.isArray(sites.features)) {
    err('[sites.geojson] must be a GeoJSON FeatureCollection with a features array');
  } else sites.features.forEach((f, i) => {
    const w = `[sites.geojson].features[${i}]`;
    if (!isObj(f) || f.type !== 'Feature') { err(`${w}: must be a GeoJSON Feature`); return; }
    const g = f.geometry;
    if (!isObj(g) || g.type !== 'Point') err(`${w}.geometry: must be a Point`);
    else if (!Array.isArray(g.coordinates) || g.coordinates.length !== 2 || !g.coordinates.every(n => typeof n === 'number' && Number.isFinite(n))) {
      err(`${w}.geometry.coordinates: must be [lng, lat] with two finite numbers`);
    } else {
      const [lng, lat] = g.coordinates;
      if (lng < -180 || lng > 180) err(`${w}: longitude out of range`);
      if (lat < -90 || lat > 90) err(`${w}: latitude out of range`);
      if (lng < GEO.minLng || lng > GEO.maxLng || lat < GEO.minLat || lat > GEO.maxLat) {
        err(`${w}: coordinates ${JSON.stringify(g.coordinates)} outside Georgia window; expected [lng,lat]`);
      }
    }
    const p = f.properties;
    if (!isObj(p)) { err(`${w}.properties: must be an object`); return; }
    if (checkId(p.id, 'site', `${w}.properties`)) { trackUnique(p.id, w); siteIds.add(p.id); }
    if (!isNonEmptyStr(p.city)) err(`${w}.properties.city: required`);
    else if (isObj(cities) && !(p.city in cities)) err(`${w}.properties.city: "${p.city}" not present in cities.json`);
    checkLocalized(p.name, `${w}.properties.name`, false);
    checkLocalized(p.address, `${w}.properties.address`, true);
    checkEnum(p.precision, ENUM.precision, `${w}.properties.precision`);
    checkEnum(p.access, ENUM.access, `${w}.properties.access`);
    if (typeof p.visible_from_outside !== 'boolean') err(`${w}.properties.visible_from_outside: required boolean`);
    if (p.visibility_radius_m !== undefined && (typeof p.visibility_radius_m !== 'number' || !(p.visibility_radius_m > 0))) {
      err(`${w}.properties.visibility_radius_m: must be a positive number`);
    }
    checkLocalized(p.access_note, `${w}.properties.access_note`, false);
    checkEnum(p.origin, ENUM.origin, `${w}.properties.origin`);
    checkUpdated(p.updated, `${w}.properties`);
    checkRefSources(p.sources, ENUM.siteRole, sourceIds, `${w}.properties`);
    checkMedia(p.media, sourceIds, `${w}.properties`);
  });
}

// --- artworks.json ---
if (Array.isArray(artworks)) {
  artworks.forEach((a, i) => {
    const w = `[artworks.json][${i}]`;
    if (!isObj(a)) { err(`${w}: must be an object`); return; }
    if (checkId(a.id, 'amg', w)) { trackUnique(a.id, w); artworkIds.add(a.id); }
    if (typeof a.site_id !== 'string' || !ID_RE.site.test(a.site_id)) err(`${w}.site_id: invalid or missing site id`);
    checkEnum(a.type, ENUM.artworkType, `${w}.type`);
    checkLocalized(a.title, `${w}.title`, false);
    if (!Array.isArray(a.artist_ids)) err(`${w}.artist_ids: must be an array`);
    else a.artist_ids.forEach((id, j) => {
      if (typeof id !== 'string' || !ID_RE.artist.test(id)) err(`${w}.artist_ids[${j}]: invalid artist id ${JSON.stringify(id)}`);
    });
    if (!(a.year === null || (Number.isInteger(a.year) && a.year >= 0))) err(`${w}.year: must be an integer or null`);
    checkEnum(a.status, ENUM.status, `${w}.status`);
    if (!(a.replaced_by === null || (typeof a.replaced_by === 'string' && ID_RE.amg.test(a.replaced_by)))) {
      err(`${w}.replaced_by: must be an artwork id or null`);
    }
    checkLocalized(a.description, `${w}.description`, false);
    checkRefSources(a.sources, ENUM.artworkRole, sourceIds, w);
    checkMedia(a.media, sourceIds, w);
    if (a.photos !== undefined) warn(`${w}.photos is deprecated; use media[] instead`);
    checkEnum(a.origin, ENUM.origin, `${w}.origin`);
    checkUpdated(a.updated, w);
  });
} else if (artworks !== null) err('[artworks.json] must be an array');

// --- cross-file references ---
if (Array.isArray(artworks)) {
  artworks.forEach((a, i) => {
    if (!isObj(a)) return;
    const w = `[artworks.json][${i}]`;
    if (typeof a.site_id === 'string' && !siteIds.has(a.site_id)) err(`${w}.site_id: "${a.site_id}" not found in sites.geojson`);
    if (Array.isArray(a.artist_ids)) a.artist_ids.forEach(id => {
      if (typeof id === 'string' && !artistIds.has(id)) err(`${w}.artist_ids: "${id}" not found in artists.json`);
    });
    if (typeof a.replaced_by === 'string' && ID_RE.amg.test(a.replaced_by)) {
      if (!artworkIds.has(a.replaced_by)) {
        err(`${w}.replaced_by: "${a.replaced_by}" not found in artworks.json`);
      } else {
        const target = artworks.find(x => isObj(x) && x.id === a.replaced_by);
        if (target && target.site_id !== a.site_id) err(`${w}.replaced_by: replacement must share the same site_id`);
        if (a.status !== 'replaced') warn(`${w}: has replaced_by but status is "${a.status}" (expected "replaced")`);
      }
    }
  });
}

// --- report ---
const counts = {
  sites: isObj(sites) && Array.isArray(sites.features) ? sites.features.length : 0,
  artworks: Array.isArray(artworks) ? artworks.length : 0,
  artists: Array.isArray(artists) ? artists.length : 0,
  sources: Array.isArray(sources) ? sources.length : 0,
  cities: isObj(cities) ? Object.keys(cities).length : 0,
};
console.log('STAGE 0 DATA VALIDATION');
console.log('files: sites.geojson, artworks.json, artists.json, sources.json, cities.json');
console.log('counts:', JSON.stringify(counts));
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}):`);
  for (const x of warnings) console.log('  ! ' + x);
}
if (errors.length) {
  console.log(`\nERRORS (${errors.length}):`);
  for (const x of errors) console.log('  x ' + x);
  console.log('\nRESULT: FAIL');
  process.exit(1);
}
console.log('\nRESULT: PASS');
