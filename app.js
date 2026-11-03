'use strict';
/* Knock – web version. Mirrors the iOS app: Map, Customers, Planner, Pipeline, Team.
   All data lives in this browser (localStorage). Use Settings → Export backup regularly. */

/* ---------------------------------------------------------------- utilities */

const $ = (s, r = document) => r.querySelector(s);
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nowISO = () => new Date().toISOString();
const pad = (n) => String(n).padStart(2, '0');
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));

const moneyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const money = (v) => moneyFmt.format(v || 0);
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

function ago(iso) {
  const s = (new Date(iso) - Date.now()) / 1000;
  const a = Math.abs(s);
  if (a < 60) return rtf.format(Math.round(s), 'second');
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 604800) return rtf.format(Math.round(s / 86400), 'day');
  return rtf.format(Math.round(s / 604800), 'week');
}
const fmtTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const fmtDay = (iso) => new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
const fmtDayTime = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const dayKey = (d) => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const keyToDate = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const toLocalInput = (iso) => { const d = new Date(iso); return `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`; };

/* ---------------------------------------------------------------- icons */

const ICON = {
  house: '<path fill="currentColor" stroke="none" d="M12 3 2.5 11.2h2.8V21h5.2v-6h3v6h5.2v-9.8h2.8z"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  back: '<path d="M9 15 4 10l5-5"/><path d="M4 10h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  star: '<path fill="currentColor" stroke="none" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  dollar: '<path d="M12 2.5v19M16.5 6.5c-.9-1.4-2.5-2-4.5-2-2.8 0-4.5 1.3-4.5 3.3 0 4.9 9.5 2.4 9.5 7.6 0 2.1-1.9 3.6-4.8 3.6-2.4 0-4.2-.8-5.2-2.4"/>',
  no: '<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  question: '<path d="M9 9.2a3 3 0 1 1 4.3 2.7c-.8.4-1.3 1.1-1.3 2v.6"/><path d="M12 18.2v.3"/>',
  bolt: '<path fill="currentColor" stroke="none" d="M13.5 2 4.5 13.5h6.5L10 22l9.5-12H13z"/>',
  flame: '<path fill="currentColor" stroke="none" d="M12 2.5c.8 3.6 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.5-4.4 2.6-5.4.1 1.8.9 2.9 2 3.2-.3-3.1.2-6.1.9-8.8z"/>',
  phone: '<path fill="currentColor" stroke="none" d="M6.6 3h3l1.8 4.6-2.2 1.5a11.5 11.5 0 0 0 5.7 5.7l1.5-2.2L21 14.4v3a2.6 2.6 0 0 1-2.8 2.6C10 19.5 4.5 14 4 5.8A2.6 2.6 0 0 1 6.6 3z"/>',
  mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  message: '<path d="M4 5h16v11H9.5L5 20v-4H4z"/>',
  person: '<circle fill="currentColor" stroke="none" cx="12" cy="8" r="4"/><path fill="currentColor" stroke="none" d="M4 20.5a8 8 0 0 1 16 0z"/>',
  lock: '<rect fill="currentColor" stroke="none" x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  // interface
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.8"/><path d="M16 14.2a5 5 0 0 1 5.5 5"/>',
  columns: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="9.5" y="4" width="5" height="11" rx="1.5"/><rect x="16" y="4" width="5" height="7" rx="1.5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8 20.5h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chev: '<path d="m9 5 7 7-7 7"/>',
  left: '<path d="m15 5-7 7 7 7"/>',
  dots: '<circle fill="currentColor" stroke="none" cx="5" cy="12" r="2"/><circle fill="currentColor" stroke="none" cx="12" cy="12" r="2"/><circle fill="currentColor" stroke="none" cx="19" cy="12" r="2"/>',
  locate: '<path fill="currentColor" stroke="none" d="M21 3 3 10.5l7.2 2.3L12.5 20z"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  pin: '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  pencil: '<path d="M4 20l4.5-1 10.5-10.5-3.5-3.5L5 15.5z"/>',
  square: '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/>',
  expand: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  wand: '<path d="m4 20 11-11M14 4v3M19 9h-3M17.5 5.5l-2 2M11 4.5l.5 1.5M19.5 13l-1.5-.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 15V4M7 9l5-5 5 5M5 20h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
};
const STATUS_ICONS = ['house', 'x', 'back', 'star', 'calendar', 'dollar', 'no', 'check', 'clock', 'question', 'bolt', 'flame', 'phone', 'mail', 'person', 'lock'];
const ic = (name, cls = '') =>
  `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[name] || ICON.question}</svg>`;

/* ---------------------------------------------------------------- constants */

const PALETTE = ['#E5484D', '#F76B15', '#FFB224', '#30A46C', '#12A594', '#0090FF', '#3E63DD', '#8E4EC6', '#D6409F', '#AD7F58', '#8B8D98', '#1C2024'];
const KINDS = { neutral: 'Neutral', lead: 'Counts as lead', sale: 'Counts as sale', negative: 'Negative' };
const OUTCOMES = { scheduled: ['Scheduled', 'clock'], completed: ['Completed', 'check'], sold: ['Sold', 'dollar'], noShow: ['No-show', 'no'], canceled: ['Canceled', 'x'] };
const DEFAULT_CENTER = [37.3318, -122.0312];

/* ---------------------------------------------------------------- data */

const KEY = 'knock.v1';

function defaults() {
  const st = [
    ['Not Home', 'house', '#8B8D98', 'neutral'], ['Not Interested', 'x', '#E5484D', 'negative'],
    ['Come Back', 'back', '#FFB224', 'neutral'], ['Lead', 'star', '#0090FF', 'lead'],
    ['Appointment', 'calendar', '#8E4EC6', 'lead'], ['Sold', 'dollar', '#30A46C', 'sale'],
    ['Do Not Knock', 'no', '#1C2024', 'negative'],
  ];
  const sg = [['New Lead', '#0090FF'], ['Appointment', '#8E4EC6'], ['Proposal', '#FFB224'], ['Closed Won', '#30A46C'], ['Closed Lost', '#8B8D98']];
  return {
    version: 1,
    reps: [{ id: uid(), name: 'Me', colorHex: '#0090FF', isMe: true }],
    statuses: st.map((s, i) => ({ id: uid(), name: s[0], symbol: s[1], colorHex: s[2], kind: s[3], order: i })),
    stages: sg.map((s, i) => ({ id: uid(), name: s[0], colorHex: s[1], order: i })),
    houses: [], visits: [], customers: [], appointments: [], territories: [],
    mapCenter: null, mapZoom: 17,
  };
}

function load() {
  try {
    const j = JSON.parse(localStorage.getItem(KEY));
    if (j && Array.isArray(j.statuses)) return j;
  } catch { /* fall through to defaults */ }
  return defaults();
}

let S = load();

function save() {
  clearTimeout(save.t);
  save.t = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { toast('Storage is full — export a backup'); }
  }, 120);
}

const get = (coll, id) => (id ? S[coll].find((x) => x.id === id) : undefined);
const statuses = () => [...S.statuses].sort((a, b) => a.order - b.order);
const stages = () => [...S.stages].sort((a, b) => a.order - b.order);
const reps = () => [...S.reps].sort((a, b) => a.name.localeCompare(b.name));
const me = () => S.reps.find((r) => r.isMe);
const visitsOf = (h) => S.visits.filter((v) => v.houseId === h.id).sort((a, b) => b.date.localeCompare(a.date));
const customerOf = (h) => S.customers.find((c) => c.houseId === h.id);
const fullName = (c) => [c.firstName, c.lastName].filter(Boolean).join(' ') || 'New customer';
const initials = (c) => ((c.firstName[0] || '') + (c.lastName[0] || '')).toUpperCase() || '?';
const houseName = (h) => h.address || 'Unnamed house';
const isLeadish = (s) => !!s && (s.kind === 'lead' || s.kind === 'sale');

function periodStart(p) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === 'today') return d;
  if (p === 'week') { d.setDate(d.getDate() - d.getDay()); return d; }
  if (p === 'month') { d.setDate(1); return d; }
  return null;
}
const inPeriod = (iso, p) => { const s = periodStart(p); return !s || new Date(iso) >= s; };

