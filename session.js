/* ── Session UI for index.html ── */
(function () {
  function getSession() {
    try {
      const raw = localStorage.getItem('dayflow_session') || sessionStorage.getItem('dayflow_session');
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.expires && Date.now() > s.expires) {
        localStorage.removeItem('dayflow_session');
        sessionStorage.removeItem('dayflow_session');
        return null;
      }
      return s;
    } catch { return null; }
  }

  const session = getSession();
  if (!session) { window.location.replace('login.html'); return; }

  /* Populate user pill */
  const firstName = session.name || session.firstName || 'User';
  const email     = session.email || '';
  const initials  = firstName.charAt(0).toUpperCase() + (email.charAt(0).toUpperCase() || '');

  document.getElementById('userAvatar').textContent = firstName.charAt(0).toUpperCase();
  document.getElementById('userName').textContent   = firstName;
  document.getElementById('udName').textContent     = session.uid === 'guest' ? 'Guest User' : (firstName + (session.lastName ? ' ' + session.lastName : ''));
  document.getElementById('udEmail').textContent    = email;

  /* Colour avatar by uid hash */
  const colors = ['#8B6914','#C9A84C','#4DB896','#7C83E0','#D97AA6','#9B7FD4'];
  let h = 0;
  for (let i = 0; i < (session.uid||'').length; i++) h = ((h << 5) + h) ^ (session.uid||'').charCodeAt(i);
  document.getElementById('userAvatar').style.background = colors[Math.abs(h) % colors.length];

  /* Toggle dropdown */
  const pill = document.getElementById('userPill');
  const dropdown = document.getElementById('userDropdown');
  pill.addEventListener('click', e => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));

  /* Logout */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('dayflow_session');
    sessionStorage.removeItem('dayflow_session');
    window.location.replace('login.html');
  });

  /* Greet via quote strip */
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const strip = document.getElementById('quoteStrip');
  if (strip) {
    strip.textContent = `${greet}, ${firstName}! ${strip.textContent}`;
  }
})();
