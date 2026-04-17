/* ── DayFlow Auth ── */

/* ── Simple hash (djb2 — client-side only, not cryptographic) ── */
function hashStr(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) ^ str.charCodeAt(i);
  return (h >>> 0).toString(16);
}

/* ── User store ── */
function getUsers() {
  try { return JSON.parse(localStorage.getItem('dayflow_users') || '[]'); }
  catch { return []; }
}
function saveUsers(users) { localStorage.setItem('dayflow_users', JSON.stringify(users)); }

function findUser(email) {
  return getUsers().find(u => u.email.toLowerCase() === email.toLowerCase().trim());
}

/* ── Session ── */
function createSession(user, remember) {
  const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const session = { token, email: user.email, name: user.firstName, uid: user.uid, expires: Date.now() + (remember ? 30 * 86400000 : 86400000) };
  if (remember) localStorage.setItem('dayflow_session', JSON.stringify(session));
  else sessionStorage.setItem('dayflow_session', JSON.stringify(session));
}

function getSession() {
  try {
    const raw = localStorage.getItem('dayflow_session') || sessionStorage.getItem('dayflow_session');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.expires && Date.now() > s.expires) { clearSession(); return null; }
    return s;
  } catch { return null; }
}

function clearSession() {
  localStorage.removeItem('dayflow_session');
  sessionStorage.removeItem('dayflow_session');
}

/* ── Tab switch ── */
function switchTab(tab) {
  const slider = document.getElementById('tabSlider');
  const lf = document.getElementById('loginForm');
  const sf = document.getElementById('signupForm');
  const lt = document.getElementById('loginTab');
  const st = document.getElementById('signupTab');
  const ff = document.getElementById('forgotForm');

  ff.classList.add('hidden');

  if (tab === 'login') {
    slider.classList.remove('right');
    lt.classList.add('active'); st.classList.remove('active');
    lf.classList.remove('hidden'); sf.classList.add('hidden');
  } else {
    slider.classList.add('right');
    st.classList.add('active'); lt.classList.remove('active');
    sf.classList.remove('hidden'); lf.classList.add('hidden');
  }
  clearErrors();
}

/* ── Forgot password ── */
function showForgot() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('forgotForm').classList.remove('hidden');
  document.getElementById('forgotSuccess').classList.add('hidden');
  document.getElementById('forgotEmail').value = '';
}
function hideForgot() {
  document.getElementById('forgotForm').classList.add('hidden');
  document.getElementById('loginForm').classList.remove('hidden');
}
function handleForgot() {
  const email = document.getElementById('forgotEmail').value.trim();
  const err = document.getElementById('forgotEmailErr');
  if (!email || !validEmail(email)) { err.textContent = 'Enter a valid email.'; shakeEl('forgotEmail'); return; }
  err.textContent = '';
  const user = findUser(email);
  if (user) {
    /* In a real app: send reset email. Here we just show success. */
    const newPass = prompt('Enter your new password (demo reset):');
    if (newPass && newPass.length >= 8) {
      user.passHash = hashStr(newPass);
      const users = getUsers().map(u => u.email === user.email ? user : u);
      saveUsers(users);
      showToast('◆ Password updated! You can now sign in.');
      hideForgot();
    }
  } else {
    document.getElementById('forgotSuccess').classList.remove('hidden');
  }
}

/* ── Validation ── */
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function clearErrors() {
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-error').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.auth-inp').forEach(el => { el.classList.remove('error','success'); });
}
function setError(id, msg) {
  const el = document.getElementById(id);
  if(el) el.textContent = msg;
}
function markErr(inpId) {
  const el = document.getElementById(inpId);
  if(el){ el.classList.add('error'); el.classList.remove('success'); }
}
function markOk(inpId) {
  const el = document.getElementById(inpId);
  if(el){ el.classList.add('success'); el.classList.remove('error'); }
}
function showFormErr(id, msg) {
  const el = document.getElementById(id);
  if(el){ el.textContent = msg; el.classList.add('show'); }
}
function shakeEl(id) {
  const el = document.getElementById(id);
  if(!el) return;
  el.closest('.input-wrap')?.classList.remove('shake');
  void el.closest('.input-wrap')?.offsetWidth;
  el.closest('.input-wrap')?.classList.add('shake');
}

/* ── Password strength ── */
function checkStrength() {
  const val = document.getElementById('signupPass').value;
  const fill = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { w:'0%', bg:'transparent', txt:'' },
    { w:'25%', bg:'#ef4444', txt:'Weak' },
    { w:'50%', bg:'#f59e0b', txt:'Fair' },
    { w:'75%', bg:'#3b82f6', txt:'Good' },
    { w:'100%', bg:'#10b981', txt:'Strong ◆' },
  ];
  const l = levels[score];
  fill.style.width = l.w;
  fill.style.background = l.bg;
  label.textContent = l.txt;
  label.style.color = l.bg;
}

/* ── Toggle password visibility ── */
function togglePass(id, btn) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '◎' : '◉';
}

