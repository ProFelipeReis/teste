/* ============================================================
   app/js/evolution.js
   Frequência de treinos: timeline semanal, calendário mensal,
   toggle de status, listener onSnapshot, delete assessment
   ============================================================ */

window._freqCalState    = {}; // { sid: { year, month } }
window._freqAttData     = {}; // { sid: { 'YYYY-MM-DD': 'trained'|'missed'|'rest' } }
window._freqUnsubMap    = {}; // { sid: unsubFn }
window._freqTodayBRCache = null;

// ── Data atual no fuso de São Paulo ──────────────────────────────────────────
async function _trainerFreqGetTodayBR() {
  if (window._freqTodayBRCache) return window._freqTodayBRCache;
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch('https://worldtimeapi.org/api/timezone/America/Sao_Paulo', { signal: ctrl.signal });
    clearTimeout(tid);
    const j = await r.json();
    const ds = j.datetime.slice(0, 10);
    window._freqTodayBRCache = ds;
    const now = new Date(j.datetime);
    const msTilMid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
    setTimeout(() => { window._freqTodayBRCache = null; }, msTilMid + 500);
    return ds;
  } catch (e) {
    const ds = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    window._freqTodayBRCache = ds;
    setTimeout(() => { window._freqTodayBRCache = null; }, 60000);
    return ds;
  }
}

// ── Escreve status de attendance ─────────────────────────────────────────────
async function _trainerFreqWrite(sid, dateStr, status) {
  await _db.collection('attendance').doc(sid).collection('days').doc(dateStr).set({
    status, updatedAt: Date.now(),
    updatedBy: (window.CURRENT_USER?.username) || 'trainer'
  }, { merge: true });
}

// ── Inicia listener onSnapshot para um aluno ─────────────────────────────────
function _trainerFreqStartListener(sid) {
  if (window._freqUnsubMap[sid]) window._freqUnsubMap[sid]();
  const ref = _db.collection('attendance').doc(sid).collection('days');
  window._freqUnsubMap[sid] = ref.onSnapshot(snap => {
    const att = {};
    snap.docs.forEach(d => { att[d.id] = d.data().status || 'trained'; });
    window._freqAttData[sid] = att;
    const container = document.getElementById('freq-content-' + sid);
    if (container) _trainerRenderFreqSection(sid, container);
  }, err => console.warn('freq listener:', err));
}

// ── Carrega frequência para um aluno ──────────────────────────────────────────
window.loadStudentFrequency = async function (sid) {
  const container = document.getElementById('freq-content-' + sid);
  if (!container) return;
  container.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:6px auto;"></div>';
  await _trainerFreqGetTodayBR();
  _trainerFreqStartListener(sid);
};

// ── Renderiza timeline semanal ────────────────────────────────────────────────
function _trainerRenderFreqSection(sid, container) {
  const att      = window._freqAttData[sid] || {};
  const todayStr = window._freqTodayBRCache || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const DAY_LABELS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const todayDate = new Date(todayStr + 'T12:00:00');
  const dow = todayDate.getDay();
  const weekStart = new Date(todayDate);
  weekStart.setDate(todayDate.getDate() + (dow === 0 ? -6 : 1 - dow));

  let dotsHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const ds       = d.toLocaleDateString('sv-SE');
    const status   = att[ds] || null;
    const trained  = status === 'trained';
    const missed   = status === 'missed';
    const rest     = status === 'rest';
    const isToday  = ds === todayStr;
    const isFuture = ds > todayStr;
    const isPast   = ds < todayStr;
    const dayLabel = DAY_LABELS[d.getDay()];

    const lineClass = trained ? ' trained' : (missed || (isPast && !isToday && !rest)) ? ' missed' : '';
    const line = i > 0 ? `<div class="freq-tl-line${lineClass}"></div>` : '';

    let dotClass = 'freq-tl-dot freq-tl-dot-clickable';
    let dotInner = '';
    let tip = '';

    if (trained)      { dotClass += ' trained'; tip = 'Treinado'; dotInner = `<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--green)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`; }
    else if (rest)    { dotClass += ' future';  tip = 'Descanso'; dotInner = `<span style="font-size:.62rem;font-weight:900;color:var(--text3);line-height:1;">Z</span>`; }
    else if (isFuture){ dotClass += ' future';  tip = 'Dia futuro'; dotInner = `<div style="width:5px;height:5px;border-radius:50%;background:var(--border2);opacity:.4;"></div>`; }
    else if (isToday) { dotClass += ' today';   tip = 'Hoje'; dotInner = `<div style="width:5px;height:5px;border-radius:50%;background:var(--accent);opacity:.7;"></div>`; }
    else if (missed)  { dotClass += ' missed';  tip = 'Faltou'; dotInner = `<span style="font-size:.7rem;font-weight:900;color:var(--red);line-height:1;">!</span>`; }
    else if (isPast)  { dotClass += ' missed';  tip = 'Faltou'; dotInner = `<span style="font-size:.7rem;font-weight:900;color:var(--red);line-height:1;">!</span>`; }

    const clickable = !isFuture;
    const clickAttr = clickable
      ? `onclick="event.stopPropagation();_trainerFreqToggle('${sid}','${ds}')" title="${tip}" style="cursor:pointer;"`
      : `title="${tip}"`;

    dotsHTML += `${line}<div class="freq-tl-item">
      <div class="${dotClass}" ${clickAttr}>${dotInner}</div>
      <span class="freq-tl-lbl${isToday ? ' today' : ''}">${dayLabel}</span>
    </div>`;
  }

  container.innerHTML = `<div class="freq-tl-row">${dotsHTML}</div>`;
  window._freqCalState[sid] = { year: todayDate.getFullYear(), month: todayDate.getMonth() };
}