function insideTerritory(t, lat, lon) {
  const pts = t.points;
  if (pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i], b = pts[j];
    if ((a.lat > lat) !== (b.lat > lat) && lon < ((b.lon - a.lon) * (lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside;
  }
  return inside;
}

function createCustomer(house) {
  const c = {
    id: uid(), firstName: '', lastName: '', phone: '', email: '', notes: '', dealValue: 0,
    createdAt: nowISO(), stageId: stages()[0]?.id || null, houseId: house?.id || null,
  };
  S.customers.push(c);
  save();
  return c;
}

function deleteHouse(id) {
  S.houses = S.houses.filter((h) => h.id !== id);
  S.visits = S.visits.filter((v) => v.houseId !== id);
  S.customers.forEach((c) => { if (c.houseId === id) c.houseId = null; });
  save();
}
function deleteCustomer(id) {
  S.customers = S.customers.filter((c) => c.id !== id);
  S.appointments = S.appointments.filter((a) => a.customerId !== id);
  save();
}
function deleteRep(id) {
  S.reps = S.reps.filter((r) => r.id !== id);
  S.visits.forEach((v) => { if (v.repId === id) v.repId = null; });
  S.appointments.forEach((a) => { if (a.setterId === id) a.setterId = null; if (a.closerId === id) a.closerId = null; });
  S.territories.forEach((t) => { if (t.repId === id) t.repId = null; });
  save();
}
function deleteStatus(id) {
  S.statuses = S.statuses.filter((s) => s.id !== id);
  S.visits.forEach((v) => { if (v.statusId === id) v.statusId = null; });
  S.houses.forEach((h) => { if (h.statusId === id) h.statusId = null; });
  save();
}
function deleteStage(id) {
  S.stages = S.stages.filter((s) => s.id !== id);
  S.customers.forEach((c) => { if (c.stageId === id) c.stageId = null; });
  save();
}

/* ---------------------------------------------------------------- demo data */

function loadDemo(center) {
  const st = statuses(), sg = stages();
  if (!S.reps.length) S.reps.push({ id: uid(), name: 'Me', colorHex: '#0090FF', isMe: true });
  for (const [name, hex] of [['Jordan', '#F76B15'], ['Priya', '#30A46C'], ['Marcus', '#D6409F']]) {
    if (!S.reps.some((r) => r.name === name)) S.reps.push({ id: uid(), name, colorHex: hex, isMe: false });
  }
  const R = S.reps;
  const weights = { 'Not Home': 35, 'Not Interested': 22, 'Come Back': 15, Lead: 12, Appointment: 8, Sold: 5, 'Do Not Knock': 3 };
  const pool = st.flatMap((s) => Array(weights[s.name] ?? 5).fill(s));
  const streets = ['Juniper Ln', 'Alder St', 'Quail Run', 'Larkspur Ave', 'Sorrel Ct', 'Birchwood Dr'];
  const firsts = ['Avery', 'Sam', 'Riley', 'Dana', 'Morgan', 'Casey', 'Jamie', 'Quinn', 'Rowan', 'Hayden', 'Elena', 'Omar', 'Grace', 'Theo', 'Nadia', 'Luis'];
  const lasts = ['Hart', 'Okafor', 'Lindqvist', 'Patel', 'Moreno', 'Kim', 'Fischer', 'Nguyen', 'Brooks', 'Silva', 'Ward', 'Novak'];
  const latStep = 0.0016, lonStep = 0.0008;
  const customers = [];

  streets.forEach((street, si) => {
    for (let hi = 0; hi < 9; hi++) {
      const h = {
        id: uid(), address: `${100 + hi * 12 + (si % 2)} ${street}`, notes: '', createdAt: nowISO(), statusId: null,
        latitude: center[0] + (si - 2.5) * latStep + rnd(-5e-5, 5e-5),
        longitude: center[1] + (hi - 4) * lonStep + rnd(-5e-5, 5e-5),
      };
      S.houses.push(h);
      if (Math.random() >= 0.75 || !pool.length) continue;
      const dates = Array.from({ length: rint(1, 3) }, () => new Date(Date.now() - rint(10, 14 * 24 * 60) * 60000)).sort((a, b) => a - b);
      let last = null;
      for (const d of dates) {
        last = pick(pool);
        S.visits.push({ id: uid(), date: d.toISOString(), note: '', houseId: h.id, repId: pick(R).id, statusId: last.id });
      }
      h.statusId = last.id;
      if (isLeadish(last)) {
        const c = createCustomer(h);
        c.firstName = pick(firsts);
        c.lastName = pick(lasts);
        c.phone = `555-01${rint(10, 99)}`;
        c.dealValue = rint(8, 32) * 1000;
        c.stageId = last.kind === 'sale' ? (sg.find((s) => s.name === 'Closed Won')?.id ?? null) : (sg.length ? pick(sg.slice(0, 3)).id : null);
        customers.push(c);
      }
    }
  });

  for (const c of customers) {
    if (Math.random() < 0.5) continue;
    const day = new Date();
    day.setDate(day.getDate() + rint(-3, 7));
    day.setHours(rint(9, 18), pick([0, 30]), 0, 0);
    const lastRep = visitsOf(get('houses', c.houseId))[0]?.repId;
    S.appointments.push({
      id: uid(), customerId: c.id, start: day.toISOString(), durationMinutes: 60, notes: '',
      setterId: lastRep || R[0].id, closerId: Math.random() < 0.7 ? pick(R).id : null,
      outcome: day < new Date() ? pick(['completed', 'sold', 'noShow']) : 'scheduled',
    });
  }

  const half = 4.5 * lonStep;
  const box = (from, to) => [[-3.1, from], [-3.1, to], [3.1, to], [3.1, from]].map(([la, lo]) => ({ lat: center[0] + la * latStep, lon: center[1] + lo }));
  S.territories.push(
    { id: uid(), name: 'West Side', colorHex: '#3E63DD', points: box(-half - lonStep / 2, -lonStep / 4), repId: R.find((r) => r.name === 'Jordan')?.id || null, createdAt: nowISO() },
    { id: uid(), name: 'East Side', colorHex: '#12A594', points: box(lonStep / 4, half + lonStep / 2), repId: R.find((r) => r.name === 'Priya')?.id || null, createdAt: nowISO() },
  );
  save();
}

/* ---------------------------------------------------------------- ui state */

const ui = {
  tab: 'map',
  stacks: { customers: [], planner: [], pipeline: [], team: [] },
  sheets: [],
  search: '',
  day: dayKey(new Date()),
  month: (() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); })(),
  period: 'week',
  hidden: new Set(),
  hideUnknocked: false,
  mapMode: 'knock',
  draft: [],
  fitOnShow: false,
  demoMsg: '',
};

/* ---------------------------------------------------------------- small html helpers */

const sec = (t) => `<div class="sec">${t}</div>`;
const group = (inner) => `<div class="group">${inner}</div>`;
const foot = (t) => `<div class="foot">${t}</div>`;
// Very dark colors (like Do Not Knock) would vanish on dark backgrounds, so lift them in dark mode.
const darkMode = matchMedia('(prefers-color-scheme: dark)');
function tone(hex) {
  if (!darkMode.matches) return hex;
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 40 ? '#B0B4BA' : hex;
}
const chip = (text, hex) => { hex = tone(hex); return `<span class="chip" style="background:${hex}2e;color:${hex}">${esc(text)}</span>`; };
const opt = (v, label, cur) => `<option value="${esc(v)}"${v === (cur || '') ? ' selected' : ''}>${esc(label)}</option>`;
const avatar = (r, size = 30) =>
  `<span class="av" style="width:${size}px;height:${size}px;font-size:${size * 0.45}px;background:${r?.colorHex || '#8B8D98'};color:#fff">${esc(r?.name?.[0] || '–')}</span>`;
const empty = (icon, title, text) => `<div class="empty">${ic(icon)}<b>${esc(title)}</b><span>${text}</span></div>`;
const inputRow = (bind, val, placeholder, type = 'text', extra = '') =>
  `<div class="row"><input type="${type}" data-bind="${bind}" value="${esc(val)}" placeholder="${esc(placeholder)}" ${extra}></div>`;

function dot(status, size = 28) {
  const c = status ? status.colorHex : '#ffffff';
  const border = status ? '#ffffff' : '#8B8D98';
  const fg = status ? '#ffffff' : '#8B8D98';
  return `<span class="pin" style="width:${size}px;height:${size}px;background:${c};border-color:${border};color:${fg}">${size >= 20 ? ic(status ? status.symbol : 'house') : ''}</span>`;
}

function swatches(current, attrs) {
  return `<div class="swatches">${PALETTE.map((c) => `<button class="sw" style="background:${c}" ${attrs(c)} aria-label="${c}">${c === current ? ic('check') : ''}</button>`).join('')}</div>`;
}

/* ---------------------------------------------------------------- views
   Each view returns { title, body, left?, right?, flush? }. Views render in a tab page
   or inside a sheet; pushing a view adds it to whichever one the tap came from. */

const V = {};

V.gone = () => ({ title: 'Not found', body: empty('question', 'Not found', 'This item was deleted.') });

/* --- map sheets --- */