/* ── Toast ── */
function showToast(msg, duration = 3000) {
  const t = document.getElementById('authToast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

/* ─────────────────── LOGIN ─────────────────── */
function handleLogin(e) {
  e.preventDefault();
  clearErrors();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  let ok = true;

  if (!email || !validEmail(email)) { setError('loginEmailErr','Enter a valid email.'); markErr('loginEmail'); shakeEl('loginEmail'); ok = false; }
  if (!pass) { setError('loginPassErr','Password is required.'); markErr('loginPass'); shakeEl('loginPass'); ok = false; }
  if (!ok) return;

  setLoading('loginBtn', true);
  setTimeout(() => {
    const user = findUser(email);
    if (!user) {
      showFormErr('loginFormErr', '▲No account found with that email.');
      markErr('loginEmail');
      setLoading('loginBtn', false);
      return;
    }
    if (user.passHash !== hashStr(pass)) {
      showFormErr('loginFormErr', '▲Incorrect password. Please try again.');
      markErr('loginPass');
      setLoading('loginBtn', false);
      return;
    }
    markOk('loginEmail'); markOk('loginPass');
    const remember = document.getElementById('rememberMe').checked;
    createSession(user, remember);
    showToast(`◈ Welcome back, ${user.firstName}!`);
    setTimeout(() => { window.location.href = 'index.html'; }, 900);
  }, 700);
}

/* ─────────────────── SIGNUP ─────────────────── */
function handleSignup(e) {
  e.preventDefault();
  clearErrors();
  const first   = document.getElementById('signupFirst').value.trim();
  const last    = document.getElementById('signupLast').value.trim();
  const email   = document.getElementById('signupEmail').value.trim();
  const pass    = document.getElementById('signupPass').value;
  const confirm = document.getElementById('signupConfirm').value;
  const terms   = document.getElementById('termsCheck').checked;
  let ok = true;

  if (!first) { setError('signupFirstErr','First name is required.'); markErr('signupFirst'); shakeEl('signupFirst'); ok = false; }
  if (!email || !validEmail(email)) { setError('signupEmailErr','Enter a valid email.'); markErr('signupEmail'); shakeEl('signupEmail'); ok = false; }
  if (pass.length < 8) { setError('signupPassErr','Password must be at least 8 characters.'); markErr('signupPass'); shakeEl('signupPass'); ok = false; }
  if (pass !== confirm) { setError('signupConfirmErr','Passwords do not match.'); markErr('signupConfirm'); shakeEl('signupConfirm'); ok = false; }
  if (!terms) { showFormErr('signupFormErr','Please accept the Terms of Service.'); ok = false; }
  if (!ok) return;

  if (findUser(email)) {
    setError('signupEmailErr','An account with this email already exists.'); markErr('signupEmail'); shakeEl('signupEmail'); return;
  }

  setLoading('signupBtn', true);
  setTimeout(() => {
    const users = getUsers();
    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const user = { uid, firstName: first, lastName: last, email: email.toLowerCase(), passHash: hashStr(pass), createdAt: Date.now() };
    users.push(user);
    saveUsers(users);
    createSession(user, false);
    showToast(`✦ Account created! Welcome, ${first}!`);
    setTimeout(() => { window.location.href = 'index.html'; }, 1000);
  }, 700);
}

/* ─────────────────── GUEST ─────────────────── */
function guestLogin() {
  const guestUser = { uid: 'guest', firstName: 'Guest', lastName: '', email: 'guest@dayflow.app' };
  sessionStorage.setItem('dayflow_session', JSON.stringify({ ...guestUser, token: 'guest', name: 'Guest', expires: Date.now() + 86400000 }));
  showToast('◎ Continuing as Guest…');
  setTimeout(() => { window.location.href = 'index.html'; }, 700);
}

/* ─────────────────── LOADING STATE ─────────────────── */
function setLoading(btnId, on) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  const txt = btn.querySelector('.btn-text');
  const ldr = btn.querySelector('.btn-loader');
  if (!txt || !ldr) return;
  btn.disabled = on;
  txt.style.opacity = on ? '0.4' : '1';
  ldr.style.display = on ? 'inline' : 'none';
}

/* ─────────────────── PARTICLES ─────────────────── */
function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx = canvas.getContext('2d');
  let W, H, pts;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  function mkPt() {
    return {
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random(),
    };
  }
  function init() { resize(); pts = Array.from({length: 80}, mkPt); }
  function draw() {
    ctx.clearRect(0,0,W,H);
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,170,255,${p.a * 0.45})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  init(); draw();
}

/* ─────────────────── BOOT ─────────────────── */
(function boot() {
  /* Already logged in? Redirect straight to app */
  if (getSession()) { window.location.href = 'index.html'; return; }
  initParticles();

  /* Keyboard: Enter on tabs */
  document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && document.activeElement.tagName !== 'BUTTON') {
      const lf = document.getElementById('loginForm');
      const sf = document.getElementById('signupForm');
      if (!lf.classList.contains('hidden')) handleLogin(new Event('submit'));
      else if (!sf.classList.contains('hidden')) handleSignup(new Event('submit'));
    }
  });
})();
