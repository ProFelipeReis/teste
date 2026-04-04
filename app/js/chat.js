/* ============================================================
   app/js/chat.js
   Chat em tempo real gestor ↔ aluno via Firestore onSnapshot
   ============================================================ */

window._chatActiveSid   = null;
window._chatPollGestor  = null;
window._chatUnreadTotal = 0;
window._chatUnreadCounts = {};
window._chatSnapshotUnsubs = [];

function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
}

// ── Lista de conversas ────────────────────────────────────────────────────────
window.loadChatList = async function () {
  const el = document.getElementById('chat-list-gestor');
  if (!el) return;
  el.innerHTML = '<div class="spinner"></div>';

  try {
    const u = window.CURRENT_USER || {};
    const q = (u.role === 'ceo' || u.isMaster)
      ? _query(_col(_db, 'students'), _orderBy('createdAt', 'desc'))
      : _query(_col(_db, 'students'), _where('managerId', '==', u.username));

    const snap = await _getDocs(q);
    const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const chatItems = [];
    for (const s of students) {
      try {
        const msgsSnap = await _db.collection('chats').doc(s.id).collection('messages')
          .orderBy('ts', 'desc').limit(1).get();
        if (msgsSnap.empty) continue;
        const lastMsg = { id: msgsSnap.docs[0].id, ...msgsSnap.docs[0].data() };
        const unreadSnap = await _db.collection('chats').doc(s.id).collection('messages')
          .where('sender', '==', 'student').where('readByManager', '==', false).get();
        chatItems.push({ student: s, lastMsg, unread: unreadSnap.size });
      } catch (e) {}
    }

    chatItems.sort((a, b) => (b.lastMsg.ts || 0) - (a.lastMsg.ts || 0));

    if (!chatItems.length) {
      el.innerHTML = `<div class="empty-state">
        <div class="ei">💬</div>
        <p>Nenhuma conversa ainda.<br>Os alunos podem iniciar o chat pelo app.</p>
      </div>`;
      return;
    }

    el.innerHTML = chatItems.map(({ student: s, lastMsg: m, unread }) => {
      const preview = m.sender === 'student' ? m.text : ('Você: ' + (m.text || ''));
      const timeStr = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '';
      return `<div class="chat-list-item${unread > 0 ? ' has-unread' : ''}" id="chatitem_${s.id}" onclick="openChatDetail('${s.id}')">
        <div class="chat-list-item-header">
          <div class="chat-list-avatar">${(s.name||'?').slice(0,2).toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:6px;">
              <div class="chat-list-name">${escHtml(s.name||s.code||'Aluno')}</div>
              ${unread > 0 ? '<div class="chat-unread-dot"></div>' : ''}
            </div>
            <div class="chat-list-preview">${escHtml((preview||'').slice(0,60))}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
            <div class="chat-list-time">${timeStr}</div>
            <button class="chat-delete-btn" title="Limpar conversa"
              onclick="event.stopPropagation();deleteChatGestor('${s.id}','${escHtml(s.name||s.code||'Aluno')}')">
              🗑
            </button>
          </div>
        </div>
      </div>`;
    }).join('');
  } catch (e) {
    el.innerHTML = `<div style="color:var(--red);font-size:.82rem;padding:20px;">Erro: ${e.message}</div>`;
  }
};

// ── Abre chat com aluno ───────────────────────────────────────────────────────
window.openChatDetail = async function (sid) {
  window._chatActiveSid = sid;
  const panel = document.getElementById('chat-detail-panel');
  panel?.classList.add('visible');

  const student = ST.students.find(s => s.id === sid) || { id: sid, name: sid };
  document.getElementById('chat-detail-name').textContent   = student.name   || student.code || sid;
  document.getElementById('chat-detail-code').textContent   = student.code   ? ('#' + student.code) : '';
  document.getElementById('chat-detail-avatar').textContent = (student.name  || '?').slice(0, 2).toUpperCase();

  // Remove indicador de não lido imediatamente
  document.querySelectorAll('.chat-list-item').forEach(el => el.classList.remove('active-chat'));
  const item = document.getElementById('chatitem_' + sid);
  if (item) {
    item.classList.add('active-chat');
    item.classList.remove('has-unread');
    item.querySelector('.chat-unread-dot')?.remove();
  }

  await window.loadChatDetailMessages();
  if (window._chatPollGestor) clearInterval(window._chatPollGestor);
  window._chatPollGestor = setInterval(window.loadChatDetailMessages, 4000);
};

