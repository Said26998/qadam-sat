/* Qadam SAT: sign-in gate and Firebase connection. Runs before the app starts. */
(function () {
  'use strict';
  const cfg = window.QADAM_CONFIG || {};
  const $ = id => document.getElementById(id);
  const msg = (t, bad) => { const m = $('gMsg'); m.textContent = t || ''; m.className = 'gmsg' + (bad ? ' bad' : ''); };
  // Running inside the Android/iOS app (mobile/ folder): Google blocks its sign-in page inside apps, so the app uses email or username.
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  window.QADAM_NATIVE = NATIVE;
  if (NATIVE) {
    document.documentElement.classList.add('native');
    $('gGoogle').hidden = true; $('gOr').hidden = true;
    const n = $('gAppNote'); if (n) n.hidden = false;
    nativeBack();
  }
  const configured = cfg.firebase && cfg.firebase.apiKey && !/^PASTE/.test(cfg.firebase.apiKey);
  if (!configured || !window.firebase) {
    $('gForm').hidden = true; $('gGoogle').hidden = true; $('gOr').hidden = true;
    msg(!configured ? 'This site is not connected to its database yet. The teacher needs to fill in config.js (see SETUP.md).' : 'Could not load the sign-in service. Check your internet connection and reload.', true);
    return;
  }
  firebase.initializeApp(cfg.firebase);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}

  const ERR = {
    'auth/invalid-credential': 'That email and password do not match. Try again or reset your password.',
    'auth/wrong-password': 'That email and password do not match. Try again or reset your password.',
    'auth/user-not-found': 'No account uses that email yet. Tap "Create an account".',
    'auth/email-already-in-use': 'An account already uses that email. Sign in instead.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/invalid-email': 'That email address does not look right.',
    'auth/missing-password': 'Enter your password.',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes, then try again.',
    'auth/network-request-failed': 'No internet connection. Connect and try again.',
    'auth/unauthorized-domain': 'This website address is not approved for sign-in yet. The teacher must add it in Firebase: Authentication > Settings > Authorized domains.',
    'auth/popup-closed-by-user': 'Sign-in window closed before finishing. Try again.',
  };
  // Students without an email sign up with a username. It is stored as a never-delivered address on the reserved example.com domain.
  const UDOM = '@example.com';
  const isUser = em => /^qadam\.[a-z0-9._-]+@example\.com$/.test(em || '');
  const toEmail = v => {
    if (v.includes('@')) return v;
    const u = v.toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw { code: 'qadam/bad-username' };
    return 'qadam.' + u + UDOM;
  };
  // Teacher tool: a second, separate sign-in connection creates or resets student logins without signing the teacher out.
  let adminAuth = null;
  const admin = () => {
    if (!adminAuth) { adminAuth = firebase.initializeApp(cfg.firebase, 'qadam-admin').auth(); adminAuth.setPersistence(firebase.auth.Auth.Persistence.NONE).catch(() => {}); }
    return adminAuth;
  };
  const uname = v => { const u = String(v || '').trim().toLowerCase(); if (!/^[a-z0-9._-]{3,30}$/.test(u)) throw { code: 'qadam/bad-username' }; return u; };
  const adminErr = e => { const m = (ERR[e && e.code] || (e && e.message) || 'Something went wrong.'); const x = new Error(m); x.code = e && e.code; return x; };
  window.QADAM_ADMIN = {
    create: async (username, pw, name) => {
      try { const a = admin(); const c = await a.createUserWithEmailAndPassword(toEmail(uname(username)), pw);
        if (name) await c.user.updateProfile({ displayName: name }); const id = c.user.uid; await a.signOut(); return id; }
      catch (e) { if (e && e.code === 'auth/email-already-in-use') throw adminErr({ message: 'That username is already taken. Choose another one.' }); throw adminErr(e); }
    },
    reset: async (username, oldPw, newPw) => {
      try { const a = admin(); const c = await a.signInWithEmailAndPassword(toEmail(uname(username)), oldPw); await c.user.updatePassword(newPw); await a.signOut(); }
      catch (e) { if (e && (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password')) throw adminErr({ message: 'The saved password no longer works, so this login cannot be reset here.' }); throw adminErr(e); }
    },
  };
  ERR['qadam/bad-username'] = 'A username needs 3 to 30 letters, numbers, dots or dashes, with no spaces.';
  ERR['auth/user-not-found'] = 'No account uses that email or username yet. Tap "Create an account".';
  ERR['auth/invalid-credential'] = 'That email or username and password do not match. Try again.';
  ERR['auth/email-already-in-use'] = 'That email or username is already taken. Sign in, or choose another username.';
  const fail = e => { msg(ERR[e && e.code] || ('Sign-in failed: ' + ((e && e.message) || 'unknown error')), true); busy(false); };
  const busy = on => document.querySelectorAll('#gate button').forEach(b => b.disabled = on);

  let mode = 'in', signingUp = false;
  const setMode = m => { mode = m; $('gNameRow').hidden = m !== 'up'; $('gSubmit').textContent = m === 'up' ? 'Create account' : 'Sign in';
    $('gSwap').textContent = m === 'up' ? 'I already have an account' : 'Create an account'; $('gPw').autocomplete = m === 'up' ? 'new-password' : 'current-password'; msg(''); };
  $('gSwap').onclick = () => setMode(mode === 'up' ? 'in' : 'up');
  $('gGoogle').onclick = () => {
    busy(true); msg('');
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
    auth.signInWithPopup(p).catch(e => (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment') ? auth.signInWithRedirect(p) : fail(e));
  };
  $('gForm').onsubmit = e => {
    e.preventDefault(); busy(true); msg('');
    let em; try { em = toEmail($('gEmail').value.trim()); } catch (x) { fail(x); return; }
    const pw = $('gPw').value, nm = $('gName').value.trim();
    if (mode === 'up') {
      if (!nm) { msg('Enter your name so your teacher knows who you are.', true); busy(false); return; }
      signingUp = true;
      auth.createUserWithEmailAndPassword(em, pw).then(c => c.user.updateProfile({ displayName: nm }).then(() => isUser(em) ? null : c.user.sendEmailVerification().catch(() => {})).then(() => { signingUp = false; start(auth.currentUser); })).catch(e => { signingUp = false; fail(e); });
    } else auth.signInWithEmailAndPassword(em, pw).catch(fail);
  };
  $('gReset').onclick = () => {
    const em = $('gEmail').value.trim();
    if (!em) { msg('Type your email above first, then tap "Forgot password".', true); return; }
    if (!em.includes('@')) { msg('Accounts with a username cannot reset by email. Ask your teacher for help.', true); return; }
    auth.sendPasswordResetEmail(em).then(() => msg('Check your inbox for a link to set a new password.')).catch(fail);
  };
  auth.getRedirectResult().catch(fail);

  let started = false;
  function start(u) {
    if (started) return; started = true;
    window.QADAM_UID = u.uid;
    window.QADAM_PROFILE = { name: u.displayName || '', email: isUser(u.email) ? '' : (u.email || '') };
    if (isUser(u.email)) window.QADAM_PROFILE.username = u.email.slice(6, -UDOM.length);
    window.QADAM_VERIFIED = !!u.emailVerified || isUser(u.email);
    window.QADAM_VERIFY = () => u.sendEmailVerification();
    // A Google account can add a password, so the same account also signs in inside the mobile app.
    const provs = (u.providerData || []).map(p => p && p.providerId);
    window.QADAM_APP_PW = provs.includes('google.com') && !provs.includes('password') && u.email ? (pw => u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, pw))
      .then(() => { window.QADAM_APP_PW = null; }, e => { if (e && e.code === 'auth/requires-recent-login') throw new Error('For safety, sign out, sign in with Google again, then set the password.'); throw new Error(ERR[e && e.code] || (e && e.message) || 'Could not set the password.'); })) : null;
    window.QADAM_SIGNOUT = () => auth.signOut().then(() => location.reload());
    // The teacher is whoever the database rules let read the whole class list; no email is stored in the site.
    // Refresh the sign-in token first so a just-verified email counts.
    const teacherCheck = u.reload().catch(() => {}).then(() => u.getIdToken(true)).catch(() => {})
      .then(() => fs.collection('students').limit(1).get({ source: 'server' })).then(() => { window.QADAM_TEACHER_ERR = ''; return true; }, e => { window.QADAM_TEACHER_ERR = (e && e.code) || 'unknown'; return false; });
    const clean = o => JSON.parse(JSON.stringify(o));
    const userNs = { isOwner: () => teacherCheck, id: async () => u.uid, profiles: async () => ({}) };
    const dbNs = {
      doc: p => ({
        get: async () => { const s = await fs.doc(p).get(); return { exists: s.exists, data: () => s.data() }; },
        set: d => fs.doc(p).set(clean(d)),
        delete: () => fs.doc(p).delete(),
      }),
      collection: p => ({
        onSnapshot: (next, err) => fs.collection(p).onSnapshot(s => next({ docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }), err),
        get: async () => { const s = await fs.collection(p).get({ source: 'server' }); return { docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }; },
        setMany: async list => { for (let i = 0; i < list.length; i += 400) { const b = fs.batch(); list.slice(i, i + 400).forEach(([id, d]) => b.set(fs.collection(p).doc(id), clean(d))); await b.commit(); } },
      }),
    };
    window.claude = { use: async n => n === 'user' ? userNs : n === 'db' ? dbNs : null };
    $('gate').hidden = true; $('app').hidden = false; document.querySelector('.nav').hidden = false;
    window.startQadam();
  }
  // Android back button inside the app: close a sheet, then the open lesson, then an open topic, then go to Learn, then leave the app.
  function nativeBack() {
    const A = window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (!A || !A.addListener) return;
    A.addListener('backButton', () => {
      const vis = el => el && !el.hidden;
      const modal = $('modal'), lesson = $('lesson');
      if (vis(modal)) { const sc = modal.querySelector('[data-close-scrim]'); if (sc) sc.click(); else { modal.hidden = true; modal.innerHTML = ''; } return; }
      if (vis(lesson)) { const x = lesson.querySelector('.hd .x'); if (x) x.click(); return; }
      if (history.state && history.state.qadamChest) { history.back(); return; }
      const nav = document.querySelector('.nav'), cur = nav && nav.querySelector('[aria-current="page"]');
      if (vis(nav) && cur && cur.dataset.tab !== 'learn') { const l = nav.querySelector('[data-tab="learn"]'); if (l) { l.click(); return; } }
      A.minimizeApp ? A.minimizeApp() : A.exitApp();
    });
  }
  auth.onAuthStateChanged(u => {
    $('gLoading').hidden = true;
    if (u && signingUp) return;
    if (u) start(u);
    else { $('gBox').hidden = false; busy(false); if (started) location.reload(); }
  });
})();
