'use strict';
/* Knock map style: a clean, soft, Apple Maps–inspired look built on free OpenFreeMap vector tiles
   (OpenMapTiles schema). knockMapStyle(dark, regionUrl) returns a MapLibre style for light or dark mode.
   regionUrl (optional) points at a PMTiles pack of Overture Maps buildings + house numbers, which fills
   in neighborhoods OpenStreetMap hasn't mapped yet. */

const MAP_PALETTE = {
  light: {
    land: '#F3F1EC', commercial: '#F4EEE3', hospital: '#F8E4E3', school: '#F4EFD8', industrial: '#ECE9E4',
    park: '#CFE8C0', wood: '#C4E1B2', sand: '#F1E9D2', water: '#A2D1F5',
    building: '#E7E3DC', buildingTop: '#EAE6DF', buildingEdge: '#D9D4CB',
    roadCase: '#DDD7CD', minor: '#FFFFFF', mid: '#FFFFFF', midCase: '#D5CEC2',
    primary: '#FCE8A9', primaryCase: '#E7CF86', motorway: '#F8C65A', motorwayCase: '#E0A53A',
    path: '#D3CCC0', rail: '#CAC5BC', runway: '#E6E3DD', boundary: '#B9B2C9',
    roadText: '#66625D', text: '#3A3A3C', subtle: '#8E8A84', waterText: '#3D7DB3', parkText: '#4E8A3E',
    number: '#A19C95', halo: '#FFFFFF',
  },
  dark: {
    land: '#1E2023', commercial: '#25272A', hospital: '#38292C', school: '#312F28', industrial: '#2A2B2D',
    park: '#28392B', wood: '#263627', sand: '#302D26', water: '#1B3550',
    building: '#3D4148', buildingTop: '#454950', buildingEdge: '#4E535B',
    roadCase: '#1F2124', minor: '#44474C', mid: '#4F5257', midCase: '#1F2124',
    primary: '#585540', primaryCase: '#2D2C24', motorway: '#7A6337', motorwayCase: '#3F3420',
    path: '#45484C', rail: '#3E4145', runway: '#34363A', boundary: '#5C5670',
    roadText: '#B5B5BA', text: '#E5E5EA', subtle: '#8E8E93', waterText: '#6FA4D2', parkText: '#7FB070',
    number: '#B8B8BE', halo: '#1E2023',
  },
};

