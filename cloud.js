'use strict';
/* Team sync for Knock (Firebase).

   Everyone on the team signs in; their knocks, customers, appointments and territories are stored in
   Firestore and stream to every phone live. Firestore keeps a copy on the phone, so the app works with
   no signal and catches up when it reconnects.

   The app keeps working on its in-memory `S` like before. After every save(), push() compares each
   record with what was last synced and writes only what changed; snapshots from Firestore are folded
   back into `S` and the screen re-renders.

   Access: only emails listed in the `members` collection can read or write (enforced by the Firestore
   security rules). The owner adds and removes members from Team → Team access.
   Loaded before app.js; app.js calls Cloud.init() when it boots. */

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBESIQBZrFfNhE3klrPo32vKgknC6MStbY',
  authDomain: 'knock-817e0.firebaseapp.com',
  projectId: 'knock-817e0',
  storageBucket: 'knock-817e0.firebasestorage.app',
  messagingSenderId: '518588875975',
  appId: '1:518588875975:web:c5e9e83d3fb59fb8466ae2',
};
const SHARED = ['reps', 'statuses', 'stages', 'houses', 'visits', 'customers', 'appointments', 'territories'];

const Cloud = {
  enabled: typeof firebase !== 'undefined',
  user: null,
  email: null,        // lowercase email of the signed-in teammate, once they have access
  role: null,         // 'owner' | 'member'
  ready: false,       // true once the team's data has loaded and pushes are allowed
  members: [],        // [{ email, role, name }]
  synced: Object.fromEntries(SHARED.map((c) => [c, new Map()])), // coll -> id -> JSON last seen in Firestore
  unsubs: [],
  db: null,
  auth: null,

  init() {
    if (!this.enabled) return; // Firebase scripts didn't load (first launch with no signal): stay local
    firebase.initializeApp(FIREBASE_CONFIG);
    this.db = firebase.firestore();
    this.db.settings({ ignoreUndefinedProperties: true, merge: true });
    this.db.enablePersistence({ synchronizeTabs: true }).catch(() => { /* private mode etc.: online only */ });
    this.auth = firebase.auth();
    this.auth.getRedirectResult().catch((e) => this.gate('signin', friendlyError(e)));
    this.gate('loading');
    this.auth.onAuthStateChanged((u) => this.onUser(u));
  },

  async onUser(user) {
    this.stop();
    this.user = user;
    if (!user) return this.gate('signin');
    const usesPassword = user.providerData.some((p) => p.providerId === 'password');
    if (usesPassword && !user.emailVerified) return this.gate('verify');
    this.gate('loading');
    const email = user.email.toLowerCase();
    try {
      const ref = this.db.collection('members').doc(email);
      let snap = await ref.get().catch(() => null);
      if (!snap || !snap.exists) {
        // Only the owner's email is allowed to add itself (see the security rules).
        await ref.set({ email, role: 'owner', name: user.displayName || email.split('@')[0], addedAt: new Date().toISOString() });
        snap = await ref.get();
      }
      this.role = snap.data().role || 'member';
      this.email = email;
      this.start();
    } catch (e) {
      this.gate('notInvited');
    }
  },

  /* ---------- live data ---------- */
  start() {
    const local = Object.fromEntries(SHARED.map((c) => [c, S[c]]));
    let pending = SHARED.length;
    const first = new Set();
    for (const coll of SHARED) {
      this.unsubs.push(this.db.collection(coll).onSnapshot((snap) => {
        if (!first.has(coll)) {
          // First load: the team's data replaces whatever this phone had.
          first.add(coll);
          S[coll] = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
          this.synced[coll] = new Map(S[coll].map((x) => [x.id, JSON.stringify(x)]));
          if (--pending === 0) this.loaded(local);
          return;
        }
        let changed = false;
        for (const ch of snap.docChanges()) {
          if (ch.doc.metadata.hasPendingWrites) continue; // our own write coming back
          const id = ch.doc.id;
          const i = S[coll].findIndex((x) => x.id === id);
          if (ch.type === 'removed') {
            if (i >= 0) S[coll].splice(i, 1);
            this.synced[coll].delete(id);
          } else {
            const rec = { ...ch.doc.data(), id };
            if (i >= 0) S[coll][i] = rec; else S[coll].push(rec);
            this.synced[coll].set(id, JSON.stringify(rec));
            if (coll === 'visits' && ch.type === 'added') announceSale(rec);
          }
          changed = true;
        }
        if (changed) { saveLocal(); scheduleRender(); }
      }, (e) => { if (e.code === 'permission-denied') this.gate('notInvited'); }));
    }
    this.unsubs.push(this.db.collection('members').onSnapshot((snap) => {
      this.members = snap.docs.map((d) => d.data()).sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : a.email.localeCompare(b.email)));
      scheduleRender();
    }, () => {}));
  },

  loaded(local) {
    if (!S.statuses.length && this.role === 'owner') {
      // Empty team and this is the owner: upload everything already on this phone.
      for (const c of SHARED) S[c] = local[c];
      this.synced = Object.fromEntries(SHARED.map((c) => [c, new Map()]));
      if (!S.statuses.length) Object.assign(S, Object.fromEntries(SHARED.map((c) => [c, defaults()[c]])));
      toast('Uploading your data to the team…');
    }
    this.ensureMyRep();
    this.ready = true;
    this.push();
    saveLocal();
    this.gate(null);
    render();
  },

  // Every signed-in teammate has a rep record tied to their email, so their knocks are credited to them.
  ensureMyRep() {
    if (S.reps.some((r) => r.email === this.email)) return;
    const legacy = this.role === 'owner' && S.reps.find((r) => r.isMe && !r.email);
    if (legacy) { legacy.email = this.email; delete legacy.isMe; return; }
    S.reps.push({ id: uid(), name: this.user.displayName || this.email.split('@')[0], colorHex: PALETTE[S.reps.length % PALETTE.length], email: this.email });
  },

  push() {
    if (!this.ready) return;
    const ops = [];
    for (const coll of SHARED) {
      const seen = this.synced[coll];
      const now = new Set();
      for (const x of S[coll]) {
        const { isMe, ...rec } = x; // "this device" is per phone, never shared
        const j = JSON.stringify(rec);
        now.add(x.id);
        if (seen.get(x.id) !== j) { ops.push(['set', coll, x.id, JSON.parse(j)]); seen.set(x.id, j); }
      }
      for (const id of [...seen.keys()]) if (!now.has(id)) { ops.push(['delete', coll, id]); seen.delete(id); }
    }
    for (let i = 0; i < ops.length; i += 450) {
      const batch = this.db.batch();
      for (const [op, coll, id, data] of ops.slice(i, i + 450)) {
        const ref = this.db.collection(coll).doc(id);
        if (op === 'set') batch.set(ref, data); else batch.delete(ref);
      }
      // Offline: Firestore queues this and sends it when the phone reconnects.
      batch.commit().catch((e) => toast(e.code === 'permission-denied' ? 'You no longer have access to this team' : 'Couldn’t sync — will retry'));
    }
  },

  stop() {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    this.ready = false;
    this.email = null;
    this.role = null;
    this.members = [];
  },

  /* ---------- team access (owner) ---------- */
  async invite(email) {
    email = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast('Enter a full email address');
    await this.db.collection('members').doc(email).set({ email, role: 'member', name: email.split('@')[0], addedAt: new Date().toISOString() });
    toast(`${email} can now sign in`);
  },
  async removeMember(email) {
    await this.db.collection('members').doc(email).delete();
    toast(`${email} removed`);
  },
  signOut() { this.auth.signOut(); },

  /* ---------- sign-in screen ---------- */
  gate(state, error = '') {
    const el = $('#gate');
    if (!el) return;
    el.hidden = !state;
    if (!state) return;
    const logo = '<div class="gate-logo">K<span>nock</span></div>';
    const err = error ? `<p class="gate-err">${esc(error)}</p>` : '';
    const email = esc(this.user?.email || '');
    const views = {
      loading: `${logo}<p class="gate-sub">Loading your team…</p>`,
      signin: `${logo}<p class="gate-sub">Sign in to see every door your team has knocked.</p>${err}
        <button class="gate-btn google" data-gate="google">Continue with Google</button>
        <div class="gate-or"><span>or use email</span></div>
        <input id="gate-email" type="email" autocomplete="email" placeholder="Email" inputmode="email">
        <input id="gate-pass" type="password" autocomplete="current-password" placeholder="Password (6+ characters)">
        <button class="gate-btn primary" data-gate="signin">Sign in</button>
        <button class="gate-btn" data-gate="signup">Create account</button>
        <button class="gate-link" data-gate="reset">Forgot password?</button>`,
      verify: `${logo}<p class="gate-sub">We sent a link to <b>${email}</b>. Tap it to confirm your email, then come back here.</p>${err}
        <button class="gate-btn primary" data-gate="verified">I tapped the link</button>
        <button class="gate-btn" data-gate="resend">Send the link again</button>
        <button class="gate-link" data-gate="signout">Use a different account</button>`,
      notInvited: `${logo}<p class="gate-sub"><b>${email}</b> isn’t on the team yet. Ask the owner to add this email in Team → Team access, then tap Try again.</p>
        <button class="gate-btn primary" data-gate="retry">Try again</button>
        <button class="gate-link" data-gate="signout">Use a different account</button>`,
    };
    el.innerHTML = `<div class="gate-card">${views[state]}</div>`;
  },

  async gateAction(act) {
    const a = this.auth;
    const em = () => ($('#gate-email')?.value || '').trim();
    const pw = () => $('#gate-pass')?.value || '';
    try {
      if (act === 'google') {
        const p = new firebase.auth.GoogleAuthProvider();
        p.setCustomParameters({ prompt: 'select_account' });
        try { await a.signInWithPopup(p); } catch (e) {
          if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) await a.signInWithRedirect(p);
          else throw e;
        }
      } else if (act === 'signin') await a.signInWithEmailAndPassword(em(), pw());
      else if (act === 'signup') {
        const cred = await a.createUserWithEmailAndPassword(em(), pw());
        await cred.user.sendEmailVerification();
        this.gate('verify');
      } else if (act === 'reset') {
        if (!em()) return this.gate('signin', 'Type your email above, then tap Forgot password.');
        await a.sendPasswordResetEmail(em());
        this.gate('signin', `Password reset link sent to ${em()}.`);
      } else if (act === 'verified') {
        await a.currentUser.reload();
        await a.currentUser.getIdToken(true);
        if (a.currentUser.emailVerified) this.onUser(a.currentUser);
        else this.gate('verify', 'Not confirmed yet. Open the link in the email first.');
      } else if (act === 'resend') { await a.currentUser.sendEmailVerification(); this.gate('verify', 'Sent. Check your inbox and spam folder.'); }
      else if (act === 'retry') this.onUser(a.currentUser);
      else if (act === 'signout') a.signOut();
    } catch (e) {
      this.gate(this.user && act !== 'google' && act !== 'signin' && act !== 'signup' ? 'verify' : 'signin', friendlyError(e));
    }
  },
};

