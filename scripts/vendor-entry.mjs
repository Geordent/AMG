// Точка входа для сборки vendor/map-bundle.js.
// Здесь перечислено РОВНО то, что нужно сайту: бандлер выкинет остальное (tree-shaking).
import maplibregl from 'maplibre-gl';
import { PMTiles } from 'pmtiles';
import { layers, namedFlavor } from '@protomaps/basemaps';

export { maplibregl, PMTiles, layers, namedFlavor };
