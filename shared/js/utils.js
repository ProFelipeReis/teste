/* ============================================================
   shared/js/utils.js
   Utilitários usados por /app e /aluno
   ============================================================ */

// ── Gerador de código de 6 caracteres (aluno) ──────────────────────────────
const genCode = () => {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('');
};

// ── Iniciais do nome ────────────────────────────────────────────────────────
const initials = n => {
  const p = n.trim().split(' ');
  return p.length >= 2
    ? (p[0][0] + p[p.length - 1][0]).toUpperCase()
    : n.slice(0, 2).toUpperCase();
};

// ── Formata data como YYYY-MM-DD sem timezone shift ─────────────────────────
const fmtLocalYMD = (date = new Date()) => {
  const d = new Date(date);
  return d.getFullYear() + '-'
    + String(d.getMonth() + 1).padStart(2, '0') + '-'
    + String(d.getDate()).padStart(2, '0');
};

// ── YouTube: extrai ID e monta embed URL ────────────────────────────────────
const ytId = url => {
  if (!url) return '';
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : '';
};
const ytEmbed = url => {
  const id = ytId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : '';
};

// ── Toast global ────────────────────────────────────────────────────────────
const toast = (msg, type = 'success') => {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.remove(), 3500);
};

// ── Modal: abre / fecha com controle de scroll e touch ──────────────────────
window.openModal = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('hidden');
  window._openModalCount = (window._openModalCount || 0) + 1;
  if (window._openModalCount === 1) {
    window._bodyScrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
  }
  el.addEventListener('touchmove', _modalTouchMove, { passive: false });
};

window.closeModal = function (id) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!el.classList.contains('hidden')) {
    el.classList.add('hidden');
    el.removeEventListener('touchmove', _modalTouchMove);
    window._openModalCount = Math.max(0, (window._openModalCount || 1) - 1);
    if (window._openModalCount === 0) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
  }
};

function _modalTouchMove(e) {
  const body = e.currentTarget.querySelector('.modal-body');
  if (!body) { e.preventDefault(); return; }
  const touch = e.touches[0];
  let node = document.elementFromPoint(touch.clientX, touch.clientY);
  while (node && node !== e.currentTarget) {
    if (node === body) return;
    node = node.parentNode;
  }
  e.preventDefault();
}

// ── Context menus (três pontinhos) ──────────────────────────────────────────
window.toggleCtxMenu = function (id) {
  const menu = document.getElementById(id);
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  closeAllCtxMenus();
  if (isHidden) menu.classList.remove('hidden');
};

window.closeAllCtxMenus = function () {
  document.querySelectorAll('.ctx-menu').forEach(m => m.classList.add('hidden'));
};

document.addEventListener('click', function (e) {
  if (!e.target.closest('.ctx-menu-wrap')) closeAllCtxMenus();
});
