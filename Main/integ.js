const toggle = document.getElementById('sidebar-toggle');
const overlay = document.querySelector('.overlay');

if (toggle && overlay) {
  toggle.addEventListener('change', () => {
    document.body.classList.toggle('sidebar-open', toggle.checked);
  });

  overlay.addEventListener('click', () => {
    toggle.checked = false;
    document.body.classList.remove('sidebar-open');
  });
}

document.querySelectorAll('.sidebar a').forEach(link => {
  link.addEventListener('click', () => {
    toggle.checked = false;
    document.body.classList.remove('sidebar-open');
  });
});

const moviesCard = document.querySelector('.card-movies');
const seriesCard = document.querySelector('.card-series');

if (moviesCard) {
  moviesCard.addEventListener('click', () => {
    window.location.href = '../Movies/index.html';
  });
}
if (seriesCard) {
  seriesCard.addEventListener('click', () => {
    window.location.href = '../Series/index.html';
  });
}
 // ── Auth guard + token from Google redirect ──
        const urlParams = new URLSearchParams(window.location.search);
        const tokenParam = urlParams.get('token');
        if (tokenParam) {
            localStorage.setItem('token', tokenParam);
            // Decode name/email from JWT payload
            try {
                const payload = JSON.parse(atob(tokenParam.split('.')[1]));
                if (payload.email) localStorage.setItem('userEmail', payload.email);
                if (payload.name)  localStorage.setItem('userName',  payload.name);
            } catch(e) {}
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (!localStorage.getItem('token')) {
            window.location.href = '../Login/login.html';
        }

        // ── Populate user bar ──
        const userName  = localStorage.getItem('userName')  || localStorage.getItem('userEmail') || 'User';
        const userEmail = localStorage.getItem('userEmail') || '';
        const initials  = userName.slice(0,2).toUpperCase();

        document.getElementById('userAvatar').textContent  = initials;
        document.getElementById('userNameText').textContent = userName;
        document.getElementById('menuName').textContent    = userName;
        document.getElementById('menuEmail').textContent   = userEmail;

        // ── Toggle menu ──
        const userBar    = document.getElementById('userBar');
        const userBarBtn = document.getElementById('userBarBtn');
        userBarBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = userBar.classList.toggle('open');
            userBarBtn.setAttribute('aria-expanded', isOpen);
        });
        document.addEventListener('click', (e) => {
            if (!userBar.contains(e.target)) {
                userBar.classList.remove('open');
                userBarBtn.setAttribute('aria-expanded', false);
            }
        });

        // ── Switch Account ──
        document.getElementById('switchAccountBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            window.location.href = '../Login/login.html';
        });

        // ── Logout ──
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            window.location.href = '../Login/login.html';
        });