V.house = (e) => {
  const h = get('houses', e.id);
  if (!h) return V.gone();
  const vs = visitsOf(h), last = vs[0], cust = customerOf(h);
  const lastRep = last && get('reps', last.repId);
  return {
    title: `<span data-title="${h.id}">${esc(h.address || 'New house')}</span>`,
    body:
      group(
        inputRow(`houses.${h.id}.address`, h.address, 'Address') +
        (last ? `<div class="row"><span class="lbl">Last knock</span><span class="val">${ago(last.date)} · ${esc(lastRep?.name || 'Unknown')}</span></div>` : ''),
      ) +
      sec('Log a knock') +
      group(
        `<div class="row"><input id="visit-note" placeholder="Note (optional)"></div>` +
        `<div class="sgrid">${statuses().map((s) => {
          const on = h.statusId === s.id, c = tone(s.colorHex);
          return `<button class="stile" style="background:${on ? c : c + '24'};color:${on ? '#fff' : c}" data-act="knock" data-house="${h.id}" data-status="${s.id}">${ic(s.symbol)}<span>${esc(s.name)}</span></button>`;
        }).join('')}</div>`,
      ) +
      sec('Customer') +
      group(cust ? customerRow(cust) : `<button class="row link" data-act="cust-create" data-house="${h.id}">${ic('person')}Create customer</button>`) +
      sec('House notes') +
      group(`<div class="row"><textarea rows="2" data-bind="houses.${h.id}.notes" placeholder="Dog in yard, gate code, best time…">${esc(h.notes)}</textarea></div>`) +
      (vs.length ? sec(`History (${vs.length})`) + group(vs.map(visitRow).join('')) : '') +
      `<div class="group mt">${`<button class="row danger" data-act="house-del" data-id="${h.id}">Delete house</button>`}</div>`,
  };
};

function visitRow(v) {
  const s = get('statuses', v.statusId), r = get('reps', v.repId);
  return `<div class="row">${dot(s, 24)}<span class="grow"><span class="t">${esc(s?.name || 'Unknown')}</span>${v.note ? `<span class="s">${esc(v.note)}</span>` : ''}</span><span class="right-meta"><span>${fmtDayTime(v.date)}</span><small>${esc(r?.name || '')}</small></span></div>`;
}

V.mapMenu = () => ({
  title: 'Map',
  left: `<button class="pill-btn" data-act="sheet-close">Cancel</button>`,
  right: '',
  body: group(
    `<button class="row" data-act="draw-start">${ic('pencil')}<span class="grow">Draw territory</span></button>` +
    `<button class="row" data-act="open-terrs">${ic('square')}<span class="grow">Territories</span>${ic('chev', 'chev')}</button>` +
    `<button class="row" data-act="fit">${ic('expand')}<span class="grow">Fit all houses</span></button>`,
  ),
});

V.terrNew = (e) => {
  const d = e.draft;
  return {
    title: 'New territory',
    left: `<button class="pill-btn" data-act="sheet-close">Cancel</button>`,
    right: `<button class="pill-btn strong" data-act="terr-save">Save</button>`,
    body:
      group(`<div class="row"><input data-draft="name" value="${esc(d.name)}" placeholder="Territory name"></div>`) +
      sec('Color') + group(swatches(d.colorHex, (c) => `data-act="draft-set" data-field="colorHex" data-val="${c}"`)) +
      `<div class="group mt"><label class="row"><span class="lbl">Assigned rep</span><select data-draft="repId">${opt('', 'Unassigned', d.repId)}${reps().map((r) => opt(r.id, r.name, d.repId)).join('')}</select></label></div>`,
  };
};

V.terrs = () => {
  const list = [...S.territories].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!list.length) return { title: 'Territories', body: empty('square', 'No territories', 'Use “Draw territory” on the map to outline one.') };
  return {
    title: 'Territories',
    body: group(list.map((t) => {
      const inside = S.houses.filter((h) => insideTerritory(t, h.latitude, h.longitude));
      const knocked = inside.filter((h) => h.statusId).length;
      const pct = inside.length ? (knocked / inside.length) * 100 : 0;
      return `<div class="row" data-act="focus-terr" data-id="${t.id}"><span class="tbar" style="background:${t.colorHex}"></span><span class="grow"><span class="t">${esc(t.name)}</span><span class="s">${knocked}/${inside.length} doors knocked</span>${inside.length ? `<span class="prog"><i style="width:${pct}%;background:${t.colorHex}"></i></span>` : ''}</span><select class="mini" data-bind="territories.${t.id}.repId">${opt('', 'Unassigned', t.repId)}${reps().map((r) => opt(r.id, r.name, t.repId)).join('')}</select><button class="icon-btn danger" data-act="terr-del" data-id="${t.id}" aria-label="Delete">${ic('trash')}</button></div>`;
    }).join('')),
  };
};

/* --- customers --- */

function customerRow(c) {
  const st = get('stages', c.stageId), col = st?.colorHex || '#8B8D98', addr = get('houses', c.houseId)?.address;
  return `<button class="row" data-act="push" data-v="customer" data-id="${c.id}"><span class="av" style="background:${col}2e;color:${col}">${esc(initials(c))}</span><span class="grow"><span class="t">${esc(fullName(c))}</span>${addr ? `<span class="s">${esc(addr)}</span>` : ''}</span>${st ? chip(st.name, st.colorHex) : ''}${ic('chev', 'chev')}</button>`;
}