function knockMapStyle(dark, regionUrl) {
  const c = dark ? MAP_PALETTE.dark : MAP_PALETTE.light;
  const name = ['coalesce', ['get', 'name:en'], ['get', 'name']];
  const cls = (...v) => ['match', ['get', 'class'], v, true, false];
  const zw = (pairs) => ['interpolate', ['exponential', 1.6], ['zoom'], ...pairs];
  const regular = ['Noto Sans Regular'], bold = ['Noto Sans Bold'], italic = ['Noto Sans Italic'];

  // Road widths [zoom, px] for the fill; casings add a border on top of these.
  const W = {
    motorway: [8, 1.5, 12, 3, 15, 8, 18, 30],
    primary: [8, 0.8, 12, 2.4, 15, 6.5, 18, 24],
    mid: [10, 0.6, 13, 1.6, 15, 4.5, 18, 18],
    minor: [12, 0.4, 14, 1.2, 16, 4, 18, 13],
    service: [14, 0.4, 16, 1.8, 18, 7],
  };
  const casing = (pairs, extra) => pairs.map((v, i) => (i % 2 ? v + extra : v));

  const road = (id, filter, widths, fill, edge, minzoom, edgePx = 1.4) => [
    {
      id: `${id}-case`, type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], filter, ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': edge, 'line-width': zw(casing(widths, edgePx)) },
    },
    {
      id: `${id}-fill`, type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom,
      filter: ['all', ['==', ['geometry-type'], 'LineString'], filter, ['!=', ['get', 'brunnel'], 'tunnel']],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': fill, 'line-width': zw(widths) },
    },
  ];
  const fillLayer = (id, sourceLayer, filter, color, minzoom = 0, opacity = 1) => ({
    id, type: 'fill', source: 'omt', 'source-layer': sourceLayer, minzoom, ...(filter === true ? {} : { filter }),
    paint: { 'fill-color': color, 'fill-opacity': opacity, 'fill-antialias': true },
  });
  const halo = { 'text-halo-color': c.halo, 'text-halo-width': 1.4, 'text-halo-blur': 0.4 };

  const minorRoads = road('road-minor', cls('minor', 'residential', 'living_street', 'unclassified'), W.minor, c.minor, c.roadCase, 12);
  const serviceRoads = road('road-service', cls('service', 'track'), W.service, c.minor, c.roadCase, 14, 1);

  return {
    version: 8,
    name: dark ? 'Knock Dark' : 'Knock Light',
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {
      omt: { type: 'vector', url: 'https://tiles.openfreemap.org/planet' },
      ...(regionUrl ? {
        region: { type: 'vector', url: `pmtiles://${regionUrl}`, attribution: '<a href="https://overturemaps.org">© Overture Maps Foundation</a>' },
      } : {}),
    },
    layers: [
      { id: 'land', type: 'background', paint: { 'background-color': c.land } },

      fillLayer('landuse-commercial', 'landuse', cls('commercial', 'retail'), c.commercial, 12),
      fillLayer('landuse-industrial', 'landuse', cls('industrial', 'railway'), c.industrial, 12),
      fillLayer('landuse-hospital', 'landuse', cls('hospital'), c.hospital, 11),
      fillLayer('landuse-school', 'landuse', cls('school', 'college', 'university', 'kindergarten'), c.school, 11),
      fillLayer('landcover-wood', 'landcover', cls('wood', 'forest'), c.wood, 0, 0.9),
      fillLayer('landcover-grass', 'landcover', cls('grass', 'meadow', 'farmland', 'scrub'), c.park, 0, 0.75),
      fillLayer('landcover-sand', 'landcover', cls('sand', 'beach'), c.sand),
      fillLayer('landuse-park', 'landuse', cls('cemetery', 'stadium', 'pitch', 'playground', 'golf_course', 'recreation_ground'), c.park, 11, 0.85),
      fillLayer('park', 'park', true, c.park, 0, 0.95),

      fillLayer('water', 'water', ['!=', ['get', 'brunnel'], 'tunnel'], c.water),
      {
        id: 'waterway', type: 'line', source: 'omt', 'source-layer': 'waterway',
        filter: cls('river', 'canal', 'stream'),
        paint: { 'line-color': c.water, 'line-width': zw([8, 0.6, 14, 2, 18, 8]) },
      },
      {
        id: 'runway', type: 'line', source: 'omt', 'source-layer': 'aeroway', minzoom: 11,
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': c.runway, 'line-width': zw([11, 2, 15, 18, 18, 60]) },
      },

      {
        // Trails and cycle paths only; sidewalks and crossings are left off like Apple Maps.
        id: 'path', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 15,
        filter: ['all', cls('path', 'cycleway'), ['!', ['match', ['get', 'subclass'], ['footway', 'sidewalk', 'crossing', 'steps', 'pedestrian'], true, false]]],
        paint: { 'line-color': c.path, 'line-width': zw([15, 1, 18, 2.5]), 'line-dasharray': [2, 1.5] },
      },
      ...serviceRoads,
      ...minorRoads,
      ...road('road-mid', cls('secondary', 'tertiary'), W.mid, c.mid, c.midCase, 10),
      ...road('road-primary', cls('primary', 'trunk'), W.primary, c.primary, c.primaryCase, 7),
      ...road('road-motorway', cls('motorway'), W.motorway, c.motorway, c.motorwayCase, 5, 1.6),
      {
        id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 12,
        filter: cls('rail', 'transit'),
        paint: { 'line-color': c.rail, 'line-width': zw([12, 1, 18, 3]) },
      },

      {
        id: 'building', type: 'fill', source: 'omt', 'source-layer': 'building', minzoom: 14,
        paint: {
          'fill-color': c.building,
          'fill-outline-color': c.buildingEdge,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1],
        },
      },
      {
        // Raised buildings, shown only while the map is tilted (toggled from app.js).
        id: 'building-3d', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 14,
        layout: { visibility: 'none' },
        paint: {
          'fill-extrusion-color': ['interpolate', ['linear'], ['zoom'], 15, c.building, 17, c.buildingTop],
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 0.9],
        },
      },
      ...(regionUrl ? [
        {
          id: 'region-building', type: 'fill', source: 'region', 'source-layer': 'buildings', minzoom: 14,
          paint: { 'fill-color': c.building, 'fill-outline-color': c.buildingEdge, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1] },
        },
        {
          id: 'region-building-3d', type: 'fill-extrusion', source: 'region', 'source-layer': 'buildings', minzoom: 14,
          layout: { visibility: 'none' },
          paint: { 'fill-extrusion-color': c.buildingTop, 'fill-extrusion-height': 6, 'fill-extrusion-opacity': 0.9 },
        },
      ] : []),

      {
        id: 'boundary', type: 'line', source: 'omt', 'source-layer': 'boundary',
        filter: ['all', ['<=', ['get', 'admin_level'], 4], ['!=', ['get', 'maritime'], 1]],
        paint: { 'line-color': c.boundary, 'line-width': zw([3, 0.6, 10, 1.6]), 'line-dasharray': [3, 2] },
      },

      // ---- labels (overlays are inserted just below this point)
      {
        id: 'label-water', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: { 'text-field': name, 'text-font': italic, 'text-size': 13, 'text-max-width': 7 },
        paint: { 'text-color': c.waterText, ...halo },
      },
      {
        id: 'label-waterway', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        filter: ['==', ['geometry-type'], 'LineString'],
        layout: { 'text-field': name, 'text-font': italic, 'text-size': 12, 'symbol-placement': 'line' },
        paint: { 'text-color': c.waterText, ...halo },
      },
      {
        id: 'label-park', type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 14,
        layout: { 'text-field': name, 'text-font': regular, 'text-size': 12, 'text-max-width': 8 },
        paint: { 'text-color': c.parkText, ...halo },
      },
      {
        id: 'label-road', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 13,
        filter: ['!', cls('path', 'footway', 'cycleway', 'track', 'service')],
        layout: {
          'symbol-placement': 'line', 'text-field': name, 'text-font': regular,
          'text-size': ['interpolate', ['linear'], ['zoom'], 13, 10, 17, 13, 19, 15],
          'text-max-angle': 30, 'text-padding': 4,
        },
        paint: { 'text-color': c.roadText, ...halo },
      },
      ...(regionUrl ? [{
        id: 'label-region-number', type: 'symbol', source: 'region', 'source-layer': 'addresses', minzoom: 16,
        layout: {
          'text-field': ['to-string', ['get', 'number']], 'text-font': regular, 'text-padding': 2,
          'text-size': ['interpolate', ['linear'], ['zoom'], 16, 10, 18, 12],
        },
        paint: { 'text-color': c.number, 'text-halo-color': c.halo, 'text-halo-width': 1 },
      }] : []),
      {
        id: 'label-housenumber', type: 'symbol', source: 'omt', 'source-layer': 'housenumber', minzoom: 16,
        layout: {
          'text-field': ['get', 'housenumber'], 'text-font': regular, 'text-padding': 2,
          'text-size': ['interpolate', ['linear'], ['zoom'], 16, 10, 18, 12],
        },
        paint: { 'text-color': c.number, 'text-halo-color': c.halo, 'text-halo-width': 1 },
      },
      {
        id: 'label-neighbourhood', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 12, maxzoom: 17,
        filter: cls('neighbourhood', 'suburb', 'quarter', 'hamlet'),
        layout: { 'text-field': ['upcase', name], 'text-font': bold, 'text-size': 11, 'text-letter-spacing': 0.12, 'text-max-width': 7 },
        paint: { 'text-color': c.subtle, ...halo },
      },
      {
        id: 'label-town', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 8, maxzoom: 16,
        filter: cls('town', 'village'),
        layout: { 'text-field': name, 'text-font': bold, 'text-size': ['interpolate', ['linear'], ['zoom'], 9, 12, 14, 16], 'text-max-width': 8 },
        paint: { 'text-color': c.text, ...halo },
      },
      {
        id: 'label-city', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 14,
        filter: cls('city'),
        layout: { 'text-field': name, 'text-font': bold, 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 13, 12, 20], 'text-max-width': 8 },
        paint: { 'text-color': c.text, ...halo },
      },
      {
        id: 'label-state', type: 'symbol', source: 'omt', 'source-layer': 'place', maxzoom: 7,
        filter: cls('state', 'country'),
        layout: { 'text-field': ['upcase', name], 'text-font': bold, 'text-size': 12, 'text-letter-spacing': 0.15 },
        paint: { 'text-color': c.subtle, ...halo },
      },
    ],
  };
}
