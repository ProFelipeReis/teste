if (new URLSearchParams(window.location.search).get('invite')) { document.documentElement.classList.add('has-invite'); }


      (function () {
        const canvas = document.getElementById('login-bg-canvas');
        const ctx = canvas.getContext('2d');
        let W, H, squares, animId;

        // Preload background photo
        const bgImg = new Image();
        bgImg.crossOrigin = 'anonymous';
        bgImg.src = 'https://i.imgur.com/Fjj25UX.jpeg';
        let bgLoaded = false;
        bgImg.onload = function () { bgLoaded = true; };

        function resize() {
          W = canvas.width = window.innerWidth;
          H = canvas.height = window.innerHeight;
        }

        function mkSquare() {
          const size = 28 + Math.random() * 68;
          return {
            x: Math.random() * W,
            y: Math.random() * H,
            size,
            rot: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.007,
            alpha: 0.05 + Math.random() * 0.12,
            dx: (Math.random() - 0.5) * 0.35,
            dy: -(0.25 + Math.random() * 0.45),
          };
        }

        function init() {
          resize();
          squares = Array.from({ length: 40 }, mkSquare);
        }

        // Diagonal divider: single straight line, off-center, lower on screen
        function getDividerY(px) {
          const leftY = H * 1.05;   // left edge — below viewport (matches entrada)
          const rightY = H * 0.82;   // right edge — rises toward the right
          return leftY + (px / W) * (rightY - leftY);
        }

        function isAboveTriangle(px, py) {
          return py < getDividerY(px);
        }

        function drawBg() {
          const leftY = getDividerY(0);
          const rightY = getDividerY(W);

          // 1. Fill dark area (above the diagonal line)
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(W, 0);
          ctx.lineTo(W, rightY);
          ctx.lineTo(0, leftY);
          ctx.closePath();
          ctx.fillStyle = '#111110';
          ctx.fill();

          // 2. Fill light area below diagonal
          ctx.beginPath();
          ctx.moveTo(0, leftY);
          ctx.lineTo(W, rightY);
          ctx.lineTo(W, H);
          ctx.lineTo(0, H);
          ctx.closePath();
          ctx.fillStyle = '#f0f0ef';
          ctx.fill();

          // 2b. Draw photo clipped to the dark area
          if (bgLoaded) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(W, 0);
            ctx.lineTo(W, rightY);
            ctx.lineTo(0, leftY);
            ctx.closePath();
            ctx.clip();
            const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;
            const scale = Math.max(W / iw, Math.max(leftY, rightY) / ih);
            const dw = iw * scale, dh = ih * scale;
            const dx = (W - dw) / 2, dy = -dh * 0.05;
            ctx.globalAlpha = 0.22;
            ctx.drawImage(bgImg, dx, dy, dw, dh);
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          // 3. Single straight edge line (subtle glow)
          ctx.beginPath();
          ctx.moveTo(0, leftY);
          ctx.lineTo(W, rightY);
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        function drawSquare(s) {
          const above = isAboveTriangle(s.x, s.y);
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.globalAlpha = s.alpha;
          if (above) {
            ctx.strokeStyle = 'rgba(255,255,255,0.18)';
            ctx.fillStyle = 'rgba(46,46,42,0.30)';
          } else {
            ctx.strokeStyle = 'rgba(17,17,16,0.22)';
            ctx.fillStyle = 'rgba(46,46,42,0.08)';
          }
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.rect(-s.size / 2, -s.size / 2, s.size, s.size);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        function step() {
          ctx.clearRect(0, 0, W, H);
          drawBg();
          squares.forEach(s => {
            s.x += s.dx; s.y += s.dy; s.rot += s.rotSpeed;
            if (s.y + s.size < 0) { s.y = H + s.size; s.x = Math.random() * W; }
            if (s.x - s.size > W) s.x = -s.size;
            if (s.x + s.size < 0) s.x = W + s.size;
            drawSquare(s);
          });
          animId = requestAnimationFrame(step);
        }

        init();
        step();
        window.addEventListener('resize', () => { resize(); });

        const loginEl = document.getElementById('screen-login');
        if (loginEl) {
          const obs = new MutationObserver(() => {
            if (loginEl.style.display === 'none') cancelAnimationFrame(animId);
          });
          obs.observe(loginEl, { attributes: true, attributeFilter: ['style'] });
        }
      })();
    


    // ══════════════════════════════════════════════════════
    // LOGIN — 100% Firestore, sem credenciais no código
    // Roles: ceo > master > comum
    // ══════════════════════════════════════════════════════
    function logoutFromBlocked() {
      var s = document.getElementById('screen-blocked');
      if (s) { s.classList.remove('on'); s.style.display = 'none'; }
      try { localStorage.removeItem('forge_gestor_session'); } catch (e) { }
      window.CURRENT_USER = null;
      document.getElementById('screen-login').style.display = 'flex';
    }

    function showBlockedScreen(reasons) {
      document.getElementById('screen-login').style.display = 'none';
      var screen = document.getElementById('screen-blocked');
      if (!screen) return;
      screen.style.display = '';
      screen.classList.add('on');
      var list = document.getElementById('blocked-reasons-list');
      if (!list) return;
      var isCrefFake = reasons.some(function (r) { return r && r.indexOf('CREF') !== -1; });
      if (reasons && reasons.length) {
        list.innerHTML = '<div class="blocked-reasons-title">Motivos registrados</div>'
          + reasons.map(function (r) { return '<div class="blocked-reason-item">' + r + '</div>'; }).join('')
          + (isCrefFake
            ? '<div style="margin-top:12px;padding:12px 14px;background:#fff8e1;border-radius:8px;border:1px solid #ffc107;">'
            + '<div style="font-size:.68rem;font-weight:800;color:#7d5a00;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>️ Aviso Legal</div>'
            + '<p style="font-size:.76rem;color:#5a3e00;line-height:1.7;margin-bottom:6px;"><strong>Exercício Ilegal da Profissão:</strong> O exercício de atividade profissional sem preencher as condições legais é contravenção penal prevista no <strong>Art. 47 da Lei das Contravenções Penais</strong>.</p>'
            + '<p style="font-size:.76rem;color:#5a3e00;line-height:1.7;"><strong>Uso de Documento Falso:</strong> A utilização de carteira do CREF, diploma ou qualquer identificação profissional falsa configura crime de uso de documento falso, conforme o <strong>Art. 304 do Código Penal</strong>.</p>'
            + '</div>'
            : '');
      } else {
        list.innerHTML = '<div class="blocked-reasons-title">Motivo</div><div class="blocked-reason-item">Violação dos Termos de Uso</div>';
      }
    }

    // _doLoginLegacy — substituída pelo sistema de Auth abaixo (firebase-auth)
    // Mantida aqui apenas como referência histórica. Não é chamada.
    async function _doLoginLegacy() {
      var user = document.getElementById('login-user').value.trim().toLowerCase();
      var pass = document.getElementById('login-pass').value;
      if (!user || !pass) { showLoginError('Preencha usuário e senha.'); return; }

      var btn = document.querySelector('#login-form button[type=button]');
      if (btn) { btn.textContent = 'Verificando...'; btn.disabled = true; }

      try {
        var attempts = 0;
        while ((!window.firebase || !window.firebase.firestore) && attempts < 40) {
          await new Promise(r => setTimeout(r, 100)); attempts++;
        }
        if (!window.firebase || !window.firebase.firestore) {
          showLoginError('Erro de conexão. Tente novamente.'); return;
        }

        var db = firebase.firestore();
        var snap = await db.collection('managers').where('username', '==', user).get();
        if (snap.empty) { showLoginError('Credenciais inválidas.'); return; }

        var docSnap = snap.docs[0];
        var mgr = docSnap.data();

        // Verifica senha: suporta SHA-256 hash ou plain (legado)
        var passOk = await _checkPassword(pass, mgr.password, mgr.passwordHash);
        if (!passOk) { showLoginError('Credenciais inválidas.'); return; }

        // Conta bloqueada pelo CEO?
        if (mgr.blocked) {
          var reasons = mgr.blockReasons && mgr.blockReasons.length ? mgr.blockReasons : [];
          showBlockedScreen(reasons);
          return;
        }

        var role = mgr.role || (mgr.isMaster ? 'master' : 'comum');
        var subStatus = (role !== 'ceo') ? _checkSubscription(mgr) : null;

        // Garante que o gestor tem um referralCode permanente — gera uma única vez se não tiver
        var referralCode = mgr.referralCode || '';
        if (!referralCode) {
          var arr = new Uint8Array(5); crypto.getRandomValues(arr);
          referralCode = Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join(''); // 10 chars hex
          try { await db.collection('managers').doc(docSnap.id).update({ referralCode: referralCode }); } catch (e) { }
        }

        _loginSuccess({
          id: docSnap.id,
          username: user,
          role: role,
          isMaster: role === 'master' || role === 'ceo',
          isCeo: role === 'ceo',
          isTester: _isTesterActive(mgr),
          displayName: mgr.name || user,
          phone: mgr.phone || '',
          subStatus: subStatus,
          trialEndsAt: mgr.trialEndsAt || null,
          subEndsAt: mgr.subEndsAt || null,
          referralCode: referralCode,
        });

      } catch (e) {
        showLoginError('Erro: ' + e.message);
      } finally {
        if (btn) { btn.textContent = 'Acessar painel →'; btn.disabled = false; }
      }
    }

    async function _checkPassword(input, plain, hash) {
      if (plain && plain === input) return true;
      if (hash) { var h = await _sha256(input); return h === hash; }
      return false;
    }

    async function _sha256(str) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Normaliza Timestamp do Firestore (objeto {seconds,nanoseconds}) ou número em ms
    function _tsToMs(v) {
      if (!v) return null;
      if (typeof v === 'number') return v;
      if (typeof v.toMillis === 'function') return v.toMillis();
      if (typeof v.seconds === 'number') return v.seconds * 1000;
      return Number(v) || null;
    }

    function _isTesterActive(mgr) {
      if (!mgr.isTester) return false;
      var ends = _tsToMs(mgr.testerEndsAt);
      if (!ends) return true;
      return ends > Date.now();
    }

    function _checkSubscription(mgr) {
      var now = Date.now();
      var trialMs = _tsToMs(mgr.trialEndsAt);
      var subMs = _tsToMs(mgr.subEndsAt);
      if (trialMs && now < trialMs) {
        return { ok: true, type: 'trial', daysLeft: Math.ceil((trialMs - now) / 86400000) };
      }
      if (subMs && now < subMs) {
        return { ok: true, type: 'active', daysLeft: Math.ceil((subMs - now) / 86400000) };
      }
      return { ok: false, type: 'expired' };
    }

    function showLoginError(msg) {
      var t = document.createElement('div'); t.className = 'toast error'; t.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + msg;
      document.getElementById('toast-container').appendChild(t); setTimeout(function () { t.remove(); }, 3500);
    }

    function _loginSuccess(userData) {
      try { localStorage.setItem('forge_gestor_session', JSON.stringify(userData)); } catch (e) { }
      window.CURRENT_USER = userData;
      location.reload();
      return;

      if (userData.role === 'ceo') {
        (function waitCeo() { if (window.showCeoPanel) { showCeoPanel(); } else { setTimeout(waitCeo, 100); } })();
        return;
      }
      if (userData.subStatus && !userData.subStatus.ok) {
        (function waitWall() { if (window.showSubscriptionWall) { showSubscriptionWall(); } else { setTimeout(waitWall, 100); } })();
        return;
      }
      (function waitDash() { if (window.showDashboardAfterLogin) { showDashboardAfterLogin(userData); } else { setTimeout(waitDash, 100); } })();
    }

    function _applyUserUI() {
      if (window._applyUserUI) { window._applyUserUI(); return; }
      // fallback — executa direto se window._applyUserUI ainda não foi definido
      var u = window.CURRENT_USER || {};
      var pill = document.getElementById('topbar-user-pill');
      if (pill) pill.textContent = u.displayName || u.username || 'gestor';
      var greetingEl = document.getElementById('dashboard-greeting');
      if (greetingEl) {
        var _h = new Date().getHours();
        var _p = _h < 12 ? 'Bom dia' : _h < 18 ? 'Boa tarde' : 'Boa noite';
        var _fn = ((u.displayName || u.username || '').split(' ')[0]) || 'você';
        greetingEl.textContent = _p + ', ' + _fn + ' 👋';
      }
      document.querySelectorAll('.sidebar-item-gestores,.mobile-nav-item-gestores').forEach(function (el) {
        el.classList.toggle('hidden', !(u.role === 'master' || u.role === 'ceo' || !!u.isMaster));
      });
      document.querySelectorAll('.sidebar-item-report,.mobile-nav-item-report').forEach(function (el) {
        el.classList.toggle('hidden', !u.isTester);
      });
      document.querySelectorAll('.sidebar-item-ceo').forEach(function (el) {
        el.classList.toggle('hidden', u.role !== 'ceo');
      });
    }
    window._applyUserUIEarly = _applyUserUI;

    document.addEventListener('DOMContentLoaded', function () {
      document.getElementById('login-form').addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doLogin();
      });
    });
  


    const _app = firebase.initializeApp({
      apiKey: "AIzaSyBVhMJfE1Zj9sVHztDXHUtsC_Y2WIikrkU",
      authDomain: "fichasacademia-8717d.firebaseapp.com",
      projectId: "fichasacademia-8717d",
      storageBucket: "fichasacademia-8717d.firebasestorage.app",
      messagingSenderId: "501312058117",
      appId: "1:501312058117:web:1b9ea06882050deeb33d6c"
    });
    const _db = firebase.firestore();
    const _col = (db, ...paths) => { let ref = db.collection(paths[0]); for (let i = 1; i < paths.length; i += 2) { if (paths[i + 1]) ref = ref.doc(paths[i]).collection(paths[i + 1]); } return ref; };
    const _doc = (db, ...paths) => { let ref = db.collection(paths[0]); for (let i = 1; i < paths.length; i += 2) { ref = ref.doc(paths[i]); if (i + 1 < paths.length) ref = ref.collection(paths[i + 1]); } return ref; };
    const _setDoc = (ref, data) => ref.set(data);
    const _getDoc = (ref) => ref.get();
    const _getDocs = (query) => query.get();
    const _updateDoc = (ref, data) => ref.update(data);
    const _deleteDoc = (ref) => ref.delete();
    const _query = (col, ...constraints) => { let q = col; constraints.forEach(fn => { q = fn(q); }); return q; };
    const _where = (field, op, val) => (q) => q.where(field, op, val);
    const _orderBy = (field, dir) => (q) => q.orderBy(field, dir || 'asc');

    window.EX_LIB = {
      "Peito": ["Supino Reto", "Supino Reto no Smith", "Supino Reto com Halter", "Supino Inclinado", "Supino Inclinado no Smith", "Supino Inclinado com Halter", "Supino Declinado", "Supino Declinado com Halter", "Supino Articulado", "Supino na Polia", "Crucifixo Reto", "Crucifixo Inclinado", "Crossover Superior", "Crossover Medial", "Crossover Inferior", "Voador Peitoral", "Flexão de Braço", "Pullover com Barra", "Pullover com Halter"],
      "Tríceps": ["Tríceps Testa com Barra", "Tríceps Testa com Halter", "Tríceps Testa na Polia com Barra", "Tríceps Testa na Polia com Corda", "Tríceps Testa Unilateral na Polia", "Tríceps Corda", "Tríceps Pulley", "Tríceps Pulley Barra V", "Tríceps Banco", "Tríceps Francês na Polia", "Tríceps Francês com Halter", "Tríceps Coice na Polia", "Tríceps Coice com Halter", "Tríceps Paralela", "Tríceps Máquina Paralela", "Tríceps Pegada Unilateral", "Tríceps Pegada Unilateral Inverso", "Tríceps Inverso na Polia"],
      "Costas": ["Puxada na Frente Pronada", "Puxada na Frente Supinada", "Puxada na Frente Barra Romana", "Puxada na Frente com Triângulo", "Barra Fixa", "Remada Curvada Pronada", "Remada Curvada Supinada", "Remada Curvada Serrote", "Remada Serrote na Polia", "Remada Baixa Aberta", "Remada Baixa Supinada", "Remada Baixa com Triângulo", "Remada Baixa Máquina Neutra", "Remada Baixa Máquina Pronada", "Remada Baixa Máquina Supinada", "Remada Cavalinho", "Pulldown Aberto", "Pulldown Fechado", "Pulldown Hammer Pronada", "Levantamento Terra"],
      "Bíceps": ["Rosca Direta Barra W", "Rosca Direta Barra Reta", "Rosca Banco 45° Alternada", "Rosca Alternada", "Rosca Martelo", "Rosca Martelo Alternada", "Rosca Concentrada", "Rosca Banco Scott", "Rosca Banco Scott com Halter", "Rosca Banco Scott com Barra", "Rosca na Polia com Corda", "Rosca na Polia com Barra Reta", "Rosca Unilateral na Polia", "Rosca Inversa na Barra", "Rosca Inversa na Polia"],
      "Ombro": ["Elevação Frontal", "Elevação Frontal com Barra", "Elevação Frontal com Anilha", "Elevação Frontal na Polia", "Elevação Frontal Alternada", "Elevação Frontal Inversa com Barra", "Desenvolvimento Máquina", "Desenvolvimento com Halter", "Desenvolvimento com Barra", "Remada Alta na Polia", "Remada Alta na Barra W", "Arnold Press", "Elevação Lateral", "Elevação Lateral no Banco 45°", "Elevação Lateral na Polia", "Crucifixo Invertido na Polia", "Crucifixo Invertido", "Face Pull", "Voador Inverso", "Encolhimento de Ombros no Smith", "Encolhimento de Ombros com Halter", "Encolhimento de Ombros com Barra"],
      "Quadríceps": ["Agachamento Livre", "Agachamento Sumo", "Agachamento no Smith", "Leg Press 90° no Smith", "Leg Press 45°", "Leg Press 45° Unilateral", "Leg Press Horizontal", "Leg Press Horizontal Unilateral", "Cadeira Extensora", "Cadeira Extensora Unilateral", "Avanço com Barra", "Afundo com Halter", "Afundo com Caneleira", "Afundo com Barra", "Afundo no Smith", "Afundo com Salto", "Agachamento Hack", "Agachamento Búlgaro", "Step-up", "Levantamento Terra Sumô"],
      "Posteriores": ["Mesa Flexora", "Mesa Flexora Unilateral", "Cadeira Flexora", "Cadeira Flexora Unilateral", "Stiff", "Stiff no Smith", "Good Morning"],
      "Glúteos": ["Cadeira Abdutora", "Abdução de Quadril na Polia", "Abdução de Quadril com Caneleira", "Agachamento Livre", "Agachamento no Smith", "Agachamento Búlgaro", "Agachamento Sumo", "Agachamento Taça", "Agachamento Hack", "Levantamento Terra Sumô", "Afundo com Halter", "Stiff", "Elevação Pélvica", "Elevação Pélvica na Bola", "Coice na Polia", "Glúteo 4 Apoios no Smith", "Glúteo 4 Apoios com Caneleira", "Glúteo 4 Apoios Perna Estendida"],
      "Adutores": ["Cadeira Adutora", "Adução de Quadril na Polia", "Adução de Quadril com Caneleira"],
      "Panturrilha": ["Elevação em Pé", "Panturrilha no Leg Press", "Panturrilha Unilateral"],
      "Abdômen": ["Abdominal Supra", "Abdominal Remador", "Abdominal na Polia", "Abdominal Infra", "Abdominal Oblíquo", "Abdominal Oblíquo na Polia", "Prancha", "Abdominal Infra na Paralela", "Abdominal Bicicleta"],
      "Lombar": ["Hiperextensão Lombar", "Good Morning", "Levantamento Terra"]
    };

    window.EX_URLS = {
      // Peito
      "Supino Reto": "https://www.youtube.com/watch?v=72UUJVBuT7o",
      "Supino Reto no Smith": "https://www.youtube.com/watch?v=FwOpfxDqvqE",
      "Supino Reto com Halter": "https://www.youtube.com/watch?v=V74Ls-mDYyE",
      "Supino Inclinado": "https://www.youtube.com/watch?v=0KWsZPMoZQs",
      "Supino Inclinado no Smith": "https://www.youtube.com/watch?v=sL8kVUI5oxU",
      "Supino Inclinado com Halter": "https://www.youtube.com/watch?v=JOVGGEwfhIk",
      "Supino Declinado": "https://www.youtube.com/watch?v=BEx_YCR1Hhs",
      "Supino Declinado com Halter": "https://www.youtube.com/watch?v=TRsrOnLu30E",
      "Supino Articulado": "https://www.youtube.com/watch?v=DKX5i7A_y_A",
      "Supino na Polia": "https://www.youtube.com/watch?v=VtoX4CHhszg",
      "Crucifixo Reto": "https://www.youtube.com/watch?v=gYh3r3x4tis",
      "Crucifixo Inclinado": "https://www.youtube.com/watch?v=5myBHdzU_E0",
      "Crossover Superior": "https://www.youtube.com/watch?v=lJHwF5_qd2U",
      "Crossover Medial": "https://www.youtube.com/watch?v=2mKYuMGDUYM",
      "Crossover Inferior": "https://www.youtube.com/watch?v=CTgac4QY9DQ",
      "Voador Peitoral": "https://www.youtube.com/watch?v=lSV3-8mlUnc",
      "Flexão de Braço": "https://www.youtube.com/watch?v=rmNKuZ_LlGc",
      "Pullover com Barra": "https://www.youtube.com/watch?v=pg-xDHdn_nU",
      "Pullover com Halter": "https://www.youtube.com/watch?v=SmrBx_wA_40",
      // Tríceps
      "Tríceps Testa com Barra": "https://www.youtube.com/watch?v=Dey4opMDq8g",
      "Tríceps Testa com Halter": "https://www.youtube.com/watch?v=KDbl_-rHmbw",
      "Tríceps Testa na Polia com Barra": "https://www.youtube.com/watch?v=DomiE2asOv8",
      "Tríceps Testa na Polia com Corda": "https://www.youtube.com/watch?v=7Ubzh8qmYIc",
      "Tríceps Testa Unilateral na Polia": "https://www.youtube.com/watch?v=68KIR4_k1TA",
      "Tríceps Corda": "https://www.youtube.com/watch?v=U88oGUP-QIw",
      "Tríceps Pulley": "https://www.youtube.com/watch?v=xkmY5D5orJ8",
      "Tríceps Pulley Barra V": "https://www.youtube.com/watch?v=gHdb4a1lsSA",
      "Tríceps Banco": "https://www.youtube.com/watch?v=V8nX8nsjpws",
      "Tríceps Francês na Polia": "https://www.youtube.com/watch?v=XYjcAZFNPnc",
      "Tríceps Francês com Halter": "https://www.youtube.com/watch?v=qLnV4qPXeSw",
      "Tríceps Coice na Polia": "https://www.youtube.com/watch?v=2CON6BzMT84",
      "Tríceps Coice com Halter": "https://www.youtube.com/watch?v=IbDymv4eTFw",
      "Tríceps Paralela": "https://www.youtube.com/watch?v=S2QL00FVBz4",
      "Tríceps Máquina Paralela": "https://www.youtube.com/watch?v=2CSkCiB_NHg",
      "Tríceps Pegada Unilateral": "https://www.youtube.com/watch?v=qrzkrTLQRUE",
      "Tríceps Pegada Unilateral Inverso": "https://www.youtube.com/watch?v=N01XPgv9JcE",
      "Tríceps Inverso na Polia": "https://www.youtube.com/watch?v=_ZKBsc7uJY0",
      // Costas
      "Puxada na Frente Pronada": "https://www.youtube.com/watch?v=kF5HN1aky2E",
      "Puxada na Frente Supinada": "https://www.youtube.com/watch?v=ocX3Ett6LWg",
      "Puxada na Frente Barra Romana": "https://www.youtube.com/watch?v=UDtThMDqshM",
      "Puxada na Frente com Triângulo": "https://www.youtube.com/watch?v=4zJ2GFRz_Ig",
      "Barra Fixa": "https://www.youtube.com/watch?v=30zgaYKWP2s",
      "Remada Curvada Pronada": "https://www.youtube.com/watch?v=PoFFS_UMf8c",
      "Remada Curvada Supinada": "https://www.youtube.com/watch?v=TD00shuX6hA",
      "Remada Curvada Serrote": "https://www.youtube.com/watch?v=Bb3SMb-ki-4",
      "Remada Serrote na Polia": "https://www.youtube.com/watch?v=n_at3YBkFoI",
      "Remada Baixa Aberta": "https://www.youtube.com/watch?v=hYuhnv9B-Gk",
      "Remada Baixa Supinada": "https://www.youtube.com/watch?v=6uSkfRxfrmM",
      "Remada Baixa com Triângulo": "https://www.youtube.com/watch?v=dXdQWGYI_Lo",
      "Remada Baixa Máquina Neutra": "https://www.youtube.com/watch?v=R1lvbDeZv1E",
      "Remada Baixa Máquina Pronada": "https://www.youtube.com/watch?v=tuFHB3yIwS0",
      "Remada Baixa Máquina Supinada": "https://www.youtube.com/watch?v=WbHTHcfRLeE",
      "Remada Cavalinho": "https://www.youtube.com/watch?v=WE0so-WCMrY",
      "Pulldown Aberto": "https://www.youtube.com/watch?v=PtruvATHY5Q",
      "Pulldown Fechado": "https://www.youtube.com/watch?v=PtruvATHY5Q",
      "Pulldown Hammer Pronada": "https://www.youtube.com/watch?v=kBJaJI7tg1s",
      "Levantamento Terra": "https://www.youtube.com/watch?v=apDhA48NlpY",
      // Bíceps
      "Rosca Direta Barra W": "https://www.youtube.com/watch?v=1N43ZJT7yiM",
      "Rosca Direta Barra Reta": "https://www.youtube.com/watch?v=TtIJUCHLSVM",
      "Rosca Banco 45° Alternada": "https://www.youtube.com/watch?v=KIlwB0fJh6k",
      "Rosca Alternada": "https://www.youtube.com/watch?v=8_cMKLgDgpo",
      "Rosca Martelo": "https://www.youtube.com/watch?v=jadLjlrgugY",
      "Rosca Martelo Alternada": "https://www.youtube.com/watch?v=ITRfzXEcBz0",
      "Rosca Concentrada": "https://www.youtube.com/watch?v=DtwsKDsuRGk",
      "Rosca Banco Scott": "https://www.youtube.com/watch?v=LIcKp31AvQY",
      "Rosca Banco Scott com Halter": "https://www.youtube.com/watch?v=0FPOPvuXDp8",
      "Rosca Banco Scott com Barra": "https://www.youtube.com/watch?v=v9AekFhVB4E",
      "Rosca na Polia com Corda": "https://www.youtube.com/watch?v=wgY_YV6fGeU",
      "Rosca na Polia com Barra Reta": "https://www.youtube.com/watch?v=e-wrb3jz_LA",
      "Rosca Unilateral na Polia": "https://www.youtube.com/watch?v=gkbpR6JoXlM",
      "Rosca Inversa na Barra": "https://www.youtube.com/watch?v=SXtGXEp-dVA",
      "Rosca Inversa na Polia": "https://www.youtube.com/watch?v=haORNZZq0vs",
      // Ombro
      "Elevação Frontal": "https://www.youtube.com/watch?v=ZbNxceb1VqU",
      "Elevação Frontal com Barra": "https://www.youtube.com/watch?v=uoxivRqpzoA",
      "Elevação Frontal com Anilha": "https://www.youtube.com/watch?v=gdLsIcKcNtE",
      "Elevação Frontal na Polia": "https://www.youtube.com/watch?v=gZmmCMD8f68",
      "Elevação Frontal Alternada": "https://www.youtube.com/watch?v=Y8EgXrLByFA",
      "Elevação Frontal Inversa com Barra": "https://www.youtube.com/watch?v=p6igMADVwd4",
      "Desenvolvimento Máquina": "https://www.youtube.com/watch?v=TUgm9SNRjUo",
      "Desenvolvimento com Halter": "https://www.youtube.com/watch?v=0-UNSkfq-Vw",
      "Desenvolvimento com Barra": "https://www.youtube.com/watch?v=jpQhfOXoqXg",
      "Remada Alta na Polia": "https://www.youtube.com/watch?v=yDEmuUfkT1A",
      "Remada Alta na Barra W": "https://www.youtube.com/watch?v=5KdpqOkaHto",
      "Arnold Press": "https://www.youtube.com/watch?v=166waxYDZhg",
      "Elevação Lateral": "https://www.youtube.com/watch?v=NJbQthqtYjA",
      "Elevação Lateral no Banco 45°": "https://www.youtube.com/watch?v=4tmlCK76bP8",
      "Elevação Lateral na Polia": "https://www.youtube.com/watch?v=xNM9hqpQl34",
      "Crucifixo Invertido na Polia": "https://www.youtube.com/watch?v=iBNp5-oTRYo",
      "Crucifixo Invertido": "https://www.youtube.com/watch?v=5P0DUzvhITA",
      "Face Pull": "https://www.youtube.com/watch?v=0Po47vvj9g4",
      "Voador Inverso": "https://www.youtube.com/watch?v=ZZTf3KsL9WE",
      "Encolhimento de Ombros no Smith": "https://www.youtube.com/watch?v=ga68Df24nOw",
      "Encolhimento de Ombros com Halter": "https://www.youtube.com/watch?v=aVjapCzICRI",
      "Encolhimento de Ombros com Barra": "https://www.youtube.com/watch?v=vAiDKER9I5I",
      // Quadríceps
      "Agachamento Livre": "https://www.youtube.com/watch?v=fYvifUC5Nac",
      "Agachamento Sumo": "https://www.youtube.com/watch?v=3jdJwJY3FXA",
      "Agachamento no Smith": "https://www.youtube.com/watch?v=qK20YwHpwyI",
      "Leg Press 90° no Smith": "https://www.youtube.com/watch?v=JHqLUVUt2ZM",
      "Leg Press 45°": "https://www.youtube.com/watch?v=NcmQ-wVlQdc",
      "Leg Press 45° Unilateral": "https://www.youtube.com/watch?v=pVxzkjC11Js",
      "Leg Press Horizontal": "https://www.youtube.com/watch?v=JxwOJQ9KG8E",
      "Leg Press Horizontal Unilateral": "https://www.youtube.com/watch?v=87y6SF8WsGw",
      "Cadeira Extensora": "https://www.youtube.com/watch?v=A1Cah1KDAlo",
      "Cadeira Extensora Unilateral": "https://www.youtube.com/watch?v=A1Cah1KDAlo",
      "Avanço com Barra": "https://www.youtube.com/watch?v=xM506kR6qIc",
      "Afundo com Halter": "https://www.youtube.com/watch?v=vjxuL0I0UZs",
      "Afundo com Caneleira": "https://www.youtube.com/watch?v=UcZ8keJOLTk",
      "Afundo com Barra": "https://www.youtube.com/watch?v=b79c_7baRIk",
      "Afundo no Smith": "https://www.youtube.com/watch?v=qoB-mdm4hYU",
      "Afundo com Salto": "https://www.youtube.com/watch?v=EALAfKY7h3I",
      "Agachamento Hack": "https://www.youtube.com/watch?v=5Ix3fjf4w9o",
      "Agachamento Búlgaro": "https://www.youtube.com/watch?v=In8oM_i5AhY",
      "Step-up": "https://www.youtube.com/watch?v=XAewOU3HNaw",
      "Levantamento Terra Sumô": "https://www.youtube.com/watch?v=wNi5Ztdnfgw",
      // Posteriores
      "Mesa Flexora": "https://www.youtube.com/watch?v=KAdhX6otnng",
      "Mesa Flexora Unilateral": "https://www.youtube.com/watch?v=Ymb82A_eMO4",
      "Cadeira Flexora": "https://www.youtube.com/watch?v=W5T_LubhXHU",
      "Cadeira Flexora Unilateral": "https://www.youtube.com/watch?v=jQszh3iuu3g",
      "Stiff": "https://www.youtube.com/watch?v=mmW5_F7i9sY",
      "Stiff no Smith": "https://www.youtube.com/watch?v=bFmE7Z9mSQs",
      "Good Morning": "https://www.youtube.com/watch?v=5MBULzHe4hI",
      // Glúteos
      "Cadeira Abdutora": "https://www.youtube.com/watch?v=fWFmbyZUf9Y",
      "Abdução de Quadril na Polia": "https://www.youtube.com/watch?v=VGqR1S0nwmU",
      "Abdução de Quadril com Caneleira": "https://www.youtube.com/watch?v=zaGi82UOVIc",
      "Agachamento Taça": "https://www.youtube.com/watch?v=E5sAEa7CLKM",
      "Elevação Pélvica": "https://www.youtube.com/watch?v=SY1eYXrCPzg",
      "Elevação Pélvica na Bola": "https://www.youtube.com/watch?v=deK86DRClM4",
      "Coice na Polia": "https://www.youtube.com/watch?v=8wN0YCs_rUc",
      "Glúteo 4 Apoios no Smith": "https://www.youtube.com/watch?v=I0M2yvMqAqI",
      "Glúteo 4 Apoios com Caneleira": "https://www.youtube.com/watch?v=8rqYQCNqb8E",
      "Glúteo 4 Apoios Perna Estendida": "https://www.youtube.com/watch?v=phJW24tjOjg",
      // Adutores
      "Cadeira Adutora": "https://www.youtube.com/watch?v=gRrJV6LO7Dk",
      "Adução de Quadril na Polia": "https://www.youtube.com/watch?v=LPhvX2T7IF0",
      "Adução de Quadril com Caneleira": "https://www.youtube.com/watch?v=9wRg96gSk3M",
      // Panturrilha
      "Elevação em Pé": "https://www.youtube.com/watch?v=QNWzxdQSD8g",
      "Panturrilha no Leg Press": "https://www.youtube.com/watch?v=BsA2ERb35FQ",
      "Panturrilha Unilateral": "https://www.youtube.com/watch?v=xUoJNbNvWPo",
      // Abdômen
      "Abdominal Supra": "https://www.youtube.com/watch?v=J2FSl4fU2qY",
      "Abdominal Remador": "https://www.youtube.com/watch?v=jpy2EjYm35U",
      "Abdominal na Polia": "https://www.youtube.com/watch?v=C68dbYflq2w",
      "Abdominal Infra": "https://www.youtube.com/watch?v=SoX3_liHpZE",
      "Abdominal Oblíquo": "https://www.youtube.com/watch?v=jRuHF2ylJng",
      "Abdominal Oblíquo na Polia": "https://www.youtube.com/watch?v=czfaGYer30o",
      "Prancha": "https://www.youtube.com/watch?v=bgY0m1KJdE4",
      "Abdominal Infra na Paralela": "https://www.youtube.com/watch?v=2U1t-R3QcnY",
      "Abdominal Bicicleta": "https://www.youtube.com/watch?v=mnj9NLbS1nE",
      // Lombar
      "Hiperextensão Lombar": "https://www.youtube.com/watch?v=nCgA_yKLjZw",
      "Levantamento Terra": "https://www.youtube.com/watch?v=apDhA48NlpY"
    };
    window.DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    window.ST = { students: [], currentStudentId: null, planStudentId: null, editPlanId: null, workoutBlocks: [] };

    // ── LocalStorage session ──
    const LS_GESTOR = 'forge_gestor_session';
    function saveSession(data) { try { localStorage.setItem(LS_GESTOR, typeof data === 'string' ? data : JSON.stringify(data)); } catch (e) { } }
    function clearSession() { try { localStorage.removeItem(LS_GESTOR); } catch (e) { } }
    function hasSession() { try { return !!localStorage.getItem(LS_GESTOR); } catch (e) { return false; } }
    function getSession() { try { var v = localStorage.getItem(LS_GESTOR); if (!v) return null; try { var s = JSON.parse(v); if (s && typeof s === 'object') { s.phone = s.phone || ''; if (!s.role) s.role = s.isMaster ? 'master' : 'comum'; var _te = s.testerEndsAt; var _teMs = (typeof _te === "number") ? _te : (_te && typeof _te.toMillis === "function") ? _te.toMillis() : (_te && typeof _te.seconds === "number") ? _te.seconds * 1000 : null; if (s.isTester && _teMs && _teMs <= Date.now()) { s.isTester = false; } return s; } return null; } catch (e) { return null; } } catch (e) { return null; } }

    const toast = (msg, type = 'success') => { const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = msg; document.getElementById('toast-container').appendChild(t); setTimeout(() => t.remove(), 3500) };
    window.openModal = function (id) {
      var el = document.getElementById(id);
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
      var el = document.getElementById(id);
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
      var body = e.currentTarget.querySelector('.modal-body');
      if (!body) { e.preventDefault(); return; }
      var touch = e.touches[0];
      var node = document.elementFromPoint(touch.clientX, touch.clientY);
      while (node && node !== e.currentTarget) {
        if (node === body) return;
        node = node.parentNode;
      }
      e.preventDefault();
    }
    const genCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join('') };
    const initials = n => { const p = n.trim().split(' '); return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : n.slice(0, 2).toUpperCase() };
    const fmtLocalYMD = (date = new Date()) => { const d = new Date(date); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') };

    window.isExpired = p => { if (!p.expiry) return false; return new Date(p.expiry) < new Date(new Date().toDateString()) };
    window.isNotStarted = p => { if (!p.startDate) return false; return new Date(p.startDate + 'T00:00') > new Date(new Date().toDateString()) };
    window.getPlanStatus = p => {
      if (window.isExpired(p)) return 'expired';
      if (window.isNotStarted(p)) return 'upcoming';
      return 'active';
    };
    const ytId = url => { if (!url) return ''; const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/); return m ? m[1] : '' };
    const ytEmbed = url => { const id = ytId(url); return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1` : '' };

    // ── showDashboard: chamado após login bem-sucedido (não-CEO, assinatura ok) ──
    window.showDashboardAfterLogin = window.showDashboard = function (userData) {
      var u = userData || window.CURRENT_USER || {};
      window.CURRENT_USER = u;
      // Garante que isTester começa como false até o Firestore confirmar
      if (window.CURRENT_USER.isTester === undefined) window.CURRENT_USER.isTester = false;

      // ── Splash pós-login ──
      var splash = document.getElementById('login-splash');
      var vid = document.getElementById('login-splash-video');
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-sub-wall').style.display = 'none';
      if (splash && vid) {
        splash.classList.add('splash-in');
        vid.currentTime = 0;
        vid.play().catch(function(){});
        function _afterSplash() {
          splash.classList.add('splash-out');
          setTimeout(function () {
            splash.classList.remove('splash-in', 'splash-out');
            vid.pause();
          }, 420);
          document.getElementById('screen-dashboard').style.cssText = 'display:flex;flex-direction:column;';
        }
        vid.onended = _afterSplash;
        // Segurança: se o vídeo travar ou demorar mais que 5s, passa mesmo assim
        var _splashTimeout = setTimeout(_afterSplash, 5000);
        vid.onended = function () { clearTimeout(_splashTimeout); _afterSplash(); };
      } else {
        document.getElementById('screen-dashboard').style.cssText = 'display:flex;flex-direction:column;';
      }
      // ─────────────────────────────────────────────

      (window._applyUserUI || window._applyUserUIEarly || function(){})();
      loadStudents();
      startNotifPolling();
      (function waitChat() { if (window.startChatBadgePolling) { startChatBadgePolling(); } else { setTimeout(waitChat, 200); } })();
      // Re-valida trial enquanto o painel está aberto (a cada 5 minutos)
      if (window._trialCheckInterval) clearInterval(window._trialCheckInterval);
      window._trialCheckInterval = setInterval(async function () {
        var u = window.CURRENT_USER || {};
        if (!u.username || u.role === 'ceo') return;
        try {
          var snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username)));
          if (snap.empty) return;
          var mgr = snap.docs[0].data();
          var sub = _checkSubscription(mgr);
          if (!sub.ok) {
            clearInterval(window._trialCheckInterval);
            window._trialCheckInterval = null;
            showSubscriptionWall();
          }
        } catch (e) { }
      }, 5 * 60 * 1000);
      // Verifica notificação pendente de revogação de bônus de indicação
      setTimeout(function () { if (window._checkPendingReferralRevokeNotice) _checkPendingReferralRevokeNotice(); }, 1500);
      // Atualiza dados do Firestore
      _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username))).then(function (snap) {
        if (!snap.empty) {
          var mgr = snap.docs[0].data();
          window.CURRENT_USER.displayName = mgr.name || u.username;
          window.CURRENT_USER.phone = mgr.phone || '';
          window.CURRENT_USER.isTester = _isTesterActive(mgr);
          // Revalida assinatura
          if (u.role !== 'ceo') {
            var sub = _checkSubscription(mgr);
            window.CURRENT_USER.subStatus = sub;
            if (!sub.ok) { showSubscriptionWall(); return; }
            // Modal testador (só na primeira vez)
            if (mgr.isTester && !mgr.testerModalSeen) {
              setTimeout(function () {
                var docId = snap.docs[0].id;
                openModal('modal-tester-welcome');
                try { _updateDoc(_doc(_db, 'managers', docId), { testerModalSeen: true }); } catch (e) { }
              }, 1200);
            } else if (sub.type === 'trial') {
              showTrialBanner(sub.daysLeft);
              // Modal especial DEBUGMODE (só na primeira vez)
              var isDebugUser = (mgr.referredBy || '').toUpperCase() === '' && sub.daysLeft > 50;
              // Detecta via flag dedicada
              if (!mgr.debugModalShown && mgr.trialEndsAt && (mgr.trialEndsAt - Date.now()) > 55 * 24 * 60 * 60 * 1000) {
                setTimeout(function () {
                  var docId = snap.docs[0].id;
                  openModal('modal-debugmode');
                  try { _updateDoc(_doc(_db, 'managers', docId), { debugModalShown: true }); } catch (e) { }
                }, 1200);
              } else if (!mgr.trialModalShown) {
                // Mostra modal de assinatura 3s após entrar (só uma vez — flag no Firestore)
                setTimeout(function () {
                  if (window.showTrialWelcomeModal) showTrialWelcomeModal(sub.daysLeft);
                  try {
                    var docId = snap.docs[0].id;
                    _updateDoc(_doc(_db, 'managers', docId), { trialModalShown: true });
                  } catch (e) { }
                }, 3000);
              }
            }
          }
          try { localStorage.setItem(LS_GESTOR, JSON.stringify(window.CURRENT_USER)); } catch (e) { }
          (window._applyUserUI || window._applyUserUIEarly || function(){})();
        }
      }).catch(function () { });
    };

    window.copyStudentCode = function (code) {
      navigator.clipboard.writeText(code).then(function () { toast('Código copiado!'); }).catch(function () { toast('Código: ' + code); });
    };
    window.copyStudentLink = function () {
      navigator.clipboard.writeText('trainly.online').then(function () { toast('Link copiado!'); }).catch(function () { toast('trainly.online'); });
    };
    window.logoutGestor = function () {
      // Faz signOut do Firebase Auth antes de limpar tudo
      try { if (window._auth && window._auth.currentUser) { window._auth.signOut().catch(function () { }); } } catch (e) { }
      clearSession();
      window.CURRENT_USER = null;
      if (window._notifInterval) { clearInterval(window._notifInterval); window._notifInterval = null; }
      if (window._trialCheckInterval) { clearInterval(window._trialCheckInterval); window._trialCheckInterval = null; }
      if (window._chatSnapshotUnsubs) { window._chatSnapshotUnsubs.forEach(function (fn) { try { fn(); } catch (e) { } }); window._chatSnapshotUnsubs = []; }
      if (window._chatSnapshotUnsubs) { window._chatSnapshotUnsubs = []; }
      // Oculta todas as telas
      ['screen-dashboard', 'screen-sub-wall', 'screen-invite', 'screen-blocked', 'screen-register'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.style.display = 'none'; el.classList.remove('on', 'visible'); }
      });
      toast('Sessão encerrada.');
      setTimeout(function () { location.reload(); }, 800);
    };
    window.switchTab = (tabId, el) => {
      // Protege abas restritas
      if (tabId === 'tab-report' && !(window.CURRENT_USER || {}).isTester) return;
      if ((tabId === 'tab-ceo' || tabId === 'tab-ceo-reports') && (window.CURRENT_USER || {}).role !== 'ceo') return;
      document.querySelectorAll('.tab-panel').forEach(t => t.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      document.querySelectorAll('.sidebar-item,.mobile-nav-item').forEach(i => i.classList.remove('active'));
      document.querySelectorAll(`[data-tab="${tabId}"]`).forEach(i => i.classList.add('active'));
      if (tabId === 'tab-alunos') showStudentsList();
      if (tabId === 'tab-gestores') loadManagers();
      if (tabId === 'tab-feedbacks') loadFeedbacks();
      if (tabId === 'tab-chat') { loadChatList(); closeChatDetail(); }
      if (tabId === 'tab-ceo') { loadCeoManagers(); loadPricing(); loadCrefPending(); }
    };
    window.goToAlunos = () => switchTab('tab-alunos', document.querySelector('[data-tab="tab-alunos"]'));

    window.loadStudents = async () => {
      try {
        const u = window.CURRENT_USER || {};
        let q;
        if (u.role === 'ceo' || u.isMaster) {
          // Master felipereis vê todos os alunos
          q = _query(_col(_db, 'students'), _orderBy('createdAt', 'desc'));
        } else {
          // Gestor normal — sem _orderBy para evitar índice composto; ordena em JS
          q = _query(_col(_db, 'students'), _where('managerId', '==', u.username));
        }
        const snap = await _getDocs(q);
        ST.students = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        renderStudentsGrid(ST.students);
        updateStats();
      } catch (err) {
        document.getElementById('students-grid').innerHTML = `<div style="padding:20px;color:red;font-family:monospace;font-size:12px;background:#fff3f3;border-radius:8px;border:1px solid red;grid-column:1/-1;"><b>ERRO Firebase:</b><br>${err.code || ''}: ${err.message}</div>`;
        console.error('loadStudents error:', err);
      }
    };
    window.renderStudentsGrid = list => {
      const g = document.getElementById('students-grid');
      if (!list.length) {
        g.innerHTML = `<div class="empty-state"><div class="ei"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><p>Nenhum aluno cadastrado.</p><button class="btn btn-primary" style="margin-top:16px;" onclick="openAddStudentModal()">+ Primeiro aluno</button></div>`;
        return;
      }

      const u = window.CURRENT_USER || {};
      const isMaster = u.role === 'ceo' || u.isMaster;

      const cardHTML = s => `
    <div class="student-card" onclick="openStudentDetail('${s.id}')">
      <div class="student-card-top">
        <div class="avatar">${initials(s.name)}</div>
        <div>
          <div class="student-name">${s.name}</div>
          <div class="student-code">${s.code}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:4px;">
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          ${s.phone ? `<span style="font-size:.75rem;color:var(--text3);font-weight:500;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${s.phone}</span>` : ''}
          ${s.obs ? `<span style="font-size:.75rem;color:var(--text2);">${s.obs}</span>` : ''}
          <span class="badge badge-active">ativo</span>
          ${isMaster && s.managerId && s.managerId !== (window.CURRENT_USER || {}).username && s.managerName ? `<span style="font-size:.72rem;color:var(--text3);font-weight:600;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:2px 8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${s.managerName}</span>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;" onclick="event.stopPropagation()">
          <button class="btn btn-ghost btn-sm" onclick="openEditStudentModal('${s.id}')">✏️ Editar</button>
          <div class="ctx-menu-wrap">
            <button class="ctx-menu-btn" onclick="toggleCtxMenu('sctx_${s.id}')" title="Mais opções">•••</button>
            <div class="ctx-menu hidden" id="sctx_${s.id}">
              <div class="ctx-menu-item" onclick="closeAllCtxMenus();openTransferModal('${s.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> Transferir aluno</div>
            </div>
          </div>
        </div>
      </div>
    </div>`;

      if (!isMaster) {
        // Gestor normal: lista simples
        g.innerHTML = list.map(cardHTML).join('');
        return;
      }

      // Master: separa próprios alunos (sem managerId ou managerId=felipereis) dos de outros gestores
      const _cu = (window.CURRENT_USER || {}).username || '';
      const mine = list.filter(s => !s.managerId || s.managerId === _cu);
      const others = list.filter(s => s.managerId && s.managerId !== _cu);

      let html = '';

      if (mine.length) {
        html += mine.map(cardHTML).join('');
      } else {
        html += `<div class="empty-state" style="grid-column:1/-1;padding:40px 20px;"><div class="ei"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div><p>Você ainda não cadastrou alunos.</p><button class="btn btn-primary" style="margin-top:16px;" onclick="openAddStudentModal()">+ Primeiro aluno</button></div>`;
      }

      if (others.length) {
        // Separador de seção
        html += `<div style="grid-column:1/-1;margin-top:12px;margin-bottom:4px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:.72rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.12em;white-space:nowrap;">Alunos de outros gestores</span>
        <div style="flex:1;height:1px;background:var(--border);"></div>
        <span style="font-size:.72rem;font-weight:600;color:var(--text3);white-space:nowrap;">${others.length} aluno${others.length !== 1 ? 's' : ''}</span>
      </div>
    </div>`;
        html += others.map(cardHTML).join('');
      }

      g.innerHTML = html;
    };
    window.filterStudents = () => {
      const q = document.getElementById('search-students').value.toLowerCase();
      const filtered = q
        ? ST.students.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.managerName || '').toLowerCase().includes(q))
        : ST.students;
      renderStudentsGrid(filtered);
    };
    // ── Helpers ──
    window.calcAgePreview = function (dobId, previewId) {
      var dob = document.getElementById(dobId).value;
      var el = document.getElementById(previewId);
      if (!dob || !el) return;
      var age = calcAge(dob);
      el.textContent = age !== null ? age + ' anos' : '';
      el.style.display = age !== null ? 'block' : 'none';
    };
    window.calcAge = function (dob) {
      if (!dob) return null;
      var d = new Date(dob + 'T12:00');
      var today = new Date();
      var age = today.getFullYear() - d.getFullYear();
      var m = today.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
      return age >= 0 && age < 120 ? age : null;
    };
    window.calcImcPreview = function (wId, hId, boxId) {
      var w = parseFloat(document.getElementById(wId).value);
      var h = parseFloat(document.getElementById(hId).value);
      var box = document.getElementById(boxId);
      if (!box) return;
      if (!w || !h || h < 50) { box.style.display = 'none'; return; }
      var hm = h / 100;
      var imc = (w / (hm * hm)).toFixed(1);
      var cat = imc < 18.5 ? 'Abaixo do peso' : imc < 25 ? 'Peso normal' : imc < 30 ? 'Sobrepeso' : imc < 35 ? 'Obesidade grau I' : imc < 40 ? 'Obesidade grau II' : 'Obesidade grau III';
      document.getElementById(boxId.replace('-box', '-val')).textContent = imc;
      document.getElementById(boxId.replace('-box', '-cat')).textContent = cat;
      box.style.display = 'flex';
    };
    window.toggleHealthCheck = function (item, detailId) {
      var chk = item.querySelector('input[type=checkbox]');
      if (event && event.target === chk) { /* handled by checkbox directly */ }
      else { chk.checked = !chk.checked; }
      item.classList.toggle('checked', chk.checked);
      var detail = document.getElementById(detailId);
      if (detail) detail.classList.toggle('visible', chk.checked);
    };
    window.switchEditTab = function (tabId, btn) {
      document.querySelectorAll('#modal-edit-student .assessment-tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('#modal-edit-student .assessment-tab').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      btn.classList.add('active');
    };
    window.readMeasures = function (prefix) {
      var ids = ['chest', 'waist', 'hip', 'arm-r', 'arm-l', 'shoulder', 'thigh-r', 'thigh-l', 'calf-r', 'calf-l', 'thigh-prox', 'thigh-dist'];
      var m = {};
      ids.forEach(function (k) {
        var v = parseFloat(document.getElementById(prefix + k)?.value);
        if (!isNaN(v) && v > 0) m[k] = v;
      });
      return m;
    };
    window.fillMeasures = function (prefix, m) {
      if (!m) return;
      var ids = ['chest', 'waist', 'hip', 'arm-r', 'arm-l', 'shoulder', 'thigh-r', 'thigh-l', 'calf-r', 'calf-l', 'thigh-prox', 'thigh-dist'];
      ids.forEach(function (k) {
        var el = document.getElementById(prefix + k);
        if (el) el.value = m[k] || '';
      });
    };

    // ── Add Student Steps ──
    window._addStudentStep = 1;
    window.openAddStudentModal = () => {
      window._addStudentStep = 1;
      ['new-student-name', 'new-student-phone', 'new-student-email', 'new-student-dob', 'new-student-obs',
        'new-student-weight', 'new-student-height', 'new-student-fat',
        'new-m-chest', 'new-m-waist', 'new-m-hip', 'new-m-arm-r', 'new-m-arm-l', 'new-m-shoulder',
        'new-m-thigh-r', 'new-m-thigh-l', 'new-m-calf-r', 'new-m-calf-l', 'new-m-thigh-prox', 'new-m-thigh-dist',
        'new-txt-injuries', 'new-txt-conditions', 'new-txt-meds'].forEach(id => {
          var el = document.getElementById(id);
          if (el) el.value = '';
        });
      document.getElementById('new-student-sex').value = '';
      document.getElementById('new-student-imc-box').style.display = 'none';
      document.getElementById('new-student-age-preview').style.display = 'none';
      ['new-chk-injuries', 'new-chk-conditions', 'new-chk-meds'].forEach(id => {
        var el = document.getElementById(id); if (el) el.checked = false;
      });
      ['new-health-injuries-detail', 'new-health-conditions-detail', 'new-health-meds-detail'].forEach(id => {
        var el = document.getElementById(id); if (el) el.classList.remove('visible');
      });
      document.querySelectorAll('#modal-add-student .health-check-item').forEach(el => el.classList.remove('checked'));
      document.getElementById('new-student-code-reveal').style.display = 'none';
      _renderAddStudentStep(1);
      openModal('modal-add-student');
      setTimeout(() => document.getElementById('new-student-name').focus(), 100);
    };
    window._renderAddStudentStep = function (step) {
      window._addStudentStep = step;
      var labels = ['', 'Etapa 1 de 3 — Dados pessoais', 'Etapa 2 de 3 — Dados físicos', 'Etapa 3 de 3 — Saúde'];
      document.getElementById('add-student-step-label').textContent = labels[step] || '';
      [1, 2, 3].forEach(function (s) {
        var panel = document.getElementById('add-student-step-' + s);
        if (panel) panel.style.display = s === step ? '' : 'none';
        var dot = document.getElementById('add-step-dot-' + s);
        if (dot) dot.style.background = s <= step ? 'var(--accent)' : 'var(--border)';
      });
      var back = document.getElementById('btn-add-student-back');
      var cancel = document.getElementById('btn-add-cancel');
      var next = document.getElementById('btn-add-student');
      if (back) back.style.display = step > 1 ? '' : 'none';
      if (cancel) cancel.style.display = step === 1 ? '' : 'none';
      if (next) { next.textContent = step < 3 ? 'Próximo →' : 'Cadastrar'; next.onclick = step < 3 ? addStudentStepNext : addStudent; }
    };
    window.addStudentStepNext = function () {
      if (window._addStudentStep === 1) {
        var name = document.getElementById('new-student-name').value.trim();
        if (!name) { toast('Nome obrigatório!', 'error'); return; }
      }
      _renderAddStudentStep(window._addStudentStep + 1);
    };
    window.addStudentStepBack = function () {
      _renderAddStudentStep(window._addStudentStep - 1);
    };
    window.addStudent = async () => {
      const name = document.getElementById('new-student-name').value.trim();
      if (!name) { toast('Nome obrigatório!', 'error'); return; }
      const btn = document.getElementById('btn-add-student');
      btn.classList.add('btn-loading'); btn.textContent = 'Aguarde...';
      try {
        const phone = document.getElementById('new-student-phone').value.trim();
        const email = document.getElementById('new-student-email').value.trim();
        const dob = document.getElementById('new-student-dob').value;
        const sex = document.getElementById('new-student-sex').value;
        const obs = document.getElementById('new-student-obs').value.trim();
        const weight = parseFloat(document.getElementById('new-student-weight').value) || null;
        const height = parseFloat(document.getElementById('new-student-height').value) || null;
        const fat = parseFloat(document.getElementById('new-student-fat').value) || null;
        const imc = (weight && height && height > 50) ? parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1)) : null;
        const measures = readMeasures('new-m-');
        const injuries = document.getElementById('new-chk-injuries').checked ? document.getElementById('new-txt-injuries').value.trim() : '';
        const conditions = document.getElementById('new-chk-conditions').checked ? document.getElementById('new-txt-conditions').value.trim() : '';
        const meds = document.getElementById('new-chk-meds').checked ? document.getElementById('new-txt-meds').value.trim() : '';
        let code, exists = true;
        while (exists) { code = genCode(); const s = await _getDocs(_query(_col(_db, 'students'), _where('code', '==', code))); exists = !s.empty; }
        const u = window.CURRENT_USER || {};
        const studentId = Date.now().toString();
        const hasPhysical = weight || height || fat || Object.keys(measures).length > 0;
        const studentData = {
          name, code, phone, email, dob, sex, obs,
          injuries, conditions, meds,
          weight: weight || null, height: height || null, imc: imc || null, fat: fat || null,
          measures: Object.keys(measures).length ? measures : null,
          managerId: u.username || '',
          managerName: u.displayName || u.username || '',
          managerPhone: u.phone || '',
          createdAt: Date.now()
        };
        await _setDoc(_doc(_db, 'students', studentId), studentData);
        // Save initial assessment if physical data provided
        if (hasPhysical) {
          await _setDoc(_doc(_db, 'students', studentId, 'assessments', Date.now().toString()), {
            date: fmtLocalYMD(),
            ts: Date.now(),
            weight, height, imc, fat, measures
          });
        }
        [1, 2, 3].forEach(s => { var p = document.getElementById('add-student-step-' + s); if (p) p.style.display = 'none'; });
        document.getElementById('add-student-steps').style.display = 'none';
        document.getElementById('add-student-step-label').textContent = '';
        document.getElementById('new-student-code-display').textContent = code;
        document.getElementById('new-student-code-reveal').style.display = 'block';
        document.getElementById('add-student-footer').innerHTML = '<button class="btn btn-primary" onclick="closeModal(\'modal-add-student\')">Concluir</button>';
        await loadStudents();
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
      finally { const b = document.getElementById('btn-add-student'); if (b) { b.classList.remove('btn-loading'); b.textContent = 'Cadastrar'; } }
    };
    window.copyNewStudentCode = function () {
      var code = document.getElementById('new-student-code-display').textContent;
      navigator.clipboard.writeText(code).then(function () { toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Código copiado!'); }).catch(function () { toast('Código: ' + code); });
    };
    window.openEditStudentModal = sid => {
      const s = ST.students.find(x => x.id === sid);
      if (!s) return;
      document.getElementById('edit-student-code-display').value = s.code;
      document.getElementById('edit-student-name').value = s.name || '';
      document.getElementById('edit-student-phone').value = s.phone || '';
      document.getElementById('edit-student-email').value = s.email || '';
      document.getElementById('edit-student-dob').value = s.dob || '';
      document.getElementById('edit-student-sex').value = s.sex || '';
      document.getElementById('edit-student-obs').value = s.obs || '';
      document.getElementById('edit-student-weight').value = s.weight || '';
      document.getElementById('edit-student-height').value = s.height || '';
      document.getElementById('edit-student-fat').value = s.fat || '';
      fillMeasures('edit-m-', s.measures || {});
      // health
      var hMap = [
        ['edit-chk-injuries', 'edit-txt-injuries', 'edit-health-injuries-detail', s.injuries],
        ['edit-chk-conditions', 'edit-txt-conditions', 'edit-health-conditions-detail', s.conditions],
        ['edit-chk-meds', 'edit-txt-meds', 'edit-health-meds-detail', s.meds]
      ];
      hMap.forEach(function (h) {
        var chk = document.getElementById(h[0]);
        var txt = document.getElementById(h[1]);
        var det = document.getElementById(h[2]);
        var val = h[3];
        if (chk) chk.checked = !!val;
        if (txt) txt.value = val || '';
        if (det) det.classList.toggle('visible', !!val);
        var item = chk && chk.closest('.health-check-item');
        if (item) item.classList.toggle('checked', !!val);
      });
      // Reset to first tab
      document.querySelectorAll('#modal-edit-student .assessment-tab-panel').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('#modal-edit-student .assessment-tab').forEach(b => b.classList.remove('active'));
      document.getElementById('edit-tab-dados').classList.add('active');
      document.querySelector('#modal-edit-student .assessment-tab').classList.add('active');
      // Recalc imc if values exist
      if (s.weight && s.height) calcImcPreview('edit-student-weight', 'edit-student-height', 'edit-student-imc-box');
      if (s.dob) calcAgePreview('edit-student-dob', 'edit-student-age-preview');
      document.getElementById('btn-save-edit-student').dataset.sid = sid;
      openModal('modal-edit-student');
      setTimeout(() => document.getElementById('edit-student-name').focus(), 100);
    };
    window.saveEditStudent = async () => {
      const btn = document.getElementById('btn-save-edit-student');
      const sid = btn.dataset.sid;
      const name = document.getElementById('edit-student-name').value.trim();
      if (!name) { toast('Nome obrigatório!', 'error'); return; }
      btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
      try {
        const phone = document.getElementById('edit-student-phone').value.trim();
        const email = document.getElementById('edit-student-email').value.trim();
        const dob = document.getElementById('edit-student-dob').value;
        const sex = document.getElementById('edit-student-sex').value;
        const obs = document.getElementById('edit-student-obs').value.trim();
        const weight = parseFloat(document.getElementById('edit-student-weight').value) || null;
        const height = parseFloat(document.getElementById('edit-student-height').value) || null;
        const fat = parseFloat(document.getElementById('edit-student-fat').value) || null;
        const imc = (weight && height && height > 50) ? parseFloat((weight / Math.pow(height / 100, 2)).toFixed(1)) : null;
        const measures = readMeasures('edit-m-');
        const injuries = document.getElementById('edit-chk-injuries').checked ? document.getElementById('edit-txt-injuries').value.trim() : '';
        const conditions = document.getElementById('edit-chk-conditions').checked ? document.getElementById('edit-txt-conditions').value.trim() : '';
        const meds = document.getElementById('edit-chk-meds').checked ? document.getElementById('edit-txt-meds').value.trim() : '';
        const hasPhysical = weight || height || fat || Object.keys(measures).length > 0;
        await _updateDoc(_doc(_db, 'students', sid), {
          name, phone, email, dob, sex, obs, injuries, conditions, meds,
          weight: weight || null, height: height || null, imc: imc || null, fat: fat || null,
          measures: Object.keys(measures).length ? measures : null
        });
        // Save assessment if physical data filled
        if (hasPhysical) {
          await _setDoc(_doc(_db, 'students', sid, 'assessments', Date.now().toString()), {
            date: fmtLocalYMD(),
            ts: Date.now(),
            weight, height, imc, fat, measures
          });
        }
        closeModal('modal-edit-student');
        toast('Aluno atualizado!', 'success');
        await loadStudents();
        // Refresh detail view if open
        if (ST.currentStudentId === sid) openStudentDetail(sid);
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
      finally { btn.classList.remove('btn-loading'); btn.textContent = 'Salvar alterações'; }
    };
    window.updateStats = async () => {
      const total = ST.students.length;
      document.getElementById('stat-alunos').textContent = total;

      // Novos alunos 7 e 30 dias
      const now = Date.now();
      const ms7  = 7  * 24 * 60 * 60 * 1000;
      const ms30 = 30 * 24 * 60 * 60 * 1000;
      const novos7  = ST.students.filter(s => s.createdAt && (now - (s.createdAt.toMillis ? s.createdAt.toMillis() : s.createdAt)) <= ms7).length;
      const novos30 = ST.students.filter(s => s.createdAt && (now - (s.createdAt.toMillis ? s.createdAt.toMillis() : s.createdAt)) <= ms30).length;
      const novosMes = ST.students.filter(s => {
        if (!s.createdAt) return false;
        const d = new Date(s.createdAt.toMillis ? s.createdAt.toMillis() : s.createdAt);
        const n = new Date();
        return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
      }).length;

      document.getElementById('stat-novos-7d').textContent = novos7;
      document.getElementById('stat-novos-7d-sub').textContent = novos7 === 1 ? 'aluno cadastrado' : 'alunos cadastrados';
      document.getElementById('stat-novos-30d').textContent = novos30;
      document.getElementById('stat-novos-30d-sub').textContent = novos30 === 1 ? 'aluno cadastrado' : 'alunos cadastrados';
      document.getElementById('stat-alunos-sub').textContent = novosMes + ' novo' + (novosMes !== 1 ? 's' : '') + ' este mês';

      // Timestamp de atualização
      const lu = document.getElementById('dash-last-updated');
      if (lu) {
        const t = new Date();
        lu.textContent = 'Atualizado ' + t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0');
      }

      // Últimos cadastros (5 mais recentes)
      const sorted = [...ST.students].sort((a, b) => {
        const ta = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt) : 0;
        const tb = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt) : 0;
        return tb - ta;
      }).slice(0, 5);

      const rl = document.getElementById('dash-recent-list');
      if (rl) {
        if (!sorted.length) {
          rl.innerHTML = '<div class="dash-empty-state">Nenhum aluno cadastrado ainda.</div>';
        } else {
          rl.innerHTML = sorted.map(s => {
            const initials = (s.name || '?').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
            const ms = s.createdAt ? (s.createdAt.toMillis ? s.createdAt.toMillis() : s.createdAt) : 0;
            const diff = now - ms;
            let dateStr = '';
            if (!ms) { dateStr = 'Data não informada'; }
            else if (diff < 60000) { dateStr = 'Agora mesmo'; }
            else if (diff < 3600000) { dateStr = Math.floor(diff/60000) + ' min atrás'; }
            else if (diff < 86400000) { dateStr = Math.floor(diff/3600000) + 'h atrás'; }
            else if (diff < 604800000) { dateStr = Math.floor(diff/86400000) + 'd atrás'; }
            else { const d = new Date(ms); dateStr = d.toLocaleDateString('pt-BR'); }
            const isNew = diff <= ms7;
            return `<div class="dash-recent-item" onclick="openStudentDetail('${s.id}')">
              <div class="dash-recent-avatar">${initials}</div>
              <div class="dash-recent-info">
                <div class="dash-recent-name">${s.name || 'Sem nome'}</div>
                <div class="dash-recent-date">Cadastrado ${dateStr}</div>
              </div>
              ${isNew ? '<span class="dash-recent-badge new">Novo</span>' : ''}
            </div>`;
          }).join('');
        }
      }

      // Count plans only for the students already loaded (filtered by manager)
      const studentIds = ST.students.map(s => s.id);
      if (!studentIds.length) {
        document.getElementById('stat-planos').textContent = 0;
        document.getElementById('stat-expired').textContent = 0;
        document.getElementById('stat-taxa').textContent = '0%';
        document.getElementById('stat-planos-sub').textContent = 'Nenhum plano';
        return;
      }
      const snap = await _getDocs(_col(_db, 'plans'));
      const ps = snap.docs.map(d => d.data()).filter(p => studentIds.includes(p.studentId));
      const activeCount  = ps.filter(p => getPlanStatus(p) === 'active').length;
      const expiredCount = ps.filter(p => getPlanStatus(p) === 'expired').length;
      const totalPlans   = ps.length;
      const taxa = totalPlans ? Math.round((activeCount / totalPlans) * 100) : 0;

      document.getElementById('stat-planos').textContent = activeCount;
      document.getElementById('stat-expired').textContent = expiredCount;
      document.getElementById('stat-taxa').textContent = taxa + '%';
      document.getElementById('stat-planos-sub').textContent = activeCount === 1 ? '1 plano vigente' : activeCount + ' planos vigentes';
      document.getElementById('stat-taxa-sub').textContent = activeCount + ' ativos de ' + totalPlans + ' total';
      if (expiredCount > 0) {
        document.getElementById('stat-expired-sub').textContent = expiredCount + ' aguardando renovação';
      } else {
        document.getElementById('stat-expired-sub').textContent = 'Nenhum vencido';
      }
    };
    window.showStudentsList = () => {
      document.getElementById('students-list-view').classList.remove('hidden');
      document.getElementById('student-detail-view').classList.add('hidden');
    };

    window.openStudentDetail = async sid => {
      // Cancela listener de frequência do aluno anterior, se houver
      if (window._freqUnsubMap) {
        Object.keys(window._freqUnsubMap).forEach(prevSid => {
          if (prevSid !== sid && window._freqUnsubMap[prevSid]) {
            window._freqUnsubMap[prevSid]();
            delete window._freqUnsubMap[prevSid];
          }
        });
      }
      const s = ST.students.find(x => x.id === sid); if (!s) return; ST.currentStudentId = sid;
      const snap = await _getDocs(_query(_col(_db, 'plans'), _where('studentId', '==', sid)));
      const plans = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.createdAt - a.createdAt);
      const active = plans.filter(p => getPlanStatus(p) === 'active');
      const upcoming = plans.filter(p => getPlanStatus(p) === 'upcoming');
      const expired = plans.filter(p => getPlanStatus(p) === 'expired');
      document.getElementById('students-list-view').classList.add('hidden');
      const dv = document.getElementById('student-detail-view'); dv.classList.remove('hidden');

      const age = s.dob ? calcAge(s.dob) : null;
      const sexLabel = { M: 'Masculino', F: 'Feminino', O: 'Outro' }[s.sex] || '';

      dv.innerHTML = `
    <button class="back-btn" onclick="showStudentsList()">← Voltar</button>
    <div class="student-access-banner">
      <div class="student-access-banner-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></div>
      <div class="student-access-info">
        <div class="sai-label">Código de acesso do aluno</div>
        <div class="sai-code">${s.code}</div>
        <div class="sai-link">Acesse em <a href="https://trainly.online" target="_blank">trainly.online</a> e insira este código</div>
      </div>
      <div class="student-access-copy">
        <button class="btn btn-ghost btn-sm" onclick="copyStudentCode('${s.code}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Copiar código</button>
        <button class="btn btn-ghost btn-sm" onclick="copyStudentLink()"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Copiar link</button>
      </div>
    </div>
    <div class="detail-header">
      <div class="detail-avatar">${initials(s.name)}</div>
      <div class="detail-info">
        <h2>${s.name}</h2>
        <div class="code">Código: ${s.code}</div>
        ${age !== null ? `<div style="font-size:.78rem;color:var(--text3);font-weight:600;margin-top:3px;">${age} anos${sexLabel ? ' · ' + sexLabel : ''}</div>` : ''}
        ${s.phone ? `<div style="font-size:.82rem;color:var(--text2);margin-top:6px;font-weight:500;">📱 ${s.phone}</div>` : ''}
        ${s.email ? `<div style="font-size:.82rem;color:var(--text2);margin-top:2px;font-weight:500;">✉️ ${s.email}</div>` : ''}
      </div>
      <div class="detail-actions" style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;">
        ${s.phone ? `<button class="btn btn-whatsapp btn-sm" onclick="contactWhatsApp('${s.phone}','${s.name}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> WhatsApp</button>` : ''}
        <button class="btn btn-ghost btn-sm" onclick="openEditStudentModal('${sid}')">✏️ Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.id}')">Excluir</button>
      </div>
    </div>

    <!-- Frequência de Treinos — seção fixa, fora das abas -->
    <div class="freq-inline-section" onclick="openFreqCalendar('${sid}')" style="cursor:pointer;">
      <div class="freq-inline-title">
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Frequência de Treinos
      </div>
      <div class="freq-inline-hint">Toque para ver o calendário completo</div>
      <div id="freq-content-${sid}"><div class="spinner" style="width:18px;height:18px;border-width:2px;margin:6px auto;"></div></div>
    </div>

    <!-- Student Tabs -->
    <div class="student-tabs">
      <button class="student-tab active" onclick="switchStudentTab('stab-treinos',this,'${sid}')">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h5"/><rect x="2" y="3" width="20" height="18" rx="3"/></svg>
        Treinos
      </button>
      <button class="student-tab" onclick="switchStudentTab('stab-dados',this,'${sid}')">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        Dados pessoais
      </button>
      <button class="student-tab" onclick="switchStudentTab('stab-evolucao',this,'${sid}')">
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Evolução
      </button>
    </div>

    <!-- TAB: Treinos -->
    <div class="student-tab-panel active" id="stab-treinos">
      ${plans.length === 0 ? `<div class="empty-center"><div class="empty-icon">📋</div><p>Nenhum plano cadastrado.</p><button class="btn btn-primary" style="margin-top:4px;" onclick="openPlanEditInfoModal('${sid}')">+ Criar plano</button></div>` : `
        <div class="add-plan-btn-wrap"><button class="add-plan-btn add-plan-btn--dark" onclick="openPlanEditInfoModal('${sid}')">+ Adicionar plano de treino</button></div>
        ${active.length ? `<div class="section-label">Planos ativos</div><div class="plans-list">${active.map((p, i) => planCardHTML(p, sid, i, 'active')).join('')}</div>` : ''}
        ${upcoming.length ? `<div class="section-label upcoming-label">Em breve</div><div class="plans-list">${upcoming.map((p, i) => planCardHTML(p, sid, i, 'upcoming')).join('')}</div>` : ''}
        ${!active.length && !upcoming.length ? `<div class="empty-center" style="padding:20px 0;"><p style="color:var(--text2);font-size:.87rem;">Nenhum treino ativo no momento.</p></div>` : ''}
        ${expired.length ? `<div class="section-label expired-label" style="margin-top:8px;">Vencidos / Finalizados</div><div class="plans-list">${expired.map((p, i) => planCardHTML(p, sid, i, 'expired')).join('')}</div>` : ''}

      `}
    </div>

    <!-- TAB: Dados pessoais -->
    <div class="student-tab-panel" id="stab-dados">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
        ${s.dob ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Nascimento</div><div style="font-weight:700;font-size:.9rem;">${new Date(s.dob + 'T12:00').toLocaleDateString('pt-BR')}${age !== null ? ' (' + age + ' anos)' : ''}</div></div>` : ''}
        ${s.sex ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Sexo</div><div style="font-weight:700;font-size:.9rem;">${{ M: 'Masculino', F: 'Feminino', O: 'Outro' }[s.sex] || ''}</div></div>` : ''}
        ${s.weight ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Peso atual</div><div style="font-weight:700;font-size:.9rem;">${s.weight} kg</div></div>` : ''}
        ${s.height ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Altura</div><div style="font-weight:700;font-size:.9rem;">${s.height} cm</div></div>` : ''}
        ${s.imc ? `<div style="background:var(--accent-dim);border:1.5px solid var(--accent-soft);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:#8a6200;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">IMC</div><div style="font-weight:800;font-size:1.1rem;">${s.imc}</div></div>` : ''}
        ${s.fat ? `<div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">% Gordura</div><div style="font-weight:700;font-size:.9rem;">${s.fat}%</div></div>` : ''}
      </div>
      ${s.measures && Object.keys(s.measures).length ? `
        <div class="evol-section-title">Medidas corporais</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:20px;">
          ${Object.entries({ chest: 'Peito', waist: 'Cintura', hip: 'Quadril', 'arm-r': 'Braço D', 'arm-l': 'Braço E', shoulder: 'Ombro', 'thigh-r': 'Coxa D', 'thigh-l': 'Coxa E', 'calf-r': 'Panturrilha D', 'calf-l': 'Panturrilha E', 'thigh-prox': 'Coxa Proximal', 'thigh-dist': 'Coxa Distal' }).filter(([k]) => s.measures[k]).map(([k, label]) => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:10px 12px;">
              <div style="font-size:.65rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">${label}</div>
              <div style="font-weight:700;font-size:.92rem;">${s.measures[k]} cm</div>
            </div>`).join('')}
        </div>`: ''}
      ${s.injuries || s.conditions || s.meds ? `
        <div class="evol-section-title">Saúde</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:16px;">
          ${s.injuries ? `<div style="background:var(--red-dim);border:1px solid rgba(224,62,62,.2);border-radius:var(--r);padding:10px 14px;"><div style="font-size:.7rem;font-weight:800;color:var(--red);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Lesões / Limitações</div><div style="font-size:.85rem;font-weight:600;">${s.injuries}</div></div>` : ''}
          ${s.conditions ? `<div style="background:rgba(245,200,0,.07);border:1px solid rgba(245,200,0,.25);border-radius:var(--r);padding:10px 14px;"><div style="font-size:.7rem;font-weight:800;color:#8a6200;text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Problemas de saúde</div><div style="font-size:.85rem;font-weight:600;">${s.conditions}</div></div>` : ''}
          ${s.meds ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;"><div style="font-size:.7rem;font-weight:800;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Medicamentos</div><div style="font-size:.85rem;font-weight:600;">${s.meds}</div></div>` : ''}
        </div>`: ''}
      ${s.obs ? `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;"><div style="font-size:.68rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Observações</div><div style="font-size:.85rem;line-height:1.6;">${s.obs}</div></div>` : ''}
      <button class="btn btn-ghost" style="margin-top:16px;" onclick="openEditStudentModal('${sid}')">✏️ Editar dados</button>
    </div>

    <!-- TAB: Evolução -->
    <div class="student-tab-panel" id="stab-evolucao">
      <div id="evolucao-content-${sid}">
        <div class="spinner"></div>
      </div>
    </div>

    <!-- TAB: Frequência -->
    <div class="student-tab-panel" id="stab-freq">
      <div id="freq-content-${sid}">
        <div class="spinner"></div>
      </div>
    </div>
  `;
      // Load assessments async
      loadStudentEvolution(sid);
      // Load frequency inline (not a tab)
      loadStudentFrequency(sid);
    };

    window.switchStudentTab = function (tabId, btn, sid) {
      var dv = document.getElementById('student-detail-view');
      dv.querySelectorAll('.student-tab-panel').forEach(p => p.classList.remove('active'));
      dv.querySelectorAll('.student-tab').forEach(b => b.classList.remove('active'));
      document.getElementById(tabId).classList.add('active');
      btn.classList.add('active');
    };

    window.loadStudentEvolution = async function (sid) {
      const container = document.getElementById('evolucao-content-' + sid);
      if (!container) return;
      try {
        const snap = await _getDocs(_query(_col(_db, 'students', sid, 'assessments'), _orderBy('ts', 'desc')));
        const assessments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!assessments.length) {
          container.innerHTML = `<div class="empty-state" style="padding:40px 20px;text-align:center;">
        <div style="font-size:2.5rem;margin-bottom:12px;">📊</div>
        <div style="font-family:var(--head);font-weight:800;font-size:.95rem;color:var(--text2);margin-bottom:6px;">Nenhuma avaliação registrada</div>
        <div style="font-size:.82rem;color:var(--text3);margin-bottom:16px;">Adicione dados físicos na aba "Editar" para começar o acompanhamento.</div>
        <button class="new-assessment-btn" onclick="openEditStudentModal('${sid}');document.querySelectorAll('#modal-edit-student .assessment-tab')[1].click();">+ Nova avaliação</button>
      </div>`;
          return;
        }
        const latest = assessments[0];
        const prev = assessments[1] || null;
        const LABELS = { weight: 'Peso (kg)', fat: '% Gordura', chest: 'Peito', waist: 'Cintura', hip: 'Quadril', 'arm-r': 'Braço D', 'arm-l': 'Braço E', shoulder: 'Ombro', 'thigh-r': 'Coxa D', 'thigh-l': 'Coxa E', 'calf-r': 'Panturrilha D', 'calf-l': 'Panturrilha E', 'thigh-prox': 'Coxa Proximal', 'thigh-dist': 'Coxa Distal' };
        const fmtDate = ts => { try { var d = new Date(ts); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return ts; } };
        const diffRow = (label, currVal, prevVal, unit) => {
          if (currVal === null || currVal === undefined) return '';
          const curr = parseFloat(currVal);
          const p = prevVal !== null && prevVal !== undefined ? parseFloat(prevVal) : null;
          const diff = p !== null ? (curr - p) : null;
          const diffStr = diff !== null ? (diff >= 0 ? '+' + diff.toFixed(1) : diff.toFixed(1)) : '—';
          const cls = diff === null || diff === 0 ? 'evo-diff-zero' : diff < 0 ? 'evo-diff-neg' : 'evo-diff-pos';
          return `<div class="evo-metric-row">
        <span class="evo-metric-label">${label}</span>
        <div class="evo-metric-values">
          ${p !== null ? `<span class="evo-metric-prev">${p.toFixed(1)}${unit}</span><span style="color:var(--border2);">→</span>` : ''}
          <span class="evo-metric-curr">${curr.toFixed(1)}${unit}</span>
          <span class="evo-metric-diff ${cls}">${diffStr}${unit}</span>
        </div>
      </div>`;
        };
        let compareRows = '';
        compareRows += diffRow('Peso', latest.weight, prev?.weight, ' kg');
        compareRows += diffRow('% Gordura', latest.fat, prev?.fat, '%');
        const m = latest.measures || {};
        const pm = prev?.measures || {};
        Object.entries(LABELS).forEach(([k, label]) => {
          if (k === 'weight' || k === 'fat') return;
          if (m[k] !== undefined) compareRows += diffRow(label, m[k], pm[k], ' cm');
        });
        if (latest.imc) compareRows += `<div class="evo-metric-row"><span class="evo-metric-label">IMC</span><div class="evo-metric-values"><span class="evo-metric-curr">${latest.imc}</span></div></div>`;

        const historyHTML = assessments.map((a, i) => {
          const summary = [a.weight ? a.weight + 'kg' : null, a.fat ? a.fat + '%gordura' : null, a.measures && a.measures.waist ? 'cintura ' + a.measures.waist + 'cm' : null].filter(Boolean).join(' · ') || 'Sem resumo';
          return `<div class="evo-history-item" id="assessment-item-${a.id}">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
          <div style="flex:1;min-width:0;">
            <div class="evo-history-date">${fmtDate(a.ts || a.date)}${i === 0 ? ' <span style="background:var(--green-dim);color:var(--green);border-radius:99px;padding:1px 7px;font-size:.65rem;font-weight:800;">Atual</span>' : ''}</div>
            <div class="evo-history-summary">${summary}</div>
          </div>
          <button onclick="deleteAssessment('${sid}','${a.id}')" title="Excluir avaliação" style="flex-shrink:0;background:var(--red-dim);border:1px solid rgba(224,62,62,.2);color:var(--red);border-radius:8px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .15s;" onmouseover="this.style.background='rgba(224,62,62,.18)'" onmouseout="this.style.background='var(--red-dim)'">
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>`;
        }).join('');

        container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-family:var(--head);font-size:1rem;font-weight:800;">Acompanhamento de evolução</div>
        <button class="new-assessment-btn" onclick="openEditStudentModal('${sid}');setTimeout(()=>document.querySelectorAll('#modal-edit-student .assessment-tab')[1].click(),200);">+ Nova avaliação</button>
      </div>
      ${compareRows ? `<div class="evo-compare-card">
        <div class="evo-compare-header">
          <span class="evo-compare-title">Comparativo — última avaliação</span>
          <span class="evo-compare-date">${fmtDate(latest.ts || latest.date)}${prev ? ` vs ${fmtDate(prev.ts || prev.date)}` : ''}</span>
        </div>
        <div class="evo-compare-body">${compareRows}</div>
      </div>` : ''}
      <div class="evol-section-title" style="margin-top:8px;">Histórico de avaliações (${assessments.length})</div>
      <div class="evo-history-list">${historyHTML}</div>
    `;
      } catch (e) {
        container.innerHTML = `<div style="color:var(--text3);padding:20px;font-size:.85rem;">Erro ao carregar avaliações: ${e.message}</div>`;
      }
    };

    // ── Frequência de Treinos ──
    // ══════════════════════════════════════════════════════════════
    // SISTEMA DE FREQUÊNCIA — attendance/{studentId}/days/{YYYY-MM-DD}
    // Hora sempre via API do Brasil, fallback Intl
    // Treinador pode clicar em qualquer bolinha para alternar status
    // ══════════════════════════════════════════════════════════════

    window._freqCalState = {}; // { sid: { year, month } }
    window._freqAttData = {}; // { sid: { 'YYYY-MM-DD': 'trained'|'missed'|'rest' } }
    window._freqUnsubMap = {}; // { sid: unsubFn }
    window._freqTodayBRCache = null;

    // Obtém data BR (America/Sao_Paulo) em YYYY-MM-DD via API, fallback Intl
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

    // Escreve um status de attendance (trainer pode editar qualquer dia)
    async function _trainerFreqWrite(sid, dateStr, status) {
      await _db.collection('attendance').doc(sid).collection('days').doc(dateStr).set({
        status,
        updatedAt: Date.now(),
        updatedBy: (window.CURRENT_USER && window.CURRENT_USER.username) || 'trainer'
      }, { merge: true });
    }

    // Inicia listener onSnapshot para um aluno
    function _trainerFreqStartListener(sid) {
      if (window._freqUnsubMap[sid]) { window._freqUnsubMap[sid](); }
      const ref = _db.collection('attendance').doc(sid).collection('days');
      window._freqUnsubMap[sid] = ref.onSnapshot(snap => {
        const att = {};
        snap.docs.forEach(d => { att[d.id] = d.data().status || 'trained'; });
        window._freqAttData[sid] = att;
        // Re-renderiza se o container ainda estiver na tela
        const container = document.getElementById('freq-content-' + sid);
        if (container) _trainerRenderFreqSection(sid, container);
      }, err => console.warn('freq listener trainer:', err));
    }

    window.loadStudentFrequency = async function (sid) {
      const container = document.getElementById('freq-content-' + sid);
      if (!container) return;
      container.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:6px auto;"></div>';
      // Garante data BR em cache
      await _trainerFreqGetTodayBR();
      // Inicia listener (substitui eventual listener anterior deste sid)
      _trainerFreqStartListener(sid);
    };

    function _trainerRenderFreqSection(sid, container) {
      const att = window._freqAttData[sid] || {};
      const todayStr = window._freqTodayBRCache || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      const todayDate = new Date(todayStr + 'T12:00:00');
      const dow = todayDate.getDay();
      const weekStart = new Date(todayDate);
      weekStart.setDate(todayDate.getDate() + ((dow === 0) ? -6 : 1 - dow));

      let dotsHTML = '';
      for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        const ds = d.toLocaleDateString('sv-SE');
        const status = att[ds] || null;
        const trained = status === 'trained';
        const missed = status === 'missed';
        const rest = status === 'rest';
        const isToday = ds === todayStr;
        const isFuture = ds > todayStr;
        const isPast = ds < todayStr;
        const dayLabel = DAY_LABELS[d.getDay()];

        let lineClass = '';
        if (trained) lineClass = ' trained';
        else if (missed || (isPast && !isToday && !rest)) lineClass = ' missed';

        const line = i > 0 ? `<div class="freq-tl-line${lineClass}"></div>` : '';

        let dotClass = 'freq-tl-dot freq-tl-dot-clickable';
        let dotInner = '';
        // Tooltip para indicar que é clicável
        const tipMap = {
          trained: 'Treinado — clique para alterar', missed: 'Faltou — clique para alterar',
          rest: 'Descanso — clique para alterar', future: 'Dia futuro', today: 'Hoje — clique para marcar'
        };
        let tip = '';

        if (trained) {
          dotClass += ' trained'; tip = tipMap.trained;
          dotInner = `<svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="var(--green)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
        } else if (rest) {
          dotClass += ' future'; tip = tipMap.rest;
          dotInner = `<span style="font-size:.62rem;font-weight:900;color:var(--text3);line-height:1;">Z</span>`;
        } else if (isFuture) {
          dotClass += ' future'; tip = tipMap.future;
          dotInner = `<div style="width:5px;height:5px;border-radius:50%;background:var(--border2);opacity:.4;"></div>`;
        } else if (isToday) {
          dotClass += ' today'; tip = tipMap.today;
          dotInner = `<div style="width:5px;height:5px;border-radius:50%;background:var(--accent);opacity:.7;"></div>`;
        } else if (missed) {
          dotClass += ' missed'; tip = tipMap.missed;
          dotInner = `<span style="font-size:.7rem;font-weight:900;color:var(--red);line-height:1;">!</span>`;
        } else if (isPast) {
          dotClass += ' missed'; tip = tipMap.missed;
          dotInner = `<span style="font-size:.7rem;font-weight:900;color:var(--red);line-height:1;">!</span>`;
        }

        // Dias futuros não são editáveis
        const clickable = !isFuture;
        const clickAttr = clickable
          ? `onclick="event.stopPropagation();_trainerFreqToggle('${sid}','${ds}')" title="${tip}" style="cursor:pointer;"`
          : `title="${tip}"`;

        dotsHTML += `
      ${line}
      <div class="freq-tl-item">
        <div class="${dotClass}" ${clickAttr}>${dotInner}</div>
        <span class="freq-tl-lbl${isToday ? ' today' : ''}">${dayLabel}</span>
      </div>`;
      }

      container.innerHTML = `<div class="freq-tl-row">${dotsHTML}</div>`;
      window._freqCalState[sid] = { year: todayDate.getFullYear(), month: todayDate.getMonth() };
    }

    // Toggle de status ao clicar numa bolinha (trainer)
    // Ciclo: sem registro → trained → missed → rest → trained
    window._trainerFreqToggle = async function (sid, ds) {
      const att = window._freqAttData[sid] || {};
      const cur = att[ds] || null;
      const next = cur === null ? 'trained' : cur === 'trained' ? 'missed' : cur === 'missed' ? 'rest' : 'trained';
      try {
        await _trainerFreqWrite(sid, ds, next);
        // onSnapshot atualiza automaticamente
      } catch (e) {
        toast('Erro ao salvar frequência: ' + e.message, 'error');
      }
    };

    window.toggleFreqCalendar = function (sid) {
      const chevron = document.getElementById('freq-chevron-' + sid);
      if (chevron) chevron.classList.toggle('open');
      openFreqCalendar(sid);
    };

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
      const existing = document.getElementById('freq-cal-overlay-' + sid);
      if (existing) existing.remove();

      const att = window._freqAttData[sid] || {};
      const todayStr = window._freqTodayBRCache || new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
      const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const WDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startOffset = firstDay.getDay();
      const totalDays = lastDay.getDate();
      const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      const monthCount = Object.keys(att).filter(d => d.startsWith(monthPrefix) && att[d] === 'trained').length;

      let gridHTML = '';
      for (let i = 0; i < startOffset; i++) gridHTML += '<div class="freq-cal-day empty"></div>';
      for (let d = 1; d <= totalDays; d++) {
        const ds = `${monthPrefix}-${String(d).padStart(2, '0')}`;
        const status = att[ds] || null;
        const trained = status === 'trained';
        const missed = status === 'missed';
        const rest = status === 'rest';
        const isToday = ds === todayStr;
        const isFuture = ds > todayStr;
        let cls = 'freq-cal-day';
        if (trained) cls += ' trained';
        else if (missed) cls += ' missed-cal';
        else if (rest) cls += ' rest-cal';
        if (isToday) cls += ' today-cal';
        const clickable = !isFuture;
        gridHTML += `<div class="${cls}"${clickable ? ` onclick="_trainerFreqToggle('${sid}','${ds}')" style="cursor:pointer;" title="Clique para alternar status"` : ''}>${d}</div>`;
      }

      const overlay = document.createElement('div');
      overlay.className = 'freq-cal-overlay';
      overlay.id = 'freq-cal-overlay-' + sid;
      overlay.innerHTML = `
    <div class="freq-cal-modal">
      <div class="freq-cal-header">
        <div class="freq-cal-title">${MONTHS[month]} ${year}</div>
        <div class="freq-cal-nav">
          <button data-dir="-1" title="Mês anterior">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button data-dir="1" title="Próximo mês">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
      <div class="freq-cal-body">
        <div class="freq-cal-weekdays">${WDAYS.map(w => `<div class="freq-cal-wday">${w}</div>`).join('')}</div>
        <div class="freq-cal-grid">${gridHTML}</div>
      </div>
      <div class="freq-cal-footer">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <div class="freq-cal-month-stat"><strong>${monthCount}</strong> dia${monthCount !== 1 ? 's' : ''} treinado${monthCount !== 1 ? 's' : ''} em ${MONTHS[month]}</div>
          <div style="font-size:.68rem;color:var(--text3);font-weight:600;">Clique nos dias para editar</div>
        </div>
        <button class="btn btn-ghost btn-sm" id="freq-cal-close-${sid}">Fechar</button>
      </div>
    </div>
  `;

      overlay.querySelectorAll('.freq-cal-nav button').forEach(btn => {
        btn.onclick = function (e) {
          e.stopPropagation();
          const dir = parseInt(btn.dataset.dir);
          let m = month + dir, y = year;
          if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
          renderFreqCalendar(sid, y, m);
        };
      });

      overlay.querySelector('#freq-cal-close-' + sid).onclick = function () {
        overlay.remove();
        const chevron = document.getElementById('freq-chevron-' + sid);
        if (chevron) chevron.classList.remove('open');
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      };

      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
          overlay.remove();
          const chevron = document.getElementById('freq-chevron-' + sid);
          if (chevron) chevron.classList.remove('open');
          document.body.style.overflow = '';
          document.body.style.touchAction = '';
        }
      });
      overlay.addEventListener('touchmove', function (e) {
        const inner = overlay.querySelector('.freq-cal-modal');
        let node = e.target;
        while (node && node !== overlay) { if (node === inner) return; node = node.parentNode; }
        e.preventDefault();
      }, { passive: false });

      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      window._freqCalState[sid] = { year, month };
    };

    window.freqCalNav = function (sid, year, month, delta) {
      let m = month + delta, y = year;
      if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
      renderFreqCalendar(sid, y, m);
    };

    // ── Delete assessment ──
    window.deleteAssessment = async function (sid, assessId) {
      if (!confirm('Excluir esta avaliação? Esta ação não pode ser desfeita.')) return;
      try {
        await _deleteDoc(_doc(_db, 'students', sid, 'assessments', assessId));
        // Remove o item da UI imediatamente
        var el = document.getElementById('assessment-item-' + assessId);
        if (el) el.remove();
        // Recarrega a aba de evolução para atualizar comparativo e contagem
        await loadStudentEvolution(sid);
        toast('✅ Avaliação excluída.');
      } catch (e) {
        toast('Erro ao excluir: ' + e.message, 'error');
      }
    };

    // WhatsApp direct contact
    window.contactWhatsApp = function (phone, name) {
      const cleaned = phone.replace(/\D/g, '');
      let num = cleaned;
      if (!num.startsWith('55')) num = '55' + num;
      const msg = encodeURIComponent(`Olá ${name}! Aqui é seu treinador. <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M6.5 6.5h11M6.5 12h11M6.5 17.5h5"/><rect x="2" y="3" width="20" height="18" rx="3"/></svg>`);
      window.open(`https://wa.me/${num}?text=${msg}`, '_blank');
    };

    // PDF Export for gestor — professional layout
    window.exportPlanPDF = function (planId, studentName) {
      const p = window.__gestorPlans && window.__gestorPlans[planId];
      if (!p) { toast('Plano não encontrado.', 'error'); return; }
      const DAYS2 = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const DAYS_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const status = getPlanStatus(p);
      const expired = status === 'expired';
      const startStr = p.startDate ? new Date(p.startDate + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
      const expiryStr = p.expiry ? new Date(p.expiry + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Sem data de vencimento';
      const periodStr = startStr && p.expiry ? startStr + ' → ' + expiryStr : startStr ? 'Início: ' + startStr : p.expiry ? 'Vence em: ' + expiryStr : 'Sem data definida';
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

      let exercisesHTML = '';
      (p.workouts || []).forEach((w, wi) => {
        const daysStr = (w.days || []).map(d => DAYS2[d]).join(', ') || 'Sem dias definidos';
        let exRows = '';
        (w.exercises || []).forEach((ex, ei) => {
          const repsArr = Array.isArray(ex.repsArr) ? ex.repsArr : (ex.reps ? ex.reps.split(',').map(s => s.trim()) : [ex.reps || '']);
          const uniqueReps = [...new Set(repsArr)];
          const repsDisplay = uniqueReps.length === 1 ? uniqueReps[0] : repsArr.join(' / ');
          const tags = [];
          if (ex.biset) tags.push('Bi-set: ' + ex.biset);
          if (ex.unilateral) tags.push('Unilateral');
          if (ex.isometria) tags.push('Isometria' + (ex.isometriaSegs ? ' ' + ex.isometriaSegs + 's' : ''));
          if (ex.restPause) tags.push('Rest-pause');
          exRows += `<tr>
        <td class="ex-num">${ei + 1}</td>
        <td class="ex-name-cell">
          <strong>${ex.name}</strong>
          ${tags.length ? '<div class="ex-tags">' + tags.map(t => '<span class="tag">' + t + '</span>').join('') + '</div>' : ''}
          ${ex.obs ? '<div class="ex-obs">' + ex.obs + '</div>' : ''}
        </td>
        <td class="ex-stat">${ex.series}</td>
        <td class="ex-stat">${repsDisplay}</td>
      </tr>`;
        });
        exercisesHTML += `
      <div class="workout-block">
        <div class="workout-header">
          <div class="workout-badge">${String.fromCharCode(65 + wi)}</div>
          <div class="workout-info">
            <div class="workout-title">${w.title || 'Treino ' + (wi + 1)}</div>
            <div class="workout-days">${daysStr}</div>
          </div>
          <div class="workout-count">${(w.exercises || []).length} exercício${(w.exercises || []).length !== 1 ? 's' : ''}</div>
        </div>
        <table class="ex-table">
          <thead><tr>
            <th class="th-num">#</th>
            <th class="th-name">Exercício</th>
            <th class="th-stat">Séries</th>
            <th class="th-stat">Reps</th>
          </tr></thead>
          <tbody>${exRows}</tbody>
        </table>
      </div>`;
      });

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Ficha de Treino — ${studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#fff;color:#111110;font-size:13px;line-height:1.5;}

  /* PAGE */
  .page{max-width:720px;margin:0 auto;padding:36px 32px;}

  /* HEADER */
  .header{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:20px;border-bottom:2px solid #111110;margin-bottom:24px;}
  .header-left{}
  .brand{font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#999990;margin-bottom:6px;}
  .student{font-size:22px;font-weight:800;color:#111110;letter-spacing:-.02em;line-height:1.1;}
  .plan-name{font-size:14px;font-weight:600;color:#555550;margin-top:4px;}
  .header-right{text-align:right;}
  .validity-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#999990;margin-bottom:3px;}
  .validity{font-size:13px;font-weight:700;color:${expired ? '#e03e3e' : '#2e7d52'};}
  .generated{font-size:10px;color:#bbbbbb;margin-top:6px;}

  /* STATUS BADGE */
  .status-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;border-radius:8px;margin-bottom:20px;font-size:12px;font-weight:700;${expired ? 'background:#fef2f2;border:1px solid #fecaca;color:#e03e3e;' : 'background:#f0faf5;border:1px solid #bbf0d5;color:#2e7d52;'}}
  .status-dot{width:7px;height:7px;border-radius:50%;background:currentColor;flex-shrink:0;}

  /* WORKOUT BLOCK */
  .workout-block{margin-bottom:20px;border:1px solid #e4e4e0;border-radius:12px;overflow:hidden;page-break-inside:avoid;}
  .workout-header{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#f7f7f5;border-bottom:1px solid #e4e4e0;}
  .workout-badge{width:32px;height:32px;border-radius:8px;background:#f5c800;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#111110;flex-shrink:0;}
  .workout-info{flex:1;}
  .workout-title{font-weight:800;font-size:14px;color:#111110;}
  .workout-days{font-size:11px;color:#888880;font-weight:600;margin-top:2px;}
  .workout-count{font-size:11px;font-weight:700;color:#999990;white-space:nowrap;}

  /* TABLE */
  .ex-table{width:100%;border-collapse:collapse;}
  .ex-table thead tr{background:#fafafa;}
  .ex-table th{padding:8px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#999990;border-bottom:1px solid #e4e4e0;text-align:left;}
  .th-num{width:32px;text-align:center;}
  .th-stat{width:68px;text-align:center;}
  .ex-table tbody tr{border-bottom:1px solid #f0f0ed;}
  .ex-table tbody tr:last-child{border-bottom:none;}
  .ex-table tbody tr:nth-child(even){background:#fafaf8;}
  .ex-num{text-align:center;font-weight:700;font-size:11px;color:#bbbbbb;padding:10px 6px;}
  .ex-name-cell{padding:10px 10px 10px 6px;}
  .ex-name-cell strong{font-weight:700;font-size:13px;color:#111110;}
  .ex-stat{text-align:center;font-weight:800;font-size:14px;color:#111110;padding:10px 6px;}
  .ex-tags{display:flex;gap:4px;flex-wrap:wrap;margin-top:4px;}
  .tag{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;background:#fef9e0;color:#8a6c00;border:1px solid #f5e080;}
  .ex-obs{font-size:11px;color:#888880;font-style:italic;margin-top:4px;line-height:1.4;}

  /* FOOTER */
  .footer{margin-top:28px;padding-top:14px;border-top:1px solid #e4e4e0;display:flex;justify-content:space-between;align-items:center;}
  .footer-left{font-size:10px;color:#cccccc;font-weight:600;}
  .footer-right{font-size:10px;color:#cccccc;}

  /* PRINT */
  @media print{
    body{font-size:12px;}
    .page{padding:20px;}
    .workout-block{page-break-inside:avoid;}
    @page{margin:16mm 12mm;}
  }
  @media(max-width:600px){
    .page{padding:20px 16px;}
    .header{flex-direction:column;gap:12px;}
    .header-right{text-align:left;}
    .th-stat,.ex-stat{width:52px;font-size:12px;}
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="header-left">
      <div class="brand">Trainly</div>
      <div class="student">${studentName}</div>
      <div class="plan-name">${p.title}</div>
    </div>
    <div class="header-right">
      <div class="validity-label">Validade</div>
      <div class="validity">${periodStr}${expired ? ' · Vencido' : ''}</div>
      <div class="generated">Gerado em ${today}</div>
    </div>
  </div>

  <div class="status-bar">
    <div class="status-dot"></div>
    <span>${expired ? 'Plano vencido — solicite uma atualização ao treinador' : 'Plano ativo'}</span>
  </div>

  ${exercisesHTML}

  <div class="footer">
    <div class="footer-left">Trainly · Ficha gerada automaticamente</div>
    <div class="footer-right">${today}</div>
  </div>

</div>
<scr'+'ipt>window.onload=function(){window.print();}<\/script>


</body>
</html>`;

      const win = window.open('', '_blank');
      if (win) { win.document.write(html); win.document.close(); toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> PDF pronto para imprimir!'); }
      else { toast('Permita pop-ups para exportar PDF.', 'error'); }
    };

    // WhatsApp plan share
    window.sharePlanWhatsApp = function (planId, studentName, studentPhone) {
      const p = window.__gestorPlans && window.__gestorPlans[planId];
      if (!p) { toast('Plano não encontrado.', 'error'); return; }
      const DAYS2 = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      let msg = `🏋️ *Trainly — Ficha de Treino*\n👤 *${studentName}*\n📋 *${p.title}*\n`;
      if (p.expiry) msg += `📅 Válido até ${new Date(p.expiry + 'T12:00').toLocaleDateString('pt-BR')}\n`;
      msg += `\n`;
      (p.workouts || []).forEach((w, wi) => {
        msg += `*${String.fromCharCode(65 + wi)}. ${w.title || 'Treino ' + (wi + 1)}*\n`;
        if (w.days && w.days.length) msg += `📅 ${w.days.map(d => DAYS2[d]).join(', ')}\n`;
        (w.exercises || []).forEach((ex, ei) => {
          msg += `  ${ei + 1}. ${ex.name} — ${ex.series}x${ex.reps}`;
          if (ex.unilateral) msg += ` (Unilateral)`;
          if (ex.biset) msg += ` + ${ex.biset}`;
          msg += `\n`;
          if (ex.obs) msg += `     _${ex.obs}_\n`;
        });
        msg += `\n`;
      });
      msg += `_Enviado via Trainly_ ⚡`;
      const encoded = encodeURIComponent(msg);
      let url = 'https://wa.me/';
      if (studentPhone) {
        const cleaned = studentPhone.replace(/\D/g, '');
        let num = cleaned;
        if (!num.startsWith('55')) num = '55' + num;
        url += num;
      }
      url += `?text=${encoded}`;
      window.open(url, '_blank');
      toast('Abrindo WhatsApp...');
    };

    const planCardHTML = (p, sid, idx, status = 'active') => {
      window.__gestorPlans = window.__gestorPlans || {};
      window.__gestorPlans[p.id] = p;
      const student = ST.students.find(s => s.id === sid) || {};
      const exp = status === 'expired';
      const upcoming = status === 'upcoming';
      const startStr = p.startDate ? new Date(p.startDate + 'T12:00').toLocaleDateString('pt-BR') : '';
      const expiryStr = p.expiry ? new Date(p.expiry + 'T12:00').toLocaleDateString('pt-BR') : '';
      let metaParts = [];
      if (startStr) metaParts.push('Início · ' + startStr);
      if (expiryStr) metaParts.push('Vence · ' + expiryStr);
      if (!startStr && !expiryStr) metaParts.push('Sem validade');
      metaParts.push((p.workouts || []).length + ' treino(s)');
      if (p.sequential && p.sequential.enabled) metaParts.push('Sequência ativada');
      const badgeClass = exp ? 'badge-expired' : upcoming ? 'badge-upcoming' : 'badge-active';
      const badgeLabel = exp ? 'Vencido' : upcoming ? 'Em breve' : 'Ativo';
      return `
  <div class="plan-card ${exp ? 'expired' : upcoming ? 'upcoming' : ''}">
    <div class="plan-card-header">
      <div class="plan-card-header-top">
        <div class="plan-letter">${String.fromCharCode(65 + idx)}</div>
        <div class="plan-info">
          <div class="plan-title">${p.title}</div>
          <div class="plan-meta">${metaParts.join(' · ')}</div>
        </div>
        <span class="badge ${badgeClass}" style="flex-shrink:0;">${badgeLabel}</span>
        <button class="plan-collapse-btn" id="collapse-btn-${p.id}" onclick="event.stopPropagation();togglePlanWorkouts('${p.id}')" title="Recolher/expandir treinos">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="ctx-menu-wrap">
          <button class="ctx-menu-btn" onclick="event.stopPropagation();toggleCtxMenu('ctx_${p.id}')" title="Mais opções">•••</button>
          <div class="ctx-menu hidden" id="ctx_${p.id}">
            <div class="ctx-menu-item" onclick="event.stopPropagation();closeAllCtxMenus();duplicatePlan('${p.id}','${sid}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Duplicar plano</div>
            <div class="ctx-menu-item" onclick="event.stopPropagation();closeAllCtxMenus();openCloneModal('${p.id}','${sid}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg> Clonar treino</div>
          </div>
        </div>
      </div>
      <div class="plan-actions">
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openSequentialModal('${p.id}','${sid}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 6h18M3 12h18M3 18h18"/></svg> Habilitar Treino Sequencial</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();viewPlan('${p.id}','${sid}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> Ver</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openPlanEditInfoModal('${sid}','${p.id}')">✏️ Editar</button>
        <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();exportPlanPDF('${p.id}','${student.name || ''}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Exportar PDF</button>
        <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();deletePlan('${p.id}','${sid}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg> Excluir</button>
      </div>
    </div>
    <div class="plan-workouts" id="plan-workouts-${p.id}">
      ${(p.workouts || []).map((w, wi) => `
        <div class="workout-row" style="padding:0;display:flex;align-items:stretch;">
          <div style="flex:1;padding:10px 14px;cursor:pointer;" onclick="event.stopPropagation();openModuleModal('${p.id}','${sid}',${wi})">
            <div class="workout-row-header">
              <div class="workout-row-tag">T${wi + 1}</div>
              <div class="workout-row-title">${w.title || 'Sem título'}</div>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">
              <div class="workout-days">${(w.days || []).map(d => `<span class="day-chip">${DAYS[d]}</span>`).join('')}</div>
              <div class="workout-excount">${(w.exercises || []).length} exercício(s)</div>
            </div>
          </div>
          <button class="btn btn-danger btn-sm" style="margin:8px 10px;padding:6px 9px;flex-shrink:0;align-self:center;" title="Remover módulo" onclick="event.stopPropagation();deleteModule('${p.id}','${sid}',${wi})">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>`).join('')}
      <div style="padding:8px 14px;border-top:1px dashed var(--border);">
        <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;gap:8px;" onclick="event.stopPropagation();openModuleModal('${p.id}','${sid}',null)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar módulo
        </button>
      </div>
    </div>
  </div>`;
    };

    window.openSequentialModal = async (planId, sid) => {
      const snap = await _getDoc(_doc(_db, 'plans', planId));
      if (!snap.exists) { toast('Plano não encontrado.', 'error'); return; }
      const p = { id: snap.id, ...snap.data() };
      const workouts = p.workouts || [];
      if (!workouts.length) { toast('Plano não possui módulos.', 'error'); return; }

      ST.sequential = { planId, sid, workouts };
      const lastCompleted = (p.sequential && typeof p.sequential.lastCompleted === 'number') ? p.sequential.lastCompleted : -1;
      const options = [{ label: 'Nenhum', value: -1 }].concat(workouts.map((w, wi) => {
        const letter = String.fromCharCode(65 + wi);
        return { label: `${letter}. ${w.title || 'Treino ' + letter}`, value: wi };
      }));

      const seqSelect = document.getElementById('seq-workout-select');
      seqSelect.innerHTML = options.map(o => `<option value="${o.value}" ${o.value === lastCompleted ? 'selected' : ''}>${o.label}</option>`).join('');

      // Mantém compatibilidade com o estilo antigo caso precise trocar para rádios no futuro.
      document.getElementById('seq-workout-options').innerHTML = options.map(o => `
        <label class="seq-option" style="display:flex;align-items:center;gap:8px;padding:10px;border:1px solid var(--border);border-radius:var(--r);cursor:pointer;background:${o.value===lastCompleted ? 'var(--accent-dim)' : 'var(--surface2)'};">
          <input type="radio" name="seq-last-workout" value="${o.value}" ${o.value === lastCompleted ? 'checked' : ''} style="accent-color:var(--accent);" />
          <span style="font-weight:600;color:var(--text);">${o.label}</span>
        </label>
      `).join('');

      document.getElementById('seq-modal-error').textContent = '';      const disableBtn = document.getElementById('seq-disable-btn');
      disableBtn.style.display = (p.sequential && p.sequential.enabled) ? 'inline-flex' : 'none';
      disableBtn.onclick = async () => {
        try {
          await _updateDoc(_doc(_db, 'plans', planId), { sequential: { enabled: false, updatedAt: Date.now() } });
          closeModal('modal-sequential-setup');
          toast('Modo sequencial desativado.');
          await openStudentDetail(sid);
        } catch (e) {
          document.getElementById('seq-modal-error').textContent = 'Erro: ' + e.message;
          toast('Erro ao desativar modo sequencial.', 'error');
        }
      };

      openModal('modal-sequential-setup');
    };

    window.saveSequentialSetting = async () => {
      const state = ST.sequential || {};
      if (!state.planId || !state.sid) return;
      const seqSelect = document.getElementById('seq-workout-select');
      let lastCompleted = null;
      if (seqSelect && seqSelect.value !== undefined) {
        lastCompleted = Number(seqSelect.value);
      } else {
        const selectedInput = document.querySelector('input[name="seq-last-workout"]:checked');
        if (!selectedInput) { document.getElementById('seq-modal-error').textContent = 'Selecione uma opção.'; return; }
        lastCompleted = Number(selectedInput.value);
      }
      if (isNaN(lastCompleted)) { document.getElementById('seq-modal-error').textContent = 'Selecione uma opção válida.'; return; }
      const workouts = state.workouts || [];
      if (!workouts.length) { document.getElementById('seq-modal-error').textContent = 'Plano sem módulos.'; return; }

      const nextIndex = (lastCompleted < 0 ? 0 : (lastCompleted + 1) % workouts.length);
      try {
        await _updateDoc(_doc(_db, 'plans', state.planId), {
          sequential: {
            enabled: true,
            lastCompleted,
            nextIndex,
            updatedAt: Date.now()
          }
        });
        closeModal('modal-sequential-setup');
        toast('Modo sequencial ativado. Próximo treino: ' + (workouts[nextIndex]?.title || 'Treino ' + String.fromCharCode(65 + nextIndex)));
        await openStudentDetail(state.sid);
      } catch (e) {
        document.getElementById('seq-modal-error').textContent = 'Erro: ' + e.message;
        toast('Erro ao salvar modo sequencial.', 'error');
      }
    };

    window.togglePlanWorkouts = function (pid) {
      const workouts = document.getElementById('plan-workouts-' + pid);
      const btn = document.getElementById('collapse-btn-' + pid);
      if (!workouts || !btn) return;
      const isCollapsed = workouts.classList.toggle('collapsed');
      btn.classList.toggle('collapsed', isCollapsed);
    };

    window.deleteStudent = async id => {
      if (!confirm('Excluir aluno e todos os planos?')) return;
      const snap = await _getDocs(_query(_col(_db, 'plans'), _where('studentId', '==', id)));
      for (const d of snap.docs) await _deleteDoc(_doc(_db, 'plans', d.id));
      await _deleteDoc(_doc(_db, 'students', id));
      toast('Aluno excluído.');
      await loadStudents();
      showStudentsList();
    };
    window.deletePlan = async (pid, sid) => {
      if (!confirm('Excluir este plano?')) return;
      await _deleteDoc(_doc(_db, 'plans', pid));
      toast('Plano excluído.');
      await openStudentDetail(sid);
    };

    window.viewPlan = async (pid, sid) => {
      const snap = await _getDoc(_doc(_db, 'plans', pid)); if (!snap.exists) return;
      const p = { id: snap.id, ...snap.data() };
      window.__gestorPlans = window.__gestorPlans || {};
      window.__gestorPlans[p.id] = p;
      const student = ST.students.find(s => s.id === sid) || {};
      const expired = isExpired(p);
      document.getElementById('pv-title').textContent = p.title;
      document.getElementById('pv-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:13px 16px;border-radius:var(--r);background:${expired ? 'var(--red-dim)' : 'var(--green-dim)'};border:1px solid ${expired ? 'rgba(229,62,62,.2)' : 'rgba(56,161,105,.2)'};font-size:.82rem;font-weight:600;color:${expired ? 'var(--red)' : 'var(--green)'};">
      <div style="width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0;"></div>
      ${p.expiry ? `Plano ${expired ? 'venceu em' : 'válido até'} ${new Date(p.expiry + 'T12:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}` : 'Plano sem data de validade'}
    </div>
    ${(p.workouts || []).map((w, wi) => `
      <div class="pv-workout">
        <div class="pv-workout-title"><span style="background:var(--accent-dim);color:var(--accent);border:1px solid var(--accent-soft);border-radius:6px;padding:2px 9px;font-size:.75rem;font-weight:700;">T${wi + 1}</span>${w.title || 'Sem título'}</div>
        <div class="pv-days">${(w.days || []).map(d => `<span class="day-chip">${DAYS[d]}</span>`).join('')}</div>
        ${(w.exercises || []).map((ex, ei) => `
          <div class="pv-ex">
            <div class="pv-ex-name">${ei + 1}. ${ex.name}</div>
            <div class="pv-ex-meta">${ex.series} série(s) × ${ex.repsArr && ex.repsArr.length > 1 ? ex.repsArr.join(', ') : ex.reps} rep${ex.unilateral ? ' · Unilateral' : ''}${ex.isometria ? ' · Isometria' + (ex.isometriaSegs ? ' ' + ex.isometriaSegs + 's' : '') : ''}${ex.restPause ? ' · Rest-pause' : ''}${ex.biset ? ' · Bi-set' : ''}${ex.obs ? `<div style='margin-top:6px;padding:7px 10px;background:var(--surface2);border-radius:7px;border-left:3px solid var(--accent-soft);font-size:.78rem;color:var(--text2);font-style:italic;'>${ex.obs}</div>` : ''}</div>
          </div>`).join('')}
      </div>`).join('')}`;
      document.getElementById('pv-footer').innerHTML = `
    <button class="btn btn-whatsapp" onclick="sendWhatsAppPlan('${sid}','${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> WhatsApp</button>
    <button class="btn btn-ghost" onclick="closeModal('modal-plan-view');exportPlanPDF('${p.id}','${student.name || ''}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> PDF</button>
    <button class="btn btn-primary" onclick="closeModal('modal-plan-view');openPlanModal('${sid}','${p.id}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Editar</button>
    <button class="btn btn-danger" onclick="deletePlan('${p.id}','${sid}')">Excluir</button>`;
      openModal('modal-plan-view');
    };

    window.openPlanModal = async (sid, editId = null) => {
      ST.planStudentId = sid; ST.editPlanId = editId; ST.workoutBlocks = [];
      document.getElementById('plan-title').value = ''; document.getElementById('plan-startdate').value = ''; document.getElementById('plan-expiry').value = ''; document.getElementById('plan-error').textContent = '';
      document.getElementById('plan-modal-title').textContent = editId ? 'Editar plano' : 'Criar plano de treino';
      var subtitleEl = document.querySelector('#modal-plan .plan-modal-subtitle'); if (subtitleEl) subtitleEl.textContent = editId ? 'Atualize os treinos e exercícios do plano' : 'Configure os treinos e exercícios do plano';
      if (editId) { const snap = await _getDoc(_doc(_db, 'plans', editId)); if (snap.exists) { const p = snap.data(); document.getElementById('plan-title').value = p.title || ''; document.getElementById('plan-startdate').value = p.startDate || ''; document.getElementById('plan-expiry').value = p.expiry || ''; ST.workoutBlocks = (p.workouts || []).map(w => ({ ...w, exercises: (w.exercises || []).map(e => ({ ...e })) })); } }
      else { ST.workoutBlocks = [{ title: 'Treino A', days: [], exercises: [{}] }]; }
      ST._planSnapshot = JSON.stringify(ST.workoutBlocks); ST._planTitleSnapshot = document.getElementById('plan-title').value; ST._planStartDateSnapshot = document.getElementById('plan-startdate').value; ST._planExpirySnapshot = document.getElementById('plan-expiry').value;
      renderWorkoutsEditor(); openModal('modal-plan');
    };

    // ── Editar apenas nome e datas do plano (botão lápis ✏️) ──
    window.openPlanEditInfoModal = async (sid, planId) => {
      ST.planStudentId = sid; ST.editPlanId = planId || null;
      document.getElementById('peinfo-error').textContent = '';
      document.getElementById('peinfo-title').value = '';
      document.getElementById('peinfo-startdate').value = '';
      document.getElementById('peinfo-expiry').value = '';
      // Ajusta título e subtítulo do modal conforme criação ou edição
      const h3 = document.querySelector('#modal-plan-edit-info .modal-header h3');
      const sub = document.querySelector('#modal-plan-edit-info .modal-header p');
      if (planId) {
        if (h3) h3.textContent = 'Editar plano';
        if (sub) sub.textContent = 'Atualize o nome e o período do plano';
        const snap = await _getDoc(_doc(_db, 'plans', planId));
        if (snap.exists) {
          const p = snap.data();
          document.getElementById('peinfo-title').value = p.title || '';
          document.getElementById('peinfo-startdate').value = p.startDate || '';
          document.getElementById('peinfo-expiry').value = p.expiry || '';
        }
      } else {
        if (h3) h3.textContent = 'Novo plano de treino';
        if (sub) sub.textContent = 'Defina o nome e o período do plano';
      }
      openModal('modal-plan-edit-info');
    };

    window.savePlanInfo = async () => {
      const title = document.getElementById('peinfo-title').value.trim();
      const errEl = document.getElementById('peinfo-error');
      errEl.textContent = '';
      if (!title) { errEl.textContent = 'Nome do plano obrigatório.'; return; }
      const btn = document.getElementById('btn-save-plan-info');
      btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
      try {
        const data = { title, startDate: document.getElementById('peinfo-startdate').value || '', expiry: document.getElementById('peinfo-expiry').value || '' };
        if (ST.editPlanId) {
          await _updateDoc(_doc(_db, 'plans', ST.editPlanId), data);
          toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Plano atualizado.');
        } else {
          await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), { ...data, workouts: [], studentId: ST.planStudentId, createdAt: Date.now() });
          toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Plano criado!');
        }
        closeModal('modal-plan-edit-info');
        await openStudentDetail(ST.planStudentId);
      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
        toast('Erro ao salvar.', 'error');
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Salvar';
      }
    };

    window.addWorkoutBlock = () => { ST.workoutBlocks.push({ title: `Treino ${String.fromCharCode(65 + ST.workoutBlocks.length)}`, days: [], exercises: [{}] }); renderWorkoutsEditor() };
    window.removeWorkoutBlock = bi => { ST.workoutBlocks.splice(bi, 1); renderWorkoutsEditor() };
    window.updateBlockTitle = (bi, v) => ST.workoutBlocks[bi].title = v;
    window.toggleBlockDay = (bi, d, btn) => { const arr = ST.workoutBlocks[bi].days; const i = arr.indexOf(d); if (i === -1) { arr.push(d); btn.classList.add('selected'); } else { arr.splice(i, 1); btn.classList.remove('selected'); } };
    window.addExToBlock = bi => { ST.workoutBlocks[bi].exercises.push({}); renderWorkoutsEditor(); setTimeout(() => { const m = document.querySelector('#modal-plan .modal'); if (m) m.scrollTop = m.scrollHeight; }, 50) };

    // Helper: detecta qual editor está ativo (modal-module ou modal-plan) e re-renderiza o correto
    window._rerenderActiveEditor = () => {
      const moduleModal = document.getElementById('modal-module');
      if (moduleModal && !moduleModal.classList.contains('hidden')) {
        renderModuleEditor();
      } else {
        renderWorkoutsEditor();
      }
    };
    window.removeExFromBlock = (bi, ei) => { ST.workoutBlocks[bi].exercises.splice(ei, 1); _rerenderActiveEditor(); };
    window.updateExInBlock = (bi, ei, f, v) => { ST.workoutBlocks[bi].exercises[ei][f] = v };
    window.onExNameSelect = (bi, ei, val) => {
      ST.workoutBlocks[bi].exercises[ei].name = val;
      if (val !== '__custom__') ST.workoutBlocks[bi].exercises[ei].customName = '';
      // Auto-fill video URL if available
      if (val && val !== '__custom__' && window.EX_URLS && window.EX_URLS[val]) {
        ST.workoutBlocks[bi].exercises[ei].videoUrl = window.EX_URLS[val];
      } else if (val !== '__custom__') {
        ST.workoutBlocks[bi].exercises[ei].videoUrl = '';
      }
      _rerenderActiveEditor();
    };
    window.updateIsometria = (bi, ei, checked) => {
      ST.workoutBlocks[bi].exercises[ei].isometria = checked;
      if (!checked) ST.workoutBlocks[bi].exercises[ei].isometriaSegs = '';
      _rerenderActiveEditor();
    };

    window.renderWorkoutsEditor = () => {
      // Salva posição de scroll antes de re-renderizar
      const modalBody = document.querySelector('#modal-plan .modal-body');
      const savedScroll = modalBody ? modalBody.scrollTop : 0;

      document.getElementById('workouts-editor').innerHTML = ST.workoutBlocks.map((wb, bi) => {
        const daysHTML = DAYS.map((d, di) => `<button type="button" class="day-toggle ${(wb.days || []).includes(di) ? 'selected' : ''}" onclick="toggleBlockDay(${bi},${di},this)">${d}</button>`).join('');
        const exHTML = wb.exercises.map((ex, ei) => {
          const opts = Object.entries(EX_LIB).map(([cat, list]) => `<optgroup label="${cat}">${list.map(e => `<option value="${e}" ${ex.name === e ? 'selected' : ''}>${e}</option>`).join('')}</optgroup>`).join('');
          // biset: full EX_LIB list so any exercise can be paired
          const bisets = Object.entries(EX_LIB).map(([cat, list]) =>
            `<optgroup label="${cat}">${list.map(e => `<option value="${e}" ${ex.biset === e ? 'selected' : ''}>${e}</option>`).join('')}</optgroup>`
          ).join('');
          // series reps: if series > 1, show individual reps fields
          const seriesCount = Number(ex.series) || 1;
          // parse existing reps array or string
          let repsArr = [];
          if (Array.isArray(ex.repsArr)) { repsArr = ex.repsArr; }
          else if (ex.reps) { repsArr = [ex.reps]; }
          while (repsArr.length < seriesCount) repsArr.push(repsArr[repsArr.length - 1] || '12');
          repsArr = repsArr.slice(0, seriesCount);
          const repsFields = repsArr.map((r, si) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px;">
          <span style="font-size:.7rem;color:var(--text3);font-weight:600;min-width:52px;">Série ${si + 1}</span>
          <input type="text" class="form-control" style="flex:1;" value="${r}" placeholder="12" oninput="updateRepsSerie(${bi},${ei},${si},this.value)"/>
        </div>`).join('');
          const isCustom = ex.name === '__custom__';
          const repsChips = repsArr.map((r, si) => `<div class="ex-rep-chip"><span class="ex-rep-chip-lbl">S${si + 1}</span><input type="text" value="${r}" placeholder="12" oninput="updateRepsSerie(${bi},${ei},${si},this.value)"/></div>`).join('');
          const isoInline = ex.isometria ? `<div class="ex-isometria-inline"><input type="number" min="1" placeholder="0" value="${ex.isometriaSegs || ''}" oninput="updateExInBlock(${bi},${ei},'isometriaSegs',this.value)"/><span>seg</span></div>` : '';
          return `<div class="exercise-item" data-bi="${bi}" data-ei="${ei}">
        <div class="ex-row-top">
          <div class="drag-handle" title="Reordenar"><svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><circle cx="2.5" cy="1.5" r="1.5"/><circle cx="7.5" cy="1.5" r="1.5"/><circle cx="2.5" cy="6" r="1.5"/><circle cx="7.5" cy="6" r="1.5"/><circle cx="2.5" cy="10.5" r="1.5"/><circle cx="7.5" cy="10.5" r="1.5"/></svg></div>
          <span class="ex-num">${ei + 1}</span>
          <select class="ex-select" onchange="onExNameSelect(${bi},${ei},this.value)">
            <option value="">— selecione o exercício —</option>
            <option value="__custom__" ${isCustom ? 'selected' : ''}>✏️ Personalizado</option>
            ${opts}
          </select>
          <button type="button" class="remove-ex-btn" title="Remover" onclick="removeExFromBlock(${bi},${ei})"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        ${isCustom ? `<div style="padding:6px 10px;border-bottom:1px solid var(--border);"><input type="text" style="width:100%;padding:5px 8px;border:1.5px solid var(--border);border-radius:7px;font-size:.82rem;font-family:var(--body);background:var(--bg);color:var(--text);" placeholder="Nome personalizado..." value="${(ex.customName || '').replace(/"/g, '&quot;')}" oninput="updateExInBlock(${bi},${ei},'customName',this.value)"/></div>` : ''}
        <div class="ex-row-fields">
          <div class="ex-field">
            <span class="ex-field-label">Séries</span>
            <input type="number" min="1" max="20" value="${seriesCount}" oninput="updateSeriesCount(${bi},${ei},this.value,true)" onblur="updateSeriesCount(${bi},${ei},this.value,false)"/>
          </div>
          <div class="ex-field">
            <span class="ex-field-label">Reps por série</span>
            <div class="ex-reps-chips">${repsChips}</div>
          </div>
          <div class="ex-field">
            <span class="ex-field-label">Bi-set com</span>
            <select onchange="updateExInBlock(${bi},${ei},'biset',this.value)"><option value="">Nenhum</option>${bisets}</select>
          </div>
        </div>
        <div class="ex-row-bottom">
          <div class="ex-techniques">
            <span class="ex-tech-label">Técnicas</span>
            <label class="tech-pill"><input type="checkbox" ${ex.unilateral ? 'checked' : ''} onchange="updateExInBlock(${bi},${ei},'unilateral',this.checked)"/>Unilateral</label>
            <label class="tech-pill"><input type="checkbox" ${ex.isometria ? 'checked' : ''} onchange="updateIsometria(${bi},${ei},this.checked)"/>Isometria</label>
            <label class="tech-pill"><input type="checkbox" ${ex.restPause ? 'checked' : ''} onchange="updateExInBlock(${bi},${ei},'restPause',this.checked)"/>Rest-pause</label>
            ${isoInline}
          </div>
          <div class="ex-obs-wrap">
            <textarea placeholder="Observações: cadência, descanso, drop-set..." oninput="updateExInBlock(${bi},${ei},'obs',this.value)">${ex.obs || ''}</textarea>
          </div>
        </div>
      </div>`;
        }).join('');
        return `<div class="workout-block">
      <div class="workout-block-header">
        <div class="wb-letter">${String.fromCharCode(65 + bi)}</div>
        <input class="wb-title-input" type="text" value="${wb.title || ''}" placeholder="Nome do treino..." onchange="updateBlockTitle(${bi},this.value)"/>
        ${ST.workoutBlocks.length > 1 ? `<button type="button" class="remove-block-btn" title="Remover treino" onclick="removeWorkoutBlock(${bi})"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>` : ''}
      </div>
      <div class="workout-block-body">
        <div class="wb-days-row">
          <span class="wb-days-label">Dias</span>
          <div class="days-selector">${daysHTML}</div>
        </div>
        <div class="exercises-list">${exHTML}</div>
        <button type="button" class="add-ex-btn" onclick="addExToBlock(${bi})"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Adicionar exercício</button>
      </div>
    </div>`;
      }).join('');
      // Restaura posição de scroll após re-renderizar
      if (modalBody) modalBody.scrollTop = savedScroll;
      // Activate drag-and-drop after render
      setTimeout(initDragDrop, 0);
    };

    // ── Drag-and-drop reordering ──
    window.initDragDrop = function () {
      // Only allow drag when initiated from the handle
      let _dragAllowed = false;

      document.querySelectorAll('.exercise-item').forEach(item => {
        const handle = item.querySelector('.drag-handle');

        // Enable drag only on handle mousedown/touchstart
        if (handle) {
          handle.addEventListener('mousedown', () => { _dragAllowed = true; item.draggable = true; });
          handle.addEventListener('touchstart', () => { _dragAllowed = true; item.draggable = true; }, { passive: true });
        }

        // Disable drag on mouseup anywhere (covers click-to-select text in inputs)
        item.addEventListener('mouseup', () => { _dragAllowed = false; item.draggable = false; });
        item.addEventListener('mouseleave', () => { if (!_dragAllowed) { item.draggable = false; } });

        // Prevent drag starting from inputs, selects, textareas
        item.addEventListener('dragstart', e => {
          const tag = (e.target.tagName || '').toLowerCase();
          if (!_dragAllowed || ['input', 'select', 'textarea', 'label'].includes(tag)) {
            e.preventDefault();
            item.draggable = false;
            return;
          }
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', JSON.stringify({
            bi: +item.dataset.bi,
            ei: +item.dataset.ei
          }));
          item.classList.add('dragging');
        });
        item.addEventListener('dragend', () => {
          _dragAllowed = false;
          item.draggable = false;
          item.classList.remove('dragging');
          document.querySelectorAll('.exercise-item').forEach(i => i.classList.remove('drag-over'));
        });
        item.addEventListener('dragover', e => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          document.querySelectorAll('.exercise-item').forEach(i => i.classList.remove('drag-over'));
          item.classList.add('drag-over');
        });
        item.addEventListener('dragleave', () => {
          item.classList.remove('drag-over');
        });
        item.addEventListener('drop', e => {
          e.preventDefault();
          item.classList.remove('drag-over');
          try {
            const { bi: fromBi, ei: fromEi } = JSON.parse(e.dataTransfer.getData('text/plain'));
            const toBi = +item.dataset.bi;
            const toEi = +item.dataset.ei;
            if (fromBi !== toBi || fromEi === toEi) return;
            const exs = ST.workoutBlocks[fromBi].exercises;
            const [moved] = exs.splice(fromEi, 1);
            exs.splice(toEi, 0, moved);
            renderWorkoutsEditor();
          } catch (err) { }
        });
      });
    };

    // Update series count → rebuild repsArr and re-render
    window.updateSeriesCount = (bi, ei, val, typing) => {
      // Se ainda estiver digitando, apenas salva o valor sem re-renderizar
      if (typing) {
        ST.workoutBlocks[bi].exercises[ei].series = val === '' ? '' : (parseInt(val) || 1);
        return;
      }
      // Ao desfocar (blur), valida e re-renderiza com scroll preservado
      const n = Math.max(1, Math.min(20, parseInt(val) || 1));
      const ex = ST.workoutBlocks[bi].exercises[ei];
      ex.series = n;
      let arr = Array.isArray(ex.repsArr) ? [...ex.repsArr] : [(ex.reps || '12')];
      while (arr.length < n) arr.push(arr[arr.length - 1] || '12');
      arr = arr.slice(0, n);
      ex.repsArr = arr;
      ex.reps = arr.join(', ');
      _rerenderActiveEditor();
    };

    window.updateRepsSerie = (bi, ei, si, val) => {
      const ex = ST.workoutBlocks[bi].exercises[ei];
      if (!Array.isArray(ex.repsArr)) ex.repsArr = [(ex.reps || '12')];
      ex.repsArr[si] = val;
      ex.reps = ex.repsArr.join(', ');
    };

    // ── Three-dots context menu helpers ──
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

    // ── WhatsApp: send plan link with student code ──
    window.sendWhatsAppPlan = function (sid, planId) {
      const student = ST.students.find(s => s.id === sid) || {};
      const name = student.name || '';
      const code = student.code || '';
      const phone = student.phone || '';
      const msg = `Olá *${name}*, seu treino está pronto! 🏋️\n\n*https://trainly.online*\n\n*Código de acesso:* \`${code}\``;
      const encoded = encodeURIComponent(msg);
      let url = 'https://wa.me/';
      if (phone) {
        const cleaned = phone.replace(/\D/g, '');
        let num = cleaned;
        if (!num.startsWith('55')) num = '55' + num;
        url += num;
      }
      url += `?text=${encoded}`;
      window.open(url, '_blank');
      toast('Abrindo WhatsApp...');
    };

    // ── Clone plan ──
    window._clonePlanId = null;
    window._cloneFromSid = null;
    window._cloneTargetSid = null;

    window.openCloneModal = function (planId, sid) {
      window._clonePlanId = planId;
      window._cloneFromSid = sid;
      window._cloneTargetSid = null;
      document.getElementById('clone-error').textContent = '';
      // Render list of other students
      const fromStudent = ST.students.find(s => s.id === sid) || {};
      const others = ST.students.filter(s => s.id !== sid);
      const list = document.getElementById('clone-student-list');
      if (!others.length) {
        list.innerHTML = '<p style="font-size:.83rem;color:var(--text3);padding:12px 0;">Não há outros alunos cadastrados.</p>';
      } else {
        list.innerHTML = others.map(s => `
      <div class="clone-student-item" id="cloneitem_${s.id}" onclick="selectCloneTarget('${s.id}')">
        <div class="avatar" style="width:34px;height:34px;font-size:.82rem;">${(s.name || '?').slice(0, 2).toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:.88rem;">${s.name}</div>
          <div style="font-size:.72rem;color:var(--text3);font-weight:600;">${s.code}</div>
        </div>
      </div>`).join('');
      }
      openModal('modal-clone');
    };

    window.selectCloneTarget = function (sid) {
      window._cloneTargetSid = sid;
      document.querySelectorAll('.clone-student-item').forEach(el => el.classList.remove('selected'));
      const el = document.getElementById('cloneitem_' + sid);
      if (el) el.classList.add('selected');
      document.getElementById('clone-error').textContent = '';
    };

    window.duplicatePlan = async function (planId, sid) {
      const plan = window.__gestorPlans && window.__gestorPlans[planId];
      if (!plan) { toast('Plano não encontrado.', 'error'); return; }
      try {
        const newData = {
          ...plan,
          studentId: sid,
          title: plan.title + ' (cópia)',
          createdAt: Date.now()
        };
        delete newData.id;
        await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), newData);
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Plano duplicado!');
        await openStudentDetail(sid);
      } catch (e) {
        toast('Erro ao duplicar: ' + e.message, 'error');
      }
    };

    window.doClonePlan = async function () {
      if (!window._cloneTargetSid) { document.getElementById('clone-error').textContent = 'Selecione um aluno.'; return; }
      const plan = window.__gestorPlans && window.__gestorPlans[window._clonePlanId];
      if (!plan) { document.getElementById('clone-error').textContent = 'Plano não encontrado.'; return; }
      const btn = document.getElementById('btn-do-clone');
      btn.classList.add('btn-loading'); btn.textContent = 'Clonando...';
      try {
        const targetStudent = ST.students.find(s => s.id === window._cloneTargetSid) || {};
        const newData = {
          ...plan,
          studentId: window._cloneTargetSid,
          title: plan.title + ' (cópia)',
          createdAt: Date.now()
        };
        delete newData.id;
        await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), newData);
        toast(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Plano clonado para ${targetStudent.name || 'aluno'}!`);
        closeModal('modal-clone');
        await loadStudents();
      } catch (e) {
        document.getElementById('clone-error').textContent = 'Erro: ' + e.message;
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Clonar plano';
      }
    };

    // ── Transfer student ──
    window._transferStudentId = null;
    window._transferTargetManagerId = null;
    window._transferTargetManagerName = null;

    window.openTransferModal = async function (sid) {
      window._transferStudentId = sid;
      window._transferTargetManagerId = null;
      window._transferTargetManagerName = null;
      document.getElementById('transfer-error').textContent = '';

      const student = ST.students.find(s => s.id === sid) || {};
      document.getElementById('transfer-student-avatar').textContent = initials(student.name || '?');
      document.getElementById('transfer-student-name').textContent = student.name || '';
      document.getElementById('transfer-student-code').textContent = student.code || '';

      // Load all managers from Firestore
      const list = document.getElementById('transfer-manager-list');
      list.innerHTML = '<div class="spinner" style="margin:20px auto;"></div>';
      openModal('modal-transfer');

      try {
        const snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
        const managers = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Deduplica por username e remove o gestor atual do aluno
        const seenUsernames = new Set();
        const allManagers = managers.filter(m => {
          if (m.username === (student.managerId || '')) return false;
          if (seenUsernames.has(m.username)) return false;
          seenUsernames.add(m.username);
          return true;
        });

        if (!allManagers.length) {
          list.innerHTML = '<p style="font-size:.83rem;color:var(--text3);padding:12px 0;">Nenhum outro gestor disponível.</p>';
          return;
        }

        list.innerHTML = allManagers.map(m => `
      <div class="clone-student-item" id="tmgr_${m.id}" onclick="selectTransferManager('${m.id}','${(m.name || m.username).replace(/'/g, '&#39;')}','${m.username}')">
        <div class="avatar" style="width:34px;height:34px;font-size:.82rem;background:${m.isMaster ? 'var(--accent-dim)' : 'var(--surface2)'};border-color:${m.isMaster ? 'var(--accent-soft)' : 'var(--border2)'};">${(m.name || m.username || '?').slice(0, 2).toUpperCase()}</div>
        <div>
          <div style="font-weight:700;font-size:.88rem;">${m.name || m.username}${m.isMaster ? ' <span style="font-size:.7rem;color:var(--accent);font-weight:700;">⭐ Master</span>' : ''}</div>
          <div style="font-size:.72rem;color:var(--text3);font-weight:600;">@${m.username}</div>
        </div>
      </div>`).join('');
      } catch (e) {
        list.innerHTML = `<p style="color:var(--red);font-size:.82rem;">Erro: ${e.message}</p>`;
      }
    };

    window.selectTransferManager = function (mgrId, mgrName, mgrUsername) {
      window._transferTargetManagerId = mgrId;
      window._transferTargetManagerName = mgrName;
      window._transferTargetManagerUsername = mgrUsername;
      document.querySelectorAll('.clone-student-item').forEach(el => el.classList.remove('selected'));
      const el = document.getElementById('tmgr_' + mgrId);
      if (el) el.classList.add('selected');
      document.getElementById('transfer-error').textContent = '';
    };

    window.confirmTransfer = function () {
      if (!window._transferTargetManagerId) {
        document.getElementById('transfer-error').textContent = 'Selecione um gestor.'; return;
      }
      const student = ST.students.find(s => s.id === window._transferStudentId) || {};
      const text = `Tem certeza que deseja transferir o aluno <strong>${student.name || ''}</strong> para o gestor <strong>${window._transferTargetManagerName}</strong>? Os planos de treino serão mantidos.`;
      document.getElementById('transfer-confirm-text').innerHTML = text;
      openModal('modal-transfer-confirm');
    };

    window.doTransfer = async function () {
      const btn = document.getElementById('btn-confirm-transfer');
      btn.classList.add('btn-loading'); btn.textContent = 'Transferindo...';
      try {
        const sid = window._transferStudentId;
        const mgrUsername = window._transferTargetManagerUsername;
        const mgrName = window._transferTargetManagerName;

        // Fetch manager phone if exists
        let mgrPhone = '';
        const mgrSnap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', mgrUsername)));
        if (!mgrSnap.empty) mgrPhone = mgrSnap.docs[0].data().phone || '';

        await _updateDoc(_doc(_db, 'students', sid), {
          managerId: mgrUsername,
          managerName: mgrName,
          managerPhone: mgrPhone
        });

        closeModal('modal-transfer-confirm');
        closeModal('modal-transfer');
        toast(`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Aluno transferido para ${mgrName}!`);
        await loadStudents();
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Sim, transferir';
      }
    };

    // ── Confirm close modal-plan ──
    window.confirmClosePlan = function () {
      var changed =
        JSON.stringify(ST.workoutBlocks) !== (ST._planSnapshot || '[]') ||
        document.getElementById('plan-title').value !== (ST._planTitleSnapshot || '') ||
        document.getElementById('plan-startdate').value !== (ST._planStartDateSnapshot || '') ||
        document.getElementById('plan-expiry').value !== (ST._planExpirySnapshot || '');
      if (changed) {
        openModal('modal-confirm-close');
      } else {
        closeModal('modal-plan');
      }
    };

    window.discardPlanAndClose = function () {
      ST.workoutBlocks = [];
      closeModal('modal-confirm-close');
      closeModal('modal-plan');
    };

    // ── Notifications ──
    window._notifData = [];
    window._notifPanelOpen = false;

    window.toggleNotifPanel = function () {
      const panel = document.getElementById('notif-panel');
      window._notifPanelOpen = !window._notifPanelOpen;
      panel.classList.toggle('hidden', !window._notifPanelOpen);
      if (window._notifPanelOpen) renderNotifPanel();
      // Close on outside click
      if (window._notifPanelOpen) {
        setTimeout(() => {
          function outsideClick(e) {
            if (!e.target.closest('.notif-wrap-rel')) { panel.classList.add('hidden'); window._notifPanelOpen = false; document.removeEventListener('click', outsideClick); }
          }
          document.addEventListener('click', outsideClick);
        }, 10);
      }
    };

    window.renderNotifPanel = function () {
      const list = document.getElementById('notif-list');
      if (!window._notifData.length) {
        list.innerHTML = '<div class="notif-panel-empty">Nenhuma notificação ainda</div>';
        return;
      }
      const typeIcon = { 'workout_done': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"/><rect x="6" y="18" width="12" height="4"/></svg>', 'workout_started': '▶️', 'workout_finished': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg>', 'workout_skipped': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M4 12h16M14 6l6 6-6 6"/></svg>', 'feedback_sent': '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' };
      const typeLabel = { 'workout_done': 'Treino concluído', 'workout_started': 'Treino iniciado', 'workout_finished': 'Treino finalizado', 'workout_skipped': 'Treino pulado', 'feedback_sent': 'Feedback recebido' };
      list.innerHTML = window._notifData.slice(0, 30).map(n => {
        let subtitle = '';
        if (n.type === 'workout_started') subtitle = `${n.workoutTitle || n.planTitle || ''} · ${n.timeStr || n.date || ''}`;
        else if (n.type === 'workout_finished') subtitle = `Duração: ${n.totalTime || ''} · ${n.timeStr || n.date || ''}`;
        else if (n.type === 'feedback_sent') subtitle = n.feedbackText ? `"${n.feedbackText.slice(0, 60)}${n.feedbackText.length > 60 ? '...' : ''}"` : n.date || '';
        else subtitle = `${n.workoutTitle || n.planTitle || ''} · ${n.date || ''}`;
        return `
    <div class="notif-item ${n.read ? '' : 'unread'}">
      <div class="notif-icon">${typeIcon[n.type] || '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>'}</div>
      <div class="notif-text">
        <div class="notif-title"><strong>${n.studentName}</strong> — ${typeLabel[n.type] || 'Notificação'}</div>
        <div class="notif-sub">${subtitle}</div>
      </div>
    </div>`;
      }).join('');
    };

    window.clearAllNotifs = async function () {
      try {
        // Delete all notifications from Firestore
        for (const n of window._notifData) {
          if (n.id) await _deleteDoc(_doc(_db, 'notifications', n.id));
        }
      } catch (e) { console.warn('clearAllNotifs:', e.message); }
      window._notifData = [];
      window._lastUnreadCount = 0;
      renderNotifPanel();
      updateNotifBadge();
    };

    // Keep old function name as alias for safety
    window.markAllNotifsRead = window.clearAllNotifs;

    window.updateNotifBadge = function () {
      const unread = window._notifData.filter(n => !n.read).length;
      const badge = document.getElementById('notif-badge');
      if (badge) {
        badge.textContent = unread > 9 ? '9+' : unread;
        badge.classList.toggle('hidden', unread === 0);
      }
    };

    window.pollNotifications = async function () {
      try {
        const u = window.CURRENT_USER || {};
        let snap;
        if (u.role === 'ceo' || u.isMaster) {
          snap = await _getDocs(_col(_db, 'notifications'));
        } else {
          snap = await _getDocs(_query(_col(_db, 'notifications'), _where('managerId', '==', u.username)));
        }
        const prev = window._notifData.length;
        window._notifData = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const newUnread = window._notifData.filter(n => !n.read);
        updateNotifBadge();
        if (prev > 0 && newUnread.length > (window._lastUnreadCount || 0)) {
          const newest = window._notifData[0];
          if (newest && !newest.read) {
            const typeMsg = { 'workout_started': 'iniciou o treino', 'workout_finished': 'finalizou o treino', 'workout_skipped': 'pulou o treino', 'feedback_sent': 'enviou um feedback', 'workout_done': 'concluiu o treino' };
            toast(`${newest.studentName} ${typeMsg[newest.type] || 'enviou notificação'}!`);
          }
        }
        window._lastUnreadCount = newUnread.length;
        if (window._notifPanelOpen) renderNotifPanel();
      } catch (e) { console.warn('pollNotifications:', e.message); }
    };

    // ── Feedbacks screen ──
    window.loadFeedbacks = async function () {
      const container = document.getElementById('feedbacks-list');
      if (!container) return;
      container.innerHTML = '<div class="spinner"></div>';
      try {
        const u = window.CURRENT_USER || {};
        let snap;
        if (u.role === 'ceo' || u.isMaster) {
          snap = await _getDocs(_query(_col(_db, 'feedbacks'), _orderBy('timestamp', 'desc')));
        } else {
          snap = await _getDocs(_query(_col(_db, 'feedbacks'), _where('managerId', '==', u.username)));
        }
        const feedbacks = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (!feedbacks.length) {
          container.innerHTML = `<div class="empty-state" style="padding:60px 20px;"><div class="ei"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><p>Nenhum feedback recebido ainda.</p></div>`;
          return;
        }
        container.innerHTML = feedbacks.map(f => `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:18px 20px;margin-bottom:12px;box-shadow:var(--shadow);transition:box-shadow .2s;">
        <div style="display:flex;align-items:flex-start;gap:14px;">
          <div class="avatar" style="flex-shrink:0;">${(f.studentName || '?').slice(0, 2).toUpperCase()}</div>
          <div style="flex:1;min-width:0;">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px;">
              <span style="font-weight:700;font-size:.95rem;color:var(--text);">${f.studentName || 'Aluno'}</span>
              ${f.workoutTitle ? `<span style="font-size:.72rem;font-weight:600;background:var(--accent-dim);border:1px solid var(--accent-soft);color:#8a6c00;border-radius:6px;padding:2px 8px;">${f.workoutTitle}</span>` : ''}
              ${f.planTitle ? `<span style="font-size:.72rem;color:var(--text3);font-weight:500;">${f.planTitle}</span>` : ''}
            </div>
            <p style="font-size:.88rem;color:var(--text2);line-height:1.6;margin-bottom:8px;white-space:pre-wrap;">${f.text || ''}</p>
            <div style="font-size:.73rem;color:var(--text3);font-weight:500;">${f.date || ''}</div>
          </div>
        </div>
      </div>`).join('');
      } catch (e) {
        container.innerHTML = `<div style="padding:20px;color:var(--red);font-size:.84rem;">Erro: ${e.message}</div>`;
      }
    };

    // Start polling every 30 seconds when dashboard is active
    window._notifInterval = null;
    window.startNotifPolling = function startNotifPolling() {
      if (window._notifInterval) clearInterval(window._notifInterval);
      pollNotifications();
      window._notifInterval = setInterval(pollNotifications, 30000);
    }

    window.savePlan = async () => {
      const title = document.getElementById('plan-title').value.trim();
      document.getElementById('plan-error').textContent = '';
      if (!title) { document.getElementById('plan-error').textContent = 'Nome do plano obrigatório.'; return; }
      if (!ST.workoutBlocks.length) { document.getElementById('plan-error').textContent = 'Adicione ao menos um treino.'; return; }
      for (const wb of ST.workoutBlocks) { if (!wb.exercises.filter(e => e.name).length) { document.getElementById('plan-error').textContent = `"${wb.title}" precisa de ao menos um exercício.`; return; } }
      const btn = document.getElementById('btn-save-plan'); btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
      const workouts = ST.workoutBlocks.map(wb => ({ title: wb.title, days: wb.days || [], exercises: wb.exercises.filter(e => e.name).map(e => ({ name: e.name === '__custom__' ? (e.customName || 'Personalizado') : e.name, series: Number(e.series) || 1, reps: e.reps || '12', repsArr: e.repsArr || [e.reps || '12'], videoUrl: e.videoUrl || '', unilateral: !!e.unilateral, biset: e.biset || '', bisetName: e.biset || '', isometria: !!e.isometria, isometriaSegs: e.isometriaSegs || '', restPause: !!e.restPause, obs: e.obs || '' })) }));
      const data = { title, startDate: document.getElementById('plan-startdate').value || '', expiry: document.getElementById('plan-expiry').value || '', workouts, studentId: ST.planStudentId, createdAt: Date.now() };
      if (ST.editPlanId && window.__gestorPlans && window.__gestorPlans[ST.editPlanId] && window.__gestorPlans[ST.editPlanId].sequential) {
        data.sequential = window.__gestorPlans[ST.editPlanId].sequential;
      }
      try {
        if (ST.editPlanId) { await _updateDoc(_doc(_db, 'plans', ST.editPlanId), data); toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Plano atualizado.'); }
        else { await _setDoc(_doc(_db, 'plans', 'plan_' + Date.now()), data); toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Plano criado!'); }
        closeModal('modal-plan'); await openStudentDetail(ST.planStudentId);
      } catch (e) { document.getElementById('plan-error').textContent = 'Erro: ' + e.message; toast('Erro ao salvar.', 'error'); }
      finally { btn.classList.remove('btn-loading'); btn.textContent = 'Salvar plano'; }
    };

    // ── MÓDULOS — abrir/salvar/excluir individualmente ──
    window.openModuleModal = async (planId, sid, moduleIndex) => {
      const snap = await _getDoc(_doc(_db, 'plans', planId));
      if (!snap.exists) { toast('Plano não encontrado.', 'error'); return; }
      const p = snap.data();
      ST.modulePlanId = planId;
      ST.moduleStudentId = sid;
      ST.moduleIndex = moduleIndex;
      const workouts = p.workouts || [];
      let wb;
      if (moduleIndex !== null && moduleIndex !== undefined) {
        wb = { ...workouts[moduleIndex], exercises: (workouts[moduleIndex].exercises || []).map(e => ({ ...e })) };
      } else {
        wb = { title: `Treino ${String.fromCharCode(65 + workouts.length)}`, days: [], exercises: [{}] };
      }
      ST.workoutBlocks = [wb];
      ST._moduleSnapshot = JSON.stringify(wb);
      document.getElementById('module-modal-title').textContent = (moduleIndex !== null && moduleIndex !== undefined) ? 'Editar módulo' : 'Novo módulo';
      document.getElementById('module-modal-subtitle').textContent = p.title || '';
      document.getElementById('module-error').textContent = '';
      renderModuleEditor();
      openModal('modal-module');
    };

    window.renderModuleEditor = () => {
      const modalBody = document.querySelector('#modal-module .modal-body');
      const savedScroll = modalBody ? modalBody.scrollTop : 0;
      const wb = ST.workoutBlocks[0]; if (!wb) return;
      const bi = 0;
      const daysHTML = DAYS.map((d, di) => `<button type="button" class="day-toggle ${(wb.days || []).includes(di) ? 'selected' : ''}" onclick="toggleBlockDay(${bi},${di},this)">${d}</button>`).join('');
      const exHTML = wb.exercises.map((ex, ei) => {
        const opts = Object.entries(EX_LIB).map(([cat, list]) => `<optgroup label="${cat}">${list.map(e => `<option value="${e}" ${ex.name === e ? 'selected' : ''}>${e}</option>`).join('')}</optgroup>`).join('');
        const bisets = Object.entries(EX_LIB).map(([cat, list]) => `<optgroup label="${cat}">${list.map(e => `<option value="${e}" ${ex.biset === e ? 'selected' : ''}>${e}</option>`).join('')}</optgroup>`).join('');
        const seriesCount = Number(ex.series) || 1;
        let repsArr = [];
        if (Array.isArray(ex.repsArr)) { repsArr = ex.repsArr; } else if (ex.reps) { repsArr = [ex.reps]; }
        while (repsArr.length < seriesCount) repsArr.push(repsArr[repsArr.length - 1] || '12');
        repsArr = repsArr.slice(0, seriesCount);
        const isCustom = ex.name === '__custom__';
        const repsChips = repsArr.map((r, si) => `<div class="ex-rep-chip"><span class="ex-rep-chip-lbl">S${si + 1}</span><input type="text" value="${r}" placeholder="12" oninput="updateRepsSerie(${bi},${ei},${si},this.value)"/></div>`).join('');
        const isoInline = ex.isometria ? `<div class="ex-isometria-inline"><input type="number" min="1" placeholder="0" value="${ex.isometriaSegs || ''}" oninput="updateExInBlock(${bi},${ei},'isometriaSegs',this.value)"/><span>seg</span></div>` : '';
        return `<div class="exercise-item" data-bi="${bi}" data-ei="${ei}">
      <div class="ex-row-top">
        <div class="drag-handle" title="Reordenar"><svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor"><circle cx="2.5" cy="1.5" r="1.5"/><circle cx="7.5" cy="1.5" r="1.5"/><circle cx="2.5" cy="6" r="1.5"/><circle cx="7.5" cy="6" r="1.5"/><circle cx="2.5" cy="10.5" r="1.5"/><circle cx="7.5" cy="10.5" r="1.5"/></svg></div>
        <span class="ex-num">${ei + 1}</span>
        <select class="ex-select" onchange="onExNameSelect(${bi},${ei},this.value)">
          <option value="">— selecione o exercício —</option>
          <option value="__custom__" ${isCustom ? 'selected' : ''}>✏️ Personalizado</option>
          ${opts}
        </select>
        <button type="button" class="remove-ex-btn" title="Remover" onclick="removeExFromBlock(${bi},${ei})"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
      ${isCustom ? `<div style="padding:6px 10px;border-bottom:1px solid var(--border);"><input type="text" style="width:100%;padding:5px 8px;border:1.5px solid var(--border);border-radius:7px;font-size:.82rem;font-family:var(--body);background:var(--bg);color:var(--text);" placeholder="Nome personalizado..." value="${(ex.customName || '').replace(/"/g, '&quot;')}" oninput="updateExInBlock(${bi},${ei},'customName',this.value)"/></div>` : ''}
      <div class="ex-row-fields">
        <div class="ex-field"><span class="ex-field-label">Séries</span><input type="number" min="1" max="20" value="${seriesCount}" oninput="updateSeriesCountModule(${bi},${ei},this.value,true)" onblur="updateSeriesCountModule(${bi},${ei},this.value,false)"/></div>
        <div class="ex-field"><span class="ex-field-label">Reps por série</span><div class="ex-reps-chips">${repsChips}</div></div>
        <div class="ex-field"><span class="ex-field-label">Bi-set com</span><select onchange="updateExInBlock(${bi},${ei},'biset',this.value)"><option value="">Nenhum</option>${bisets}</select></div>
      </div>
      <div class="ex-row-bottom">
        <div class="ex-techniques">
          <span class="ex-tech-label">Técnicas</span>
          <label class="tech-pill"><input type="checkbox" ${ex.unilateral ? 'checked' : ''} onchange="updateExInBlock(${bi},${ei},'unilateral',this.checked)"/>Unilateral</label>
          <label class="tech-pill"><input type="checkbox" ${ex.isometria ? 'checked' : ''} onchange="updateIsometriaModule(${bi},${ei},this.checked)"/>Isometria</label>
          <label class="tech-pill"><input type="checkbox" ${ex.restPause ? 'checked' : ''} onchange="updateExInBlock(${bi},${ei},'restPause',this.checked)"/>Rest-pause</label>
          ${isoInline}
        </div>
        <div class="ex-obs-wrap">
          <textarea placeholder="Observações: cadência, descanso, drop-set..." oninput="updateExInBlock(${bi},${ei},'obs',this.value)">${ex.obs || ''}</textarea>
        </div>
      </div>
    </div>`;
      }).join('');
      const letter = String.fromCharCode(65 + (ST.moduleIndex !== null && ST.moduleIndex !== undefined ? ST.moduleIndex : ((ST.modulePlanWorkoutsLen || 0))));
      document.getElementById('module-editor').innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
      <div class="wb-letter" style="background:var(--accent);width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:800;font-size:.85rem;color:#111110;flex-shrink:0;">${letter}</div>
      <input class="form-control" type="text" value="${wb.title || ''}" placeholder="Nome do módulo..." onchange="updateBlockTitle(0,this.value)" style="flex:1;font-weight:700;font-size:.95rem;"/>
    </div>
    <div class="wb-days-row" style="margin-bottom:14px;"><span class="wb-days-label">Dias</span><div class="days-selector">${daysHTML}</div></div>
    <div class="exercises-list">${exHTML}</div>
    <button type="button" class="add-ex-btn" onclick="addExToModule()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      Adicionar exercício
    </button>`;
      if (modalBody) modalBody.scrollTop = savedScroll;
      setTimeout(initDragDrop, 0);
    };

    window.addExToModule = () => {
      ST.workoutBlocks[0].exercises.push({});
      renderModuleEditor();
      setTimeout(() => { const m = document.querySelector('#modal-module .modal-body'); if (m) m.scrollTop = m.scrollHeight; }, 50);
    };

    window.updateSeriesCountModule = (bi, ei, val, typing) => {
      if (typing) { ST.workoutBlocks[bi].exercises[ei].series = val === '' ? '' : (parseInt(val) || 1); return; }
      const n = Math.max(1, Math.min(20, parseInt(val) || 1));
      const ex = ST.workoutBlocks[bi].exercises[ei];
      ex.series = n;
      let arr = Array.isArray(ex.repsArr) ? [...ex.repsArr] : [(ex.reps || '12')];
      while (arr.length < n) arr.push(arr[arr.length - 1] || '12');
      arr = arr.slice(0, n);
      ex.repsArr = arr; ex.reps = arr.join(', ');
      renderModuleEditor();
    };

    window.updateIsometriaModule = (bi, ei, checked) => {
      ST.workoutBlocks[bi].exercises[ei].isometria = checked;
      if (!checked) ST.workoutBlocks[bi].exercises[ei].isometriaSegs = '';
      renderModuleEditor();
    };

    window.confirmCloseModule = () => {
      const changed = JSON.stringify(ST.workoutBlocks && ST.workoutBlocks[0]) !== (ST._moduleSnapshot || '{}');
      if (changed) {
        openModal('modal-confirm-close-module');
      } else {
        closeModal('modal-module');
      }
    };

    window.discardModuleAndClose = function () {
      ST.workoutBlocks = [];
      ST._moduleSnapshot = '{}';
      closeModal('modal-confirm-close-module');
      closeModal('modal-module');
    };

    window.saveModule = async () => {
      const wb = ST.workoutBlocks && ST.workoutBlocks[0];
      if (!wb) return;
      if (!wb.exercises.filter(e => e.name).length) { document.getElementById('module-error').textContent = 'Adicione ao menos um exercício.'; return; }
      const errEl = document.getElementById('module-error');
      errEl.textContent = '';
      const btn = document.getElementById('btn-save-module');
      // Evita duplo clique durante o save
      if (btn.classList.contains('btn-loading')) return;
      btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
      const moduleData = { title: wb.title || 'Treino', days: wb.days || [], exercises: wb.exercises.filter(e => e.name).map(e => ({ name: e.name === '__custom__' ? (e.customName || 'Personalizado') : e.name, series: Number(e.series) || 1, reps: e.reps || '12', repsArr: e.repsArr || [e.reps || '12'], videoUrl: e.videoUrl || '', unilateral: !!e.unilateral, biset: e.biset || '', bisetName: e.biset || '', isometria: !!e.isometria, isometriaSegs: e.isometriaSegs || '', restPause: !!e.restPause, obs: e.obs || '' })) };
      // Timeout de segurança: 15s — desbloqueia o botão mesmo se a Promise travar
      const safetyTimer = setTimeout(() => {
        btn.classList.remove('btn-loading'); btn.textContent = 'Salvar módulo';
        errEl.textContent = 'Tempo esgotado. Verifique sua conexão e tente novamente.';
      }, 15000);
      try {
        // Busca o plano com retry (resolve race condition de leitura)
        let snap, attempts = 0;
        while (attempts < 3) {
          try { snap = await _getDoc(_doc(_db, 'plans', ST.modulePlanId)); break; }
          catch (fetchErr) { attempts++; if (attempts >= 3) throw fetchErr; await new Promise(r => setTimeout(r, 600)); }
        }
        if (!snap || !snap.exists) throw new Error('Plano não encontrado.');
        const workouts = [...(snap.data().workouts || [])];
        if (ST.moduleIndex !== null && ST.moduleIndex !== undefined) { workouts[ST.moduleIndex] = moduleData; } else { workouts.push(moduleData); }
        await _updateDoc(_doc(_db, 'plans', ST.modulePlanId), { workouts });
        clearTimeout(safetyTimer);
        // Atualiza snapshot para evitar falso alerta de "alterações não salvas"
        ST._moduleSnapshot = JSON.stringify(ST.workoutBlocks && ST.workoutBlocks[0]);
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Módulo salvo!');
        closeModal('modal-module');
        await openStudentDetail(ST.moduleStudentId);
      } catch (e) {
        clearTimeout(safetyTimer);
        errEl.textContent = 'Erro: ' + e.message;
        toast('Erro ao salvar. Tente novamente.', 'error');
      }
      finally { btn.classList.remove('btn-loading'); btn.textContent = 'Salvar módulo'; }
    };

    window.deleteModule = async (planId, sid, moduleIndex) => {
      if (!confirm('Excluir este módulo de treino?')) return;
      try {
        const snap = await _getDoc(_doc(_db, 'plans', planId));
        if (!snap.exists) { toast('Plano não encontrado.', 'error'); return; }
        const workouts = [...(snap.data().workouts || [])];
        workouts.splice(moduleIndex, 1);
        await _updateDoc(_doc(_db, 'plans', planId), { workouts });
        toast('Módulo excluído.');
        await openStudentDetail(sid);
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
    };

    // ── Manager CRUD ──
    // ── Profile settings ──
    window.openProfileModal = function () {
      var u = window.CURRENT_USER || {};
      document.getElementById('profile-name').value = u.displayName || u.username || '';
      document.getElementById('profile-phone').value = u.phone || '';
      document.getElementById('profile-pass').value = '';
      document.getElementById('profile-pass-confirm').value = '';
      document.getElementById('profile-error').textContent = '';
      openModal('modal-profile');
      setTimeout(() => document.getElementById('profile-phone').focus(), 100);
    };

    window.saveProfile = async function () {
      var u = window.CURRENT_USER || {};
      var name = document.getElementById('profile-name').value.trim();
      var phone = document.getElementById('profile-phone').value.trim();
      var pass = document.getElementById('profile-pass').value;
      var passConfirm = document.getElementById('profile-pass-confirm').value;
      var errEl = document.getElementById('profile-error');
      errEl.textContent = '';

      if (pass && pass !== passConfirm) {
        errEl.textContent = 'As senhas não coincidem.'; return;
      }
      if (pass && pass.length < 4) {
        errEl.textContent = 'Senha muito curta (mínimo 4 caracteres).'; return;
      }

      var btn = document.getElementById('btn-save-profile');
      btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';

      try {
        var isMaster = u.role === 'ceo';
        var finalName = name || u.username;
        var finalPhone = phone || u.phone || '';

        if (isMaster) {
          // Salva nome/telefone do master num doc próprio no Firestore
          // name saved via managers collection below
          // Propaga para todos os alunos do master
          var studSnap = await _getDocs(_query(_col(_db, 'students'), _where('managerId', '==', (window.CURRENT_USER || {}).username || '')));
          for (var sd of studSnap.docs) {
            await _updateDoc(_doc(_db, 'students', sd.id), { managerName: finalName, managerPhone: finalPhone });
          }
        } else {
          // Gestor comum — atualiza no Firestore managers
          var snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username)));
          if (!snap.empty) {
            var upd = { name: finalName, phone: finalPhone };
            if (pass) { upd.passwordHash = await _sha256(pass); upd.password = null; }
            await _updateDoc(_doc(_db, 'managers', snap.docs[0].id), upd);
            // Propaga para alunos
            var studSnap2 = await _getDocs(_query(_col(_db, 'students'), _where('managerId', '==', u.username)));
            for (var sd2 of studSnap2.docs) {
              await _updateDoc(_doc(_db, 'students', sd2.id), { managerName: finalName, managerPhone: finalPhone });
            }
          }
        }

        // Atualiza memória e localStorage
        window.CURRENT_USER.displayName = finalName;
        window.CURRENT_USER.phone = finalPhone;
        try { localStorage.setItem(LS_GESTOR, JSON.stringify(window.CURRENT_USER)); } catch (e) { }

        (window._applyUserUI || window._applyUserUIEarly || function(){})();
        closeModal('modal-profile');
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Perfil atualizado!');
      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Salvar alterações';
      }
    };

    window._applyUserUI = function () {
      var u = window.CURRENT_USER || {};
      var pill = document.getElementById('topbar-user-pill');
      if (pill) pill.textContent = u.displayName || u.username || 'gestor';
      // Gestores tab: visível para master e CEO
      var showGestores = u.role === 'master' || u.role === 'ceo' || !!u.isMaster;
      document.querySelectorAll('.sidebar-item-gestores,.mobile-nav-item-gestores').forEach(function (el) {
        el.classList.toggle('hidden', !showGestores);
      });
      // CEO tab: visível apenas para CEO
      var showCeo = u.role === 'ceo';
      document.querySelectorAll('.sidebar-item-ceo').forEach(function (el) {
        el.classList.toggle('hidden', !showCeo);
      });
      // Report tab: visível apenas para testadores
      var showReport = !!u.isTester;
      document.querySelectorAll('.sidebar-item-report,.mobile-nav-item-report').forEach(function (el) {
        el.classList.toggle('hidden', !showReport);
      });
      // Badge de role na topbar
      var existingBadge = document.getElementById('role-topbar-badge');
      if (!existingBadge && (u.role === 'master' || u.role === 'ceo')) {
        var pill2 = document.getElementById('topbar-user-pill');
        if (pill2) {
          var span = document.createElement('span');
          span.id = 'role-topbar-badge';
          span.style.cssText = 'background:' + (u.role === 'ceo' ? 'linear-gradient(135deg,#f5c800,#e0a800)' : 'rgba(245,200,0,.15)') + ';color:#111110;border-radius:6px;padding:2px 8px;font-size:.65rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em;margin-left:6px;';
          span.textContent = u.role === 'ceo' ? '⭐ CEO' : 'Master';
          pill2.after(span);
        }
      }
    };

    window.openMobileSidebar = function () {
      document.getElementById('mobile-sidebar').classList.add('open');
      document.getElementById('mobile-sidebar-overlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    window.closeMobileSidebar = function () {
      document.getElementById('mobile-sidebar').classList.remove('open');
      document.getElementById('mobile-sidebar-overlay').classList.remove('open');
      document.body.style.overflow = '';
    };

    window.openAddManagerModal = function (editData) {
      document.getElementById('manager-modal-title').textContent = editData ? 'Editar gestor' : 'Cadastrar gestor';
      document.getElementById('new-manager-user').value = editData ? editData.username : '';
      document.getElementById('new-manager-user').disabled = !!editData;
      document.getElementById('new-manager-pass').value = '';
      document.getElementById('new-manager-name').value = editData ? editData.name || '' : '';
      document.getElementById('new-manager-phone').value = editData ? editData.phone || '' : '';
      document.getElementById('new-manager-master').checked = editData ? !!editData.isMaster : false;
      var btn = document.getElementById('btn-save-manager');
      btn.textContent = editData ? 'Salvar' : 'Cadastrar';
      btn.dataset.editId = editData ? editData.id : '';
      openModal('modal-add-manager');
      setTimeout(() => document.getElementById(editData ? 'new-manager-name' : 'new-manager-user').focus(), 100);
    };

    window.saveManager = async function () {
      var btn = document.getElementById('btn-save-manager');
      var editId = btn.dataset.editId || '';
      var username = document.getElementById('new-manager-user').value.trim().toLowerCase();
      var pass = document.getElementById('new-manager-pass').value;
      var name = document.getElementById('new-manager-name').value.trim();
      var phone = document.getElementById('new-manager-phone').value.trim();
      var isMaster = document.getElementById('new-manager-master').checked;

      if (!username) { toast('Usuário obrigatório!', 'error'); return; }
      if (!editId && !pass) { toast('Senha obrigatória!', 'error'); return; }


      btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';
      try {
        if (editId) {
          var upd = { name, phone, isMaster };
          if (pass) { upd.passwordHash = await _sha256(pass); upd.password = null; }
          await _updateDoc(_doc(_db, 'managers', editId), upd);
          // Propagate phone and name update to all students of this manager
          var studSnap = await _getDocs(_query(_col(_db, 'students'), _where('managerId', '==', username)));
          for (var sd of studSnap.docs) {
            await _updateDoc(_doc(_db, 'students', sd.id), { managerPhone: phone, managerName: name || username });
          }
          toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Gestor atualizado!');
        } else {
          // Check if username exists
          var exists = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', username)));
          if (!exists.empty) { toast('Usuário já existe!', 'error'); return; }
          // Determina role
          var u = window.CURRENT_USER || {};
          var newRole = isMaster ? 'master' : 'comum';
          // SHA-256 da senha
          var passHash = await _sha256(pass);
          // Trial de 7 dias automático
          var trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
          await _setDoc(_doc(_db, 'managers', 'mgr_' + Date.now()), {
            username, passwordHash: passHash, name, phone,
            role: newRole, isMaster,
            trialEndsAt, subEndsAt: null,
            blocked: false, createdAt: Date.now()
          });
          toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Gestor cadastrado com 7 dias de teste!');
        }
        closeModal('modal-add-manager');
        await loadManagers();
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
      finally { btn.classList.remove('btn-loading'); btn.textContent = editId ? 'Salvar' : 'Cadastrar'; }
    };

    window.loadManagers = async function () {
      var g = document.getElementById('managers-grid');
      if (!g) return;
      g.innerHTML = '<div class="spinner"></div>';
      try {
        var snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
        var managers = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderManagersGrid(managers);
      } catch (e) {
        g.innerHTML = `<div style="padding:20px;color:red;font-size:12px;grid-column:1/-1;">Erro: ${e.message}</div>`;
      }
    };

    window.renderManagersGrid = function (list) {
      var g = document.getElementById('managers-grid');
      if (!list.length) {
        g.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="ei"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>️</div><p>Nenhum gestor cadastrado além do master.</p></div>`;
        return;
      }
      g.innerHTML = list.map(m => `
    <div class="student-card">
      <div class="student-card-top">
        <div class="avatar" style="${m.isMaster ? 'background:var(--accent-dim);border-color:var(--accent-soft);' : ''}">${(m.name || m.username || '?').slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="student-name">${m.name || m.username}</div>
          <div class="student-code">@${m.username}</div>
          ${m.cref ? `<div style="font-size:.74rem;color:var(--text2);margin-top:3px;font-weight:600;display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:2px 8px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/><line x1="13" y1="15" x2="17" y2="15"/></svg> ${m.cref}</div>` : ''}
          ${m.phone ? `<div style="font-size:.74rem;color:var(--text3);margin-top:2px;font-weight:500;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${m.phone}</div>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-top:4px;">
        <span class="mgr-badge ${m.role === 'ceo' ? 'mgr-ceo' : m.isMaster ? 'mgr-master' : 'mgr-comum'}">${m.role === 'ceo' ? '⭐ CEO' : m.isMaster ? '⭐ Master' : 'Comum'}</span>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-ghost btn-sm" onclick="openAddManagerModal(${JSON.stringify(m).replace(/"/g, '&quot;')})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteManager('${m.id}','${m.username}')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
        </div>
      </div>
    </div>`).join('');
    };

    window.deleteManager = async function (id, username) {
      if (!confirm(`Excluir o gestor @${username}?`)) return;
      await _deleteDoc(_doc(_db, 'managers', id));
      toast('Gestor excluído.');
      await loadManagers();
    };

    // ── Verifica retorno de pagamento MP na inicialização ──
    document.addEventListener('DOMContentLoaded', function () {
      (function waitCheck() {
        if (window.checkPaymentReturn) { checkPaymentReturn(); }
        else { setTimeout(waitCheck, 200); }
      })();
    });

    // ── Auto login from localStorage ──
    (function init() {
      if (new URLSearchParams(window.location.search).get('invite')) return;
      if (hasSession()) {
        var sess = getSession();
        if (sess) {
          window.CURRENT_USER = sess;
          // Route based on role and subscription
          if (sess.role === 'ceo') {
            (function w() { if (window.showCeoPanel) { showCeoPanel(); } else { setTimeout(w, 100); } })();
          } else if (sess.subStatus && !sess.subStatus.ok) {
            (function w() { if (window.showSubscriptionWall) { showSubscriptionWall(); } else { setTimeout(w, 100); } })();
          } else {
            window.showDashboard();
          }
        } else {
          clearSession();
        }
      }
    })();

    // ═══════════════════════════════════════════
    // CHAT — GESTOR
    // ═══════════════════════════════════════════
    window._chatActiveSid = null;
    window._chatPollGestor = null;
    window._chatUnreadTotal = 0;

    window.loadChatList = async function () {
      var el = document.getElementById('chat-list-gestor');
      if (!el) return;
      el.innerHTML = '<div class="spinner"></div>';
      try {
        var u = window.CURRENT_USER || {};
        // Get all students for this manager
        var q;
        if (u.role === 'ceo' || u.isMaster) {
          q = _query(_col(_db, 'students'), _orderBy('createdAt', 'desc'));
        } else {
          q = _query(_col(_db, 'students'), _where('managerId', '==', u.username));
        }
        var snap = await _getDocs(q);
        var students = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

        // For each student, get latest message and unread count
        var chatItems = [];
        for (var s of students) {
          try {
            var msgsSnap = await _db.collection('chats').doc(s.id).collection('messages').orderBy('ts', 'desc').limit(1).get();
            if (!msgsSnap.empty) {
              var lastMsg = Object.assign({ id: msgsSnap.docs[0].id }, msgsSnap.docs[0].data());
              var unreadSnap = await _db.collection('chats').doc(s.id).collection('messages')
                .where('sender', '==', 'student').where('readByManager', '==', false).get();
              chatItems.push({ student: s, lastMsg: lastMsg, unread: unreadSnap.size });
            }
          } catch (e) { }
        }

        // Sort by latest message timestamp
        chatItems.sort(function (a, b) { return (b.lastMsg.ts || 0) - (a.lastMsg.ts || 0); });

        if (!chatItems.length) {
          el.innerHTML = '<div class="empty-state"><div class="ei"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div><p>Nenhuma conversa ainda.<br>Os alunos podem iniciar o chat pelo app.</p></div>';
          return;
        }

        el.innerHTML = chatItems.map(function (item) {
          var s = item.student;
          var m = item.lastMsg;
          var unread = item.unread;
          var preview = m.sender === 'student' ? m.text : ('Você: ' + (m.text || ''));
          var timeStr = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          return '<div class="chat-list-item' + (unread > 0 ? ' has-unread' : '') + '" id="chatitem_' + s.id + '" onclick="openChatDetail(\'' + s.id + '\')">'
            + '<div class="chat-list-item-header">'
            + '<div class="chat-list-avatar">' + (s.name || '?').slice(0, 2).toUpperCase() + '</div>'
            + '<div style="flex:1;min-width:0;">'
            + '<div style="display:flex;align-items:center;gap:6px;">'
            + '<div class="chat-list-name">' + escHtml(s.name || s.code || 'Aluno') + '</div>'
            + (unread > 0 ? '<div class="chat-unread-dot"></div>' : '')
            + '</div>'
            + '<div class="chat-list-preview">' + escHtml((preview || '').slice(0, 60)) + '</div>'
            + '</div>'
            + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">'
            + '<div class="chat-list-time">' + timeStr + '</div>'
            + '<button class="chat-delete-btn" title="Limpar conversa" onclick="event.stopPropagation();deleteChatGestor(\'' + s.id + '\',\'' + escHtml(s.name || s.code || 'Aluno') + '\')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>'
            + '</div>'
            + '</div>'
            + '</div>';
        }).join('');
      } catch (e) {
        el.innerHTML = '<div style="color:var(--red);font-size:.82rem;padding:20px;">Erro: ' + e.message + '</div>';
      }
    };

    window.openChatDetail = async function (sid) {
      window._chatActiveSid = sid;
      var panel = document.getElementById('chat-detail-panel');
      panel.classList.add('visible');

      var student = ST.students.find(function (s) { return s.id === sid; }) || { id: sid, name: sid };
      document.getElementById('chat-detail-name').textContent = student.name || student.code || sid;
      document.getElementById('chat-detail-code').textContent = student.code ? ('#' + student.code) : '';
      document.getElementById('chat-detail-avatar').textContent = (student.name || '?').slice(0, 2).toUpperCase();

      // Highlight selected e remove indicador de não lido imediatamente
      document.querySelectorAll('.chat-list-item').forEach(function (el) { el.classList.remove('active-chat'); });
      var item = document.getElementById('chatitem_' + sid);
      if (item) {
        item.classList.add('active-chat');
        item.classList.remove('has-unread');
        var dot = item.querySelector('.chat-unread-dot');
        if (dot) dot.remove();
      }

      await window.loadChatDetailMessages();

      if (window._chatPollGestor) clearInterval(window._chatPollGestor);
      window._chatPollGestor = setInterval(window.loadChatDetailMessages, 4000);
    };

    window.loadChatDetailMessages = async function () {
      if (!window._chatActiveSid) return;
      try {
        var snap = await _db.collection('chats').doc(window._chatActiveSid).collection('messages').orderBy('ts', 'asc').get();
        var msgs = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });

        var el = document.getElementById('chat-detail-messages');
        if (!msgs.length) {
          el.innerHTML = '<div class="chat-empty-state">Nenhuma mensagem. Diga olá! 👋</div>';
          return;
        }
        var html = msgs.map(function (m) {
          var mine = m.sender === 'manager';
          var time = m.ts ? new Date(m.ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
          return '<div class="chat-msg ' + (mine ? 'mine' : 'theirs') + '">'
            + '<div class="chat-bubble">' + escHtml(m.text) + '</div>'
            + '<div class="chat-time-label">' + time + '</div>'
            + '</div>';
        }).join('');
        el.innerHTML = html;
        el.scrollTop = el.scrollHeight;

        // Mark messages from student as read by manager
        var hadUnread = false;
        for (var m of msgs) {
          if (m.sender === 'student' && !m.readByManager) {
            hadUnread = true;
            _db.collection('chats').doc(window._chatActiveSid).collection('messages').doc(m.id).update({ readByManager: true }).catch(function () { });
          }
        }
        // Atualiza badge imediatamente se havia não lidos
        if (hadUnread) window.updateChatBadge();
      } catch (e) { console.warn('loadChatDetailMessages:', e.message); }
    };

    window.closeChatDetail = function () {
      window._chatActiveSid = null;
      if (window._chatPollGestor) { clearInterval(window._chatPollGestor); window._chatPollGestor = null; }
      var panel = document.getElementById('chat-detail-panel');
      if (panel) panel.classList.remove('visible');
    };

    window.sendChatMessageGestor = async function () {
      var inp = document.getElementById('chat-gestor-input');
      var text = (inp.value || '').trim();
      if (!text || !window._chatActiveSid) return;
      inp.value = ''; inp.style.height = '';
      try {
        await _db.collection('chats').doc(window._chatActiveSid).collection('messages').add({
          text: text, sender: 'manager', ts: Date.now(), readByManager: true, readByStudent: false
        });
        window.loadChatDetailMessages();
        window.loadChatList();
      } catch (e) { toast('Erro ao enviar: ' + e.message, 'error'); }
    };

    window.chatGestorKeydown = function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.sendChatMessageGestor(); }
    };

    window.autoResizeChatGestor = function (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 100) + 'px';
    };

    window.deleteChatGestor = async function (sid, name) {
      if (!confirm('Limpar a conversa com ' + name + '? Isso apagará todas as mensagens e a conversa sairá da lista.')) return;
      try {
        var snap = await _db.collection('chats').doc(sid).collection('messages').get();
        for (var d of snap.docs) {
          await _db.collection('chats').doc(sid).collection('messages').doc(d.id).delete();
        }
        toast('Conversa limpa!');
        if (window._chatActiveSid === sid) window.closeChatDetail();
        window.loadChatList();
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
    };

    // ── Badge de chat em tempo real (onSnapshot) ──
    window._chatSnapshotUnsubs = []; // guarda os unsubscribes dos listeners

    window.startChatBadgePolling = async function () {
      // Cancela listeners anteriores se existirem
      window._chatSnapshotUnsubs.forEach(function (fn) { try { fn(); } catch (e) { } });
      window._chatSnapshotUnsubs = [];
      window._chatUnreadCounts = {}; // { studentId: count }

      var u = window.CURRENT_USER || {};
      if (!u.username) return;

      // Busca lista de alunos deste gestor
      var q;
      if (u.role === 'ceo' || u.isMaster) {
        q = _query(_col(_db, 'students'), _orderBy('createdAt', 'desc'));
      } else {
        q = _query(_col(_db, 'students'), _where('managerId', '==', u.username));
      }

      try {
        var snap = await _getDocs(q);
        snap.docs.forEach(function (d) {
          var sid = d.id;
          // Listener em tempo real para mensagens não lidas deste aluno
          // Evita índice composto: filtra só por sender, checa readByManager em JS
          var unsub = _db.collection('chats').doc(sid).collection('messages')
            .where('sender', '==', 'student')
            .onSnapshot(function (msgSnap) {
              var unread = msgSnap.docs.filter(function (m) {
                return m.data().readByManager === false;
              }).length;
              window._chatUnreadCounts[sid] = unread;
              window._applyBadgeCount();
            }, function (e) { console.warn('chat snapshot err:', e.message); });
          window._chatSnapshotUnsubs.push(unsub);
        });
      } catch (e) { console.error('startChatBadgePolling:', e); }
    };

    window._applyBadgeCount = function () {
      var total = Object.values(window._chatUnreadCounts || {}).reduce(function (a, b) { return a + b; }, 0);
      window._chatUnreadTotal = total;
      var label = total > 9 ? '9+' : String(total);
      // Desktop sidebar badge
      var sb = document.getElementById('chat-sidebar-badge');
      if (sb) { sb.textContent = label; sb.classList.toggle('hidden', total === 0); }
      // Mobile sidebar badge (mesmo id, agora no sidebar mobile)
      var mb = document.getElementById('chat-mobile-badge');
      if (mb) { mb.textContent = label; mb.classList.toggle('hidden', total === 0); }
    };

    // Mantém updateChatBadge como alias para chamadas existentes (ex: após marcar como lido)
    window.updateChatBadge = function () {
      window._applyBadgeCount();
    };

    function escHtml(str) {
      return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }

    // ═══════════════════════════════════════════
    // CRIAR ALERTA — GESTOR
    // ═══════════════════════════════════════════
    window.openCreateAlertModal = function () {
      var sel = document.getElementById('alert-student-select');
      sel.innerHTML = '<option value="">— Selecione um aluno —</option>';
      var students = ST.students || [];
      students.forEach(function (s) {
        var opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name || s.code || s.id;
        sel.appendChild(opt);
      });
      document.getElementById('alert-message-text').value = '';
      document.getElementById('alert-error').textContent = '';
      openModal('modal-create-alert');
    };

    window.sendAlert = async function () {
      var sid = document.getElementById('alert-student-select').value;
      var msg = document.getElementById('alert-message-text').value.trim();
      var errEl = document.getElementById('alert-error');
      errEl.textContent = '';
      if (!sid) { errEl.textContent = 'Selecione um aluno.'; return; }
      if (!msg) { errEl.textContent = 'Digite a mensagem do alerta.'; return; }
      var btn = document.getElementById('btn-send-alert');
      btn.classList.add('btn-loading'); btn.textContent = 'Enviando...';
      try {
        await _setDoc(_doc(_db, 'alerts', sid), { message: msg, ts: Date.now() });
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Alerta enviado! O aluno verá ao abrir o app.');
        closeModal('modal-create-alert');
      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
      } finally {
        btn.classList.remove('btn-loading');
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/></svg> Enviar alerta';
      }
    };

    window.loadCrefPending = async function () {
      var list = document.getElementById('cref-pending-list');
      var badge = document.getElementById('cref-pending-count');
      if (!list) return;
      list.innerHTML = '<div class="cref-empty"><div class="spinner" style="margin:0 auto;"></div></div>';
      try {
        var snap = await _db.collection('managers').get();
        var pending = snap.docs
          .map(function (d) { return Object.assign({ id: d.id }, d.data()); })
          .filter(function (m) { return m.role !== 'ceo' && m.cref && (!m.crefStatus || m.crefStatus === 'pending'); });

        if (badge) {
          badge.style.display = pending.length > 0 ? 'inline-flex' : 'none';
          badge.textContent = pending.length > 9 ? '9+' : pending.length;
        }
        if (!pending.length) {
          list.innerHTML = '<div class="cref-empty"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Nenhum documento pendente de análise.</div>';
          return;
        }
        list.innerHTML = pending.map(function (m) {
          return '<div class="cref-item" id="cref-item-' + m.id + '">'
            + '<div class="avatar" style="flex-shrink:0;width:42px;height:42px;font-size:.95rem;">' + (m.name || m.username || '?').slice(0, 2).toUpperCase() + '</div>'
            + '<div class="cref-item-info">'
            + '<div class="cref-item-name">' + escHtml(m.name || m.username) + '</div>'
            + '<div class="cref-item-user">@' + escHtml(m.username) + '</div>'
            + '<div class="cref-item-number"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/><line x1="7" y1="15" x2="10" y2="15"/><line x1="13" y1="15" x2="17" y2="15"/></svg> CREF: ' + escHtml(m.cref || 'Não informado') + '</div>'
            + '</div>'
            + '<div class="cref-item-actions">'
            + '<button class="btn-approve" onclick="crefApprove(this)" data-id="' + m.id + '">✓ Aprovar</button>'
            + '<button class="btn-reject"  onclick="crefReject(this)"  data-id="' + m.id + '">✕ Rejeitar</button>'
            + '</div>'
            + '</div>';
        }).join('');
      } catch (e) {
        list.innerHTML = '<div class="cref-empty" style="color:var(--red);">Erro: ' + e.message + '</div>';
      }
    };

    window.crefApprove = async function (btn) {
      var id = btn.dataset.id;
      var item = document.getElementById('cref-item-' + id);
      if (item) item.style.opacity = '.4';
      try {
        await _updateDoc(_doc(_db, 'managers', id), { crefStatus: 'approved' });
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> CREF aprovado!');
        loadCrefPending();
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
        if (item) item.style.opacity = '1';
      }
    };

    window.crefReject = async function (btn) {
      var id = btn.dataset.id;
      try {
        // Busca o username do gestor para notificar alunos
        var mgrDoc = await _db.collection('managers').doc(id).get();
        var mgrUsername = mgrDoc.exists ? (mgrDoc.data().username || '') : '';

        await _updateDoc(_doc(_db, 'managers', id), {
          crefStatus: 'rejected',
          blocked: true,
          blockReasons: ['Documento CREF falso ou inválido']
        });

        // Notifica todos os alunos desse gestor e revoga bônus de indicação
        if (mgrUsername) {
          await window._notifyStudentsOfSuspension(mgrUsername);
        }
        await _revokeReferralBonus(id);

        toast('Conta bloqueada por CREF inválido.', 'error');
        loadCrefPending();
        loadCeoManagers();
      } catch (e) {
        toast('Erro: ' + e.message, 'error');
      }
    }

    // ── _sha256 helper (também usado pelo login) ──
    window._sha256 = async function (str) {
      var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    };

    // ── Notifica alunos quando um gestor é bloqueado/suspenso ──
    // Grava um documento em alerts/{studentId} com type='trainer_suspended'
    // O app do aluno lê isso e exibe o pop-up de suspensão.
    window._notifyStudentsOfSuspension = async function (managerUsername) {
      if (!managerUsername) return;
      try {
        var snap = await _db.collection('students').where('managerId', '==', managerUsername).get();
        var batch = [];
        snap.docs.forEach(function (d) {
          batch.push(
            _db.collection('alerts').doc(d.id).set({
              type: 'trainer_suspended',
              message: 'Seu treinador foi suspenso da plataforma. Após o vencimento do seu plano de treino, o acesso será removido automaticamente.',
              ts: Date.now()
            }, { merge: true })
          );
        });
        await Promise.all(batch);
        console.log('[Trainly] Suspension alerts sent to', snap.size, 'student(s) of', managerUsername);
      } catch (e) {
        console.warn('[Trainly] Failed to notify students of suspension:', e.message);
      }
    };


  


    // ════════════════════════════════════════════════════════════
    // TRIAL BANNER
    // ════════════════════════════════════════════════════════════
    window.showTrialBanner = function (daysLeft) {
      var banner = document.getElementById('trial-banner');
      var text = document.getElementById('trial-banner-text');
      if (banner && text) {
        text.textContent = daysLeft <= 1
          ? 'Seu período de teste expira hoje! Assine para não perder o acesso.'
          : 'Você tem ' + daysLeft + ' dias restantes de avaliação gratuita.';
        banner.style.display = 'block';
        setTimeout(function () { banner.style.display = 'none'; }, 8000);
      }
      // Exibe card no dashboard
      var card = document.getElementById('trial-dash-card');
      var daysEl = document.getElementById('trial-dash-days');
      var descEl = document.getElementById('trial-dash-desc');
      if (card) {
        card.classList.add('visible');
        if (daysEl) daysEl.textContent = daysLeft;
        if (descEl) {
          if (daysLeft <= 1) {
            descEl.innerHTML = 'Seu teste <strong style="color:#f5c800;">expira hoje!</strong><br/>Assine agora para continuar.';
          } else {
            descEl.innerHTML = 'Você tem <strong style="color:#f5c800;">' + daysLeft + ' dias</strong> restantes.<br/>Assine para não perder o acesso.';
          }
        }
      }
    };

    // ════════════════════════════════════════════════════════════
    // SUBSCRIPTION WALL — Liberação manual pelo CEO
    // ════════════════════════════════════════════════════════════
    // ─── Mercado Pago ─────────────────────────────────────────────────────────────
    var MP_PUBLIC_KEY = 'APP_USR-f12a2b24-0d63-4c1a-ab86-7e1ac6302acf';
    var MP_BACKEND_URL = 'https://mercadopagopayment-ax2n6uynda-uc.a.run.app';
    // ──────────────────────────────────────────────────────────────────────────────

    var _mpInstance = null;
    var _mpSelectedPlan = 'monthly';
    var _mpPricing = { monthly: 0, discount: 0 };
    var _mpPaymentMethodId = '';   // bandeira detectada (visa, master, elo...)

    // ── Exibe subscription wall e carrega preços ──────────────────────────────────
    window.showSubscriptionWall = async function () {
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-dashboard').style.display = 'none';
      document.getElementById('screen-sub-wall').style.display = 'flex';
      subShowStep('plan');

      try {
        var snap = await _db.collection('settings').doc('pricing').get();
        if (snap.exists) {
          var d = snap.data();
          _mpPricing.monthly = parseFloat(d.monthly) || 0;
          _mpPricing.discount = parseFloat(d.discount) || 0;
        }
      } catch (e) { console.warn('loadPricing wall:', e); }
      renderSubWallPrices();

      // Inicializa SDK MP
      if (!_mpInstance && window.MercadoPago) {
        _mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
      }
    };

    // ── Renderiza preços nos cards de plano ───────────────────────────────────────
    function renderSubWallPrices() {
      var m = _mpPricing.monthly;
      var disc = _mpPricing.discount;
      var annualTotal = m * 12 * (1 - disc / 100);
      var annualMonthly = annualTotal / 12;
      var saving = m * 12 - annualTotal;

      var fmt = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };

      var elM = document.getElementById('sub-price-monthly');
      var elA = document.getElementById('sub-price-annual');
      var elB = document.getElementById('sub-annual-badge');
      var elS = document.getElementById('sub-annual-saving');

      if (elM) elM.textContent = m > 0 ? fmt(m) : 'R$ —';
      if (elA) elA.textContent = annualMonthly > 0 ? fmt(annualMonthly) : 'R$ —';
      if (elB) elB.textContent = disc > 0 ? 'Economize ' + disc + '%' : '';
      if (elS && saving > 0) elS.textContent = 'Economia de ' + fmt(saving) + '/ano';
    }

    // ── Seleção de plano ──────────────────────────────────────────────────────────
    window.selectPlan = function (plan) {
      _mpSelectedPlan = plan;
      document.getElementById('plan-monthly').classList.toggle('selected', plan === 'monthly');
      document.getElementById('plan-annual').classList.toggle('selected', plan === 'annual');
    };

    // ── Avança para o formulário de cartão ───────────────────────────────────────
    window.goToPayment = function () {
      if (!_mpPricing.monthly) {
        toast('Precos nao configurados. Contate o administrador.', 'error');
        return;
      }
      var disc = _mpPricing.discount;
      var annualMonthly = _mpPricing.monthly * 12 * (1 - disc / 100) / 12;
      var fmt = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };

      var summary = _mpSelectedPlan === 'monthly'
        ? 'Plano Mensal — ' + fmt(_mpPricing.monthly) + '/mes'
        : 'Plano Anual — ' + fmt(annualMonthly) + '/mes (cobrado anualmente)';

      var el = document.getElementById('sub-card-plan-summary');
      if (el) el.textContent = summary;

      // Limpa campos
      ['mp-cardNumber', 'mp-expirationDate', 'mp-securityCode', 'mp-cardholderName', 'mp-docNumber'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('sub-pay-error').textContent = '';
      document.getElementById('mp-card-brand').textContent = '';
      document.getElementById('mp-installments-wrap').style.display = 'none';
      _mpPaymentMethodId = '';

      subShowStep('card');
    };

    // ── Volta para seleção de plano ───────────────────────────────────────────────
    window.backToPlan = function () {
      subShowStep('plan');
    };

    // ── Mascara número do cartão (grupos de 4) e detecta bandeira ────────────────
    window.onCardNumberInput = function (input) {
      var raw = input.value.replace(/\D/g, '').slice(0, 16);
      var groups = raw.match(/.{1,4}/g) || [];
      input.value = groups.join(' ');

      // Detecta bandeira pelo prefixo
      var brand = '';
      var brandEl = document.getElementById('mp-card-brand');
      if (/^4/.test(raw)) brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Visa';
      else if (/^5[1-5]/.test(raw)) brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Mastercard';
      else if (/^3[47]/.test(raw)) brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Amex';
      else if (/^6(?:011|5)/.test(raw)) brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Discover';
      else if (/^(?:606282|3841)/.test(raw)) brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Hipercard';
      else if (/^(?:4011|4312|4389|4514|4576|5041|5067|5090|6277|6362|6516|6550)/.test(raw)) brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Elo';
      if (brandEl) brandEl.innerHTML = brand;

      // Detecta payment_method_id para MP
      if (/^4/.test(raw)) _mpPaymentMethodId = 'visa';
      else if (/^5[1-5]/.test(raw)) _mpPaymentMethodId = 'master';
      else if (/^3[47]/.test(raw)) _mpPaymentMethodId = 'amex';
      else if (/^(?:606282|3841)/.test(raw)) _mpPaymentMethodId = 'hipercard';
      else _mpPaymentMethodId = '';

      // Busca parcelas se tiver 6+ dígitos
      if (raw.length >= 6 && _mpInstance && _mpPaymentMethodId) {
        loadInstallments(raw.slice(0, 6));
      }
    };

    // ── Mascara validade MM/AA ────────────────────────────────────────────────────
    window.onExpiryInput = function (input) {
      var raw = input.value.replace(/\D/g, '').slice(0, 4);
      if (raw.length > 2) input.value = raw.slice(0, 2) + '/' + raw.slice(2);
      else input.value = raw;
    };

    // ── Busca parcelas disponíveis via MP ─────────────────────────────────────────
    async function loadInstallments(bin) {
      if (!_mpInstance) return;
      try {
        var amount = getSelectedAmount();
        var result = await _mpInstance.getInstallments({
          amount: String(amount.toFixed(2)),
          bin: bin,
          paymentTypeId: 'credit_card'
        });
        var wrap = document.getElementById('mp-installments-wrap');
        var sel = document.getElementById('mp-installments');
        if (!result || !result[0] || !result[0].payer_costs) { if (wrap) wrap.style.display = 'none'; return; }
        var costs = result[0].payer_costs;
        if (wrap) wrap.style.display = 'block';
        if (sel) {
          sel.innerHTML = costs.map(function (c) {
            var label = c.installments + 'x de R$ ' + c.installment_amount.toFixed(2).replace('.', ',');
            if (c.installment_rate === 0) label += ' (sem juros)';
            return '<option value="' + c.installments + '">' + label + '</option>';
          }).join('');
        }
      } catch (e) { console.warn('getInstallments:', e); }
    }

    // ── Valor total do plano selecionado ──────────────────────────────────────────
    function getSelectedAmount() {
      var m = _mpPricing.monthly;
      var disc = _mpPricing.discount;
      return _mpSelectedPlan === 'annual' ? m * 12 * (1 - disc / 100) : m;
    }

    // ── Submete pagamento: valida → tokeniza → envia ao backend ──────────────────
    window.submitCardPayment = async function () {
      var errEl = document.getElementById('sub-pay-error');
      errEl.textContent = '';

      // ── Lê campos ──
      var cardRaw = (document.getElementById('mp-cardNumber').value || '').replace(/\s/g, '');
      var expiry = (document.getElementById('mp-expirationDate').value || '').trim();
      var cvv = (document.getElementById('mp-securityCode').value || '').trim();
      var name = (document.getElementById('mp-cardholderName').value || '').trim();
      var cpf = (document.getElementById('mp-docNumber').value || '').replace(/\D/g, '');
      var email = (document.getElementById('mp-email').value || '').trim();

      // ── Validações ──
      if (cardRaw.length < 13) { errEl.textContent = 'Numero do cartao invalido.'; return; }
      if (!expiry.match(/^\d{2}\/\d{2}$/)) { errEl.textContent = 'Validade invalida. Use MM/AA.'; return; }
      if (cvv.length < 3) { errEl.textContent = 'CVV invalido.'; return; }
      if (!name || name.length < 3) { errEl.textContent = 'Informe o nome do titular.'; return; }
      if (cpf.length !== 11) { errEl.textContent = 'CPF invalido (11 digitos).'; return; }
      if (!email || !email.includes('@')) { errEl.textContent = 'Informe um e-mail valido.'; return; }

      if (!_mpInstance) {
        errEl.textContent = 'SDK Mercado Pago nao carregou. Recarregue a pagina.';
        return;
      }

      subShowStep('processing');

      try {
        var parts = expiry.split('/');
        var expMonth = parts[0];
        var expYear = '20' + parts[1];

        // ── Cria token seguro do cartão via SDK MP ──
        var tokenResult = await _mpInstance.createCardToken({
          cardNumber: cardRaw,
          cardExpirationMonth: expMonth,
          cardExpirationYear: expYear,
          securityCode: cvv,
          cardholderName: name,
          identificationType: 'CPF',
          identificationNumber: cpf
        });

        if (!tokenResult || !tokenResult.id) {
          throw new Error((tokenResult && tokenResult.cause && tokenResult.cause[0] && tokenResult.cause[0].description) || 'Erro ao tokenizar cartao.');
        }

        await processPaymentWithToken(tokenResult.id);

      } catch (err) {
        console.error('submitCardPayment error:', err);
        subShowStep('card');
        var errMsg = typeof err === 'string' ? err
          : (err && err.message) ? err.message
            : (err && err.cause) ? JSON.stringify(err.cause)
              : (err && err.error) ? JSON.stringify(err.error)
                : JSON.stringify(err);
        if (errMsg === '{}' || !errMsg) errMsg = 'Verifique os dados do cartão e tente novamente.';
        errEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + errMsg;
      }
    };

    // ── Envia token ao backend e processa ─────────────────────────────────────────
    async function processPaymentWithToken(token) {
      var u = window.CURRENT_USER || {};
      var amount = getSelectedAmount();
      var installments = parseInt((document.getElementById('mp-installments') || {}).value || '1') || 1;
      var name = (document.getElementById('mp-cardholderName').value || '').trim();
      var cpf = (document.getElementById('mp-docNumber').value || '').replace(/\D/g, '');

      // Busca o managerId real do Firestore caso nao esteja na sessao
      var managerId = u.id || '';
      if (!managerId && u.username) {
        try {
          var snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', u.username)));
          if (!snap.empty) {
            managerId = snap.docs[0].id;
            window.CURRENT_USER.id = managerId;
            try { localStorage.setItem('forge_gestor_session', JSON.stringify(window.CURRENT_USER)); } catch (e) { }
          }
        } catch (e) { console.warn('Nao conseguiu buscar managerId:', e); }
      }

      var body = {
        token: token,
        amount: amount,
        installments: installments,
        payment_method_id: _mpPaymentMethodId || '',
        description: 'Trainly ' + (_mpSelectedPlan === 'annual' ? 'Anual' : 'Mensal'),
        payer: {
          email: (document.getElementById('mp-email').value || '').trim(),
          identification: { type: 'CPF', number: cpf },
          first_name: name
        },
        plan: _mpSelectedPlan,
        managerId: managerId,
        username: u.username || ''
      };

      try {
        var resp = await fetch(MP_BACKEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        var result = await resp.json();

        console.log('MP result:', JSON.stringify(result));

        if (result.status === 'approved' || result.status === 'authorized') {
          await activateSubscription(managerId, _mpSelectedPlan, result);
          subShowStep('success');
          document.getElementById('sub-success-msg').textContent =
            _mpSelectedPlan === 'annual'
              ? 'Plano anual ativado! Acesso liberado por 12 meses.'
              : 'Plano mensal ativado! Acesso liberado por 30 dias.';
        } else if (result.status === 'pending' || result.status === 'in_process') {
          subShowStep('success');
          document.getElementById('sub-success-msg').textContent = 'Pagamento em analise. Voce recebera a confirmacao em breve.';
        } else {
          subShowStep('card');
          var detail = result.status_detail || result.message || result.error || 'Pagamento recusado. Verifique os dados.';
          document.getElementById('sub-pay-error').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + detail;
        }
      } catch (backendErr) {
        console.warn('Backend erro:', backendErr.message);
        subShowStep('card');
        document.getElementById('sub-pay-error').innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Erro de conexao com o servidor. Tente novamente.';
      }
    }

    // ── Ativa assinatura no Firestore e na sessao local ───────────────────────────
    async function activateSubscription(managerId, plan, paymentResult) {
      var now = Date.now();
      var subEndsAt = plan === 'annual'
        ? now + 365 * 24 * 60 * 60 * 1000
        : now + 30 * 24 * 60 * 60 * 1000;

      // Aguarda Auth inicializar
      var attempts = 0;
      while (!_auth && attempts < 20) { await new Promise(r => setTimeout(r, 100)); attempts++; }

      // ── CORREÇÃO: Garante que o Firebase Auth tem sessão ativa ───────────────
      // O Firestore exige isAuth() para escrever. Se o Auth expirou ou não foi
      // restaurado (ex: usuário veio da sessão localStorage), faz re-login silencioso.
      if (_auth && !_auth.currentUser && window.CURRENT_USER && window.CURRENT_USER.username) {
        try {
          var authEmail = _authEmail(window.CURRENT_USER.username);
          // Tenta restaurar sessão via onAuthStateChanged (pode já estar carregando)
          await new Promise(function (resolve) {
            var unsub = _auth.onAuthStateChanged(function (user) {
              unsub();
              resolve(user);
            });
          });
        } catch (authRestoreErr) {
          console.warn('activateSubscription: nao conseguiu restaurar Auth:', authRestoreErr.message);
        }
      }

      // Se managerId vazio, tenta buscar pelo username da sessão
      if (!managerId && window.CURRENT_USER && window.CURRENT_USER.username) {
        try {
          var snap = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', window.CURRENT_USER.username)));
          if (!snap.empty) { managerId = snap.docs[0].id; window.CURRENT_USER.id = managerId; }
        } catch (e) { console.warn('activateSubscription: busca por username falhou', e); }
      }

      var savedToFirestore = false;
      if (managerId) {
        var paymentData = {
          subEndsAt: subEndsAt,
          trialEndsAt: null,
          lastPayment: {
            plan: plan,
            amount: typeof getSelectedAmount === 'function' ? getSelectedAmount() : 0,
            paymentId: String(paymentResult.id || ''),
            status: paymentResult.status || 'approved',
            date: now
          }
        };

        // ── Tentativa 1: Firestore direto (requer Auth ativo) ────────────────
        try {
          await _updateDoc(_doc(_db, 'managers', managerId), paymentData);
          savedToFirestore = true;
          console.log('activateSubscription OK: managerId=', managerId, 'subEndsAt=', new Date(subEndsAt).toLocaleDateString('pt-BR'));
        } catch (fsErr) {
          console.error('activateSubscription FIRESTORE FALHOU:', fsErr.code, fsErr.message);

          // ── Tentativa 2: Backend /activate com Admin SDK (não depende de Auth do cliente) ──
          try {
            var fbResp = await fetch(MP_BACKEND_URL + '/activate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                managerId: managerId,
                plan: plan,
                subEndsAt: subEndsAt,
                paymentId: String(paymentResult.id || ''),
                username: (window.CURRENT_USER || {}).username || ''
              })
            });
            if (fbResp.ok) {
              savedToFirestore = true;
              console.log('activateSubscription: salvo via backend /activate');
            } else {
              var fbBody = await fbResp.text().catch(function () { return ''; });
              console.error('activateSubscription backend /activate retornou erro:', fbResp.status, fbBody);
            }
          } catch (bErr) {
            console.error('activateSubscription backend fallback falhou:', bErr.message);
          }
        }
      } else {
        console.error('activateSubscription: managerId nao encontrado — assinatura NAO salva no Firestore!');
      }

      // Atualiza sessão local para acesso imediato sem depender do Firestore
      if (window.CURRENT_USER) {
        window.CURRENT_USER.subEndsAt = subEndsAt;
        window.CURRENT_USER.trialEndsAt = null;
        window.CURRENT_USER.subStatus = { ok: true, type: 'active', daysLeft: plan === 'annual' ? 365 : 30 };
        try { localStorage.setItem('forge_gestor_session', JSON.stringify(window.CURRENT_USER)); } catch (e) { }
      }

      if (!savedToFirestore) {
        // Avisa o usuário que o acesso está ativo agora mas pode ser perdido
        console.warn('activateSubscription: sessao local OK mas Firestore nao salvo. Usuario perdera acesso apos logout.');
        toast('⚠️ Assinatura ativa nesta sessão, mas houve um problema ao salvar. Contate o suporte se o acesso sumir após relogar.');
      }
      return savedToFirestore;
    }

    // ── Entra no painel apos pagamento ───────────────────────────────────────────
    window.enterAfterPayment = function () {
      document.getElementById('screen-sub-wall').style.display = 'none';
      window.showDashboardAfterLogin(window.CURRENT_USER);
    };

    // ── Alterna entre steps do formulario ────────────────────────────────────────
    function subShowStep(step) {
      ['plan', 'card', 'processing', 'success'].forEach(function (s) {
        var el = document.getElementById('sub-step-' + s);
        if (el) el.style.display = (s === step) ? 'block' : 'none';
      });
    }

    // ── Mascara CPF ───────────────────────────────────────────────────────────────
    window.maskCPF = function (input) {
      var v = input.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
      else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2');
      input.value = v;
    };

    window.checkPaymentReturn = async function () {
      var params = new URLSearchParams(window.location.search);
      var paymentId = params.get('payment_id');
      var status = params.get('status');
      if (paymentId && status === 'approved' && window.CURRENT_USER) {
        await activateSubscription(window.CURRENT_USER.id, 'monthly', { id: paymentId, status: 'approved' });
        history.replaceState({}, '', window.location.pathname);
        toast('Pagamento confirmado! Bem-vindo ao Trainly.');
      }
    };

    // ════════════════════════════════════════════════════════════
    // CEO PANEL
    // ════════════════════════════════════════════════════════════
    window._ceoAllManagers = [];

    window.showCeoPanel = function () {
      // CEO também usa o dashboard normal, com aba extra de controle
      var u = window.CURRENT_USER || {};
      // Força como isMaster para ter acesso a gestores
      window.CURRENT_USER.isMaster = true;
      // Mostra o dashboard completo
      window.showDashboardAfterLogin(window.CURRENT_USER);
      // Após carregar, abre a aba CEO
      setTimeout(function () {
        var ceoTab = document.querySelector('[data-tab="tab-ceo"]');
        if (ceoTab) switchTab('tab-ceo', ceoTab);
        loadCrefPending();
        loadCeoPaymentHistory();
      }, 300);
    };

    window.loadCeoManagers = async function () {
      var tbody = document.getElementById('ceo-managers-tbody');
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><div class="spinner" style="margin:20px auto;"></div></td></tr>';
      try {
        var snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
        window._ceoAllManagers = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        renderCeoTable(window._ceoAllManagers);
        loadCeoPaymentHistory();
        // Update stats
        var total = window._ceoAllManagers.length;
        var now = Date.now();
        var active = 0, trial = 0, expired = 0;
        window._ceoAllManagers.forEach(function (m) {
          if (m.role === 'ceo') return;
          var sub = _checkSubscription(m);
          if (sub.type === 'active') active++;
          else if (sub.type === 'trial') trial++;
          else expired++;
        });
        document.getElementById('ceo-stat-total').textContent = total;
        document.getElementById('ceo-stat-active').textContent = active;
        document.getElementById('ceo-stat-trial').textContent = trial;
        document.getElementById('ceo-stat-expired').textContent = expired;
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:var(--red);padding:20px;">Erro: ' + e.message + '</td></tr>';
      }
    };

    window.renderCeoTable = function (list) {
      var tbody = document.getElementById('ceo-managers-tbody');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text3);padding:32px;">Nenhum gestor cadastrado.</td></tr>';
        return;
      }
      var now = Date.now();
      tbody.innerHTML = list.map(function (m) {
        var sub = (m.role !== 'ceo') ? _checkSubscription(m) : null;
        var subBadge = !sub ? '<span class="sub-status-badge sub-active">⭐ CEO</span>'
          : sub.type === 'trial' ? '<span class="sub-status-badge sub-trial"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Teste (' + sub.daysLeft + 'd)</span>'
            : sub.type === 'active' ? '<span class="sub-status-badge sub-active">✓ Ativo (' + sub.daysLeft + 'd)</span>'
              : '<span class="sub-status-badge sub-expired">✕ Expirado</span>';
        if (m.blocked) subBadge = '<span class="sub-status-badge sub-blocked"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Bloqueado</span>';

        var roleBadge = m.role === 'ceo' ? '<span class="role-badge role-ceo">CEO</span>'
          : m.role === 'master' ? '<span class="role-badge role-master">Master</span>'
            : '<span class="role-badge role-comum">Comum</span>';

        var expDate = m.subEndsAt ? new Date(m.subEndsAt).toLocaleDateString('pt-BR')
          : m.trialEndsAt ? new Date(m.trialEndsAt).toLocaleDateString('pt-BR') + ' (trial)'
            : '—';

        var safeJson = JSON.stringify(m).replace(/'/g, '&#39;').replace(/"/g, '&quot;');

        return '<tr>'
          + '<td><div style="font-weight:700;font-size:.88rem;">' + escHtml(m.name || m.username) + '</div>'
          + '<div style="font-size:.72rem;color:var(--text3);">@' + escHtml(m.username) + '</div></td>'
          + '<td>' + roleBadge + '</td>'
          + '<td>' + subBadge + '</td>'
          + '<td style="font-size:.8rem;">' + expDate + '</td>'
          + '<td><div class="ceo-actions-cell">'
          + '<button class="btn btn-ghost btn-sm" onclick="openCeoEdit(\'' + m.id + '\')">✏️ Editar</button>'
          + '</div></td>'
          + '</tr>';
      }).join('');
    };

    window.filterCeoManagers = function () {
      var q = (document.getElementById('ceo-search').value || '').toLowerCase();
      var filtered = !q ? window._ceoAllManagers
        : window._ceoAllManagers.filter(function (m) {
          return (m.name || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
        });
      renderCeoTable(filtered);
    };

    window._ceoEditId = null;

    window.openCeoEdit = function (id) {
      var m = window._ceoAllManagers.find(function (x) { return x.id === id; });
      if (!m) return;
      window._ceoEditId = id;

      document.getElementById('ceo-edit-avatar').textContent = (m.name || m.username || '?').slice(0, 2).toUpperCase();
      document.getElementById('ceo-edit-name').textContent = m.name || m.username;
      document.getElementById('ceo-edit-username').textContent = '@' + m.username;
      document.getElementById('ceo-edit-role').value = m.role || 'comum';
      document.getElementById('ceo-edit-blocked').checked = !!m.blocked;
      document.getElementById('ceo-edit-sub-type').value = 'trial7';
      document.getElementById('ceo-edit-error').textContent = '';

      // Status badge
      var sub = (m.role !== 'ceo') ? _checkSubscription(m) : null;
      var badge = document.getElementById('ceo-edit-status-badge');
      if (!sub) badge.innerHTML = '<span class="sub-status-badge sub-active">CEO</span>';
      else if (sub.type === 'trial') badge.innerHTML = '<span class="sub-status-badge sub-trial">Teste · ' + sub.daysLeft + 'd</span>';
      else if (sub.type === 'active') badge.innerHTML = '<span class="sub-status-badge sub-active">Ativo · ' + sub.daysLeft + 'd</span>';
      else badge.innerHTML = '<span class="sub-status-badge sub-expired">Expirado</span>';

      updateCeoSubUI();
      openModal('modal-ceo-edit');
    };

    window.updateCeoSubUI = function () {
      var type = document.getElementById('ceo-edit-sub-type').value;
      document.getElementById('ceo-custom-days-wrap').style.display = type === 'custom' ? 'block' : 'none';
      document.getElementById('ceo-edit-date-wrap').style.display = type === 'setdate' ? 'block' : 'none';
      document.getElementById('ceo-tester-days-wrap').style.display = type === 'tester' ? 'block' : 'none';
    };

    window.ceoSaveManagerEdits = async function () {
      var btn = document.getElementById('btn-ceo-save');
      var errEl = document.getElementById('ceo-edit-error');
      errEl.textContent = '';
      btn.classList.add('btn-loading'); btn.textContent = 'Salvando...';

      try {
        var id = window._ceoEditId;
        var role = document.getElementById('ceo-edit-role').value;
        var blocked = document.getElementById('ceo-edit-blocked').checked;
        var subType = document.getElementById('ceo-edit-sub-type').value;
        var now = Date.now();

        var upd = {
          role: role,
          isMaster: role === 'master' || role === 'ceo',
          blocked: blocked
        };

        // Subscription action
        if (subType === 'trial7') {
          upd.trialEndsAt = now + 7 * 24 * 60 * 60 * 1000;
          upd.subEndsAt = null;
        } else if (subType === 'custom') {
          var days = parseInt(document.getElementById('ceo-edit-days').value) || 0;
          if (!days) { errEl.textContent = 'Informe o número de dias.'; return; }
          upd.trialEndsAt = null;
          upd.subEndsAt = now + days * 24 * 60 * 60 * 1000;
        } else if (subType === 'monthly') {
          var m = window._ceoAllManagers.find(function (x) { return x.id === id; }) || {};
          var base = (m.subEndsAt && m.subEndsAt > now) ? m.subEndsAt : now;
          upd.subEndsAt = base + 30 * 24 * 60 * 60 * 1000;
          upd.trialEndsAt = null;
        } else if (subType === 'setdate') {
          var dateVal = document.getElementById('ceo-edit-date').value;
          if (!dateVal) { errEl.textContent = 'Selecione uma data.'; return; }
          upd.subEndsAt = new Date(dateVal).getTime();
          upd.trialEndsAt = null;
        } else if (subType === 'expire') {
          upd.subEndsAt = now - 1000;
          upd.trialEndsAt = null;
        } else if (subType === 'tester') {
          var testerDays = parseInt(document.getElementById('ceo-edit-tester-days').value) || 0;
          if (!testerDays) { errEl.textContent = 'Informe o número de dias como testador.'; btn.classList.remove('btn-loading'); btn.textContent = 'Salvar'; return; }
          upd.isTester = true;
          upd.testerEndsAt = now + testerDays * 24 * 60 * 60 * 1000;
          upd.testerModalSeen = false;
          upd.subEndsAt = now + testerDays * 24 * 60 * 60 * 1000;
          upd.trialEndsAt = null;
        }

        // Verifica se o gestor está sendo bloqueado agora
        var mgrBefore = (window._ceoAllManagers || []).find(function (x) { return x.id === id; }) || {};
        var wasBlocked = !!mgrBefore.blocked;
        var isNowBlocked = !!blocked;

        await _updateDoc(_doc(_db, 'managers', id), upd);

        // Se acabou de ser bloqueado, notifica os alunos e revoga bônus de indicação
        if (!wasBlocked && isNowBlocked) {
          var mgrUsername = mgrBefore.username || '';
          if (mgrUsername) {
            await window._notifyStudentsOfSuspension(mgrUsername);
          }
          await _revokeReferralBonus(id);
        }

        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Gestor atualizado!');
        closeModal('modal-ceo-edit');
        loadCeoManagers();
      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Salvar';
      }
    };

    window.ceoDeleteManager = async function () {
      var id = window._ceoEditId;
      var m = window._ceoAllManagers.find(function (x) { return x.id === id; });
      if (!m) return;
      if (!confirm('Excluir o gestor @' + m.username + '? Isso não remove os alunos vinculados.')) return;
      try {
        await _deleteDoc(_doc(_db, 'managers', id));
        toast('Gestor excluído.');
        closeModal('modal-ceo-edit');
        loadCeoManagers();
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
    };

    window.openCeoAddManager = function () {
      ['ceo-new-user', 'ceo-new-pass', 'ceo-new-name', 'ceo-new-phone'].forEach(function (id) {
        document.getElementById(id).value = '';
      });
      document.getElementById('ceo-new-role').value = 'comum';
      document.getElementById('ceo-add-error').textContent = '';
      openModal('modal-ceo-add');
    };

    window.ceoCreateManager = async function () {
      var btn = document.getElementById('btn-ceo-add');
      var errEl = document.getElementById('ceo-add-error');
      errEl.textContent = '';
      var username = document.getElementById('ceo-new-user').value.trim().toLowerCase();
      var pass = document.getElementById('ceo-new-pass').value;
      var name = document.getElementById('ceo-new-name').value.trim();
      var phone = document.getElementById('ceo-new-phone').value.trim();
      var role = document.getElementById('ceo-new-role').value;

      if (!username) { errEl.textContent = 'Usuário obrigatório.'; return; }
      if (!pass || pass.length < 6) { errEl.textContent = 'Senha mínimo 6 caracteres.'; return; }

      btn.classList.add('btn-loading'); btn.textContent = 'Cadastrando...';
      try {
        var exists = await _getDocs(_query(_col(_db, 'managers'), _where('username', '==', username)));
        if (!exists.empty) { errEl.textContent = 'Usuário já existe.'; return; }

        var passHash = await _sha256(pass);
        var trialEndsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
        await _setDoc(_doc(_db, 'managers', 'mgr_' + Date.now()), {
          username, passwordHash: passHash, name, phone,
          role, isMaster: role === 'master' || role === 'ceo',
          trialEndsAt, subEndsAt: null, blocked: false,
          createdAt: Date.now()
        });
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Gestor cadastrado com 7 dias de teste!');
        closeModal('modal-ceo-add');
        loadCeoManagers();
      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Cadastrar';
      }
    };

    // ── Testador: fechar modal de boas-vindas ──
    window.closeTesterWelcome = function () {
      closeModal('modal-tester-welcome');
    };

    // ── Report: categoria changed ──
    window.reportCategoryChange = function () {
      document.getElementById('report-error').textContent = '';
    };

    // ── Report: enviar ──
    window.submitReport = async function () {
      var btn = document.getElementById('btn-submit-report');
      var errEl = document.getElementById('report-error');
      errEl.textContent = '';
      var category = document.getElementById('report-category').value;
      var description = document.getElementById('report-description').value.trim();
      if (!category) { errEl.textContent = 'Selecione uma categoria.'; return; }
      if (!description || description.length < 10) { errEl.textContent = 'Descreva o problema com pelo menos 10 caracteres.'; return; }
      var u = window.CURRENT_USER || {};
      btn.disabled = true; btn.textContent = 'Enviando...';
      try {
        var categoryLabels = {
          crash: 'App travou / fechou sozinho', load: 'Conteúdo não carregou',
          login: 'Problema no login / acesso', aluno: 'Erro relacionado a alunos',
          treino: 'Erro nos treinos ou planos', evolucao: 'Evolução / avaliação com problema',
          chat: 'Chat com defeito', pagamento: 'Problema com pagamento / assinatura',
          visual: 'Elemento visual quebrado / desalinhado', lentidao: 'App lento ou travando',
          notificacao: 'Notificação não chegou', sugestao: 'Sugestão de melhoria', outro: 'Outro'
        };
        await _db.collection('reports').add({
          username: u.username || '?',
          displayName: u.displayName || u.username || '?',
          category: category,
          categoryLabel: categoryLabels[category] || category,
          description: description,
          sentAt: Date.now()
        });
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Report enviado! Obrigado pelo feedback.');
        document.getElementById('report-category').value = '';
        document.getElementById('report-description').value = '';
      } catch (e) {
        errEl.textContent = 'Erro ao enviar: ' + e.message;
      } finally {
        btn.disabled = false; btn.textContent = 'Enviar Report';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg> Enviar Report';
      }
    };

    // ── CEO REPORTS: estado global ──
    window._rptAllDocs = [];
    window._rptResolvedDocs = [];
    window._rptCurrentFilter = 'all';
    window._rptCurrentTab = 'open';

    var _catMeta = {
      crash:       { label: 'Travamento / Crash',          sev: 'critical', color: '#c0392b', bg: 'rgba(192,57,43,.08)', border: 'rgba(192,57,43,.22)', icon: '🔴' },
      load:        { label: 'Conteúdo não carregou',        sev: 'high',     color: '#e67e22', bg: 'rgba(230,126,34,.08)', border: 'rgba(230,126,34,.22)', icon: '🟠' },
      login:       { label: 'Problema no login / acesso',   sev: 'high',     color: '#e67e22', bg: 'rgba(230,126,34,.08)', border: 'rgba(230,126,34,.22)', icon: '🟠' },
      pagamento:   { label: 'Pagamento / assinatura',       sev: 'high',     color: '#e67e22', bg: 'rgba(230,126,34,.08)', border: 'rgba(230,126,34,.22)', icon: '🟠' },
      aluno:       { label: 'Erro em alunos',               sev: 'medium',   color: '#b7860b', bg: 'rgba(183,134,11,.08)', border: 'rgba(183,134,11,.22)', icon: '🟡' },
      treino:      { label: 'Erro em treinos / planos',     sev: 'medium',   color: '#b7860b', bg: 'rgba(183,134,11,.08)', border: 'rgba(183,134,11,.22)', icon: '🟡' },
      evolucao:    { label: 'Evolução / avaliação',         sev: 'medium',   color: '#b7860b', bg: 'rgba(183,134,11,.08)', border: 'rgba(183,134,11,.22)', icon: '🟡' },
      chat:        { label: 'Chat com defeito',             sev: 'medium',   color: '#b7860b', bg: 'rgba(183,134,11,.08)', border: 'rgba(183,134,11,.22)', icon: '🟡' },
      lentidao:    { label: 'Lentidão / travamento',        sev: 'low',      color: '#2e7d52', bg: 'rgba(46,125,82,.08)',  border: 'rgba(46,125,82,.22)',  icon: '🟢' },
      visual:      { label: 'Visual quebrado',              sev: 'low',      color: '#2e7d52', bg: 'rgba(46,125,82,.08)',  border: 'rgba(46,125,82,.22)',  icon: '🟢' },
      notificacao: { label: 'Notificação não chegou',       sev: 'low',      color: '#2e7d52', bg: 'rgba(46,125,82,.08)',  border: 'rgba(46,125,82,.22)',  icon: '🟢' },
      sugestao:    { label: 'Sugestão de melhoria',         sev: 'info',     color: '#2980b9', bg: 'rgba(41,128,185,.08)', border: 'rgba(41,128,185,.22)', icon: '🔵' },
      outro:       { label: 'Outro',                        sev: 'info',     color: '#2980b9', bg: 'rgba(41,128,185,.08)', border: 'rgba(41,128,185,.22)', icon: '🔵' }
    };
    var _sevLabel = { critical: 'CRÍTICO', high: 'ALTO', medium: 'MÉDIO', low: 'BAIXO', info: 'INFO' };
    var _sevOrder = ['critical','high','medium','low','info'];
    var _sevColors = { critical:'#c0392b', high:'#e67e22', medium:'#b7860b', low:'#2e7d52', info:'#2980b9' };

    function _buildReportCard(r, docId, resolved) {
      var m = _catMeta[r.category] || _catMeta.outro;
      var dt = new Date(r.sentAt);
      var dateStr = dt.toLocaleDateString('pt-BR', {day:'2-digit',month:'short',year:'numeric'});
      var timeStr = dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
      var protocol = 'RPT-' + String(r.sentAt).slice(-6).toUpperCase();
      var initials = (r.displayName || r.username || '?').split(' ').map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();
      var leftBorderColor = resolved ? '#2e7d52' : m.color;

      var footerBtns = resolved
        ? '<div style="font-size:.7rem;color:var(--green);font-weight:700;display:flex;align-items:center;gap:5px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Resolvido em ' + (r.resolvedAt ? new Date(r.resolvedAt).toLocaleDateString('pt-BR') : 'data desconhecida') + '</div>'
          + '<button onclick="reopenReport(\'' + docId + '\',this)" style="display:inline-flex;align-items:center;gap:5px;background:none;border:1px solid var(--border2);border-radius:7px;padding:5px 11px;font-size:.72rem;font-weight:700;color:var(--text3);cursor:pointer;font-family:var(--body);transition:all .15s;" onmouseover="this.style.borderColor=\'var(--accent)\';this.style.color=\'var(--text)\'" onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text3)\'">↩ Reabrir</button>'
        : '<button onclick="resolveOneReport(\'' + docId + '\',this)" style="display:inline-flex;align-items:center;gap:5px;background:rgba(46,125,82,.1);border:1px solid rgba(46,125,82,.3);border-radius:7px;padding:5px 11px;font-size:.72rem;font-weight:800;color:#2e7d52;cursor:pointer;font-family:var(--body);transition:all .15s;" onmouseover="this.style.background=\'rgba(46,125,82,.2)\'" onmouseout="this.style.background=\'rgba(46,125,82,.1)\'">'
          + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Marcar resolvido</button>'
          + '<button onclick="deleteOneReport(\'' + docId + '\',this)" style="display:inline-flex;align-items:center;gap:5px;background:none;border:1px solid var(--border2);border-radius:7px;padding:5px 11px;font-size:.72rem;font-weight:700;color:var(--text3);cursor:pointer;font-family:var(--body);transition:all .15s;" onmouseover="this.style.borderColor=\'var(--red)\';this.style.color=\'var(--red)\'" onmouseout="this.style.borderColor=\'var(--border2)\';this.style.color=\'var(--text3)\'"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>Arquivar</button>';

      return '<div data-sev="' + m.sev + '" data-search="' + ((r.displayName||'') + ' ' + (r.username||'') + ' ' + (r.category||'') + ' ' + (r.description||'')).toLowerCase() + '" style="border:1.5px solid var(--border);border-left:3px solid ' + leftBorderColor + ';border-radius:var(--r2);overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,.05);background:var(--surface);transition:box-shadow .15s;" onmouseover="this.style.boxShadow=\'0 4px 16px rgba(0,0,0,.09)\'" onmouseout="this.style.boxShadow=\'0 1px 6px rgba(0,0,0,.05)\'">'
        // Header strip
        + '<div style="background:var(--surface2);border-bottom:1px solid var(--border);padding:10px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'
          + '<div style="display:flex;align-items:center;gap:10px;">'
            + '<code style="font-size:.68rem;font-weight:700;color:var(--text3);background:var(--surface3);border:1px solid var(--border2);border-radius:5px;padding:2px 8px;">' + protocol + '</code>'
            + '<span style="display:inline-flex;align-items:center;gap:4px;border-radius:5px;padding:2px 9px;font-size:.65rem;font-weight:900;letter-spacing:.06em;text-transform:uppercase;background:' + m.bg + ';border:1px solid ' + m.border + ';color:' + m.color + ';">'
              + '<span style="width:5px;height:5px;border-radius:50%;background:' + m.color + ';flex-shrink:0;"></span>'
              + _sevLabel[m.sev]
            + '</span>'
            + '<span style="display:inline-flex;align-items:center;gap:5px;font-size:.72rem;font-weight:700;color:var(--text2);">' + m.icon + ' ' + m.label + '</span>'
          + '</div>'
          + '<span style="font-size:.7rem;color:var(--text3);font-family:monospace;font-weight:600;">' + dateStr + ' · ' + timeStr + '</span>'
        + '</div>'
        // Body
        + '<div style="padding:14px 16px;">'
          + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
            + '<div style="width:32px;height:32px;border-radius:50%;background:#111110;border:2px solid rgba(245,200,0,.2);display:flex;align-items:center;justify-content:center;font-family:var(--head);font-size:.72rem;font-weight:800;color:#f5c800;flex-shrink:0;">' + initials + '</div>'
            + '<div>'
              + '<div style="font-weight:700;font-size:.85rem;color:var(--text);">' + (r.displayName || r.username || '?') + '</div>'
              + '<div style="font-size:.68rem;color:var(--text3);font-weight:600;">@' + (r.username || '?') + '</div>'
            + '</div>'
          + '</div>'
          + '<div style="background:var(--surface2);border:1px solid var(--border);border-left:3px solid ' + leftBorderColor + ';border-radius:0 8px 8px 0;padding:11px 14px;font-size:.84rem;color:var(--text2);line-height:1.65;white-space:pre-wrap;font-family:var(--body);">'
            + (r.description || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')
          + '</div>'
        + '</div>'
        // Footer
        + '<div style="background:var(--surface2);border-top:1px solid var(--border);padding:9px 16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">'
          + footerBtns
        + '</div>'
      + '</div>';
    }

    function _renderReportList(docs, containerEl, resolved) {
      if (!docs.length) {
        containerEl.innerHTML = '<div style="text-align:center;padding:56px 20px;color:var(--text3);"><svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="opacity:.3;display:block;margin:0 auto 14px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div style="font-weight:700;font-size:.9rem;margin-bottom:6px;">' + (resolved ? 'Nenhum ticket resolvido' : 'Nenhum registro encontrado') + '</div><div style="font-size:.76rem;opacity:.6;">' + (resolved ? 'Tickets marcados como resolvidos aparecerão aqui.' : 'Os relatórios enviados pelos testadores aparecerão aqui.') + '</div></div>';
        return;
      }
      // Group by severity
      var groups = {};
      _sevOrder.forEach(function(s){ groups[s] = []; });
      docs.forEach(function(item){ groups[item.sev] = groups[item.sev] || []; groups[item.sev].push(item); });
      var html = '';
      _sevOrder.forEach(function(s){
        if (!groups[s] || !groups[s].length) return;
        html += '<div style="margin-bottom:20px;">'
          + '<div style="font-size:.65rem;font-weight:900;color:' + _sevColors[s] + ';text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px;display:flex;align-items:center;gap:7px;">'
          + '<span style="width:7px;height:7px;border-radius:50%;background:' + _sevColors[s] + ';flex-shrink:0;"></span>' + _sevLabel[s] + ' <span style="color:var(--text3);font-weight:700;">(' + groups[s].length + ')</span>'
          + '<span style="flex:1;height:1px;background:' + _sevColors[s] + ';opacity:.2;"></span>'
          + '</div>'
          + '<div style="display:flex;flex-direction:column;gap:10px;">';
        groups[s].forEach(function(item){ html += _buildReportCard(item.data, item.id, resolved); });
        html += '</div></div>';
      });
      containerEl.innerHTML = html;
    }

    window.filterReports = function(sev) {
      window._rptCurrentFilter = sev;
      // update filter buttons
      ['all','critical','high','medium','low'].forEach(function(s){
        var btn = document.getElementById('rpt-filter-' + s);
        if (!btn) return;
        if (s === sev) { btn.style.background = 'var(--text)'; btn.style.color = 'var(--bg)'; }
        else { btn.style.background = 'none'; btn.style.color = 'var(--text3)'; }
      });
      var q = (document.getElementById('rpt-search') || {}).value || '';
      q = q.toLowerCase().trim();
      var source = window._rptCurrentTab === 'resolved' ? window._rptResolvedDocs : window._rptAllDocs;
      var filtered = source.filter(function(item){
        var sevMatch = sev === 'all' || item.sev === sev;
        var qMatch = !q || item.searchStr.indexOf(q) >= 0;
        return sevMatch && qMatch;
      });
      var containerEl = document.getElementById(window._rptCurrentTab === 'resolved' ? 'ceo-reports-resolved-list' : 'ceo-reports-list');
      if (containerEl) _renderReportList(filtered, containerEl, window._rptCurrentTab === 'resolved');
    };

    window.switchReportTab = function(tab) {
      window._rptCurrentTab = tab;
      var openList = document.getElementById('ceo-reports-list');
      var resolvedList = document.getElementById('ceo-reports-resolved-list');
      var tabOpen = document.getElementById('rpt-tab-open');
      var tabResolved = document.getElementById('rpt-tab-resolved');
      if (tab === 'open') {
        if (openList) openList.style.display = '';
        if (resolvedList) resolvedList.style.display = 'none';
        if (tabOpen) { tabOpen.style.color = 'var(--text)'; tabOpen.style.borderBottomColor = 'var(--accent)'; }
        if (tabResolved) { tabResolved.style.color = 'var(--text3)'; tabResolved.style.borderBottomColor = 'transparent'; }
      } else {
        if (openList) openList.style.display = 'none';
        if (resolvedList) resolvedList.style.display = '';
        if (tabOpen) { tabOpen.style.color = 'var(--text3)'; tabOpen.style.borderBottomColor = 'transparent'; }
        if (tabResolved) { tabResolved.style.color = 'var(--text)'; tabResolved.style.borderBottomColor = 'var(--accent)'; }
        _renderReportList(window._rptResolvedDocs, resolvedList, true);
      }
      filterReports(window._rptCurrentFilter);
    };

    // ── CEO: carregar reports recebidos ──
    window.loadCeoReports = async function () {
      var listEl = document.getElementById('ceo-reports-list');
      if (!listEl) return;
      listEl.innerHTML = '<div style="text-align:center;padding:48px;color:var(--text3);"><svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" style="opacity:.4;display:block;margin:0 auto 12px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>Carregando registros...</div>';
      try {
        var snap = await _getDocs(_query(_col(_db, 'reports'), _orderBy('sentAt', 'desc')));
        var snapR = await _getDocs(_query(_col(_db, 'reports_resolved'), _orderBy('resolvedAt', 'desc')));

        // Build open docs list
        window._rptAllDocs = [];
        snap.docs.forEach(function(doc) {
          var r = doc.data();
          var m = _catMeta[r.category] || _catMeta.outro;
          window._rptAllDocs.push({ id: doc.id, data: r, sev: m.sev, searchStr: ((r.displayName||'')+ ' '+(r.username||'')+' '+(r.category||'')+' '+(r.description||'')).toLowerCase() });
        });

        // Build resolved docs list
        window._rptResolvedDocs = [];
        snapR.docs.forEach(function(doc) {
          var r = doc.data();
          var m = _catMeta[r.category] || _catMeta.outro;
          window._rptResolvedDocs.push({ id: doc.id, data: r, sev: m.sev, searchStr: ((r.displayName||'')+ ' '+(r.username||'')+' '+(r.category||'')+' '+(r.description||'')).toLowerCase() });
        });

        // Atualiza badge do menu
        var badge = document.getElementById('ceo-reports-badge');
        if (badge) { badge.textContent = snap.size; badge.classList.toggle('hidden', snap.size === 0); }

        // KPIs
        var tc = document.getElementById('rpt-total-count'); if (tc) tc.textContent = snap.size;
        var rc = document.getElementById('rpt-resolved-count'); if (rc) rc.textContent = snapR.size;
        var critCount = window._rptAllDocs.filter(function(d){ return d.sev === 'critical'; }).length;
        var cc = document.getElementById('rpt-critical-count'); if (cc) cc.textContent = critCount;
        var ld = document.getElementById('rpt-last-date');
        if (ld) {
          if (snap.size > 0 && snap.docs[0].data().sentAt) {
            var fd = new Date(snap.docs[0].data().sentAt);
            ld.textContent = fd.toLocaleDateString('pt-BR', {day:'2-digit',month:'short'}) + ' ' + fd.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
          } else { ld.textContent = '—'; }
        }

        // Severity summary pills
        var _sevBg  = { critical:'rgba(192,57,43,.10)',  high:'rgba(230,126,34,.10)', medium:'rgba(183,134,11,.10)', low:'rgba(46,125,82,.10)',  info:'rgba(41,128,185,.10)' };
        var _sevBdr = { critical:'rgba(192,57,43,.28)',  high:'rgba(230,126,34,.28)', medium:'rgba(183,134,11,.28)', low:'rgba(46,125,82,.28)',  info:'rgba(41,128,185,.28)' };
        var sevCount = {};
        window._rptAllDocs.forEach(function(item){ sevCount[item.sev] = (sevCount[item.sev]||0)+1; });
        var summaryHtml = '';
        _sevOrder.forEach(function(s) {
          if (!sevCount[s]) return;
          summaryHtml += '<span style="display:inline-flex;align-items:center;gap:4px;background:' + _sevBg[s] + ';border:1px solid ' + _sevBdr[s] + ';border-radius:5px;padding:2px 8px;font-size:.67rem;font-weight:800;color:' + _sevColors[s] + ';">'
            + '<span style="width:5px;height:5px;border-radius:50%;background:' + _sevColors[s] + ';flex-shrink:0;"></span>'
            + _sevLabel[s] + ' <span style="opacity:.7;font-weight:700;">×' + sevCount[s] + '</span></span>';
        });
        var ss = document.getElementById('rpt-severity-summary'); if (ss) ss.innerHTML = summaryHtml || '<span style="font-size:.72rem;color:var(--text3);">Sem registros abertos</span>';

        // Badges
        var ob = document.getElementById('rpt-open-count-badge'); if (ob) ob.textContent = snap.size;
        var rb = document.getElementById('rpt-resolved-count-badge'); if (rb) rb.textContent = snapR.size;

        // Render
        filterReports(window._rptCurrentFilter || 'all');

      } catch (e) {
        var listEl2 = document.getElementById('ceo-reports-list');
        if (listEl2) listEl2.innerHTML = '<div style="color:var(--red);padding:20px;font-size:.84rem;font-weight:600;">Erro ao carregar registros: ' + e.message + '</div>';
      }
    };

    // ── CEO: marcar como resolvido ──
    window.resolveOneReport = async function(docId, btn) {
      if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Resolvendo...'; }
      try {
        var docRef = _doc(_db, 'reports', docId);
        var snap = await _getDocs(_query(_col(_db, 'reports')));
        var found = snap.docs.find(function(d){ return d.id === docId; });
        if (found) {
          var data = found.data();
          data.resolvedAt = Date.now();
          await _db.collection('reports_resolved').doc(docId).set(data);
          await _deleteDoc(docRef);
        }
        toast('✅ Ticket marcado como resolvido!', 'success');
        loadCeoReports();
      } catch(e) { toast('Erro: ' + e.message, 'error'); if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>Marcar resolvido'; } }
    };

    // ── CEO: reabrir ticket resolvido ──
    window.reopenReport = async function(docId, btn) {
      if (btn) { btn.disabled = true; btn.textContent = 'Reabrindo...'; }
      try {
        var snap = await _getDocs(_col(_db, 'reports_resolved'));
        var found = snap.docs.find(function(d){ return d.id === docId; });
        if (found) {
          var data = found.data();
          delete data.resolvedAt;
          await _db.collection('reports').doc(docId).set(data);
          await _db.collection('reports_resolved').doc(docId).delete();
        }
        toast('Ticket reaberto.', 'success');
        switchReportTab('open');
        loadCeoReports();
      } catch(e) { toast('Erro: ' + e.message, 'error'); if(btn){ btn.disabled=false; btn.textContent='↩ Reabrir'; } }
    };

    // ── CEO: exportar para Excel (CSV) ──
    window.exportReportsToExcel = function() {
      var all = window._rptAllDocs.concat(window._rptResolvedDocs);
      if (!all.length) { toast('Nenhum registro para exportar.', 'error'); return; }
      // Sort by severity order then date
      var sevRank = { critical:0, high:1, medium:2, low:3, info:4 };
      all.sort(function(a,b){ return (sevRank[a.sev]||9) - (sevRank[b.sev]||9) || b.data.sentAt - a.data.sentAt; });
      var rows = [['Protocolo','Severidade','Categoria','Testador','Username','Data','Hora','Descrição','Status']];
      all.forEach(function(item){
        var r = item.data;
        var m = _catMeta[r.category] || _catMeta.outro;
        var dt = new Date(r.sentAt);
        var protocol = 'RPT-' + String(r.sentAt).slice(-6).toUpperCase();
        var resolved = !!r.resolvedAt;
        rows.push([
          protocol,
          _sevLabel[m.sev] || m.sev,
          m.label,
          r.displayName || r.username || '?',
          '@' + (r.username || '?'),
          dt.toLocaleDateString('pt-BR'),
          dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'}),
          (r.description || '').replace(/\n/g,' '),
          resolved ? 'RESOLVIDO' : 'ABERTO'
        ]);
      });
      var csv = rows.map(function(row){ return row.map(function(c){ return '"' + String(c).replace(/"/g,'""') + '"'; }).join(';'); }).join('\n');
      var bom = '\uFEFF';
      var blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var now = new Date();
      a.download = 'trainly_incidentes_' + now.toISOString().slice(0,10) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast('📊 Excel exportado com ' + (rows.length - 1) + ' registros!', 'success');
    };

    // ── CEO: limpar todos os reports ──
    window.clearAllReports = async function () {
      if (!confirm('Arquivar todos os reports recebidos? Esta ação não pode ser desfeita.')) return;
      try {
        var snap = await _getDocs(_col(_db, 'reports'));
        var batch = _db.batch ? _db.batch() : null;
        if (batch) {
          snap.docs.forEach(function (d) { batch.delete(d.ref); });
          await batch.commit();
        } else {
          for (var d of snap.docs) { await _deleteDoc(d.ref); }
        }
        toast('Reports apagados.');
        loadCeoReports();
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
    };

    // ── CEO: arquivar um report individual ──
    window.deleteOneReport = async function (docId, btn) {
      if (!confirm('Arquivar este registro? A ação não pode ser desfeita.')) return;
      if (btn) { btn.disabled = true; btn.textContent = 'Arquivando...'; }
      try {
        await _deleteDoc(_doc(_db, 'reports', docId));
        loadCeoReports();
      } catch (e) { toast('Erro: ' + e.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Arquivar'; } }
    };

    // ── Carregar reports ao entrar na aba CEO Reports ──
    (function () {
      var origSwitch = window.switchTab;
      window.switchTab = function (tabId, el) {
        origSwitch(tabId, el);
        if (tabId === 'tab-ceo-reports') loadCeoReports();
      };
    })();

    // ── Pricing ──
    window.loadPricing = async function () {
      try {
        var snap = await _db.collection('settings').doc('pricing').get();
        if (snap.exists) {
          var d = snap.data();
          document.getElementById('price-monthly').value = d.monthly || '';
          document.getElementById('price-discount').value = d.discount || '';
          updatePricingPreview();
        }
      } catch (e) { console.warn('loadPricing error:', e); }
    };

    window.updatePricingPreview = function () {
      var monthly = parseFloat(document.getElementById('price-monthly').value) || 0;
      var discount = parseFloat(document.getElementById('price-discount').value) || 0;
      var preview = document.getElementById('pricing-preview');
      if (!monthly) { preview.textContent = 'Preencha o preço mensal.'; return; }
      var annual = monthly * 12 * (1 - discount / 100);
      var annualMonthly = annual / 12;
      var saving = monthly * 12 - annual;
      preview.innerHTML =
        '<strong>Plano Mensal:</strong> R$ ' + monthly.toFixed(2).replace('.', ',') + '/mês<br>'
        + '<strong>Plano Anual:</strong> R$ ' + annualMonthly.toFixed(2).replace('.', ',')
        + '/mês · R$ ' + annual.toFixed(2).replace('.', ',') + ' total<br>'
        + '<strong>Economia anual:</strong> R$ ' + saving.toFixed(2).replace('.', ',') + ' (-' + discount + '%)<br>'
        + '<span style="font-size:.72rem;color:var(--text3);">O aluno vê: "Plano anual: economize R$ ' + saving.toFixed(2).replace('.', ',') + ' por ano"</span>';
    };

    window.savePricing = async function () {
      var monthly = parseFloat(document.getElementById('price-monthly').value);
      var discount = parseFloat(document.getElementById('price-discount').value);
      if (!monthly || !discount) { toast('Preencha todos os campos.', 'error'); return; }
      try {
        await _db.collection('settings').doc('pricing').set({ monthly, discount });
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Preços salvos!');
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
    };


    // ══════════════════════════════════════════════════════════
    // SISTEMA DE CONVITE — tudo aqui, _db já está disponível
    // ══════════════════════════════════════════════════════════

    var _TERMS_USO = `
<h2>1. Sobre a Plataforma</h2>
<p>A <strong>Trainly</strong> é uma plataforma digital voltada à gestão de treinos, alunos e comunicação entre profissionais e seus clientes, permitindo a criação, organização e acompanhamento de rotinas de treino.</p>
<p>A plataforma atua exclusivamente como <strong>ferramenta tecnológica</strong>, não realizando prescrição direta de exercícios físicos.</p>
<h2>2. Aceitação dos Termos</h2>
<p>Ao se cadastrar e utilizar a plataforma, o usuário declara que leu, compreendeu e concorda integralmente com estes Termos de Uso.</p>
<h2>3. Cadastro e Elegibilidade</h2>
<p>Para utilizar a Trainly, o usuário deve ter no mínimo 18 anos, fornecer informações verdadeiras e ser responsável pela confidencialidade de sua conta e senha.</p>
<h2>4. Uso Profissional e Registro no CREF</h2>
<p>Ao se cadastrar como gestor, o usuário declara que é profissional de educação física devidamente qualificado, possui registro ativo no CREF e é o único responsável pelas prescrições de treino fornecidas.</p>
<h2>5. Responsabilidade sobre Treinos</h2>
<p>A Trainly <strong>não se responsabiliza</strong> por lesões, danos físicos ou problemas de saúde decorrentes da execução de treinos, resultados obtidos pelos alunos, ou prescrições inadequadas. Toda orientação é de <strong>responsabilidade exclusiva do gestor</strong>.</p>
<h2>6. Uso da Plataforma</h2>
<p>O usuário concorda em utilizar a plataforma de forma legal e ética, não compartilhar sua conta com terceiros e não utilizar o sistema para fins ilícitos.</p>
<h2>7. Planos, Pagamentos e Assinaturas</h2>
<p>Ao contratar um plano, o usuário concorda que os valores podem ser alterados com aviso prévio, a cobrança poderá ser recorrente e o acesso poderá ser suspenso em caso de inadimplência.</p>
<h2>8. Período de Teste (Trial)</h2>
<p>A Trainly poderá oferecer período de teste gratuito por tempo limitado. Após o término, será necessário contratar um plano pago para continuar utilizando os serviços.</p>
<h2>9. Cancelamento</h2>
<p>O usuário pode solicitar cancelamento a qualquer momento. A Trainly se reserva o direito de suspender contas que violem estes termos.</p>
<h2>10. Dados e Privacidade (LGPD)</h2>
<p>Ao utilizar a plataforma, o usuário autoriza a coleta e tratamento de dados conforme a Política de Privacidade. Os dados são armazenados em serviços de terceiros como Firebase.</p>
<h2>11. Propriedade Intelectual</h2>
<p>Todos os direitos sobre a plataforma pertencem à Trainly, sendo proibida a cópia ou reprodução sem autorização.</p>
<h2>12. Legislação Aplicável</h2>
<p>Estes Termos são regidos pelas leis da República Federativa do Brasil.</p>
`;

    var _TERMS_PRIVACIDADE = `
<h2>1. Introdução</h2>
<p>Esta Política informa como a <strong>Trainly</strong> coleta, utiliza, armazena e protege os dados pessoais dos usuários da plataforma.</p>
<h2>2. Dados Coletados</h2>
<p>Coletamos dados fornecidos pelo usuário (nome, telefone, e-mail, senha criptografada), dados de alunos cadastrados pelo gestor, dados de uso da plataforma e dados de pagamento. <strong>Dados sensíveis de cartão não são armazenados pela Trainly.</strong></p>
<h2>3. Base Legal (LGPD)</h2>
<p>O tratamento ocorre com base na execução de contrato, consentimento do usuário, cumprimento de obrigações legais e legítimo interesse para melhoria dos serviços.</p>
<h2>4. Finalidade do Uso</h2>
<p>Os dados são utilizados para funcionamento da plataforma, cadastro de usuários, processamento de pagamentos, comunicação e melhoria dos serviços.</p>
<h2>5. Compartilhamento</h2>
<p>Dados podem ser compartilhados com prestadores de serviço essenciais (Firebase, Mercado Pago) e autoridades legais quando exigido. <strong>A Trainly não comercializa dados pessoais.</strong></p>
<h2>6. Segurança</h2>
<p>Adotamos controle de acesso, autenticação, monitoramento e criptografia. Nenhum sistema é completamente seguro.</p>
<h2>7. Direitos do Titular (LGPD)</h2>
<p>O usuário pode acessar, corrigir, anonimizar, bloquear ou solicitar exclusão de seus dados, além de revogar consentimento a qualquer momento.</p>
<h2>8. Responsabilidade dos Gestores</h2>
<p>Os gestores são responsáveis pelos dados de seus alunos inseridos na plataforma e devem garantir o consentimento adequado.</p>
<h2>9. Alterações</h2>
<p>Esta política pode ser atualizada a qualquer momento. O uso contínuo implica aceitação das alterações.</p>
<h2>10. Contato</h2>
<p>Para dúvidas ou solicitações sobre privacidade, entre em contato pelos canais oficiais da plataforma.</p>
`;

    window.openTermsModal = function (tipo) {
      var modal = document.getElementById('modal-terms');
      var title = document.getElementById('terms-modal-title');
      var body = document.getElementById('terms-modal-body');
      title.textContent = tipo === 'uso' ? 'Termos de Uso' : 'Política de Privacidade';
      body.innerHTML = tipo === 'uso' ? _TERMS_USO : _TERMS_PRIVACIDADE;
      modal.classList.add('on');
      body.scrollTop = 0;
    };

    window.closeTermsModal = function () {
      document.getElementById('modal-terms').classList.remove('on');
    };

    // ════════════════════════════════════════════════════════
    // SISTEMA DE INDICAÇÃO (REFERRAL) — todos os gestores
    // ════════════════════════════════════════════════════════

    // Abre modal de indicação
    window.openReferralModal = async function () {
      var u = window.CURRENT_USER || {};
      var refCode = u.referralCode || '';

      if (!refCode) {
        toast('Erro ao carregar seu código. Tente fazer login novamente.', 'error');
        return;
      }

      var link = window.location.origin + window.location.pathname + '?ref=' + refCode;
      var codeEl = document.getElementById('referral-code-display');
      if (codeEl) codeEl.textContent = refCode;
      document.getElementById('referral-link-input').value = link;

      // Carrega estatísticas de indicações
      // Busca tanto por referralCode (fluxo ?ref=) quanto por username (fluxo ?invite=)
      try {
        var u = window.CURRENT_USER || {};
        var snapByCode = await _db.collection('managers').where('referredBy', '==', refCode).get();
        var snapByUser = await _db.collection('managers').where('referredBy', '==', u.username || '').get();
        // Une os IDs sem duplicar
        var ids = new Set();
        snapByCode.docs.forEach(function(d) { ids.add(d.id); });
        snapByUser.docs.forEach(function(d) { ids.add(d.id); });
        var count = ids.size;
        document.getElementById('ref-stat-sent').textContent = count;
        document.getElementById('ref-stat-days').textContent = (count * 7) + ' dias';
      } catch (e) {
        document.getElementById('ref-stat-sent').textContent = '—';
        document.getElementById('ref-stat-days').textContent = '—';
      }
      openModal('modal-referral');
    };

    window.copyReferralCode = function () {
      var code = (document.getElementById('referral-code-display') || {}).textContent || '';
      navigator.clipboard.writeText(code)
        .then(function () { toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Código copiado!'); })
        .catch(function () { toast('Código: ' + code); });
    };

    window.copyReferralLink = function () {
      var input = document.getElementById('referral-link-input');
      navigator.clipboard.writeText(input.value)
        .then(function () { toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Link de indicação copiado!'); })
        .catch(function () { input.select(); document.execCommand('copy'); toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!'); });
    };

    window.shareReferralWhatsApp = function () {
      var link = document.getElementById('referral-link-input').value;
      var text = 'Oi! Estou usando o Trainly para gerenciar meus alunos e recomendo muito. Se você é personal trainer ou professor de educação física, se cadastra pelo meu link: ' + link;
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    };

    // Gera link de convite — mantido para compatibilidade com aba Gestores (master/ceo)
    window.inviteGenLink = async function () {
      var u = window.CURRENT_USER || {};
      if (!u.isMaster && u.role !== 'master' && u.role !== 'ceo') {
        toast('Apenas o master pode gerar convites de gestor.', 'error'); return;
      }
      var btn = document.getElementById('btn-inv-link');
      btn.textContent = 'Gerando...'; btn.disabled = true;
      try {
        var arr = new Uint8Array(24); crypto.getRandomValues(arr);
        var token = Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        await _db.collection('invites').doc('inv_' + Date.now()).set({
          token, createdBy: u.username || '', createdAt: Date.now(),
          expiresAt: Date.now() + 48 * 60 * 60 * 1000, used: false, usedBy: null, usedAt: null
        });
        var link = window.location.origin + window.location.pathname + '?invite=' + token;
        document.getElementById('inv-link-box').style.display = 'block';
        document.getElementById('inv-link-input').value = link;
        toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Link gerado!');
      } catch (e) { toast('Erro: ' + e.message, 'error'); }
      finally { btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> Link de convite'; btn.disabled = false; }
    };

    window.inviteCopyLink = function () {
      var input = document.getElementById('inv-link-input');
      navigator.clipboard.writeText(input.value)
        .then(function () { toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!'); })
        .catch(function () { input.select(); document.execCommand('copy'); toast('<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><polyline points="20 6 9 17 4 12"/></svg> Link copiado!'); });
    };

    // ── Recompensa de +7 dias para quem indicou ──────────────────────────────────
    async function _applyReferralBonus(referredByCode) {
      if (!referredByCode) return;
      try {
        // Busca pelo referralCode aleatório (não pelo username)
        var snap = await _db.collection('managers').where('referralCode', '==', referredByCode).get();
        if (snap.empty) return;
        var doc = snap.docs[0];
        var m = doc.data();
        var now = Date.now();
        var bonusDays = 7 * 24 * 60 * 60 * 1000;
        var base = (m.subEndsAt && m.subEndsAt > now) ? m.subEndsAt
          : (m.trialEndsAt && m.trialEndsAt > now) ? m.trialEndsAt
            : now;
        var field = (m.subEndsAt && m.subEndsAt > now) ? 'subEndsAt' : 'trialEndsAt';
        var upd = {}; upd[field] = base + bonusDays;
        await _db.collection('managers').doc(doc.id).update(upd);
      } catch (e) { console.warn('Referral bonus error:', e); }
    }

    // ── Revoga bônus de +7 dias de quem indicou um gestor bloqueado ──────────────
    async function _revokeReferralBonus(blockedManagerId) {
      if (!blockedManagerId) return;
      try {
        // Busca o gestor bloqueado para pegar o referredBy
        var blockedDoc = await _db.collection('managers').doc(blockedManagerId).get();
        if (!blockedDoc.exists) return;
        var blockedData = blockedDoc.data();

        // Evita revogar duas vezes
        if (blockedData.referralBonusRevoked) return;

        var refCode = blockedData.referredBy || '';
        if (!refCode) return; // não foi indicado por ninguém

        // Tenta encontrar o referrer pelo referralCode (fluxo ?ref=) OU pelo username (fluxo ?invite=)
        var referrerDoc = null;
        var snap = await _db.collection('managers').where('referralCode', '==', refCode).get();
        if (!snap.empty) {
          referrerDoc = snap.docs[0];
        } else {
          // Fallback: refCode pode ser o username de quem criou o convite
          var snap2 = await _db.collection('managers').where('username', '==', refCode).get();
          if (!snap2.empty) referrerDoc = snap2.docs[0];
        }
        if (!referrerDoc) return; // referrer não encontrado de jeito nenhum

        var referrer = referrerDoc.data();
        var now = Date.now();
        var bonusDays = 7 * 24 * 60 * 60 * 1000;

        // Remove os 7 dias que foram adicionados
        var upd = {};
        if (referrer.subEndsAt && referrer.subEndsAt > now) {
          upd.subEndsAt = Math.max(now, referrer.subEndsAt - bonusDays);
        } else if (referrer.trialEndsAt && referrer.trialEndsAt > now) {
          upd.trialEndsAt = Math.max(now, referrer.trialEndsAt - bonusDays);
        } else {
          // Assinatura já vencida — não há dias a remover, mas ainda notifica
        }

        if (Object.keys(upd).length) {
          await _db.collection('managers').doc(referrerDoc.id).update(upd);
        }

        // Marca no gestor bloqueado que o bônus foi revogado (evita dupla revogação)
        await _db.collection('managers').doc(blockedManagerId).update({ referralBonusRevoked: true });

        var blockedName = blockedData.name || blockedData.username || 'O gestor indicado';

        // Se o referrer estiver logado agora, mostra o popup imediatamente
        var cu = window.CURRENT_USER || {};
        if (cu.id === referrerDoc.id) {
          _showReferralRevokedAlert(blockedName);
        } else {
          // Grava notificação pendente — referrer verá no próximo login
          await _db.collection('managers').doc(referrerDoc.id).update({
            pendingReferralRevokeNotice: {
              revokedAt: Date.now(),
              blockedName: blockedName
            }
          });
        }
      } catch (e) { console.warn('Revoke referral bonus error:', e); }
    }

    function _showReferralRevokedAlert(blockedName) {
      // Remove overlay anterior se existir
      var existing = document.getElementById('referral-revoke-overlay');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'referral-revoke-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:16px;';
      overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:20px;width:100%;max-width:400px;box-shadow:var(--shadow-md);overflow:hidden;">
      <div style="background:var(--red-dim);border-bottom:1px solid rgba(224,62,62,.2);padding:20px 24px;display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:rgba(224,62,62,.15);border:1px solid rgba(224,62,62,.25);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>️</div>
        <div>
          <div style="font-family:var(--head);font-size:1rem;font-weight:800;color:var(--red);">Bônus de indicação revogado</div>
          <div style="font-size:.76rem;color:var(--text2);margin-top:2px;">Uma indicação sua foi bloqueada</div>
        </div>
      </div>
      <div style="padding:20px 24px;">
        <p style="font-size:.88rem;color:var(--text2);line-height:1.65;">
          A conta de <strong style="color:var(--text);">${blockedName}</strong>, que você indicou, foi bloqueada pela administração.<br><br>
          Os <strong>7 dias de bônus</strong> concedidos pela indicação foram removidos da sua assinatura.
        </p>
      </div>
      <div style="padding:0 24px 20px;display:flex;justify-content:flex-end;">
        <button class="btn btn-ghost" onclick="document.getElementById('referral-revoke-overlay').remove()">Entendi</button>
      </div>
    </div>`;
      document.body.appendChild(overlay);
    }

    // Verifica ao carregar o dashboard se há notificação de revogação pendente
    window._checkPendingReferralRevokeNotice = async function () {
      var cu = window.CURRENT_USER || {};
      if (!cu.id) return;
      try {
        var doc = await _db.collection('managers').doc(cu.id).get();
        if (!doc.exists) return;
        var data = doc.data();
        if (data.pendingReferralRevokeNotice) {
          var notice = data.pendingReferralRevokeNotice;
          // Exibe o popup e limpa a notificação pendente
          _showReferralRevokedAlert(notice.blockedName || 'um gestor indicado');
          await _db.collection('managers').doc(cu.id).update({ pendingReferralRevokeNotice: null });
        }
      } catch (e) { }
    };
    window.inviteStep1Next = function () {
      var errEl = document.getElementById('inv-error');
      errEl.textContent = '';
      var username = (document.getElementById('inv-user').value || '').trim().toLowerCase();
      var pass = document.getElementById('inv-pass').value;
      var pass2 = document.getElementById('inv-pass2').value;
      var name = (document.getElementById('inv-name').value || '').trim();
      if (!name || name.length < 3) { errEl.textContent = 'Informe seu nome completo.'; return; }
      if (!username || username.length < 3) { errEl.textContent = 'Usuário deve ter ao menos 3 caracteres.'; return; }
      if (!pass || pass.length < 6) { errEl.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }
      if (pass !== pass2) { errEl.textContent = 'As senhas não coincidem.'; return; }
      if (!document.getElementById('inv-terms').checked) { errEl.textContent = 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.'; return; }
      errEl.textContent = '';
      document.getElementById('inv-step1').style.display = 'none';
      document.getElementById('inv-step2').style.display = 'block';
      document.getElementById('inv-cref').focus();
    };

    window.inviteStep2Back = function () {
      document.getElementById('inv-error').textContent = '';
      document.getElementById('inv-step2').style.display = 'none';
      document.getElementById('inv-step1').style.display = 'block';
    };

    window.inviteRegister = async function () {
      var errEl = document.getElementById('inv-error');
      errEl.textContent = '';
      var cref = (document.getElementById('inv-cref').value || '').trim();
      if (!cref) { errEl.textContent = 'Informe seu número de registro no CREF.'; return; }
      if (!document.getElementById('inv-cref-decl').checked) { errEl.textContent = 'Você precisa marcar a declaração profissional.'; return; }
      if (!window._invDocId) { errEl.textContent = 'Convite inválido. Solicite um novo link.'; return; }
      var username = (document.getElementById('inv-user').value || '').trim().toLowerCase();
      var pass = document.getElementById('inv-pass').value;
      var btn = document.getElementById('inv-btn');
      btn.classList.add('btn-loading'); btn.textContent = 'Cadastrando...';
      try {
        var ex = await _db.collection('managers').where('username', '==', username).get();
        if (!ex.empty) { errEl.textContent = 'Usuário já existe.'; inviteStep2Back(); return; }
        var inv = await _db.collection('invites').doc(window._invDocId).get();
        if (!inv.exists || inv.data().used) { errEl.textContent = 'Convite já utilizado.'; return; }
        var hash = await _sha256(pass);
        var newId = 'mgr_' + Date.now();
        var invName = (document.getElementById('inv-name').value || '').trim();
        var invBy = window._invBy || '';
        // Busca o referralCode real de quem criou o convite (para consistência com o sistema de revogação)
        var invByRefCode = invBy;
        try {
          var invBySnap = await _db.collection('managers').where('username', '==', invBy).get();
          if (!invBySnap.empty) invByRefCode = invBySnap.docs[0].data().referralCode || invBy;
        } catch (e) { }
        await _db.collection('managers').doc(newId).set({
          username, passwordHash: hash, name: invName, role: 'comum', isMaster: false,
          cref, crefDeclared: true,
          trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000, subEndsAt: null,
          blocked: false, createdAt: Date.now(), invitedBy: invBy, referredBy: invByRefCode
        });
        await _db.collection('invites').doc(window._invDocId).update({
          used: true, usedAt: Date.now(), usedBy: username
        });
        // Bônus para quem indicou
        await _applyReferralBonus(invBy);
        var card = document.querySelector('.inv-card');
        var ov = document.createElement('div');
        ov.className = 'inv-success';
        ov.innerHTML = '<div class="inv-check"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="inv-ok-title">Conta criada com sucesso!</div><div class="inv-ok-sub">Redirecionando para o login...</div>';
        card.appendChild(ov);
        setTimeout(function () {
          history.replaceState({}, '', window.location.pathname);
          document.getElementById('screen-invite').classList.remove('on');
          document.getElementById('screen-login').style.display = 'flex';
          document.documentElement.classList.remove('has-invite');
        }, 2500);
      } catch (e) { errEl.textContent = 'Erro: ' + e.message; }
      finally { btn.classList.remove('btn-loading'); btn.textContent = 'Criar conta →'; }
    };

    // Valida token de convite — chamado logo abaixo
    window._invDocId = null; window._invBy = '';
    (function checkInviteUrl() {
      var token = new URLSearchParams(window.location.search).get('invite');
      if (!token) return;
      // Esconde login imediatamente enquanto valida
      document.getElementById('screen-login').style.display = 'none';
      // Aguarda page load + openRegisterScreen estar definida
      window.addEventListener('load', function () {
        function tryOpen() {
          if (typeof openRegisterScreen !== 'function') { setTimeout(tryOpen, 100); return; }
          _db.collection('invites').where('token', '==', token).get().then(function (snap) {
            if (snap.empty) { document.getElementById('screen-login').style.display = 'flex'; return; }
            var d = snap.docs[0]; var inv = d.data();
            if (inv.used || (inv.expiresAt && Date.now() > inv.expiresAt)) { document.getElementById('screen-login').style.display = 'flex'; return; }
            window._invDocId = d.id; window._invBy = inv.createdBy || '';
            openRegisterScreen();
          }).catch(function () { document.getElementById('screen-login').style.display = 'flex'; });
        }
        setTimeout(tryOpen, 300);
      });
    })();

    // Detecta ?ref= e abre tela de cadastro direto (validação do código ocorre no regStep2Next)
    window._pendingRefCode = '';
    (function checkRefUrl() {
      var ref = new URLSearchParams(window.location.search).get('ref');
      if (!ref) return;
      window._pendingRefCode = ref;
      window.addEventListener('load', function () {
        function tryOpen() {
          if (typeof openRegisterScreen !== 'function') { setTimeout(tryOpen, 100); return; }
          openRegisterScreen();
        }
        setTimeout(tryOpen, 300);
      });
    })();

  



    // ════════════════════════════════════════════════════════
    // CADASTRO PÚBLICO
    // ════════════════════════════════════════════════════════

    var _regSelectedPlan = 'monthly';
    var _regPricing = { monthly: 0, discount: 0 };
    var _regMpMethodId = '';
    var _regNewId = null;

    window.openRegisterScreen = async function () {
      // Carrega preços
      try {
        var snap = await _db.collection('settings').doc('pricing').get();
        if (snap.exists) {
          var d = snap.data();
          _regPricing.monthly = parseFloat(d.monthly) || 0;
          _regPricing.discount = parseFloat(d.discount) || 0;
        }
      } catch (e) { }
      regRenderPrices();

      // Inicializa MP SDK
      if (!_mpInstance && window.MercadoPago) {
        _mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
      }

      // Limpa campos
      ['reg-name', 'reg-user', 'reg-pass', 'reg-pass2', 'reg-cref', 'reg-card-name', 'reg-cpf', 'reg-email', 'reg-cardNumber', 'reg-expiry', 'reg-cvv'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.value = '';
      });
      ['reg-terms', 'reg-cref-decl'].forEach(function (id) {
        var el = document.getElementById(id); if (el) el.checked = false;
      });
      document.getElementById('reg-error').textContent = '';
      document.getElementById('reg-card-brand').textContent = '';
      document.getElementById('reg-installments-wrap').style.display = 'none';
      _regSelectedPlan = 'monthly';
      _regMpMethodId = '';

      // Trata código de indicação — da URL (?ref=) já validado ou digitado manualmente
      var refCode = window._pendingRefCode || new URLSearchParams(window.location.search).get('ref') || '';
      var refBanner = document.getElementById('reg-referral-banner');
      var refCodeWrap = document.getElementById('reg-ref-code-wrap');
      var refCodeInput = document.getElementById('reg-ref-code');
      if (refCode) {
        // Veio via link válido: mostra banner, armazena código no campo oculto
        if (refBanner) refBanner.style.display = 'block';
        if (refCodeWrap) refCodeWrap.style.display = 'none';
        if (refCodeInput) refCodeInput.value = refCode;
      } else {
        // Abriu cadastro direto: mostra campo opcional de código
        if (refBanner) refBanner.style.display = 'none';
        if (refCodeWrap) refCodeWrap.style.display = 'block';
        if (refCodeInput) refCodeInput.value = '';
      }

      regShowStep(1);
      document.getElementById('screen-login').style.display = 'none';
      document.getElementById('screen-register').classList.add('on');
    };

    window.closeRegisterScreen = function () {
      document.getElementById('screen-register').classList.remove('on');
      document.getElementById('screen-register').style.display = '';
      document.getElementById('screen-login').style.display = 'flex';
      if (_regNewId) {
        // Já criou conta — faz login automático
        _regNewId = null;
      }
    };

    function regShowStep(n) {
      [1, 2, 3].forEach(function (i) {
        var s = document.getElementById('reg-step' + i);
        if (s) s.style.display = i === n ? 'block' : 'none';
        var dot = document.getElementById('reg-dot-' + i);
        if (dot) {
          dot.classList.remove('active', 'done');
          if (i < n) dot.classList.add('done');
          if (i === n) dot.classList.add('active');
        }
      });
      document.getElementById('reg-processing').style.display = 'none';
      document.getElementById('reg-success').style.display = 'none';
    }

    function regRenderPrices() {
      var m = _regPricing.monthly;
      var disc = _regPricing.discount;
      var annTotal = m * 12 * (1 - disc / 100);
      var annMonthly = annTotal / 12;
      var saving = m * 12 - annTotal;
      var fmt = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
      var elM = document.getElementById('reg-price-monthly');
      var elA = document.getElementById('reg-price-annual');
      var elB = document.getElementById('reg-annual-badge');
      var elS = document.getElementById('reg-annual-saving');
      if (elM) elM.textContent = m > 0 ? fmt(m) : 'R$ —';
      if (elA) elA.textContent = annMonthly > 0 ? fmt(annMonthly) : 'R$ —';
      if (elB) elB.textContent = disc > 0 ? 'Economize ' + disc + '%' : '';
      if (elS && saving > 0) elS.textContent = 'Economia de ' + fmt(saving) + '/ano';
    }

    window.regSelectPlan = function (plan) {
      _regSelectedPlan = plan;
      document.getElementById('reg-plan-monthly').classList.toggle('selected', plan === 'monthly');
      document.getElementById('reg-plan-annual').classList.toggle('selected', plan === 'annual');
    };

    window.regStep1Next = async function () {
      var errEl = document.getElementById('reg-error');
      errEl.textContent = '';
      var name = (document.getElementById('reg-name').value || '').trim();
      var user = (document.getElementById('reg-user').value || '').trim().toLowerCase();
      var pass = document.getElementById('reg-pass').value;
      var pass2 = document.getElementById('reg-pass2').value;
      if (!name || name.length < 3) { errEl.textContent = 'Informe seu nome completo.'; return; }
      if (!user || user.length < 3) { errEl.textContent = 'Usuário deve ter ao menos 3 caracteres.'; return; }
      if (!pass || pass.length < 6) { errEl.textContent = 'Senha deve ter ao menos 6 caracteres.'; return; }
      if (pass !== pass2) { errEl.textContent = 'As senhas não coincidem.'; return; }
      if (!document.getElementById('reg-terms').checked) { errEl.textContent = 'Você precisa aceitar os Termos de Uso e a Política de Privacidade.'; return; }

      // Valida código de indicação manual (se preenchido e não veio via ?ref=)
      var refInput = document.getElementById('reg-ref-code');
      var refCodeWrap = document.getElementById('reg-ref-code-wrap');
      var refManual = refInput ? refInput.value.trim() : '';
      if (refManual && !window._pendingRefCode && refCodeWrap && refCodeWrap.style.display !== 'none') {
        if (refManual.toUpperCase() === 'DEBUGMODE') {
          // Código especial — aceita diretamente sem buscar no Firestore
          window._pendingRefCode = refManual;
        } else {
          var btn1 = document.querySelector('#reg-step1 .btn-primary');
          if (btn1) { btn1.classList.add('btn-loading'); btn1.textContent = 'Verificando...'; }
          try {
            // Busca pelo campo referralCode (código aleatório), não pelo username
            var snap = await _db.collection('managers').where('referralCode', '==', refManual).get();
            if (snap.empty) {
              errEl.textContent = 'Código de indicação inválido. Verifique com quem te indicou.';
              if (btn1) { btn1.classList.remove('btn-loading'); btn1.textContent = 'Continuar →'; }
              return;
            }
            // Código válido — armazena para usar no cadastro
            window._pendingRefCode = refManual;
          } catch (e) {
            // Erro de rede — deixa passar sem bloquear o cadastro
          }
          if (btn1) { btn1.classList.remove('btn-loading'); btn1.textContent = 'Continuar →'; }
        }
      }

      regShowStep(2);
    };

    window.regStepBack = function (to) {
      document.getElementById('reg-error').textContent = '';
      regShowStep(to);
    };

    window.regCardNumberInput = function (input) {
      var raw = input.value.replace(/\D/g, '').slice(0, 16);
      input.value = (raw.match(/.{1,4}/g) || []).join(' ');
      var brand = '';
      if (/^4/.test(raw)) { brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Visa'; _regMpMethodId = 'visa'; }
      else if (/^5[1-5]/.test(raw)) { brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Mastercard'; _regMpMethodId = 'master'; }
      else if (/^3[47]/.test(raw)) { brand = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> Amex'; _regMpMethodId = 'amex'; }
      else { _regMpMethodId = ''; }
      document.getElementById('reg-card-brand').innerHTML = brand;
      if (raw.length >= 6 && _mpInstance && _regMpMethodId) {
        loadInstallmentsReg(raw.slice(0, 6));
      }
    };

    async function loadInstallmentsReg(bin) {
      try {
        var amount = regGetAmount();
        var result = await _mpInstance.getInstallments({ amount: String(amount.toFixed(2)), bin, paymentTypeId: 'credit_card' });
        var wrap = document.getElementById('reg-installments-wrap');
        var sel = document.getElementById('reg-installments');
        if (!result || !result[0] || !result[0].payer_costs) { if (wrap) wrap.style.display = 'none'; return; }
        if (wrap) wrap.style.display = 'block';
        if (sel) sel.innerHTML = result[0].payer_costs.map(function (c) {
          var label = c.installments + 'x de R$ ' + c.installment_amount.toFixed(2).replace('.', ',');
          if (c.installment_rate === 0) label += ' (sem juros)';
          return '<option value="' + c.installments + '">' + label + '</option>';
        }).join('');
      } catch (e) { }
    }

    function regGetAmount() {
      var m = _regPricing.monthly, disc = _regPricing.discount;
      return _regSelectedPlan === 'annual' ? m * 12 * (1 - disc / 100) : m;
    }

    window.regSubmitPayment = async function () {
      var errEl = document.getElementById('reg-error');
      errEl.textContent = '';
      var cardRaw = (document.getElementById('reg-cardNumber').value || '').replace(/\s/g, '');
      var expiry = (document.getElementById('reg-expiry').value || '').trim();
      var cvv = (document.getElementById('reg-cvv').value || '').trim();
      var cname = (document.getElementById('reg-card-name').value || '').trim();
      var cpf = (document.getElementById('reg-cpf').value || '').replace(/\D/g, '');
      var email = (document.getElementById('reg-email').value || '').trim();
      if (cardRaw.length < 13) { errEl.textContent = 'Número do cartão inválido.'; return; }
      if (!expiry.match(/^\d{2}\/\d{2}$/)) { errEl.textContent = 'Validade inválida. Use MM/AA.'; return; }
      if (cvv.length < 3) { errEl.textContent = 'CVV inválido.'; return; }
      if (!cname || cname.length < 3) { errEl.textContent = 'Informe o nome do titular.'; return; }
      if (cpf.length !== 11) { errEl.textContent = 'CPF inválido.'; return; }
      if (!email || !email.includes('@')) { errEl.textContent = 'Informe um e-mail válido.'; return; }
      if (!_mpInstance) { errEl.textContent = 'SDK Mercado Pago não carregou. Recarregue a página.'; return; }

      // Verifica se username já existe
      var user = (document.getElementById('reg-user').value || '').trim().toLowerCase();
      var existing = await _db.collection('managers').where('username', '==', user).get();
      if (!existing.empty) { errEl.textContent = 'Este usuário já está em uso. Escolha outro.'; regShowStep(1); return; }

      regShowStep('processing');
      document.getElementById('reg-processing').style.display = 'block';
      var _rpt = document.getElementById('reg-processing-title'); if (_rpt) _rpt.textContent = 'Processando pagamento...';
      document.getElementById('reg-step1').style.display = 'none';
      document.getElementById('reg-step2').style.display = 'none';
      document.getElementById('reg-step3').style.display = 'none';

      try {
        var parts = expiry.split('/');
        var tokenResult = await _mpInstance.createCardToken({
          cardNumber: cardRaw, cardExpirationMonth: parts[0], cardExpirationYear: '20' + parts[1],
          securityCode: cvv, cardholderName: cname, identificationType: 'CPF', identificationNumber: cpf
        });
        if (!tokenResult || !tokenResult.id) throw new Error('Erro ao tokenizar cartão.');

        var installments = parseInt((document.getElementById('reg-installments') || {}).value || '1') || 1;
        var amount = regGetAmount();
        var name = (document.getElementById('reg-name').value || '').trim();
        var cref = (document.getElementById('reg-cref').value || '').trim();

        // Cria conta no Firestore (trial de 7 dias durante processamento)
        var hash = await _sha256(document.getElementById('reg-pass').value);
        _regNewId = 'mgr_' + Date.now();
        await _db.collection('managers').doc(_regNewId).set({
          username: user, passwordHash: hash, name, cref, crefDeclared: true,
          role: 'comum', isMaster: false,
          trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000, subEndsAt: null,
          blocked: false, createdAt: Date.now()
        });

        // Processa pagamento
        var resp = await fetch(MP_BACKEND_URL, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: tokenResult.id, amount, installments,
            payment_method_id: _regMpMethodId || '',
            description: 'Trainly ' + (_regSelectedPlan === 'annual' ? 'Anual' : 'Mensal'),
            payer: { email, identification: { type: 'CPF', number: cpf }, first_name: cname },
            plan: _regSelectedPlan, managerId: _regNewId, username: user
          })
        });
        var result = await resp.json();

        document.getElementById('reg-processing').style.display = 'none';

        if (result.status === 'approved' || result.status === 'authorized') {
          try {
            var now = Date.now();
            var subEndsAt = _regSelectedPlan === 'annual' ? now + 365 * 24 * 60 * 60 * 1000 : now + 30 * 24 * 60 * 60 * 1000;
            await _db.collection('managers').doc(_regNewId).update({
              subEndsAt: subEndsAt, trialEndsAt: null,
              lastPayment: { plan: _regSelectedPlan, amount: regGetAmount(), paymentId: String(result.id || ''), status: result.status || 'approved', date: Date.now() }
            });
          } catch (fsErr) { console.error('activateSubscription reg error:', fsErr); }
          document.getElementById('reg-success').style.display = 'block';
          document.getElementById('reg-success-msg').textContent =
            _regSelectedPlan === 'annual' ? 'Plano anual ativado! Acesso liberado por 12 meses.' : 'Plano mensal ativado! Acesso liberado por 30 dias.';
        } else if (result.status === 'pending' || result.status === 'in_process') {
          document.getElementById('reg-success').style.display = 'block';
          document.getElementById('reg-success-msg').textContent = 'Pagamento em análise. Você receberá a confirmação em breve.';
        } else {
          // Pagamento falhou — remove a conta criada
          await _db.collection('managers').doc(_regNewId).delete();
          _regNewId = null;
          errEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + (result.status_detail || result.message || 'Pagamento recusado. Verifique os dados.');
          regShowStep(3);
        }
      } catch (e) {
        document.getElementById('reg-processing').style.display = 'none';
        if (_regNewId) { try { await _db.collection('managers').doc(_regNewId).delete(); } catch (x) { } _regNewId = null; }
        var errMsg = typeof e === 'string' ? e
          : (e && e.message) ? e.message
            : (e && e.cause) ? JSON.stringify(e.cause)
              : (e && e.error) ? JSON.stringify(e.error)
                : JSON.stringify(e);
        if (errMsg === '{}' || !errMsg) errMsg = 'Verifique os dados do cartão e tente novamente.';
        errEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + errMsg;
        regShowStep(3);
      }
    };

  


    // ════════════════════════════════════════════════════════
    // HISTÓRICO DE PAGAMENTOS — CEO
    // ════════════════════════════════════════════════════════
    window._ceoPayFilter = 'all';
    window._ceoPayAll = [];

    window.loadCeoPaymentHistory = async function () {
      var tbody = document.getElementById('ceo-payment-tbody');
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:32px;"><div class="spinner" style="margin:0 auto;"></div></td></tr>';
      try {
        var snap = await _getDocs(_query(_col(_db, 'managers'), _orderBy('createdAt', 'desc')));
        var payments = [];
        snap.docs.forEach(function (d) {
          var m = Object.assign({ id: d.id }, d.data());
          // lastPayment (objeto único — pagamento mais recente via MP)
          if (m.lastPayment && m.lastPayment.date) {
            payments.push(Object.assign({}, m.lastPayment, {
              _managerId: m.id,
              _managerName: m.name || m.username || m.id,
              _managerUser: m.username || '',
              _source: 'mp'
            }));
          }
          // paymentHistory (array — histórico completo se existir)
          if (Array.isArray(m.paymentHistory)) {
            m.paymentHistory.forEach(function (p) {
              // Evita duplicar o lastPayment
              if (m.lastPayment && p.paymentId && p.paymentId === (m.lastPayment.paymentId || '')) return;
              payments.push(Object.assign({}, p, {
                _managerId: m.id,
                _managerName: m.name || m.username || m.id,
                _managerUser: m.username || '',
                _source: 'mp'
              }));
            });
          }
          // Ajustes manuais feitos pelo CEO (subEndsAt sem paymentId = manual)
          // Representados como eventos de auditoria se existirem
          if (Array.isArray(m.adminActions)) {
            m.adminActions.forEach(function (a) {
              payments.push(Object.assign({}, a, {
                _managerId: m.id,
                _managerName: m.name || m.username || m.id,
                _managerUser: m.username || '',
                _source: 'manual',
                status: 'manual'
              }));
            });
          }
        });
        // Ordena por data desc
        payments.sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
        window._ceoPayAll = payments;
        _renderCeoPayments(payments);
        _updateCeoPaySummary(payments);
      } catch (e) {
        tbody.innerHTML = '<tr><td colspan="6" style="color:var(--red);padding:20px;">Erro: ' + escHtml(e.message) + '</td></tr>';
      }
    };

    function _updateCeoPaySummary(list) {
      var approved = list.filter(function (p) { return p.status === 'approved' || p.status === 'authorized'; });
      var total = approved.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
      var now = new Date(); var y = now.getFullYear(); var mo = now.getMonth();
      var thisMonth = approved.filter(function (p) {
        if (!p.date) return false;
        var d = new Date(p.date); return d.getFullYear() === y && d.getMonth() === mo;
      });
      var monthTotal = thisMonth.reduce(function (s, p) { return s + (parseFloat(p.amount) || 0); }, 0);
      var annualCount = list.filter(function (p) { return p.plan === 'annual'; }).length;
      var monthlyCount = list.filter(function (p) { return p.plan === 'monthly'; }).length;
      var fmt = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
      document.getElementById('pay-sum-total').textContent = fmt(total);
      document.getElementById('pay-sum-count').textContent = list.length;
      document.getElementById('pay-sum-month').textContent = fmt(monthTotal);
      document.getElementById('pay-sum-annual-count').textContent = annualCount;
      document.getElementById('pay-sum-monthly-count').textContent = monthlyCount;
    }

    function _renderCeoPayments(list) {
      var tbody = document.getElementById('ceo-payment-tbody');
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text3);">Nenhum pagamento encontrado.</td></tr>';
        return;
      }
      var fmt = function (v) {
        var n = parseFloat(v);
        if (!n && n !== 0) return '—';
        return 'R$ ' + n.toFixed(2).replace('.', ',');
      };
      var fmtDate = function (ts) {
        if (!ts) return '—';
        return new Date(ts).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      };
      var planLabel = function (p) {
        if (p === 'annual') return '<span style="font-size:.75rem;font-weight:700;color:#8a6c00;background:rgba(245,200,0,.12);border:1px solid rgba(245,200,0,.3);border-radius:6px;padding:2px 8px;">Anual</span>';
        if (p === 'monthly') return '<span style="font-size:.75rem;font-weight:700;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:2px 8px;">Mensal</span>';
        return '<span style="font-size:.75rem;color:var(--text3);">' + (p || '—') + '</span>';
      };
      var statusBadge = function (s) {
        if (s === 'approved' || s === 'authorized') return '<span class="pay-status-badge pay-approved">✓ Aprovado</span>';
        if (s === 'pending' || s === 'in_process') return '<span class="pay-status-badge pay-pending">⏳ Pendente</span>';
        if (s === 'manual') return '<span class="pay-status-badge pay-manual"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>️ Manual</span>';
        return '<span class="pay-status-badge pay-rejected">✕ ' + (s || 'Recusado') + '</span>';
      };
      tbody.innerHTML = list.map(function (p) {
        var pid = p.paymentId || p.id || '—';
        var pidShort = (pid && pid !== '—' && pid.length > 12) ? pid.slice(0, 12) + '…' : pid;
        return '<tr>'
          + '<td><div style="font-weight:700;font-size:.85rem;">' + escHtml(p._managerName) + '</div>'
          + '<div style="font-size:.71rem;color:var(--text3);">@' + escHtml(p._managerUser) + '</div></td>'
          + '<td>' + planLabel(p.plan) + '</td>'
          + '<td style="font-weight:700;font-size:.88rem;">' + fmt(p.amount) + '</td>'
          + '<td>' + statusBadge(p.status) + '</td>'
          + '<td style="font-size:.78rem;color:var(--text2);">' + fmtDate(p.date) + '</td>'
          + '<td><span title="' + escHtml(pid) + '" style="font-size:.72rem;color:var(--text3);font-family:monospace;cursor:default;">' + escHtml(pidShort) + '</span></td>'
          + '</tr>';
      }).join('');
    }

    window.setCeoPayFilter = function (filter) {
      window._ceoPayFilter = filter;
      ['all', 'approved', 'pending', 'manual'].forEach(function (f) {
        var btn = document.getElementById('pay-filter-' + f);
        if (btn) btn.classList.toggle('active', f === filter);
      });
      var filtered = window._ceoPayAll;
      if (filter === 'approved') filtered = filtered.filter(function (p) { return p.status === 'approved' || p.status === 'authorized'; });
      else if (filter === 'pending') filtered = filtered.filter(function (p) { return p.status === 'pending' || p.status === 'in_process'; });
      else if (filter === 'manual') filtered = filtered.filter(function (p) { return p._source === 'manual' || p.status === 'manual'; });
      _renderCeoPayments(filtered);
    };

    // ════════════════════════════════════════════════════════
    // ANÁLISE DE CREF — CEO
    // ════════════════════════════════════════════════════════

  



    // ════════════════════════════════════════════════════════
    // TRIAL WELCOME MODAL
    // ════════════════════════════════════════════════════════
    var _twPlan = 'monthly';
    var _twPricing = { monthly: 0, discount: 0 };

    window.showTrialWelcomeModal = async function (daysLeft) {
      // Carrega preços
      try {
        var snap = await _db.collection('settings').doc('pricing').get();
        if (snap.exists) {
          var d = snap.data();
          _twPricing.monthly = parseFloat(d.monthly) || 0;
          _twPricing.discount = parseFloat(d.discount) || 0;
        }
      } catch (e) { }

      // Atualiza dias
      var daysEl = document.getElementById('trial-welcome-days');
      if (daysEl) daysEl.textContent = daysLeft || 7;

      // Renderiza preços
      twRenderPrices();

      // Inicializa MP
      if (!_mpInstance && window.MercadoPago) {
        _mpInstance = new MercadoPago(MP_PUBLIC_KEY, { locale: 'pt-BR' });
      }

      // Exibe overlay
      document.getElementById('trial-welcome-overlay').classList.add('on');
    };

    function twRenderPrices() {
      var m = _twPricing.monthly, disc = _twPricing.discount;
      var annTotal = m * 12 * (1 - disc / 100);
      var annMonthly = annTotal / 12;
      var saving = m * 12 - annTotal;
      var fmt = function (v) { return 'R$ ' + v.toFixed(2).replace('.', ','); };
      var elM = document.getElementById('tw-price-monthly');
      var elA = document.getElementById('tw-price-annual');
      var elB = document.getElementById('tw-annual-badge');
      var elS = document.getElementById('tw-annual-saving');
      if (elM) elM.textContent = m > 0 ? fmt(m) : 'R$ —';
      if (elA) elA.textContent = annMonthly > 0 ? fmt(annMonthly) : 'R$ —';
      if (elB) elB.textContent = disc > 0 ? 'Economize ' + disc + '%' : '';
      if (elS && saving > 0) elS.textContent = 'Economia de ' + fmt(saving) + '/ano';
    }

    window.twSelectPlan = function (plan) {
      _twPlan = plan;
      document.getElementById('tw-plan-monthly').classList.toggle('selected', plan === 'monthly');
      document.getElementById('tw-plan-annual').classList.toggle('selected', plan === 'annual');
    };

    window.twGoToPayment = function () {
      // Fecha modal e abre a subscription wall no step de plano
      document.getElementById('trial-welcome-overlay').classList.remove('on');
      // Pre-seleciona o plano escolhido
      _mpSelectedPlan = _twPlan;
      showSubscriptionWall();
    };

    window.twContinueTrial = function () {
      document.getElementById('trial-welcome-overlay').classList.remove('on');
    };

  


    // Block all zoom gestures on iOS
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });

    // Block double-tap zoom — APENAS fora de modais e inputs
    var lastTap = 0;
    document.addEventListener('touchend', function (e) {
      // Não interfere com modais, inputs, selects, textareas, botões dentro de modais
      var t = e.target;
      if (t && (
        t.closest('.modal') ||
        t.closest('.modal-overlay') ||
        t.tagName === 'INPUT' ||
        t.tagName === 'SELECT' ||
        t.tagName === 'TEXTAREA' ||
        t.tagName === 'BUTTON' ||
        t.tagName === 'A'
      )) return;
      var now = Date.now();
      if (now - lastTap < 300) { e.preventDefault(); }
      lastTap = now;
    }, { passive: false });

    // Block pinch zoom (multi-touch) — sempre válido
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) { e.preventDefault(); }
    }, { passive: false });
  


    // ════════════════════════════════════════════════════════
    // FIREBASE AUTH — FLUXO SEGURO (username → e-mail interno)
    //
    // O login deriva o e-mail diretamente do username, sem
    // nenhuma consulta ao Firestore antes de autenticar.
    // Isso permite fechar as Security Rules completamente.
    // ════════════════════════════════════════════════════════

    var _auth = null;

    (function initAuth() {
      function tryInit() {
        if (window.firebase && window.firebase.auth) {
          _auth = firebase.auth();
          _auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } else {
          setTimeout(tryInit, 100);
        }
      }
      tryInit();
    })();

    // Deriva o e-mail de autenticação a partir do username.
    // O e-mail real do gestor fica salvo no Firestore apenas
    // para fins de suporte — nunca é usado no Auth.
    function _authEmail(username) {
      return username.toLowerCase().replace(/[^a-z0-9]/g, '') + '@trainly-app.internal';
    }
    var _syntheticEmail = _authEmail; // alias para compatibilidade

    // ── Criar ou buscar conta no Firebase Auth ───────────────
    async function _ensureAuthAccount(email, password) {
      try {
        var cred = await _auth.createUserWithEmailAndPassword(email, password);
        return cred.user.uid;
      } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
          var cred2 = await _auth.signInWithEmailAndPassword(email, password);
          return cred2.user.uid;
        }
        throw e;
      }
    }

    // ── LOGIN PRINCIPAL ───────────────────────────────────────
    // Fluxo:
    //   1. Deriva e-mail interno do username (sem consultar Firestore)
    //   2. signInWithEmailAndPassword no Auth
    //   3. Autenticado → lê documento do manager no Firestore
    //   4. Verifica bloqueio, subscription, etc.
    //   5. _loginSuccess
    async function doLogin() {
      var user = document.getElementById('login-user').value.trim().toLowerCase();
      var pass = document.getElementById('login-pass').value;
      if (!user || !pass) { showLoginError('Preencha usuário e senha.'); return; }

      var btn = document.querySelector('#login-form button[type=button]');
      if (btn) { btn.textContent = 'Verificando...'; btn.disabled = true; }

      try {
        // Aguarda Firebase estar pronto
        var attempts = 0;
        while ((!window.firebase || !window.firebase.firestore || !_auth) && attempts < 40) {
          await new Promise(r => setTimeout(r, 100)); attempts++;
        }
        if (!window.firebase || !window.firebase.firestore || !_auth) {
          showLoginError('Erro de conexão. Tente novamente.'); return;
        }

        // ── Passo 1: autentica no Auth via e-mail interno ─────
        var authEmail = _authEmail(user);
        try {
          await _auth.signInWithEmailAndPassword(authEmail, pass);
        } catch (authErr) {
          if (
            authErr.code === 'auth/wrong-password' ||
            authErr.code === 'auth/invalid-credential' ||
            authErr.code === 'auth/user-not-found'
          ) {
            showLoginError('Usuário ou senha incorretos.');
          } else {
            showLoginError('Erro ao autenticar: ' + authErr.message);
          }
          return;
        }

        // ── Passo 2: autenticado → lê o documento no Firestore ──
        var db = firebase.firestore();
        var snap = await db.collection('managers').where('username', '==', user).get();
        if (snap.empty) {
          await _auth.signOut();
          showLoginError('Usuário ou senha incorretos.');
          return;
        }

        var docSnap = snap.docs[0];
        var mgr = docSnap.data();

        // Conta bloqueada?
        if (mgr.blocked) {
          await _auth.signOut();
          var reasons = mgr.blockReasons && mgr.blockReasons.length ? mgr.blockReasons : [];
          showBlockedScreen(reasons);
          return;
        }

        var role = mgr.role || (mgr.isMaster ? 'master' : 'comum');
        var subStatus = (role !== 'ceo') ? _checkSubscription(mgr) : null;

        // Garante referralCode
        var referralCode = mgr.referralCode || '';
        if (!referralCode) {
          var arr = new Uint8Array(5); crypto.getRandomValues(arr);
          referralCode = Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
          try { await db.collection('managers').doc(docSnap.id).update({ referralCode: referralCode }); } catch (e) { }
        }

        var userData = {
          id: docSnap.id,
          username: user,
          role: role,
          isMaster: role === 'master' || role === 'ceo',
          isCeo: role === 'ceo',
          isTester: _isTesterActive(mgr),
          displayName: mgr.name || user,
          phone: mgr.phone || '',
          subStatus: subStatus,
          trialEndsAt: mgr.trialEndsAt || null,
          subEndsAt: mgr.subEndsAt || null,
          referralCode: referralCode,
        };

        _loginSuccess(userData);

      } catch (e) {
        showLoginError('Erro: ' + e.message);
      } finally {
        if (btn) { btn.textContent = 'Acessar painel →'; btn.disabled = false; }
      }
    }

    // ════════════════════════════════════════════════════════
    // CADASTRO PÚBLICO — regStep2Next (com Auth)
    // Cria conta no Firestore + Firebase Auth simultaneamente
    // ════════════════════════════════════════════════════════

    window.regStep2Next = async function () {
      var errEl = document.getElementById('reg-error');
      errEl.textContent = '';
      var cref = (document.getElementById('reg-cref').value || '').trim();
      if (!cref) { errEl.textContent = 'Informe seu número de registro no CREF.'; return; }
      if (!document.getElementById('reg-cref-decl').checked) {
        errEl.textContent = 'Você precisa marcar a declaração profissional.'; return;
      }

      [1, 2, 3].forEach(function (i) {
        var el = document.getElementById('reg-step' + i); if (el) el.style.display = 'none';
      });
      document.getElementById('reg-processing').style.display = 'block';
      var _rpt = document.getElementById('reg-processing-title'); if (_rpt) _rpt.textContent = 'Criando sua conta...';

      // Helper para mostrar erro e voltar ao step 2
      function showErr(msg) {
        document.getElementById('reg-processing').style.display = 'none';
        errEl.textContent = msg;
        regShowStep(2);
        // Garante que o erro seja visível no topo do card
        var card = document.querySelector('.reg-card');
        if (card) card.scrollTop = 0;
      }

      try {
        // Aguarda Firebase estar pronto
        var attempts = 0;
        while ((!window.firebase || !window.firebase.firestore || !_auth) && attempts < 40) {
          await new Promise(function (r) { setTimeout(r, 100); }); attempts++;
        }
        if (!window.firebase || !window.firebase.firestore || !_auth) {
          showErr('Erro de conexão. Tente novamente.'); return;
        }

        var user = (document.getElementById('reg-user').value || '').trim().toLowerCase();
        var name = (document.getElementById('reg-name').value || '').trim();
        var email = (document.getElementById('reg-email-step1').value || '').trim().toLowerCase();
        var password = document.getElementById('reg-pass').value;

        if (!user) { showErr('Nome de usuário obrigatório.'); return; }
        if (!password) { showErr('Senha obrigatória.'); return; }

        // Verifica username duplicado no Firestore
        var existing = await _db.collection('managers').where('username', '==', user).get();
        if (!existing.empty) {
          showErr('Este usuário já está em uso. Escolha outro.');
        }

        // Cria no Firebase Auth — ANTES do Firestore
        var authEmail = _authEmail(user);
        var uid = null;
        try {
          uid = await _ensureAuthAccount(authEmail, password);
        } catch (authErr) {
          showErr('Erro ao criar conta: ' + authErr.message); return;
        }

        var hash = await _sha256(password);
        _regNewId = 'mgr_' + Date.now();

        var refCode = window._pendingRefCode
          || (document.getElementById('reg-ref-code') ? document.getElementById('reg-ref-code').value.trim() : '')
          || '';

        // Calcula dias de trial: 7 base + 7 se veio com código de indicação; DEBUGMODE = 2 meses
        var isDebugMode = refCode.toUpperCase() === 'DEBUGMODE';
        var trialDays = isDebugMode ? 60 : (refCode ? 14 : 7);
        var trialEndsAt = Date.now() + trialDays * 24 * 60 * 60 * 1000;

        // Salva no Firestore
        try {
          await _db.collection('managers').doc(_regNewId).set({
            username: user, passwordHash: hash, name, cref, crefDeclared: true,
            email: email || authEmail,
            authUid: uid,
            role: 'comum', isMaster: false,
            trialEndsAt: trialEndsAt, subEndsAt: null,
            blocked: false, createdAt: Date.now(),
            referredBy: isDebugMode ? '' : refCode
          });
        } catch (fsErr) {
          // Firestore falhou — deleta a conta do Auth para não deixar "fantasma"
          try {
            var authUser = _auth.currentUser;
            if (authUser) await authUser.delete();
          } catch (e2) { }
          showErr('Erro ao salvar conta: ' + fsErr.message); return;
        }

        // Aplica bônus de indicação (não aplica para DEBUGMODE)
        if (refCode && !isDebugMode) {
          try { await _applyReferralBonus(refCode); } catch (e) { }
        }

        // Desloga do Auth para não disparar auto-login antes da tela de sucesso
        try { await _auth.signOut(); } catch (e) { }

        document.getElementById('reg-processing').style.display = 'none';
        document.querySelector('.reg-step-indicator').style.display = 'none';
        var foot = document.getElementById('reg-foot'); if (foot) foot.style.display = 'none';
        document.getElementById('reg-success').style.display = 'block';
        document.getElementById('reg-success-msg').textContent = 'Redirecionando para o login...';

        setTimeout(function () {
          history.replaceState({}, '', window.location.pathname);
          document.getElementById('screen-register').classList.remove('on');
          document.getElementById('screen-register').style.display = '';
          document.getElementById('screen-login').style.display = 'flex';
        }, 2800);

      } catch (e) {
        showErr('Erro: ' + e.message);
      }
    };

    // ════════════════════════════════════════════════════════
    // CADASTRO VIA CONVITE — inviteRegister (com Auth)
    // ════════════════════════════════════════════════════════
    window.inviteRegister = async function () {
      var errEl = document.getElementById('inv-error');
      errEl.textContent = '';
      var cref = (document.getElementById('inv-cref').value || '').trim();
      if (!cref) { errEl.textContent = 'Informe seu número de registro no CREF.'; return; }
      if (!document.getElementById('inv-cref-decl').checked) {
        errEl.textContent = 'Você precisa marcar a declaração profissional.'; return;
      }
      if (!window._invDocId) { errEl.textContent = 'Convite inválido. Solicite um novo link.'; return; }

      var username = (document.getElementById('inv-user').value || '').trim().toLowerCase();
      var pass = document.getElementById('inv-pass').value;
      var btn = document.getElementById('inv-btn');
      btn.classList.add('btn-loading'); btn.textContent = 'Cadastrando...';

      try {
        var ex = await _db.collection('managers').where('username', '==', username).get();
        if (!ex.empty) { errEl.textContent = 'Usuário já existe.'; inviteStep2Back(); return; }

        var inv = await _db.collection('invites').doc(window._invDocId).get();
        if (!inv.exists || inv.data().used) { errEl.textContent = 'Convite já utilizado.'; return; }

        var hash = await _sha256(pass);
        var newId = 'mgr_' + Date.now();
        var invName = (document.getElementById('inv-name').value || '').trim();
        var invBy = window._invBy || '';
        var authEmail = _authEmail(username); // sempre deriva do username

        // Cria no Firebase Auth primeiro
        var uid = null;
        try {
          uid = await _ensureAuthAccount(authEmail, pass);
        } catch (authErr) {
          errEl.textContent = 'Erro ao criar conta: ' + authErr.message;
          btn.classList.remove('btn-loading'); btn.textContent = 'Criar conta →';
          return;
        }

        // Busca referralCode de quem criou o convite
        var invByRefCode = invBy;
        try {
          var invBySnap = await _db.collection('managers').where('username', '==', invBy).get();
          if (!invBySnap.empty) invByRefCode = invBySnap.docs[0].data().referralCode || invBy;
        } catch (e) { }

        // Cria no Firestore
        await _db.collection('managers').doc(newId).set({
          username, passwordHash: hash, name: invName, role: 'comum', isMaster: false,
          cref, crefDeclared: true,
          email: authEmail,
          authUid: uid,
          trialEndsAt: Date.now() + 7 * 24 * 60 * 60 * 1000, subEndsAt: null,
          blocked: false, createdAt: Date.now(), invitedBy: invBy, referredBy: invByRefCode
        });

        await _db.collection('invites').doc(window._invDocId).update({
          used: true, usedAt: Date.now(), usedBy: username
        });
        await _applyReferralBonus(invBy);

        var card = document.querySelector('.inv-card');
        var ov = document.createElement('div');
        ov.className = 'inv-success';
        ov.innerHTML = '<div class="inv-check"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div class="inv-ok-title">Conta criada com sucesso!</div><div class="inv-ok-sub">Redirecionando para o login...</div>';
        card.appendChild(ov);
        setTimeout(function () {
          history.replaceState({}, '', window.location.pathname);
          document.getElementById('screen-invite').classList.remove('on');
          document.getElementById('screen-login').style.display = 'flex';
          document.documentElement.classList.remove('has-invite');
        }, 2500);

      } catch (e) {
        errEl.textContent = 'Erro: ' + e.message;
      } finally {
        btn.classList.remove('btn-loading'); btn.textContent = 'Criar conta →';
      }
    };

    // ════════════════════════════════════════════════════════
    // LOGOUT
    // ════════════════════════════════════════════════════════
    window.doLogout = async function () {
      try {
        if (_auth && _auth.currentUser) await _auth.signOut();
      } catch (e) { }
      try { localStorage.removeItem('forge_gestor_session'); } catch (e) { }
      try { localStorage.removeItem('trainly_role'); } catch (e) { }
      location.reload();
    };

    document.addEventListener('DOMContentLoaded', function () {
      document.querySelectorAll('[onclick*="doLogout"], .logout-btn').forEach(function (el) {
        if (el.getAttribute('onclick') && el.getAttribute('onclick').includes('doLogout')) return;
        el.onclick = function () { window.doLogout(); };
      });
    });

  


    (function () {
      function isIOSSafari() {
        var ua = navigator.userAgent;
        if (!/iP(hone|od|ad)/.test(ua)) return false;
        return /Safari/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua) && !/OPiOS/.test(ua);
      }

      function isInStandaloneMode() {
        return (window.navigator.standalone === true) ||
          (window.matchMedia('(display-mode: standalone)').matches);
      }

      function shouldShow() {
        if (!isIOSSafari()) return false;
        if (isInStandaloneMode()) return false;
        try { if (localStorage.getItem('trainly_safari_tutorial_dismissed') === '1') return false; } catch (e) { }
        return true;
      }

      function openSafariTutorial() {
        var overlay = document.getElementById('safari-tutorial-overlay');
        if (!overlay) return;
        overlay.classList.add('on');
        var vid = overlay.querySelector('video');
        if (vid) { try { vid.play().catch(function () { }); } catch (e) { } }
      }

      window.closeSafariTutorial = function () {
        var overlay = document.getElementById('safari-tutorial-overlay');
        if (overlay) overlay.classList.remove('on');
        var chk = document.getElementById('safari-tutorial-no-show');
        if (chk && chk.checked) {
          try { localStorage.setItem('trainly_safari_tutorial_dismissed', '1'); } catch (e) { }
        }
        var vid = overlay ? overlay.querySelector('video') : null;
        if (vid) { try { vid.pause(); } catch (e) { } }
      };

      // Observa quando #screen-dashboard se torna visível — sem interferir no login
      document.addEventListener('DOMContentLoaded', function () {
        if (!shouldShow()) return;
        var dashboard = document.getElementById('screen-dashboard');
        if (!dashboard) return;
        var shown = false;
        var observer = new MutationObserver(function () {
          if (shown) return;
          var s = dashboard.style.display;
          if (s && s !== 'none') {
            shown = true;
            observer.disconnect();
            setTimeout(openSafariTutorial, 900);
          }
        });
        observer.observe(dashboard, { attributes: true, attributeFilter: ['style'] });
      });
    })();
/* ═══════════════════════════════════
   DONUT CHART — dashboard melhorada
   ═══════════════════════════════════ */
(function initDonutChart() {
  function updateDonut() {
    var ativos = 0, vencidos = 0;
    var elA = document.getElementById('stat-planos');
    var elV = document.getElementById('stat-expired');
    if (elA) ativos = parseInt(elA.textContent) || 0;
    if (elV) vencidos = parseInt(elV.textContent) || 0;
    var total = ativos + vencidos;
    if (total === 0) return;

    var circ = 2 * Math.PI * 28; // 175.93
    var pctAtivos = ativos / total;
    var pctVencidos = vencidos / total;
    var dasharrayAtivos = (circ * pctAtivos).toFixed(2) + ' ' + circ.toFixed(2);
    var dasharrayVencidos = (circ * pctVencidos).toFixed(2) + ' ' + circ.toFixed(2);
    var offsetVencidos = -(circ * pctAtivos);

    var dA = document.getElementById('donut-ativos');
    var dV = document.getElementById('donut-vencidos');
    if (dA) dA.setAttribute('stroke-dasharray', dasharrayAtivos);
    if (dV) {
      dV.setAttribute('stroke-dasharray', dasharrayVencidos);
      dV.setAttribute('stroke-dashoffset', offsetVencidos);
    }

    var pct = Math.round(pctAtivos * 100);
    var elPct = document.getElementById('donut-pct');
    if (elPct) elPct.textContent = pct + '%';

    var elLA = document.getElementById('donut-leg-ativos');
    var elLV = document.getElementById('donut-leg-vencidos');
    if (elLA) elLA.textContent = ativos + ' ativo' + (ativos !== 1 ? 's' : '');
    if (elLV) elLV.textContent = vencidos + ' vencido' + (vencidos !== 1 ? 's' : '');
  }

  // Observa mudanças nos elementos de stat para atualizar o donut
  var observer = new MutationObserver(function() { setTimeout(updateDonut, 100); });
  function watchStats() {
    var elA = document.getElementById('stat-planos');
    var elV = document.getElementById('stat-expired');
    if (elA) observer.observe(elA, { childList: true, characterData: true, subtree: true });
    if (elV) observer.observe(elV, { childList: true, characterData: true, subtree: true });
    updateDonut();
  }
  // Aguarda DOM pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(watchStats, 1500); });
  } else {
    setTimeout(watchStats, 1500);
  }
})();
