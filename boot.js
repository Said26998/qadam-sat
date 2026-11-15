/* Qadam SAT: sign-in gate and Firebase connection. Runs before the app starts. */
(function () {
  'use strict';
  const cfg = window.QADAM_CONFIG || {};
  const $ = id => document.getElementById(id);
  const msg = (t, bad) => { const m = $('gMsg'); m.textContent = t || ''; m.className = 'gmsg' + (bad ? ' bad' : ''); };
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
    const em = $('gEmail').value.trim(), pw = $('gPw').value, nm = $('gName').value.trim();
    if (mode === 'up') {
      if (!nm) { msg('Enter your name so your teacher knows who you are.', true); busy(false); return; }
      signingUp = true;
      auth.createUserWithEmailAndPassword(em, pw).then(c => c.user.updateProfile({ displayName: nm }).then(() => c.user.sendEmailVerification().catch(() => {})).then(() => { signingUp = false; start(auth.currentUser); })).catch(e => { signingUp = false; fail(e); });
    } else auth.signInWithEmailAndPassword(em, pw).catch(fail);
  };
  $('gReset').onclick = () => {
    const em = $('gEmail').value.trim();
    if (!em) { msg('Type your email above first, then tap "Forgot password".', true); return; }
    auth.sendPasswordResetEmail(em).then(() => msg('Check your inbox for a link to set a new password.')).catch(fail);
  };
  auth.getRedirectResult().catch(fail);

  let started = false;
  function start(u) {
    if (started) return; started = true;
    window.QADAM_UID = u.uid;
    window.QADAM_PROFILE = { name: u.displayName || '', email: u.email || '' };
    window.QADAM_VERIFIED = !!u.emailVerified;
    window.QADAM_VERIFY = () => u.sendEmailVerification();
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
      }),
      collection: p => ({
        onSnapshot: (next, err) => fs.collection(p).onSnapshot(s => next({ docs: s.docs.map(d => ({ id: d.id, data: () => d.data() })) }), err),
      }),
    };
    window.claude = { use: async n => n === 'user' ? userNs : n === 'db' ? dbNs : null };
    $('gate').hidden = true; $('app').hidden = false; document.querySelector('.nav').hidden = false;
    window.startQadam();
  }
  auth.onAuthStateChanged(u => {
    $('gLoading').hidden = true;
    if (u && signingUp) return;
    if (u) start(u);
    else { $('gBox').hidden = false; busy(false); if (started) location.reload(); }
  });
})();
