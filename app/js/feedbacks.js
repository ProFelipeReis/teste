/* ============================================================
   app/js/feedbacks.js
   Feedbacks dos alunos e aba de gestores (master)
   ============================================================ */

// ── Feedbacks ─────────────────────────────────────────────────────────────────
window.loadFeedbacks = async function () {
  const container = document.getElementById('feedbacks-list');
  if (!container) return;
  container.innerHTML = '<div class="spinner"></div>';
  try {
    const u = window.CURRENT_USER || {};
    const snap = (u.role === 'ceo' || u.isMaster)
      ? await _getDocs(_query(_col(_db, 'feedbacks'), _orderBy('timestamp', 'desc')))
      : await _getDocs(_query(_col(_db, 'feedbacks'), _where('managerId', '==', u.username)));

    const feedbacks = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    if (!feedbacks.length) {
      container.innerHTML = `<div class="empty-state" style="padding:60px 20px;">
        <div class="ei">💬</div>
        <p>Nenhum feedback recebido ainda.</p>
      </div>`;
      return;
    }

    container.innerHTML = feedbacks.map(f => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:18px 20px;margin-bottom:12px;box-shadow:var(--shadow);transition:box-shadow .2s;">
        <div style="display:flex;align-items:flex-start;gap:14px;">
          <div class="avatar" style="flex-shrink:0;">${(f.studentName||'?').slice(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="font-weight:700;font-size:.95rem;color:var(--text);">${f.studentName||'Aluno'}</span>
              ${f.workoutTitle ? `<span style="font-size:.72rem;font-weight:600;background:var(--accent-dim);border:1px solid var(--accent-soft);color:#8a6c00;border-radius:6px;padding:2px 8px;">${f.workoutTitle}</span>` : ''}
              ${f.planTitle    ? `<span style="font-size:.72rem;color:var(--text3);font-weight:500;">${f.planTitle}</span>` : ''}
              ${f.rating       ? `<span style="font-size:.85rem;">` + '⭐'.repeat(Math.min(f.rating, 5)) + `</span>` : ''}
            </div>
            <p style="font-size:.88rem;color:var(--text2);line-height:1.6;margin-bottom:8px;white-space:pre-wrap;">${f.text||''}</p>
            <div style="font-size:.73rem;color:var(--text3);font-weight:500;">${f.date||''}</div>
          </div>
        </div>
      </div>`).join('');
  } catch (e) {
    container.innerHTML = `<div style="padding:20px;color:var(--red);font-size:.84rem;">Erro: ${e.message}</div>`;
  }
};

// ── Gestores (aba master) ─────────────────────────────────────────────────────
window.loadManagers = async function () {
  const g = document.getElementById('managers-grid');
  if (!g) return;
  g.innerHTML = '<div class="spinner"></div>';
  try {
    const snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
    const managers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderManagersGrid(managers);
  } catch (e) {
    g.innerHTML = `<div style="padding:20px;color:red;font-size:12px;grid-column:1/-1;">Erro: ${e.message}</div>`;
  }
};

window.renderManagersGrid = function (list) {
  const g = document.getElementById('managers-grid');
  if (!list.length) {
    g.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="ei">🛡️</div>
      <p>Nenhum gestor cadastrado além do master.</p>
    </div>`;
    return;
  }
  g.innerHTML = list.map(m => `
    <div class="student-card">
      <div class="student-card-top">
        <div class="avatar" style="${m.isMaster ? 'background:var(--accent-dim);border-color:var(--accent-soft);' : ''}">
          ${(m.name||m.username||'?').slice(0,2).toUpperCase()}
        </div>
        <div>
          <div class="student-name">${m.name||m.username}</div>
          <div class="student-code">@${m.username}</div>
          ${m.cref  ? `<div style="font-size:.74rem;color:var(--text2);margin-top:3px;font-weight:600;">📋 CREF: ${m.cref}</div>` : ''}
          ${m.phone ? `<div style="font-size:.74rem;color:var(--text3);margin-top:2px;font-weight:500;">📱 ${m.phone}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:4px;">
        <span class="mgr-badge ${m.role==='ceo' ? 'mgr-ceo' : m.isMaster ? 'mgr-master' : 'mgr-comum'}">
          ${m.role==='ceo' ? '⭐ CEO' : m.isMaster ? '⭐ Master' : 'Comum'}
        </span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-danger btn-sm" onclick="deleteManager('${m.id}','${m.username}')">🗑</button>
        </div>
      </div>
    </div>`).join('');
};

window.deleteManager = async function (id, username) {
  if (!confirm(`Excluir o gestor @${username}?`)) return;
  try {
    await _deleteDoc(_doc(_db, 'managers', id));
    toast('✅ Gestor excluído.');
    await loadManagers();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Notificações polling (complementa main.js) ────────────────────────────────
window.pollNotifications = async function () {
  try {
    const u = window.CURRENT_USER || {};
    if (!u.username || u.role === 'ceo') return;

    const snap = await _getDocs(_query(
      _col(_db, 'notifications'),
      _where('managerId', '==', u.username),
      _orderBy('ts', 'desc')
    ));

    window._notifData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = window._notifData.filter(n => !n.read).length;

    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
    if (window._notifPanelOpen) renderNotifPanel();
  } catch (e) {}
};

// ── Exportar PDF do plano ─────────────────────────────────────────────────────
window.exportPlanPDF = function (planId, studentName) {
  const p = window.__gestorPlans?.[planId];
  if (!p) { toast('Plano não encontrado.', 'error'); return; }

  const DAYS2 = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const status = getPlanStatus(p);
  const expired = status === 'expired';
  const startStr  = p.startDate ? new Date(p.startDate+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const expiryStr = p.expiry    ? new Date(p.expiry+'T12:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}) : 'Sem data de vencimento';
  const periodStr = startStr && p.expiry ? `${startStr} → ${expiryStr}` : startStr ? `Início: ${startStr}` : p.expiry ? `Vence em: ${expiryStr}` : 'Sem data definida';
  const today = new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});

  let exercisesHTML = '';
  (p.workouts||[]).forEach((w, wi) => {
    const daysStr = (w.days||[]).map(d => DAYS2[d]).join(', ') || 'Sem dias definidos';
    let exRows = '';
    (w.exercises||[]).forEach((ex, ei) => {
      const repsArr = Array.isArray(ex.repsArr) ? ex.repsArr : (ex.reps ? ex.reps.split(',').map(s => s.trim()) : [ex.reps||'']);
      const uniqueReps = [...new Set(repsArr)];
      const repsDisplay = uniqueReps.length === 1 ? uniqueReps[0] : repsArr.join(' / ');
      exRows += `<tr>
        <td class="ex-num">${ei+1}</td>
        <td class="ex-name-cell"><strong>${ex.name}</strong>${ex.obs ? `<div class="ex-obs">${ex.obs}</div>` : ''}</td>
        <td class="ex-stat">${ex.series}</td>
        <td class="ex-stat">${repsDisplay}</td>
      </tr>`;
    });
    exercisesHTML += `<div class="workout-block">
      <div class="workout-header">
        <div class="workout-badge">${String.fromCharCode(65+wi)}</div>
        <div class="workout-info">
          <div class="workout-title">${w.title||'Treino '+(wi+1)}</div>
          <div class="workout-days">${daysStr}</div>
        </div>
        <div class="workout-count">${(w.exercises||[]).length} exercício(s)</div>
      </div>
      <table class="ex-table">
        <thead><tr><th class="th-num">#</th><th class="th-name">Exercício</th><th class="th-stat">Séries</th><th class="th-stat">Reps</th></tr></thead>
        <tbody>${exRows}</tbody>
      </table>
    </div>`;
  });

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
<title>Ficha de Treino — ${studentName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:system-ui,sans-serif;background:#fff;color:#111;font-size:13px;line-height:1.5;}
.page{max-width:720px;margin:0 auto;padding:36px 32px;}
.header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;border-bottom:2px solid #111;margin-bottom:24px;}
.student{font-size:22px;font-weight:800;color:#111;letter-spacing:-.02em;}
.plan-name{font-size:14px;font-weight:600;color:#555;margin-top:4px;}
.validity{font-size:13px;font-weight:700;color:${expired?'#e03e3e':'#2e7d52'};}
.workout-block{margin-bottom:20px;border:1px solid #e4e4e0;border-radius:12px;overflow:hidden;page-break-inside:avoid;}
.workout-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f7f7f5;border-bottom:1px solid #e4e4e0;}
.workout-badge{width:32px;height:32px;border-radius:8px;background:#f5c800;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#111;}
.workout-info{flex:1;}
.workout-title{font-weight:800;font-size:14px;}
.workout-days{font-size:11px;color:#888;font-weight:600;margin-top:2px;}
.workout-count{font-size:11px;font-weight:700;color:#999;}
.ex-table{width:100%;border-collapse:collapse;}
.ex-table th{padding:8px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999;border-bottom:1px solid #e4e4e0;text-align:left;}
.th-num{width:32px;text-align:center;}.th-stat{width:68px;text-align:center;}
.ex-table tbody tr{border-bottom:1px solid #f0f0ed;}
.ex-table tbody tr:nth-child(even){background:#fafaf8;}
.ex-num{text-align:center;font-weight:700;font-size:11px;color:#bbb;padding:10px 6px;}
.ex-name-cell{padding:10px;}
.ex-name-cell strong{font-weight:700;font-size:13px;}
.ex-stat{text-align:center;font-weight:800;font-size:14px;padding:10px 6px;}
.ex-obs{font-size:11px;color:#888;font-style:italic;margin-top:4px;}
.footer{margin-top:28px;padding-top:14px;border-top:1px solid #e4e4e0;font-size:10px;color:#ccc;}
@media print{body{font-size:12px;}.workout-block{page-break-inside:avoid;}}
</style></head><body><div class="page">
<div class="header">
  <div><div class="student">${studentName}</div><div class="plan-name">${p.title||''}</div></div>
  <div style="text-align:right"><div style="font-size:10px;color:#999;margin-bottom:3px;">VALIDADE</div><div class="validity">${periodStr}</div><div style="font-size:10px;color:#bbb;margin-top:6px;">Gerado em ${today}</div></div>
</div>
${exercisesHTML}
<div class="footer"><div>Trainly — trainly.online · ${today}</div></div>
</div></body></html>`;

  const win = window.open('', '_blank');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 600);
};