// A teammate logged a knock with a "counts as sale" status (Sold): tell everyone who has the app open.
function announceSale(v) {
  const status = S.statuses.find((s) => s.id === v.statusId);
  if (status?.kind !== 'sale') return;
  if (v.repId && v.repId === me()?.id) return;                     // my own sale
  if (Date.now() - new Date(v.date).getTime() > 30 * 60 * 1000) return; // old knock syncing late
  const rep = S.reps.find((r) => r.id === v.repId);
  const house = S.houses.find((h) => h.id === v.houseId);
  showSaleAlert(`${rep?.name || 'A teammate'} made a sale!`, house?.address || '', v.houseId);
}

function showSaleAlert(title, sub, houseId) {
  const el = document.createElement('button');
  el.className = 'sale-alert';
  el.innerHTML = `<span class="sale-emoji">🎉</span><span class="grow"><b>${esc(title)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
  el.addEventListener('click', () => {
    el.remove();
    if (!houseId || !S.houses.some((h) => h.id === houseId)) return;
    ui.tab = 'map';
    ui.sheets = [];
    render();
    const h = S.houses.find((x) => x.id === houseId);
    map.flyTo({ center: [h.longitude, h.latitude], zoom: Math.max(map.getZoom(), 17.5) });
    openHouse(houseId, false);
  });
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('out'), 7000);
  setTimeout(() => el.remove(), 7600);
}

function friendlyError(e) {
  return ({
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'No account with that email. Tap Create account.',
    'auth/email-already-in-use': 'That email already has an account. Tap Sign in.',
    'auth/weak-password': 'Use at least 6 characters for the password.',
    'auth/invalid-email': 'That email address doesn’t look right.',
    'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
    'auth/network-request-failed': 'No internet connection. Try again when you have signal.',
    'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
    'auth/unauthorized-domain': 'This web address isn’t allowed yet. Add it in Firebase → Authentication → Settings → Authorized domains.',
  })[e?.code] || e?.message || 'Something went wrong. Try again.';
}

// Re-render after teammates' changes, but never while someone is typing in a field.
function scheduleRender() {
  clearTimeout(scheduleRender.t);
  scheduleRender.t = setTimeout(() => {
    const f = document.activeElement;
    if (f && f.matches('input, textarea, select') && !f.closest('#gate')) {
      f.addEventListener('blur', () => scheduleRender(), { once: true });
      return;
    }
    render();
  }, 150);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-gate]');
  if (b) Cloud.gateAction(b.dataset.gate);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'gate-pass') Cloud.gateAction('signin');
});