function customerListHTML() {
  const q = ui.search.trim().toLowerCase();
  const all = [...S.customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (!all.length) return empty('people', 'No customers yet', 'Log a lead on the map or tap + to add one.');
  const list = q
    ? all.filter((c) => fullName(c).toLowerCase().includes(q) || c.phone.includes(q) || (get('houses', c.houseId)?.address || '').toLowerCase().includes(q))
    : all;
  if (!list.length) return empty('search', 'No results', `No customers match “${esc(ui.search)}”.`);
  return group(list.map(customerRow).join(''));
}

V.customersRoot = () => ({
  title: 'Customers',
  right: `<button class="nav-btn" data-act="cust-new" aria-label="Add customer">${ic('plus')}</button>`,
  body: `<div class="search">${ic('search')}<input type="search" id="cust-search" value="${esc(ui.search)}" placeholder="Name, phone or address"></div><div id="cust-list">${customerListHTML()}</div>`,
});

function linksHTML(c) {
  const d = c.phone.replace(/[^\d+]/g, '');
  return [
    c.phone && `<a class="lnk" href="tel:${d}">${ic('phone')}Call</a>`,
    c.phone && `<a class="lnk" href="sms:${d}">${ic('message')}Text</a>`,
    c.email && `<a class="lnk" href="mailto:${esc(c.email)}">${ic('mail')}Email</a>`,
  ].filter(Boolean).join('');
}

V.customer = (e) => {
  const c = get('customers', e.id);
  if (!c) return V.gone();
  const b = (f) => `customers.${c.id}.${f}`;
  const house = get('houses', c.houseId), hs = house && get('statuses', house.statusId);
  const appts = S.appointments.filter((a) => a.customerId === c.id).sort((a, b2) => b2.start.localeCompare(a.start));
  return {
    title: `<span data-title="${c.id}">${esc(fullName(c))}</span>`,
    body:
      sec('Contact') +
      group(
        inputRow(b('firstName'), c.firstName, 'First name', 'text', 'autocapitalize="words"') +
        inputRow(b('lastName'), c.lastName, 'Last name', 'text', 'autocapitalize="words"') +
        inputRow(b('phone'), c.phone, 'Phone', 'tel') +
        inputRow(b('email'), c.email, 'Email', 'email') +
        `<div class="row links" id="links-${c.id}">${linksHTML(c)}</div>`,
      ) +
      sec('Deal') +
      group(
        `<label class="row"><span class="lbl">Stage</span><select data-bind="${b('stageId')}">${opt('', 'None', c.stageId)}${stages().map((s) => opt(s.id, s.name, c.stageId)).join('')}</select></label>` +
        `<label class="row"><span class="lbl">Value</span><input class="right" type="number" inputmode="decimal" data-type="number" data-bind="${b('dealValue')}" value="${c.dealValue || ''}" placeholder="$0"></label>` +
        (house ? `<div class="row"><span class="lbl">Address</span><span class="val">${esc(houseName(house))}</span></div>` : '') +
        (hs ? `<div class="row"><span class="lbl">Door status</span><span class="val">${chip(hs.name, hs.colorHex)}</span></div>` : ''),
      ) +
      sec('Appointments') +
      group(
        appts.map((a) => `<button class="row" data-act="appt-edit" data-id="${a.id}">${apptHTML(a, true)}</button>`).join('') +
        `<button class="row link" data-act="appt-new" data-customer="${c.id}">${ic('calendar')}Schedule appointment</button>`,
      ) +
      sec('Notes') +
      group(`<div class="row"><textarea rows="3" data-bind="${b('notes')}" placeholder="Notes">${esc(c.notes)}</textarea></div>`) +
      `<div class="group mt"><button class="row danger" data-act="cust-del" data-id="${c.id}">Delete customer</button></div>`,
  };
};

/* --- planner --- */

function apptHTML(a, showDay) {
  const c = get('customers', a.customerId), st = c && get('stages', c.stageId), addr = c && get('houses', c.houseId)?.address;
  const setter = get('reps', a.setterId), closer = get('reps', a.closerId), o = OUTCOMES[a.outcome] || OUTCOMES.scheduled;
  return `<span class="appt-time">${showDay ? `<b>${fmtDay(a.start)}</b>` : ''}<span>${fmtTime(a.start)}</span><small>${a.durationMinutes}m</small></span>` +
    `<span class="appt-bar" style="background:${st?.colorHex || '#0090FF'}"></span>` +
    `<span class="grow"><span class="t">${esc(c ? fullName(c) : 'No customer')}</span>${addr ? `<span class="s">${esc(addr)}</span>` : ''}` +
    `<span class="s team"><span>${ic('person')}${esc(setter?.name || '—')}</span><span class="${closer ? '' : 'warn'}">${ic('check')}${esc(closer?.name || 'Unassigned')}</span></span></span>` +
    `<span class="outc${a.outcome === 'sold' ? ' sold' : ''}">${ic(o[1])}</span>`;
}

function calendarHTML() {
  const m = ui.month, y = m.getFullYear(), mo = m.getMonth();
  const start = new Date(y, mo, 1).getDay(), days = new Date(y, mo + 1, 0).getDate();
  const busy = new Set(S.appointments.map((a) => dayKey(a.start)));
  const today = dayKey(new Date());
  let cells = '';
  for (let i = 0; i < start; i++) cells += '<span></span>';
  for (let d = 1; d <= days; d++) {
    const k = `${y}-${pad(mo + 1)}-${pad(d)}`;
    cells += `<button class="day${k === today ? ' today' : ''}${k === ui.day ? ' sel' : ''}" data-act="day" data-date="${k}">${d}${busy.has(k) ? '<i class="dot"></i>' : ''}</button>`;
  }
  const label = m.toLocaleDateString([], { month: 'long', year: 'numeric' });
  return `<div class="cal"><div class="cal-head"><b>${label}</b><span class="grow"></span><button class="icon-btn link" data-act="month" data-d="-1" aria-label="Previous month">${ic('left')}</button><button class="icon-btn link" data-act="month" data-d="1" aria-label="Next month">${ic('chev')}</button></div>` +
    `<div class="cal-grid">${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((d) => `<span class="dow">${d}</span>`).join('')}${cells}</div></div>`;
}

V.plannerRoot = () => {
  const byStart = (a, b) => a.start.localeCompare(b.start);
  const dayAppts = S.appointments.filter((a) => dayKey(a.start) === ui.day).sort(byStart);
  const needs = S.appointments.filter((a) => !a.closerId && new Date(a.start) > new Date() && a.outcome === 'scheduled').sort(byStart);
  const dayLabel = keyToDate(ui.day).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  return {
    title: 'Planner',
    right: `<button class="pill-btn" data-act="today">Today</button><button class="nav-btn" data-act="appt-new" aria-label="New appointment">${ic('plus')}</button>`,
    body:
      calendarHTML() +
      sec(dayLabel) +
      group(dayAppts.length
        ? dayAppts.map((a) => `<button class="row" data-act="appt-edit" data-id="${a.id}">${apptHTML(a, false)}</button>`).join('')
        : '<div class="row muted">No appointments</div>') +
      (needs.length ? sec('Needs a closer') + group(needs.map((a) => `<button class="row" data-act="appt-edit" data-id="${a.id}">${apptHTML(a, true)}</button>`).join('')) : ''),
  };
};

V.appt = (e) => {
  const d = e.draft;
  const custs = [...S.customers].sort((a, b) => fullName(a).localeCompare(fullName(b)));
  const repOpts = (cur, none) => opt('', none, cur) + reps().map((r) => opt(r.id, r.name, cur)).join('');
  return {
    title: e.id ? 'Appointment' : 'New appointment',
    left: `<button class="pill-btn" data-act="sheet-close">Cancel</button>`,
    right: `<button class="pill-btn strong" data-act="appt-save">Save</button>`,
    body:
      group(`<label class="row"><span class="lbl">Customer</span><select data-draft="customerId">${opt('', 'None', d.customerId)}${custs.map((c) => opt(c.id, fullName(c), d.customerId)).join('')}</select></label>`) +
      sec('When') +
      group(
        `<label class="row"><span class="lbl">Start</span><input class="right" type="datetime-local" data-draft="start" data-type="datetime" value="${toLocalInput(d.start)}"></label>` +
        `<label class="row"><span class="lbl">Length</span><select data-draft="durationMinutes" data-type="number">${[30, 45, 60, 90, 120].map((n) => `<option value="${n}"${n === d.durationMinutes ? ' selected' : ''}>${n} min</option>`).join('')}</select></label>`,
      ) +
      sec('Team') +
      group(
        `<label class="row"><span class="lbl">Setter</span><select data-draft="setterId">${repOpts(d.setterId, 'None')}</select></label>` +
        `<label class="row"><span class="lbl">Closer</span><select data-draft="closerId">${repOpts(d.closerId, 'Unassigned')}</select></label>`,
      ) +
      sec('Outcome') +
      group(
        `<label class="row"><span class="lbl">Outcome</span><select data-draft="outcome">${Object.entries(OUTCOMES).map(([k, [l]]) => opt(k, l, d.outcome)).join('')}</select></label>` +
        `<div class="row"><textarea rows="2" data-draft="notes" placeholder="Notes">${esc(d.notes)}</textarea></div>`,
      ) +
      (e.id ? `<div class="group mt"><button class="row danger" data-act="appt-del" data-id="${e.id}">Delete appointment</button></div>` : ''),
  };
};

/* --- pipeline --- */

function pipelineColumn(name, hex, list) {
  const total = list.reduce((s, c) => s + (c.dealValue || 0), 0);
  const cards = list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((c) => {
    const addr = get('houses', c.houseId)?.address;
    const next = S.appointments.filter((a) => a.customerId === c.id && new Date(a.start) > new Date()).sort((a, b) => a.start.localeCompare(b.start))[0];
    return `<div class="card" data-act="push" data-v="customer" data-id="${c.id}"><div class="card-top"><b>${esc(fullName(c))}</b><span>${money(c.dealValue)}</span></div>` +
      (addr ? `<div class="s">${ic('pin')}${esc(addr)}</div>` : '') +
      (next ? `<div class="s">${ic('calendar')}${fmtDayTime(next.start)}</div>` : '') +
      `<button class="card-move" data-act="move-sheet" data-id="${c.id}" aria-label="Move to stage">${ic('dots')}</button></div>`;
  }).join('') || '<div class="col-empty">Empty</div>';
  return `<section class="col" style="background:${hex}12"><div class="col-head"><i style="background:${hex}"></i><b>${esc(name)}</b><span>${list.length}</span></div><div class="col-total">${money(total)}</div>${cards}</section>`;
}

V.pipelineRoot = () => {
  const cols = stages().map((s) => pipelineColumn(s.name, s.colorHex, S.customers.filter((c) => c.stageId === s.id)));
  const none = S.customers.filter((c) => !get('stages', c.stageId));
  if (none.length) cols.push(pipelineColumn('No stage', '#8B8D98', none));
  return { title: 'Pipeline', flush: true, body: `<div class="board">${cols.join('')}</div>` };
};

V.move = (e) => {
  const c = get('customers', e.id);
  if (!c) return V.gone();
  return {
    title: 'Move to stage',
    left: `<button class="pill-btn" data-act="sheet-close">Cancel</button>`,
    right: '',
    body: group(stages().map((s) => `<button class="row" data-act="move-to" data-id="${c.id}" data-stage="${s.id}"><i class="sdot" style="background:${s.colorHex}"></i><span class="grow">${esc(s.name)}</span>${c.stageId === s.id ? `<span class="link">${ic('check')}</span>` : ''}</button>`).join('')),
  };
};

/* --- team --- */

V.teamRoot = () => {
  const p = ui.period;
  const kind = Object.fromEntries(S.statuses.map((s) => [s.id, s.kind]));
  const rows = reps().map((r) => {
    const mine = S.visits.filter((v) => v.repId === r.id && inPeriod(v.date, p));
    return {
      r,
      doors: mine.length,
      leads: mine.filter((v) => kind[v.statusId] === 'lead').length,
      sales: mine.filter((v) => kind[v.statusId] === 'sale').length,
      appts: S.appointments.filter((a) => a.setterId === r.id && inPeriod(a.start, p)).length,
    };
  }).sort((a, b) => b.sales - a.sales || b.leads - a.leads || b.doors - a.doors);
  const max = Math.max(1, ...rows.map((x) => x.doors));
  const metric = (n, l) => `<span class="metric"><b>${n}</b><small>${l}</small></span>`;
  const medals = ['🥇', '🥈', '🥉'];
  return {
    title: 'Team',
    body:
      group(`<div class="seg-wrap"><div class="seg">${[['today', 'Today'], ['week', 'Week'], ['month', 'Month'], ['all', 'All']].map(([k, l]) => `<button class="${k === p ? 'on' : ''}" data-act="period" data-p="${k}">${l}</button>`).join('')}</div></div>`) +
      sec('Doors knocked') +
      group(`<div class="bars">${rows.map((x) => `<div class="bar-row"><div class="bar-name">${esc(x.r.name)}</div><div class="bar-line"><span class="bar" style="width:${(x.doors / max) * 88}%;background:${x.r.colorHex}"></span><span class="bar-n">${x.doors}</span></div></div>`).join('')}</div>`) +
      sec('Leaderboard') +
      group(rows.map((x, i) => `<div class="row"><span class="rank">${i < 3 ? medals[i] : i + 1}</span>${avatar(x.r)}<span class="grow"><span class="t">${esc(x.r.name)}</span>${x.r.isMe ? '<span class="you">You</span>' : ''}</span>${metric(x.leads, 'leads')}${metric(x.appts, 'appts')}${metric(x.sales, 'sales')}</div>`).join('')) +
      sec('Team') +
      group(
        reps().map((r) => `<div class="row">${avatar(r)}<span class="grow">${esc(r.name)}</span>${r.isMe
          ? '<span class="val">This device</span>'
          : `<button class="mini-btn" data-act="set-me" data-id="${r.id}">I'm ${esc(r.name)}</button><button class="icon-btn danger" data-act="rep-del" data-id="${r.id}" aria-label="Remove">${ic('trash')}</button>`}</div>`).join('') +
        `<button class="row link" data-act="rep-add">${ic('person')}Add teammate</button>`,
      ) +
      `<div class="group mt"><button class="row" data-act="push" data-v="settings">${ic('gear')}<span class="grow">Statuses, pipeline & data</span>${ic('chev', 'chev')}</button></div>`,
  };
};

/* --- settings --- */

V.settings = () => ({
  title: 'Settings',
  body:
    sec('Door statuses') +
    group(
      statuses().map((s) => `<button class="row" data-act="push" data-v="status" data-id="${s.id}">${dot(s, 26)}<span class="grow">${esc(s.name)}</span>${s.kind !== 'neutral' ? `<span class="val">${KINDS[s.kind]}</span>` : ''}${ic('chev', 'chev')}</button>`).join('') +
      `<button class="row link" data-act="status-add">${ic('plus')}Add status</button>`,
    ) +
    foot('Shown as quick buttons when you log a knock. Lead and sale statuses feed the leaderboard.') +
    sec('Pipeline stages') +
    group(
      stages().map((s) => `<button class="row" data-act="push" data-v="stage" data-id="${s.id}"><i class="sdot" style="background:${s.colorHex}"></i><span class="grow">${esc(s.name)}</span>${ic('chev', 'chev')}</button>`).join('') +
      `<button class="row link" data-act="stage-add">${ic('plus')}Add stage</button>`,
    ) +
    sec('Data') +
    group(
      `<button class="row link" data-act="demo">${ic('wand')}Load demo neighborhood</button>` +
      `<button class="row link" data-act="export-json">${ic('download')}Export backup</button>` +
      `<label class="row link">${ic('upload')}Restore backup<input type="file" id="import-file" accept="application/json,.json" hidden></label>` +
      `<button class="row link" data-act="export-csv">${ic('download')}Export houses as CSV</button>` +
      `<button class="row danger" data-act="erase">${ic('trash')}Erase all data</button>`,
    ) +
    foot(ui.demoMsg || 'Everything is saved only on this device. Export a backup now and then so you never lose your knocks.'),
});

V.status = (e) => {
  const s = get('statuses', e.id);
  if (!s) return V.gone();
  const b = (f) => `statuses.${s.id}.${f}`;
  return {
    title: `<span data-title="${s.id}">${esc(s.name)}</span>`,
    body:
      group(`<div class="row">${dot(s, 40)}<input class="big" data-bind="${b('name')}" value="${esc(s.name)}" placeholder="Name"></div>`) +
      `<div class="group mt"><label class="row"><span class="lbl">Counts as</span><select data-bind="${b('kind')}">${Object.entries(KINDS).map(([k, l]) => opt(k, l, s.kind)).join('')}</select></label>` +
      `<label class="row"><span class="lbl">Position</span><input class="right" type="number" inputmode="numeric" data-type="pos" data-bind="${b('order')}" value="${s.order + 1}"></label></div>` +
      sec('Color') + group(swatches(s.colorHex, (c) => `data-act="set" data-bind="${b('colorHex')}" data-val="${c}"`)) +
      sec('Icon') + group(`<div class="igrid">${STATUS_ICONS.map((n) => `<button class="ib" style="background:${n === s.symbol ? s.colorHex : s.colorHex + '1f'};color:${n === s.symbol ? '#fff' : s.colorHex}" data-act="set" data-bind="${b('symbol')}" data-val="${n}" aria-label="${n}">${ic(n)}</button>`).join('')}</div>`) +
      `<div class="group mt"><button class="row danger" data-act="status-del" data-id="${s.id}">Delete status</button></div>`,
  };
};

V.stage = (e) => {
  const s = get('stages', e.id);
  if (!s) return V.gone();
  const b = (f) => `stages.${s.id}.${f}`;
  return {
    title: `<span data-title="${s.id}">${esc(s.name)}</span>`,
    body:
      group(
        `<div class="row"><input data-bind="${b('name')}" value="${esc(s.name)}" placeholder="Name"></div>` +
        `<label class="row"><span class="lbl">Position</span><input class="right" type="number" inputmode="numeric" data-type="pos" data-bind="${b('order')}" value="${s.order + 1}"></label>`,
      ) +
      sec('Color') + group(swatches(s.colorHex, (c) => `data-act="set" data-bind="${b('colorHex')}" data-val="${c}"`)) +
      `<div class="group mt"><button class="row danger" data-act="stage-del" data-id="${s.id}">Delete stage</button></div>`,
  };
};

/* ---------------------------------------------------------------- rendering */

const TABS = [['map', 'Map', 'map'], ['customers', 'Customers', 'people'], ['planner', 'Planner', 'calendar'], ['pipeline', 'Pipeline', 'columns'], ['team', 'Team', 'trophy']];

function render() {
  document.body.dataset.tab = ui.tab;
  $('#tabbar').innerHTML = TABS.map(([k, l, i]) => `<button class="tab${ui.tab === k ? ' on' : ''}" data-act="tab" data-tab="${k}">${ic(i)}<span>${l}</span></button>`).join('');
  if (ui.tab === 'map') { renderMapUI(); drawMap(); } else renderPage();
  renderSheets();
}

function renderPage() {
  const stack = ui.stacks[ui.tab];
  const e = stack.at(-1) || { v: `${ui.tab}Root` };
  const v = (V[e.v] || V.gone)(e);
  const key = `${ui.tab}:${e.v}:${e.id || ''}`;
  const page = $('#page');
  const top = key === ui.pageKey ? page.scrollTop : 0;
  page.innerHTML =
    `<header class="nav"><div class="nav-row">${stack.length ? `<button class="nav-btn" data-act="pop" aria-label="Back">${ic('left')}</button>` : ''}<span class="grow"></span>${v.right || ''}</div><h1>${v.title}</h1></header>` +
    `<div class="${v.flush ? 'flush' : 'content'}">${v.body}</div>`;
  page.scrollTop = top;
  ui.pageKey = key;
}

function renderSheets() {
  const root = $('#sheets');
  const prev = [...root.querySelectorAll('.sheet-body')].map((b) => b.scrollTop);
  root.innerHTML = ui.sheets.map((s, i) => {
    const e = s.stack.at(-1);
    const v = (V[e.v] || V.gone)(e);
    const left = v.left ?? (s.stack.length > 1 ? `<button class="nav-btn" data-act="pop" aria-label="Back">${ic('left')}</button>` : '');
    const right = v.right ?? `<button class="pill-btn strong" data-act="sheet-close">Done</button>`;
    const anim = s.shown ? '' : ' anim';
    s.shown = true;
    return `<div class="sheet-backdrop" data-act="sheet-dismiss" style="z-index:${2000 + i * 2}"></div>` +
      `<div class="sheet${anim}" data-sheet="${i}" style="z-index:${2001 + i * 2}"><div class="grabber"></div>` +
      `<div class="sheet-head">${left}<div class="sheet-title">${v.title}</div>${right}</div><div class="sheet-body">${v.body}</div></div>`;
  }).join('');
  root.querySelectorAll('.sheet-body').forEach((b, i) => {
    const s = ui.sheets[i], key = s.stack.at(-1).v + (s.stack.at(-1).id || '');
    b.scrollTop = key === s.lastKey ? (prev[i] || 0) : 0;
    s.lastKey = key;
  });
}

function openSheet(sheet) { ui.sheets.push(sheet); render(); }
function closeSheet() { const s = ui.sheets.pop(); render(); s?.onClose?.(); }
function topEntry(el) {
  const i = el?.closest('.sheet')?.dataset.sheet;
  return i != null ? ui.sheets[+i]?.stack.at(-1) : undefined;
}
function push(v, id, fromSheet) {
  if (fromSheet && ui.sheets.length) ui.sheets.at(-1).stack.push({ v, id });
  else if (ui.stacks[ui.tab]) ui.stacks[ui.tab].push({ v, id });
  render();
}
function pop(fromSheet) {
  if (fromSheet && ui.sheets.length) {
    const s = ui.sheets.at(-1);
    if (s.stack.length > 1) s.stack.pop(); else ui.sheets.pop();
  } else ui.stacks[ui.tab]?.pop();
  render();
}

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

/* ---------------------------------------------------------------- map
   MapLibre + OpenFreeMap vector tiles, styled in mapstyle.js. Houses, territories and the
   drawing draft are GeoJSON sources layered on top of the base map. */

let map, userMarker, userLatLng = null, centeredOnUser = false;
const PIN_ZOOM = 15; // below this, pins become plain dots
const pinImages = new Set(); // image ids already added to the current style
const FIT_PADDING = { top: 120, bottom: 200, left: 40, right: 40 };

function initMap() {
  const c = S.mapCenter || DEFAULT_CENTER;
  map = new maplibregl.Map({
    container: 'map',
    style: knockMapStyle(darkMode.matches),
    center: [c[1], c[0]],
    zoom: S.mapZoom && S.mapZoom <= 20 ? S.mapZoom : 16,
    attributionControl: false,
    maxPitch: 60,
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
  map.touchZoomRotate.enableRotation();

  map.on('style.load', () => { pinImages.clear(); addOverlays(); drawMap(); updateCompass(); });
  // Start the credits collapsed to the small (i) button.
  map.once('load', () => $('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show'));
  map.on('styleimagemissing', (e) => {
    // Pins are drawn asynchronously; give MapLibre a blank stand-in until the real one is ready.
    if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) });
  });
  map.on('click', onMapClick);
  map.on('moveend', () => {
    const m = map.getCenter();
    S.mapCenter = [m.lat, m.lng];
    S.mapZoom = map.getZoom();
    save();
  });
  map.on('rotate', updateCompass);
  map.on('pitch', updateCompass);

  if (!S.mapCenter && S.houses.length) map.once('load', fitHouses);

  if ('geolocation' in navigator) {
    navigator.geolocation.watchPosition((pos) => {
      userLatLng = [pos.coords.latitude, pos.coords.longitude];
      if (!userMarker) {
        const el = document.createElement('div');
        el.className = 'user-dot';
        userMarker = new maplibregl.Marker({ element: el }).setLngLat([userLatLng[1], userLatLng[0]]).addTo(map);
      } else userMarker.setLngLat([userLatLng[1], userLatLng[0]]);
      if (!centeredOnUser && !S.mapCenter) { map.jumpTo({ center: [userLatLng[1], userLatLng[0]], zoom: 16 }); centeredOnUser = true; }
    }, () => {}, { enableHighAccuracy: true, maximumAge: 10000 });
  }
}

function addOverlays() {
  const empty = { type: 'FeatureCollection', features: [] };
  for (const id of ['terr', 'draft', 'houses']) if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data: empty });
  const below = map.getLayer('label-water') ? 'label-water' : undefined;
  map.addLayer({ id: 'terr-fill', type: 'fill', source: 'terr', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.12 } }, below);
  map.addLayer({ id: 'terr-line', type: 'line', source: 'terr', paint: { 'line-color': ['get', 'color'], 'line-width': 2 } }, below);
  map.addLayer({
    id: 'draft-line', type: 'line', source: 'draft', filter: ['==', ['geometry-type'], 'LineString'],
    paint: { 'line-color': '#0090FF', 'line-width': 2, 'line-dasharray': [3, 2] },
  });
  map.addLayer({
    id: 'draft-pts', type: 'circle', source: 'draft', filter: ['==', ['geometry-type'], 'Point'],
    paint: { 'circle-radius': 5, 'circle-color': '#0090FF', 'circle-stroke-color': '#fff', 'circle-stroke-width': 2 },
  });
  map.addLayer({
    id: 'houses-dot', type: 'circle', source: 'houses', maxzoom: PIN_ZOOM,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 3, PIN_ZOOM, 6.5],
      'circle-color': ['get', 'color'], 'circle-stroke-color': ['get', 'stroke'], 'circle-stroke-width': 1.5,
    },
  });
  map.addLayer({
    id: 'houses-pin', type: 'symbol', source: 'houses', minzoom: PIN_ZOOM,
    layout: {
      'icon-image': ['get', 'icon'], 'icon-size': ['interpolate', ['linear'], ['zoom'], PIN_ZOOM, 0.75, 17, 0.9],
      'icon-allow-overlap': true, 'icon-ignore-placement': true,
    },
  });
}