// ── Toggle de status (ciclo: sem registro → trained → missed → rest → trained)
window._trainerFreqToggle = async function (sid, ds) {
  const att  = window._freqAttData[sid] || {};
  const cur  = att[ds] || null;
  const next = cur === null ? 'trained' : cur === 'trained' ? 'missed' : cur === 'missed' ? 'rest' : 'trained';
  try {
    await _trainerFreqWrite(sid, ds, next);
    // onSnapshot cuida do re-render
  } catch (e) {
    toast('Erro ao salvar frequência: ' + e.message, 'error');
  }
};

// ── Calendário mensal completo ────────────────────────────────────────────────
window.openFreqCalendar = function (sid) {
  const existing = document.getElementById('freq-cal-overlay-' + sid);
  if (existing) {
    existing.remove();
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    return;
  }
  const state = window._freqCalState[sid] || { year: new Date().getFullYear(), month: new Date().getMonth() };
  renderFreqCalendar(sid, state.year, state.month);
};

window.renderFreqCalendar = function (sid, year, month) {
  document.getElementById('freq-cal-overlay-' + sid)?.remove();

  const att      = window._freqAttData[sid] || {};
  const todayStr = window._freqTodayBRCache || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const WDAYS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  const firstDay    = new Date(year, month, 1);
  const lastDay     = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays   = lastDay.getDate();
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthCount  = Object.keys(att).filter(d => d.startsWith(monthPrefix) && att[d] === 'trained').length;

  let gridHTML = '';
  for (let i = 0; i < startOffset; i++) gridHTML += '<div class="freq-cal-day empty"></div>';
  for (let d = 1; d <= totalDays; d++) {
    const ds      = `${monthPrefix}-${String(d).padStart(2, '0')}`;
    const status  = att[ds] || null;
    const trained = status === 'trained';
    const missed  = status === 'missed';
    const rest    = status === 'rest';
    const isToday = ds === todayStr;
    const isFuture = ds > todayStr;
    let cls = 'freq-cal-day';
    if (trained) cls += ' trained';
    else if (missed) cls += ' missed-cal';
    else if (rest) cls += ' rest-cal';
    if (isToday) cls += ' today-cal';
    const clickable = !isFuture;
    gridHTML += `<div class="${cls}"${clickable ? ` onclick="_trainerFreqToggle('${sid}','${ds}')" style="cursor:pointer;" title="Clique para alternar"` : ''}>${d}</div>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'freq-cal-overlay';
  overlay.id = 'freq-cal-overlay-' + sid;
  overlay.innerHTML = `
    <div class="freq-cal-modal">
      <div class="freq-cal-header">
        <div class="freq-cal-title">${MONTHS[month]} ${year}</div>
        <div class="freq-cal-nav">
          <button data-dir="-1" title="Mês anterior">◀</button>
          <button data-dir="1"  title="Próximo mês">▶</button>
        </div>
      </div>
      <div class="freq-cal-body">
        <div class="freq-cal-weekdays">${WDAYS.map(w => `<div class="freq-cal-wday">${w}</div>`).join('')}</div>
        <div class="freq-cal-grid">${gridHTML}</div>
      </div>
      <div class="freq-cal-footer">
        <div class="freq-cal-month-stat">
          <strong>${monthCount}</strong> dia${monthCount !== 1 ? 's' : ''} treinado${monthCount !== 1 ? 's' : ''} em ${MONTHS[month]}
        </div>
        <button class="btn btn-ghost btn-sm" id="freq-cal-close-${sid}">Fechar</button>
      </div>
    </div>`;

  overlay.querySelectorAll('.freq-cal-nav button').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      let m = month + parseInt(btn.dataset.dir), y = year;
      if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
      renderFreqCalendar(sid, y, m);
    };
  });

  overlay.querySelector(`#freq-cal-close-${sid}`).onclick = () => {
    overlay.remove();
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  };

  overlay.addEventListener('click', e => {
    if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; document.body.style.touchAction = ''; }
  });
  overlay.addEventListener('touchmove', e => {
    let node = e.target;
    const inner = overlay.querySelector('.freq-cal-modal');
    while (node && node !== overlay) { if (node === inner) return; node = node.parentNode; }
    e.preventDefault();
  }, { passive: false });

  document.body.appendChild(overlay);
  document.body.style.overflow    = 'hidden';
  document.body.style.touchAction = 'none';
  window._freqCalState[sid] = { year, month };
};

// ── Excluir avaliação ─────────────────────────────────────────────────────────
window.deleteAssessment = async function (sid, assessId) {
  if (!confirm('Excluir esta avaliação? Esta ação não pode ser desfeita.')) return;
  try {
    await _deleteDoc(_doc(_db, 'students', sid, 'assessments', assessId));
    const el = document.getElementById('assessment-item-' + assessId);
    if (el) el.remove();
    await loadStudentEvolution(sid);
    toast('✅ Avaliação excluída.');
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'error');
  }
};
