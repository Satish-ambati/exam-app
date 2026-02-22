'use strict';

// ─── STATE ───────────────────────────────────────────────────────────────────
let examStarted = false;
let examUrl = '';

// ─── DOM ─────────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg, type = 'danger', ms = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ─── SCREENS ─────────────────────────────────────────────────────────────────
function hideStartScreen() {
  const s = $('startScreen');
  s.style.opacity = '0';
  s.style.transform = 'scale(0.96)';
  s.style.pointerEvents = 'none';
  setTimeout(() => s.classList.add('hidden'), 500);
}

// ─── TITLE BAR CONTROLS ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const minBtn = $('minBtn');
  const closeTBBtn = $('closeTBBtn');

  if (minBtn) {
    minBtn.addEventListener('click', () => {
      if (window.examAPI) window.examAPI.minimize();
    });
  }

  if (closeTBBtn) {
    closeTBBtn.addEventListener('click', () => {
      openCloseModal();
    });
  }
});

// ─── START EXAM ──────────────────────────────────────────────────────────────
function startExam() {
  const url = $('urlInput').value.trim();
  if (!url) {
    showToast('⚠ Please enter a valid exam URL', 'warn');
    return;
  }

  examUrl = /^https?:\/\//i.test(url) ? url : 'https://' + url;
  examStarted = true;

  const tb = $('titleBar');
  if (tb) tb.style.display = 'none';

  hideStartScreen();

  $('examBar').classList.add('visible');
  $('examUrlDisplay').textContent = examUrl;

  if (window.examAPI) {
    window.examAPI.loadURL(examUrl);
  }

  showToast('✓ Exam launched — Safe Mode active', 'success', 3000);
}

// ─── CLOSE MODAL ─────────────────────────────────────────────────────────────
function openCloseModal() {
  $('closeModal').classList.add('open');
  $('closePasswordInput').value = '';
  $('closeWrongMsg').classList.remove('show');
  setTimeout(() => $('closePasswordInput').focus(), 120);
}

function closeCloseModal() {
  $('closeModal').classList.remove('open');
}

function confirmClose() {
  const pass = $('closePasswordInput').value;
  if (!pass) return;

  if (pass === 'admin@exam2024') {
    showToast('✓ Closing session...', 'success', 1500);
    setTimeout(() => {
      if (window.examAPI) window.examAPI.quitApp();
    }, 800);
  } else {
    const box = $('closeModalBox');
    box.classList.add('shake');
    setTimeout(() => box.classList.remove('shake'), 420);
    $('closeWrongMsg').classList.add('show');
    $('closePasswordInput').value = '';
    $('closePasswordInput').focus();
    showToast('❌ Wrong password', 'danger', 2500);
  }
}

// ─── KEY BLOCKING (exam mode only) ───────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  if (!examStarted) return;

  const inPasswordField = (document.activeElement && document.activeElement.id === 'closePasswordInput');
  const k = e.key;
  const ctrl = e.ctrlKey, shift = e.shiftKey, alt = e.altKey, meta = e.metaKey;

  // Always block F-keys
  if (/^F\d+$/.test(k)) {
    e.preventDefault(); e.stopPropagation();
    showToast('⛔ Key blocked', 'danger', 1200);
    return;
  }

  // Always block Windows/Meta key
  if (meta) {
    e.preventDefault(); e.stopPropagation();
    showToast('⛔ Key blocked', 'danger', 1200);
    return;
  }

  // Always block Alt combos
  if (alt) {
    e.preventDefault(); e.stopPropagation();
    showToast('⛔ Key blocked', 'danger', 1200);
    return;
  }

  // Always block PrintScreen
  if (k === 'PrintScreen') {
    e.preventDefault(); e.stopPropagation();
    showToast('⛔ Screenshot blocked', 'danger', 1200);
    return;
  }

  // Block Escape only when NOT in the close modal
  if (k === 'Escape' && !inPasswordField) {
    e.preventDefault(); e.stopPropagation();
    return;
  }

  // Block Ctrl combos
  if (ctrl) {
    const blocked = ['r','R','w','W','n','N','t','T','a','A','p','P',
                     's','S','u','U','l','L','j','J','c','C','x','X',
                     'v','V','z','Z','y','Y'];
    if (blocked.includes(k)) {
      e.preventDefault(); e.stopPropagation();
      showToast('⛔ Key blocked', 'danger', 1200);
      return;
    }
    if (shift && ['i','I','c','C','j','J','k','K'].includes(k)) {
      e.preventDefault(); e.stopPropagation();
      showToast('⛔ Key blocked', 'danger', 1200);
      return;
    }
  }

}, true);

// ─── BLOCK RIGHT CLICK ────────────────────────────────────────────────────────
document.addEventListener('contextmenu', (e) => {
  if (examStarted) e.preventDefault();
});

// ─── BLOCK COPY / CUT / PASTE ────────────────────────────────────────────────
document.addEventListener('copy',  (e) => { if (examStarted) e.preventDefault(); });
document.addEventListener('cut',   (e) => { if (examStarted) e.preventDefault(); });
document.addEventListener('paste', (e) => {
  if (examStarted && e.target.id !== 'closePasswordInput' && e.target.id !== 'urlInput') {
    e.preventDefault();
  }
});