/** A pin image: colored disc, white ring, white status icon (or a white disc with a gray house). */
function pinSVG(status) {
  const fill = status ? status.colorHex : '#FFFFFF', ring = status ? '#FFFFFF' : '#8B8D98', fg = status ? '#FFFFFF' : '#8B8D98';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 36 36">` +
    `<defs><filter id="s" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1" stdDeviation="1.1" flood-opacity=".32"/></filter></defs>` +
    `<circle cx="18" cy="18" r="13.5" fill="${fill}" stroke="${ring}" stroke-width="2.4" filter="url(#s)"/>` +
    `<g transform="translate(11 11) scale(0.5833)" fill="none" stroke="${fg}" color="${fg}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">${ICON[status ? status.symbol : 'house'] || ICON.question}</g></svg>`;
}
const pinId = (s) => (s ? `pin:${s.colorHex}:${s.symbol}` : 'pin:none');

function ensurePin(status) {
  const id = pinId(status);
  if (pinImages.has(id)) return;
  pinImages.add(id);
  const img = new Image(72, 72);
  img.onload = () => {
    if (!map.style) return;
    if (map.hasImage(id)) map.removeImage(id);
    map.addImage(id, img, { pixelRatio: 2 });
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSVG(status))}`;
}

function visibleHouses() {
  return S.houses.filter((h) => (h.statusId && get('statuses', h.statusId) ? !ui.hidden.has(h.statusId) : !ui.hideUnknocked));
}

function drawMap() {
  if (!map?.getSource('houses')) return;
  const sById = Object.fromEntries(S.statuses.map((s) => [s.id, s]));
  ensurePin(null);
  S.statuses.forEach(ensurePin);
  map.getSource('houses').setData({
    type: 'FeatureCollection',
    features: visibleHouses().map((h) => {
      const s = sById[h.statusId];
      return {
        type: 'Feature', geometry: { type: 'Point', coordinates: [h.longitude, h.latitude] },
        properties: { id: h.id, icon: pinId(s), color: s ? s.colorHex : '#FFFFFF', stroke: s ? '#FFFFFF' : '#8B8D98' },
      };
    }),
  });
  map.getSource('terr').setData({
    type: 'FeatureCollection',
    features: S.territories.filter((t) => t.points.length >= 3).map((t) => {
      const ring = t.points.map((p) => [p.lon, p.lat]);
      return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...ring, ring[0]]] }, properties: { color: t.colorHex } };
    }),
  });
  const d = ui.draft.map((p) => [p.lng, p.lat]);
  map.getSource('draft').setData({
    type: 'FeatureCollection',
    features: [
      ...(d.length > 1 ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: d.length > 2 ? [...d, d[0]] : d }, properties: {} }] : []),
      ...d.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: {} })),
    ],
  });
}

function onMapClick(e) {
  if (ui.mapMode === 'drawing') { ui.draft.push(e.lngLat); drawMap(); renderMapUI(); return; }
  // Generous hit box so pins are easy to tap with a finger.
  const p = e.point, r = 14;
  const layers = ['houses-pin', 'houses-dot'].filter((id) => map.getLayer(id));
  const hit = layers.length ? map.queryRenderedFeatures([[p.x - r, p.y - r], [p.x + r, p.y + r]], { layers }) : [];
  if (hit.length) openHouse(hit[0].properties.id, false);
  else addHouse(e.lngLat);
}

function updateCompass() {
  const tilted = map.getPitch() > 8;
  if (map.getLayer('building-3d') && (map.getLayoutProperty('building-3d', 'visibility') === 'visible') !== tilted) {
    map.setLayoutProperty('building-3d', 'visibility', tilted ? 'visible' : 'none');
    map.setLayoutProperty('building', 'visibility', tilted ? 'none' : 'visible');
  }
  const el = $('#compass');
  if (!el) return;
  const b = map.getBearing();
  el.classList.toggle('show', Math.abs(b) > 0.5 || map.getPitch() > 1);
  el.querySelector('.needle').style.transform = `rotate(${-b}deg)`;
}

function boundsOf(points) {
  const b = new maplibregl.LngLatBounds();
  points.forEach(([lat, lon]) => b.extend([lon, lat]));
  return b;
}

function fitHouses() {
  if (!S.houses.length) return;
  map.fitBounds(boundsOf(S.houses.map((h) => [h.latitude, h.longitude])), { padding: FIT_PADDING, maxZoom: 17.5, duration: 700 });
}

function renderMapUI() {
  const prevScroll = $('#map-ui .chips')?.scrollLeft || 0;
  const chips =
    `<button class="fchip${ui.hideUnknocked ? ' off' : ''}" style="background:#8B8D98" data-act="chip" data-id="unknocked">${ic('house')}Unknocked</button>` +
    statuses().map((s) => `<button class="fchip${ui.hidden.has(s.id) ? ' off' : ''}" style="background:${tone(s.colorHex)}" data-act="chip" data-id="${s.id}">${ic(s.symbol)}${esc(s.name)}</button>`).join('');
  let bottom;
  if (ui.mapMode === 'drawing') {
    bottom = `<div class="bar-card"><span class="grow"><b>Drawing territory</b><small>Tap the map to add corners (${ui.draft.length})</small></span>` +
      `<button class="icon-btn link" data-act="draw-undo" aria-label="Undo"${ui.draft.length ? '' : ' disabled'}>${ic('back')}</button>` +
      `<button class="pill-btn" data-act="draw-cancel">Cancel</button><button class="pill-btn primary" data-act="draw-save"${ui.draft.length < 3 ? ' disabled' : ''}>Save</button></div>`;
  } else {
    const mine = S.visits.filter((v) => v.repId === me()?.id && inPeriod(v.date, 'today'));
    const leads = mine.filter((v) => isLeadish(get('statuses', v.statusId))).length;
    bottom = `<div class="bar-card"><span class="stat"><b>${mine.length}</b><small>doors today</small></span><i class="vdiv"></i>` +
      `<span class="stat"><b>${leads}</b><small>leads</small></span><i class="vdiv"></i><span class="stat"><b>${S.houses.length}</b><small>on map</small></span>` +
      `<span class="grow hint">Tap map to add a house</span></div>`;
  }
  $('#map-ui').innerHTML =
    `<div class="map-top"><div class="chips">${chips}</div><button class="round-btn" data-act="map-menu" aria-label="Map menu">${ic('dots')}</button></div>` +
    `<button class="round-btn locate" data-act="locate" aria-label="My location">${ic('locate')}</button>` +
    `<button class="round-btn compass" id="compass" data-act="north" aria-label="Face north"><span class="needle"><i></i><b>N</b></span></button>` +
    `<div class="map-bottom">${bottom}</div>`;
  const ch = $('#map-ui .chips');
  if (ch) ch.scrollLeft = prevScroll;
  if (map) updateCompass();
}

let geoQueue = Promise.resolve();
function reverseGeocode(lat, lon) {
  // Nominatim allows about one request per second.
  const job = geoQueue.then(async () => {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
      const j = await r.json();
      const a = j.address || {};
      return [a.house_number, a.road].filter(Boolean).join(' ') || (j.display_name || '').split(',')[0] || null;
    } catch { return null; }
  });
  geoQueue = job.then(() => new Promise((res) => setTimeout(res, 1100)));
  return job;
}

function addHouse(latlng) {
  const h = { id: uid(), latitude: latlng.lat, longitude: latlng.lng, address: '', notes: '', statusId: null, createdAt: nowISO() };
  S.houses.push(h);
  save();
  openHouse(h.id, true);
  reverseGeocode(h.latitude, h.longitude).then((addr) => {
    const cur = get('houses', h.id);
    if (!addr || !cur || cur.address) return;
    cur.address = addr;
    save();
    const input = document.querySelector(`[data-bind="houses.${h.id}.address"]`);
    if (input && document.activeElement !== input) input.value = addr;
    document.querySelectorAll(`[data-title="${h.id}"]`).forEach((el) => { el.textContent = addr; });
  });
}

function openHouse(id, isNew) {
  openSheet({
    stack: [{ v: 'house', id }],
    // A house added by tapping the map is thrown away if the sheet closes without anything logged.
    onClose: () => {
      const h = get('houses', id);
      if (isNew && h && !h.statusId && !visitsOf(h).length && !h.notes && !customerOf(h)) {
        deleteHouse(id);
        drawMap();
        renderMapUI();
      } else if (ui.tab === 'map') drawMap();
    },
  });
}

/* ---------------------------------------------------------------- files */

async function shareOrDownload(name, text, type) {
  const file = new File([text], name, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title: name }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function housesCSV() {
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Address', 'Latitude', 'Longitude', 'Status', 'Last knock', 'Last rep', 'Knocks', 'Customer', 'Phone', 'Email', 'Stage', 'Deal value', 'House notes']];
  for (const h of S.houses) {
    const vs = visitsOf(h), c = customerOf(h);
    rows.push([
      h.address, h.latitude.toFixed(6), h.longitude.toFixed(6), get('statuses', h.statusId)?.name || '',
      vs[0] ? new Date(vs[0].date).toLocaleString() : '', get('reps', vs[0]?.repId)?.name || '', vs.length,
      c ? fullName(c) : '', c?.phone || '', c?.email || '', get('stages', c?.stageId)?.name || '', c?.dealValue || '', h.notes,
    ]);
  }
  return rows.map((r) => r.map(q).join(',')).join('\n');
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const j = JSON.parse(reader.result);
      const data = j.data || j;
      const need = ['reps', 'statuses', 'stages', 'houses', 'visits', 'customers', 'appointments', 'territories'];
      if (!need.every((k) => Array.isArray(data[k]))) throw new Error('bad file');
      if (!confirm('Replace everything in Knock with this backup?')) return;
      S = data;
      save();
      ui.stacks = { customers: [], planner: [], pipeline: [], team: [] };
      ui.sheets = [];
      render();
      toast('Backup restored');
    } catch { alert('That file is not a Knock backup.'); }
  };
  reader.readAsText(file);
}

/* ---------------------------------------------------------------- actions */

const A = {
  tab({ tab }) {
    if (ui.tab === tab && ui.stacks[tab]) ui.stacks[tab] = [];
    ui.tab = tab;
    render();
    if (tab === 'map') setTimeout(() => {
      map.resize();
      if (ui.fitOnShow) { fitHouses(); ui.fitOnShow = false; }
    }, 0);
  },
  push({ v, id }, el) { push(v, id, !!el.closest('.sheet')); },
  pop(_, el) { pop(!!el.closest('.sheet')); },
  'sheet-close': () => closeSheet(),
  'sheet-dismiss': () => closeSheet(),

  knock({ house, status }) {
    const h = get('houses', house), s = get('statuses', status);
    if (!h || !s) return;
    const note = $('#visit-note')?.value.trim() || '';
    S.visits.push({ id: uid(), date: nowISO(), note, houseId: h.id, repId: me()?.id || null, statusId: s.id });
    h.statusId = s.id;
    save();
    navigator.vibrate?.(12);
    if (isLeadish(s) && !customerOf(h)) { const c = createCustomer(h); push('customer', c.id, true); } else render();
    drawMap();
  },
  'cust-create'({ house }) { const c = createCustomer(get('houses', house)); push('customer', c.id, true); },
  'cust-new'() { const c = createCustomer(null); push('customer', c.id, false); },
  'cust-del'({ id }, el) {
    if (!confirm('Delete this customer and their appointments?')) return;
    deleteCustomer(id);
    pop(!!el.closest('.sheet'));
  },
  'house-del'({ id }) {
    if (!confirm('Delete this house and its history?')) return;
    deleteHouse(id);
    closeSheet();
  },

  'appt-new'({ customer }) {
    const base = ui.tab === 'planner' ? keyToDate(ui.day) : new Date();
    const start = new Date(base);
    if (dayKey(base) === dayKey(new Date())) { start.setTime(Date.now()); start.setMinutes(0, 0, 0); start.setHours(start.getHours() + 1); } else start.setHours(10, 0, 0, 0);
    const draft = { customerId: customer || '', start: start.toISOString(), durationMinutes: 60, setterId: me()?.id || '', closerId: '', outcome: 'scheduled', notes: '' };
    openSheet({ stack: [{ v: 'appt', draft }] });
  },
  'appt-edit'({ id }) {
    const a = get('appointments', id);
    if (!a) return;
    openSheet({ stack: [{ v: 'appt', id, draft: { ...a, customerId: a.customerId || '', setterId: a.setterId || '', closerId: a.closerId || '' } }] });
  },
  'appt-save'(_, el) {
    const e = topEntry(el), d = e.draft;
    const clean = { ...d, customerId: d.customerId || null, setterId: d.setterId || null, closerId: d.closerId || null };
    if (e.id) Object.assign(get('appointments', e.id), clean); else S.appointments.push({ id: uid(), ...clean });
    save();
    closeSheet();
  },
  'appt-del'({ id }) {
    if (!confirm('Delete this appointment?')) return;
    S.appointments = S.appointments.filter((a) => a.id !== id);
    save();
    closeSheet();
  },
  today() { ui.day = dayKey(new Date()); const d = new Date(); ui.month = new Date(d.getFullYear(), d.getMonth(), 1); render(); },
  day({ date }) { ui.day = date; render(); },
  month({ d }) { ui.month = new Date(ui.month.getFullYear(), ui.month.getMonth() + Number(d), 1); render(); },

  'move-sheet'({ id }) { openSheet({ stack: [{ v: 'move', id }] }); },
  'move-to'({ id, stage }) { const c = get('customers', id); if (c) c.stageId = stage; save(); closeSheet(); },

  period({ p }) { ui.period = p; render(); },
  'rep-add'() {
    const name = prompt('New teammate')?.trim();
    if (!name) return;
    S.reps.push({ id: uid(), name, colorHex: PALETTE[S.reps.length % PALETTE.length], isMe: false });
    save();
    render();
  },
  'set-me'({ id }) { S.reps.forEach((r) => { r.isMe = r.id === id; }); save(); render(); },
  'rep-del'({ id }) { if (confirm('Remove this teammate? Their past knocks stay, unassigned.')) { deleteRep(id); render(); } },

  'status-add'() {
    const s = { id: uid(), name: 'New status', symbol: 'question', colorHex: PALETTE[5], kind: 'neutral', order: Math.max(-1, ...S.statuses.map((x) => x.order)) + 1 };
    S.statuses.push(s);
    save();
    push('status', s.id, false);
  },
  'status-del'({ id }) { if (confirm('Delete this status? Houses using it become unknocked.')) { deleteStatus(id); pop(false); } },
  'stage-add'() {
    const s = { id: uid(), name: 'New stage', colorHex: PALETTE[3], order: Math.max(-1, ...S.stages.map((x) => x.order)) + 1 };
    S.stages.push(s);
    save();
    push('stage', s.id, false);
  },
  'stage-del'({ id }) { if (confirm('Delete this stage? Its customers move to “No stage”.')) { deleteStage(id); pop(false); } },
  set({ bind, val }) { setBind(bind, val); render(); },
  'draft-set'({ field, val }, el) { const e = topEntry(el); if (e) e.draft[field] = val; render(); },

  demo() {
    const c = map ? map.getCenter() : null;
    loadDemo(c ? [c.lat, c.lng] : (userLatLng || DEFAULT_CENTER));
    ui.fitOnShow = true;
    ui.demoMsg = 'Demo loaded — check the Map tab.';
    render();
  },
  'export-json'() {
    shareOrDownload(`knock-backup-${dayKey(new Date())}.json`, JSON.stringify({ app: 'Knock', exportedAt: nowISO(), data: S }, null, 1), 'application/json');
  },
  'export-csv'() { shareOrDownload(`knock-houses-${dayKey(new Date())}.csv`, housesCSV(), 'text/csv'); },
  erase() {
    if (!confirm('Erase every house, customer and appointment? This cannot be undone.')) return;
    S = defaults();
    save();
    ui.demoMsg = '';
    render();
  },

  chip({ id }) {
    if (id === 'unknocked') ui.hideUnknocked = !ui.hideUnknocked;
    else if (ui.hidden.has(id)) ui.hidden.delete(id); else ui.hidden.add(id);
    render();
  },
  'map-menu'() { openSheet({ stack: [{ v: 'mapMenu' }] }); },
  'draw-start'() { ui.sheets = []; ui.mapMode = 'drawing'; ui.draft = []; render(); },
  'draw-undo'() { ui.draft.pop(); render(); },
  'draw-cancel'() { ui.mapMode = 'knock'; ui.draft = []; render(); },
  'draw-save'() { if (ui.draft.length >= 3) openSheet({ stack: [{ v: 'terrNew', draft: { name: '', colorHex: PALETTE[6], repId: '' } }] }); },
  'terr-save'(_, el) {
    const d = topEntry(el).draft;
    S.territories.push({ id: uid(), name: d.name.trim() || 'Territory', colorHex: d.colorHex, repId: d.repId || null, createdAt: nowISO(), points: ui.draft.map((p) => ({ lat: p.lat, lon: p.lng })) });
    save();
    ui.draft = [];
    ui.mapMode = 'knock';
    closeSheet();
  },
  'open-terrs'(_, el) { const s = ui.sheets.at(-1); if (s && el.closest('.sheet')) { s.stack.push({ v: 'terrs' }); render(); } else openSheet({ stack: [{ v: 'terrs' }] }); },
  'focus-terr'({ id }) {
    const t = get('territories', id);
    if (!t) return;
    ui.sheets = [];
    render();
    map.fitBounds(boundsOf(t.points.map((p) => [p.lat, p.lon])), { padding: FIT_PADDING, duration: 700 });
  },
  'terr-del'({ id }) {
    if (!confirm('Delete this territory?')) return;
    S.territories = S.territories.filter((t) => t.id !== id);
    save();
    render();
  },
  fit() { ui.sheets = []; render(); fitHouses(); },
  north() { map.easeTo({ bearing: 0, pitch: 0, duration: 500 }); },
  locate() {
    const go = () => map.easeTo({ center: [userLatLng[1], userLatLng[0]], zoom: Math.max(map.getZoom(), 16.5), duration: 600 });
    if (userLatLng) { go(); return; }
    navigator.geolocation?.getCurrentPosition(
      (p) => { userLatLng = [p.coords.latitude, p.coords.longitude]; go(); },
      () => toast('Location is off — allow it in Settings to center the map on you'),
    );
  },
};

/* ---------------------------------------------------------------- binding */

function convert(t) {
  const type = t.dataset.type;
  if (type === 'number') return parseFloat(t.value) || 0;
  if (type === 'pos') return Math.max(0, (parseInt(t.value, 10) || 1) - 1);
  if (type === 'datetime') return t.value ? new Date(t.value).toISOString() : nowISO();
  if (t.tagName === 'SELECT' && t.dataset.bind?.endsWith('Id')) return t.value || null;
  return t.value;
}

function setBind(path, val) {
  const [coll, id, field] = path.split('.');
  const o = get(coll, id);
  if (!o) return;
  o[field] = val;
  save();
  if (coll === 'customers' && (field === 'firstName' || field === 'lastName')) setTitle(id, fullName(o));
  if (coll === 'customers' && (field === 'phone' || field === 'email')) { const l = $(`#links-${id}`); if (l) l.innerHTML = linksHTML(o); }
  if (coll === 'houses' && field === 'address') setTitle(id, o.address || 'New house');
  if ((coll === 'statuses' || coll === 'stages') && field === 'name') setTitle(id, o.name);
}
const setTitle = (id, text) => document.querySelectorAll(`[data-title="${id}"]`).forEach((el) => { el.textContent = text; });

document.addEventListener('click', (e) => {
  if (e.target.closest('select, input, textarea')) return;
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.act];
  if (fn) fn(el.dataset, el);
});

document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'cust-search') { ui.search = t.value; $('#cust-list').innerHTML = customerListHTML(); return; }
  if (t.dataset.bind) setBind(t.dataset.bind, convert(t));
  if (t.dataset.draft) { const entry = topEntry(t); if (entry) entry.draft[t.dataset.draft] = convert(t); }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'import-file' && t.files[0]) { importBackup(t.files[0]); t.value = ''; return; }
  if (t.tagName === 'SELECT' && t.dataset.bind) { setBind(t.dataset.bind, convert(t)); render(); }
  if (t.dataset.bind?.endsWith('.order')) render();
});

/* ---------------------------------------------------------------- boot */

initMap();
render();
// A full style reload (diff: false) fires style.load, which re-adds the houses/territory layers.
darkMode.addEventListener('change', () => { map.setStyle(knockMapStyle(darkMode.matches), { diff: false }); render(); });
navigator.storage?.persist?.();
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js');