// ── Carrega mensagens ────────────────────────────────────────────────────────
window.loadChatDetailMessages = async function () {
  if (!window._chatActiveSid) return;
  try {
    const snap = await _db.collection('chats').doc(window._chatActiveSid)
      .collection('messages').orderBy('ts', 'asc').get();
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const el = document.getElementById('chat-detail-messages');
    if (!msgs.length) {
      el.innerHTML = '<div class="chat-empty-state">Nenhuma mensagem. Diga olá! 👋</div>';
      return;
    }

    el.innerHTML = msgs.map(m => {
      const mine   = m.sender === 'manager';
      const time   = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' }) : '';
      return `<div class="chat-msg ${mine ? 'mine' : 'theirs'}">
        <div class="chat-bubble">${escHtml(m.text)}</div>
        <div class="chat-time-label">${time}</div>
      </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;

    // Marca mensagens do aluno como lidas
    let hadUnread = false;
    for (const m of msgs) {
      if (m.sender === 'student' && !m.readByManager) {
        hadUnread = true;
        _db.collection('chats').doc(window._chatActiveSid)
          .collection('messages').doc(m.id)
          .update({ readByManager: true }).catch(() => {});
      }
    }
    if (hadUnread) window.updateChatBadge();
  } catch (e) {
    console.warn('loadChatDetailMessages:', e.message);
  }
};

// ── Fecha detalhe do chat ────────────────────────────────────────────────────
window.closeChatDetail = function () {
  window._chatActiveSid = null;
  if (window._chatPollGestor) { clearInterval(window._chatPollGestor); window._chatPollGestor = null; }
  document.getElementById('chat-detail-panel')?.classList.remove('visible');
};

// ── Envia mensagem ────────────────────────────────────────────────────────────
window.sendChatMessageGestor = async function () {
  const inp  = document.getElementById('chat-gestor-input');
  const text = (inp?.value || '').trim();
  if (!text || !window._chatActiveSid) return;
  inp.value = ''; inp.style.height = '';
  try {
    await _db.collection('chats').doc(window._chatActiveSid).collection('messages').add({
      text, sender: 'manager', ts: Date.now(), readByManager: true, readByStudent: false
    });
    window.loadChatDetailMessages();
    window.loadChatList();
  } catch (e) { toast('Erro ao enviar: ' + e.message, 'error'); }
};

window.chatGestorKeydown = e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendChatMessageGestor(); }
};

window.autoResizeChatGestor = el => {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
};

// ── Limpar conversa ───────────────────────────────────────────────────────────
window.deleteChatGestor = async function (sid, name) {
  if (!confirm(`Limpar a conversa com ${name}? Todas as mensagens serão apagadas.`)) return;
  try {
    const snap = await _db.collection('chats').doc(sid).collection('messages').get();
    for (const d of snap.docs) {
      await _db.collection('chats').doc(sid).collection('messages').doc(d.id).delete();
    }
    toast('✅ Conversa limpa!');
    if (window._chatActiveSid === sid) window.closeChatDetail();
    window.loadChatList();
  } catch (e) { toast('Erro: ' + e.message, 'error'); }
};

// ── Badge em tempo real via onSnapshot ────────────────────────────────────────
window.startChatBadgePolling = async function () {
  // Cancela listeners anteriores
  window._chatSnapshotUnsubs.forEach(fn => { try { fn(); } catch (e) {} });
  window._chatSnapshotUnsubs = [];
  window._chatUnreadCounts = {};

  const u = window.CURRENT_USER || {};
  if (!u.username) return;

  const q = (u.role === 'ceo' || u.isMaster)
    ? _query(_col(_db, 'students'), _orderBy('createdAt', 'desc'))
    : _query(_col(_db, 'students'), _where('managerId', '==', u.username));

  try {
    const snap = await _getDocs(q);
    snap.docs.forEach(d => {
      const sid = d.id;
      const unsub = _db.collection('chats').doc(sid).collection('messages')
        .where('sender', '==', 'student')
        .onSnapshot(msgSnap => {
          window._chatUnreadCounts[sid] = msgSnap.docs.filter(m => m.data().readByManager === false).length;
          window._applyBadgeCount();
        }, e => console.warn('chat snapshot err:', e.message));
      window._chatSnapshotUnsubs.push(unsub);
    });
  } catch (e) { console.error('startChatBadgePolling:', e); }
};

window._applyBadgeCount = function () {
  const total = Object.values(window._chatUnreadCounts || {}).reduce((a, b) => a + b, 0);
  window._chatUnreadTotal = total;
  const label = total > 9 ? '9+' : String(total);
  const sb = document.getElementById('chat-sidebar-badge');
  const mb = document.getElementById('chat-mobile-badge');
  if (sb) { sb.textContent = label; sb.classList.toggle('hidden', total === 0); }
  if (mb) { mb.textContent = label; mb.classList.toggle('hidden', total === 0); }
};

window.updateChatBadge = () => window._applyBadgeCount();
