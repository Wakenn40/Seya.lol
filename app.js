/**
 * seya.lol — app.js
 * Handles routing, auth, builder state, and preview updates.
 * Pure vanilla JS, no dependencies.
 */

if (location.hash && location.hash.startsWith('#/')) {
  history.replaceState(null, '', location.pathname + location.search);
}

console.log('app.js loaded');

/* ================================================
   CORE ELEMENTS (always on top, outside layer system)
   ================================================ */
const CORE_ELEMENTS = ['avatar', 'name', 'bio'];
const isCoreElement = (key) => CORE_ELEMENTS.includes(key) || (key.startsWith('link-'));
const CORE_Z_INDEX = 1000;

/* ================================================
   STATE
   ================================================ */
const state = {
  currentUser: null,

  page: {
    displayName: '',
    displayNameHtml: '',
    bio: 'Hey, this is my page ✨',
    bioHtml: 'Hey, this is my page ✨',
    avatar: '',
    music: {
      src: '',
      name: '',
      gain: 1,
      volume: 1, // 0..1 (user volume), applied * gain
    },
    linksEnabled: true,
    links: [
      { emoji: '📸', label: 'Instagram', url: 'https://instagram.com', style: 'icon' },
      { emoji: '🐦', label: 'Twitter / X', url: 'https://x.com', style: 'icon' },
    ],
    bg: 'bg-black',
    bgImageGlobal: '', // dataURL
    bgImagePhone: '',  // dataURL (applies to .phone-inner)
    bgPhoneOpacity: 1, // 0..1
    phoneBlur: false,
    phoneBlurStrength: 3,
    phoneBorderRadius: 42,
    deleted: {
      avatar: false,
      name: false,
      bio: false,
      phone: false,
    },
    btnStyle: '',
    accentColor: '#d6d6d6',
    font: 'Syne',
    nameSize: 22,
    textManualSize: {
      name: false,
      bio: false,
    },
    customObjects: [],
    customObjectCounter: 0,
    animations: {}, // { 'avatar': { animation: 'shake', speed: 1 }, 'name': {...}, ... }
    phoneFrameImage: '', // custom frame image (dataURL)
    cursorImage: '', // custom cursor image (dataURL)
    cursorSize: 32, // cursor display size in px
    cursorTrail: { mode: 'none', image: '', config: {} },
    discord: { id: '', username: '', avatar: '', discriminator: '0' },
    clickToEnter: false,
    clickToEnterText: 'Click to enter',
    discordWidgets: false,
    layers: [
      { id: 'layer-0', name: 'Main Layer', objects: ['phone', 'avatar', 'name', 'bio', 'link-0', 'link-1', 'link-2', 'link-3', 'link-4'] }
    ],
    layerCounter: 1,
    activeLayer: 'layer-0',
    layout: {
      avatar: { x: 230, y: 150, w: 82, h: 82 },
      name: { x: 219, y: 240, w: 140, h: 30 },
      bio: { x: 219, y: 300, w: 140, h: 50 },
      links: { x: 219, y: 434, w: 232, h: 44 },
      phone: { x: 0, y: 0, w: 280, h: 560 },
    },
  },

  builder: {
    tool: 'cursor', // 'cursor' | 'hand'
    view: { x: 0, y: 0, scale: 1 }, // pan/zoom for preview-stage-inner
    canvasW: 0, canvasH: 0, // stored dimensions of the preview stage canvas
  },

  auth: {
    mode: 'signup', // 'signup' | 'login'
  },
};

/* ================================================
  DEFAULT PAGE DATA
  ================================================ */
function getDefaultPageData() {
  return {
    displayName: '',
    displayNameHtml: '',
    bio: 'Hey, this is my page ✨',
    bioHtml: 'Hey, this is my page ✨',
    avatar: '',
    music: { src: '', name: '', gain: 1, volume: 1 },
    linksEnabled: false,
    links: [],
    bg: 'bg-black',
    bgImageGlobal: '',
    bgImagePhone: '',
    bgPhoneOpacity: 1,
    deleted: { avatar: false, name: false, bio: false, phone: false },
    btnStyle: '',
    accentColor: '#d6d6d6',
    font: 'Syne',
    nameSize: 22,
    textManualSize: { name: false, bio: false },
    customFonts: [],
    customObjects: [],
    customObjectCounter: 0,
    animations: {},
    effects: {},
    phoneFrameImage: '',
    cursorImage: '',
    cursorSize: 32,
    cursorTrail: { mode: 'none', image: '', config: {} },
    discord: { id: '', username: '', avatar: '', discriminator: '0' },
    clickToEnter: { enabled: false, text: 'Click to enter' },
    layers: [
      { id: 'layer-0', name: 'Main Layer', objects: ['phone', 'avatar', 'name', 'bio', 'link-0', 'link-1', 'link-2', 'link-3', 'link-4'] }
    ],
    layerCounter: 1,
    activeLayer: 'layer-0',
    layout: {
      avatar: { x: 230, y: 150, w: 82, h: 82 },
      name: { x: 219, y: 240, w: 140, h: 30 },
      bio: { x: 219, y: 300, w: 140, h: 50 },
      links: { x: 219, y: 434, w: 232, h: 44 },
      phone: { x: 0, y: 0, w: 280, h: 560 }
    },
    clickToEnter: false,
    clickToEnterText: 'Click to enter',
    discordWidgets: false
  };
}

function normalizePageData(pageData) {
  const defaults = getDefaultPageData();
  const normalized = { ...defaults };
  
  if (!pageData) return normalized;
  
  Object.keys(defaults).forEach(key => {
    if (pageData[key] !== undefined && pageData[key] !== null && pageData[key] !== 'null') {
      if (typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
        normalized[key] = { ...defaults[key], ...pageData[key] };
      } else {
        normalized[key] = pageData[key];
      }
    }
  });
  
  console.log('[normalizePageData] defaults.layout.phone:', JSON.stringify(defaults.layout?.phone));
  console.log('[normalizePageData] pageData.layout.phone:', JSON.stringify(pageData.layout?.phone));
  console.log('[normalizePageData] pageData.customFonts:', JSON.stringify(pageData.customFonts || []).substring(0, 100));
  console.log('[normalizePageData] normalized.layout.phone (before fix):', JSON.stringify(normalized.layout?.phone));
  
  // Deep merge layout.phone to preserve tilt3D
  if (pageData.layout && pageData.layout.phone) {
    if (!normalized.layout.phone) normalized.layout.phone = {};
    normalized.layout.phone = { ...normalized.layout.phone, ...pageData.layout.phone };
  }
  // Ensure cursorTrail.config is an object, not an array (PHP json_decode([]) → array bug)
  if (normalized.cursorTrail && Array.isArray(normalized.cursorTrail.config)) {
    normalized.cursorTrail.config = {};
  }
  console.log('[normalizePageData] normalized.layout.phone (after fix):', JSON.stringify(normalized.layout.phone));
  console.log('[normalizePageData] normalized.customFonts:', JSON.stringify(normalized.customFonts || []).substring(0, 100));
  
  return normalized;
}

/* ================================================
  MUSIC — background playback (no visible player)
  ================================================ */
const musicBg = {
  audio: null,
  lastSrc: '',
  lastGain: 1,
  userStopped: false,
  needsGesture: false,
  gestureHandler: null,
};

function getPublicSlug() {
  const raw = String(state.page.displayName || state.currentUser || 'user').trim().toLowerCase();
  const withoutAt = raw.replace(/^@+/, '');
  const slug = withoutAt.replace(/[^a-z0-9_.-]/g, '');
  return slug || (state.currentUser || 'user');
}

function syncPublicUrlLabels() {
  const slug = getPublicSlug();
  const dashLink = document.getElementById('dash-link');
  const previewUrl = document.getElementById('preview-url-label');
  if (dashLink) dashLink.textContent = `seya.lol/${slug}`;
  if (previewUrl) previewUrl.textContent = `seya.lol/${slug}`;
}

function ensureBgAudio() {
  if (musicBg.audio) return musicBg.audio;
  const a = document.createElement('audio');
  a.preload = 'auto';
  a.loop = true;
  a.setAttribute('aria-hidden', 'true');
  a.style.display = 'none';
  document.body.appendChild(a);
  musicBg.audio = a;
  return a;
}

function syncBgAudioFromState() {
  const a = ensureBgAudio();
  const src = (state.page.music && state.page.music.src) ? state.page.music.src : '';
  const gain = Math.max(0.05, Math.min(1, Number(state.page.music && state.page.music.gain ? state.page.music.gain : 1)));
  const userVol = Math.max(0, Math.min(1, Number(state.page.music && state.page.music.volume != null ? state.page.music.volume : 1)));

  if (!src) {
    a.pause();
    a.removeAttribute('src');
    a.load();
    musicBg.lastSrc = '';
    musicBg.lastGain = gain;
    setMusicDemoStatus('');
    return;
  }

  if (musicBg.lastSrc !== src) {
    a.src = src;
    musicBg.lastSrc = src;
    // Reset "manual stop" when a new track is uploaded
    musicBg.userStopped = false;
  }

  // Clamp background volume
  musicBg.lastGain = gain;
  a.volume = Math.max(0, Math.min(gain, userVol * gain));
}

async function playBgMusic() {
  syncBgAudioFromState();
  const a = ensureBgAudio();
  if (!a.src) {
    setMusicDemoStatus('Upload a track first.');
    return;
  }
  try {
    await a.play();
    musicBg.needsGesture = false;
    setMusicDemoStatus('Playing');
    syncMusicPreviewUi();
  } catch (_) {
    setMusicDemoStatus('Click Play to enable audio');
    musicBg.needsGesture = true;
    installOneShotAudioGesture();
    syncMusicPreviewUi();
  }
}

function installOneShotAudioGesture() {
  if (!musicBg.needsGesture) return;
  if (musicBg.gestureHandler) return;
  const handler = () => {
    removeOneShotAudioGesture();
    // best-effort: user gesture just happened
    playBgMusic();
  };
  musicBg.gestureHandler = handler;
  document.addEventListener('pointerdown', handler, true);
  document.addEventListener('keydown', handler, true);
}

function removeOneShotAudioGesture() {
  const handler = musicBg.gestureHandler;
  if (!handler) return;
  document.removeEventListener('pointerdown', handler, true);
  document.removeEventListener('keydown', handler, true);
  musicBg.gestureHandler = null;
}

function stopBgMusicForNavigation() {
  const a = ensureBgAudio();
  removeOneShotAudioGesture();
  musicBg.needsGesture = false;
  a.pause();
  try { a.currentTime = 0; } catch (_) { /* ignore */ }
  setMusicDemoStatus('');
  syncMusicPreviewUi();
}

function stopBgMusic() {
  const a = ensureBgAudio();
  removeOneShotAudioGesture();
  musicBg.needsGesture = false;
  a.pause();
  try { a.currentTime = 0; } catch (_) { /* ignore */ }
  musicBg.userStopped = true;
  setMusicDemoStatus('Stopped');
  syncMusicPreviewUi();
}

function setMusicDemoStatus(text) {
  const el = document.getElementById('music-demo-status');
  if (!el) return;
  el.textContent = text || '';
}

function syncMusicPreviewUi() {
  const toggle = document.getElementById('music-preview-toggle');
  const volume = document.getElementById('music-volume');
  const volumeVal = document.getElementById('music-volume-val');
  const a = musicBg.audio;
  if (toggle) {
    const isPlaying = !!(a && !a.paused && a.src);
    toggle.textContent = isPlaying ? 'Pause' : 'Play';
  }
  if (volume && volumeVal) {
    const gain = Math.max(0.05, Math.min(1, Number(state.page.music && state.page.music.gain ? state.page.music.gain : 1)));
    const userVol = Math.max(0, Math.min(1, Number(state.page.music && state.page.music.volume != null ? state.page.music.volume : 1)));
    const pct = Math.round(userVol * 100);
    volume.value = String(Math.max(0, Math.min(100, pct)));
    volumeVal.textContent = `${Math.max(0, Math.min(100, pct))}%`;
    // Also ensure the real audio is clamped to the saved setting
    if (a && a.src) a.volume = Math.max(0, Math.min(gain, userVol * gain));
  }
}

function setupMusicDemoControls() {
  const toggleBtn = document.getElementById('music-preview-toggle');
  const volume = document.getElementById('music-volume');
  const volumeVal = document.getElementById('music-volume-val');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', async () => {
      musicBg.userStopped = false;
      syncBgAudioFromState();
      const a = ensureBgAudio();
      if (!a.src) {
        setMusicDemoStatus('Upload a track first.');
        syncMusicPreviewUi();
        return;
      }
      if (a.paused) await playBgMusic();
      else stopBgMusic();
    });
  }

  if (volume) {
    const apply = () => {
      const a = ensureBgAudio();
      const gain = Math.max(0.05, Math.min(1, Number(state.page.music && state.page.music.gain ? state.page.music.gain : 1)));
      const pct = Math.max(0, Math.min(100, Number(volume.value)));
      const userVol = pct / 100;
      state.page.music.volume = userVol;
      a.volume = Math.max(0, Math.min(gain, userVol * gain));
      if (volumeVal) volumeVal.textContent = `${Math.round(pct)}%`;
    };
    volume.addEventListener('input', apply);
    volume.addEventListener('change', apply);
  }

  // Keep UI in sync with real audio element events
  const a = ensureBgAudio();
  a.addEventListener('play', syncMusicPreviewUi);
  a.addEventListener('pause', syncMusicPreviewUi);
  a.addEventListener('volumechange', syncMusicPreviewUi);

  // Initial paint
  syncMusicPreviewUi();
}

/* ================================================
   ROUTER — screen switching
   ================================================ */
function showScreen(id, opts = {}) {
  const { push = true, payload = null } = opts;
  const current = document.querySelector('.screen.active');
  const currentId = current && current.id ? current.id.replace('screen-', '') : null;

  // Stop music when leaving public bio screen (or any screen, if you prefer)
  if (currentId === 'public' && id !== 'public') {
    stopBgMusicForNavigation();
  }

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + id);
  if (target) {
    target.classList.add('active');

    if (push) {
      const nextState = { screen: id, payload: payload || null };
      let newPath;
      if (id === 'public') {
        newPath = '/' + getPublicSlug();
      } else {
        newPath = '/';
      }
      history.pushState(nextState, '', newPath);
    }

    // Handle auth screen payload
    if (id === 'auth' && payload) {
      if (payload.authMode) {
        setAuthMode(payload.authMode);
      }
      if (payload.discordConnected) {
        const discordInfo = document.getElementById('discord-info');
        const discordUsername = document.getElementById('discord-username');
        if (discordInfo && discordUsername) {
          discordUsername.textContent = payload.discordUsername || '';
          discordInfo.style.display = 'block';
        }
      }
    }

    if (id === 'hub' || id === 'builder') {
      requestAnimationFrame(() => {
        initSmartGuides();
        if (id === 'builder') {
          ensureBuilderStageInner();
          renderLinksList();
        }
        updatePreview();
        if (!musicBg.userStopped && state.page.music && state.page.music.src) {
          playBgMusic();
        }
      });
    }
if (id === 'public') {
      document.body.classList.add('public-page-active');
      const overlay = document.getElementById('loading-overlay');
      if (overlay) overlay.style.display = 'block';
      requestAnimationFrame(() => {
        updatePublicPage();
        if (window.syncClickToEnterOverlay) {
          window.syncClickToEnterOverlay();
        }
        setTimeout(() => {
          applyPublicScale();
          applyPhoneBlur();
          if (window.setup3DTilt) window.setup3DTilt();
          if (window.setupCustomObject3DTilt) window.setupCustomObject3DTilt();
          if (overlay) overlay.style.display = 'none';
          startTrail();
        }, 50);
        musicBg.userStopped = false;
        if (state.page.music && state.page.music.src) playBgMusic();
      });
    } else {
      stopTrail();
      document.body.classList.remove('public-page-active');
      const publicScreenEl = document.getElementById('screen-public');
      if (publicScreenEl) {
        publicScreenEl.style.backgroundImage = '';
        publicScreenEl.style.backgroundSize = '';
        publicScreenEl.style.backgroundPosition = '';
        publicScreenEl.style.backgroundRepeat = '';
      }
      if (window.reset3DTilt) window.reset3DTilt();
    }
  }
}

async function loadPublicPage(username) {
  console.log('loadPublicPage called:', username);
  
  const userToLoad = window.__PUBLIC_USER__ || username;
  console.log('Loading page for:', userToLoad);
  
  try {
    const res = await fetch('/api/public-page?user=' + encodeURIComponent(userToLoad));
    const data = await res.json();
    console.log('API response:', data);
    
    if (data.found && data.published && data.pageData) {
      console.log('[Load] Raw pageData.layout:', JSON.stringify(data.pageData.layout).substring(0, 300));
      console.log('[Load] Raw pageData.customFonts:', JSON.stringify(data.pageData.customFonts || []).substring(0, 100));
      
    state.page = normalizePageData(data.pageData);
    
    console.log('[Load] Normalized layout.phone:', JSON.stringify(state.page.layout?.phone));
    console.log('[Load] Normalized customFonts:', JSON.stringify(state.page.customFonts || []).substring(0, 100));
    
    // Restore custom fonts
    restoreCustomFonts();
      
      // Log loaded rotation values
      console.log('[Load] Loaded layout:', JSON.stringify(state.page.layout).substring(0, 500));
      console.log('[Load] layout.phone.tilt3D:', JSON.stringify(state.page.layout?.phone?.tilt3D));
      Object.entries(state.page.layout || {}).forEach(([key, box]) => {
        if (box.rotate) {
          console.log(`[Load] ${key} rotation: ${box.rotate}°`);
        }
      });
      
      // Apply saved settings (with fallbacks to defaults)
      console.log('Loaded pageData clickToEnter:', state.page.clickToEnter, 'phoneBlur:', state.page.phoneBlur);
      if (state.page.phoneBlur === undefined) state.page.phoneBlur = false;
      if (state.page.phoneBlurStrength === undefined) state.page.phoneBlurStrength = 3;
      if (state.page.phoneBorderRadius === undefined) state.page.phoneBorderRadius = 42;
      if (state.page.bgPhoneOpacity === undefined) state.page.bgPhoneOpacity = 1;
      if (state.page.clickToEnter === undefined) state.page.clickToEnter = { enabled: false, text: 'Click to enter' };
      console.log('After defaults - phoneBlur:', state.page.phoneBlur, 'phoneBorderRadius:', state.page.phoneBorderRadius, 'bgPhoneOpacity:', state.page.bgPhoneOpacity);
      applyPhoneBlur();
      applyPhoneRadius();
      applyPhoneBackgroundOpacity();
      updatePublicPage();
      
      // Sync 3D Tilt profile toggle after loading
      if (window.syncTilt3DProfileToggle) window.syncTilt3DProfileToggle();
      
      document.body.classList.add('public-page-active');
      showScreen('public', { push: true });
      return true;
    } else {
      console.log('Page not available:', data.message || 'unknown reason');
      showScreen('landing', { push: false });
      return false;
    }
  } catch (e) {
    console.error('Failed to load public page:', e);
    showScreen('landing', { push: false });
    return false;
  }
}

function showPublicPlaceholder(username) {
  const publicScreen = document.getElementById('screen-public');
  if (!publicScreen) return;
  
  const stage = publicScreen.querySelector('.public-stage');
  if (stage) {
    stage.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;">
        <div style="color:#888;font-family:sans-serif;font-size:18px;text-align:center;">
          @${username}<br>page not created yet :(
        </div>
      </div>
    `;
  }
}

function setupHistoryRouting() {
  const initialPath = window.__INITIAL_PATH__;
  const publicUser = window.__PUBLIC_USER__;
  const publicValid = window.__PUBLIC_VALID__;
  
  console.log('setupHistoryRouting called:', { publicUser, publicValid, initialPath, pageData: !!window.__PAGE_DATA__ });
  
  if (publicUser && window.__PAGE_DATA__) {
    console.log('Loading public page with preloaded data');
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'block';
    
    console.log('[Preload] Raw __PAGE_DATA__.layout:', JSON.stringify(window.__PAGE_DATA__.layout).substring(0, 300));
    console.log('[Preload] Raw __PAGE_DATA__.customFonts:', JSON.stringify(window.__PAGE_DATA__.customFonts || []).substring(0, 100));
    
    state.page = normalizePageData({ ...getDefaultPageData(), ...window.__PAGE_DATA__ });
    
    console.log('[Preload] Normalized layout.phone:', JSON.stringify(state.page.layout?.phone));
    console.log('[Preload] Normalized customFonts:', JSON.stringify(state.page.customFonts || []).substring(0, 100));
    
    // Restore custom fonts
    restoreCustomFonts();
    
    if (state.page.clickToEnter === undefined) state.page.clickToEnter = { enabled: false, text: 'Click to enter' };
    console.log('Preloaded - clickToEnter:', state.page.clickToEnter, 'phoneBlur:', state.page.phoneBlur);
    applyPhoneBlur();
    applyPhoneRadius();
    applyPhoneBackgroundOpacity();
    updatePublicPage();
    
    // Sync 3D Tilt profile toggle after preloading
    if (window.syncTilt3DProfileToggle) window.syncTilt3DProfileToggle();
    
    document.body.classList.add('public-page-active');
    setTimeout(() => {
      applyPublicScale();
      if (overlay) overlay.style.display = 'none';
    }, 50);
    setupPublicPageResponsiveScale();
    showScreen('public', { push: true });
    return;
  }
  
  if (initialPath && initialPath !== '/') {
    const path = initialPath.replace(/^\//, '');
    
    if (path === 'landing') {
      showScreen('landing', { push: false });
    } else if (path === 'auth') {
      showScreen('auth', { push: false });
    } else if (path === 'dashboard') {
      showScreen('dashboard', { push: false });
    } else if (path === 'builder') {
      showScreen('builder', { push: false });
    } else if (path === 'hub') {
      showScreen('hub', { push: false });
    } else if (path === 'public') {
      showScreen('public', { push: false });
    } else if (path && !['api', 'assets', 'css', 'js'].includes(path.split('.')[0])) {
      loadPublicPage(path);
    }
  }

  if (!history.state || !history.state.screen) {
    history.replaceState({ screen: 'landing', payload: null }, '', '/');
  }

  window.addEventListener('popstate', (ev) => {
    const next = (ev && ev.state && ev.state.screen) ? ev.state.screen : 'landing';
    const payload = (ev && ev.state && ev.state.payload) ? ev.state.payload : null;
    if (next === 'auth' && payload && payload.authMode) {
      setAuthMode(payload.authMode);
    }
    showScreen(next, { push: false, payload });
  });
}

/* ================================================
   AUTH
   ================================================ */
let authToken = localStorage.getItem('authToken');

function setupAuth() {
  const nicknameInput = document.getElementById('nickname-input');
  const submitBtn     = document.getElementById('auth-submit-btn');
  const hint          = document.getElementById('nickname-hint');

  const passwordInput = document.getElementById('password-input');
  const passwordHint  = document.getElementById('password-hint');
  const confirmInput  = document.getElementById('confirm-password-input');
  const confirmHint   = document.getElementById('confirm-password-hint');

  nicknameInput.addEventListener('input', () => {
    const val = nicknameInput.value;
    const clean = val.replace(/[^a-z0-9_.]/gi, '').toLowerCase();
    if (val !== clean) nicknameInput.value = clean;

    if (clean.length > 0 && clean.length < 1) {
      hint.textContent = 'Minimum 1 character';
    } else if (clean.length > 0) {
      hint.textContent = '';
    }
  });

  passwordInput.addEventListener('input', () => {
    if (passwordInput.value.length > 0 && passwordInput.value.length < 4) {
      passwordHint.textContent = 'Minimum 4 characters';
    } else {
      passwordHint.textContent = '';
    }
  });

  confirmInput.addEventListener('input', () => {
    if (confirmInput.value !== passwordInput.value && confirmInput.value.length > 0) {
      confirmHint.textContent = 'Passwords do not match';
    } else {
      confirmHint.textContent = '';
    }
  });

  const handleEnter = (e) => {
    if (e.key === 'Enter') handleAuthSubmit();
  };
  nicknameInput.addEventListener('keydown', handleEnter);
  passwordInput.addEventListener('keydown', handleEnter);
  confirmInput.addEventListener('keydown', handleEnter);

  submitBtn.addEventListener('click', handleAuthSubmit);

  const discordBtn = document.getElementById('discord-btn');
  if (discordBtn) {
    discordBtn.addEventListener('click', () => {
      const clientId = '1505514252473991238';
      const redirectUri = encodeURIComponent('http://seya.lol/api/discord-callback.php');
      const scope = 'identify%20guilds%20email';
      const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
      window.location.href = oauthUrl;
    });
  }

  // Handle Discord OAuth redirect
  if (window.__AUTH_PARAM__ === 'discord-connected') {
    const discordUser = new URLSearchParams(window.location.search).get('discord_user') || '';
    console.log('Discord connected, user:', discordUser);
    setAuthMode('signup');
    showScreen('auth', { payload: { authMode: 'signup', discordConnected: true, discordUsername: discordUser } });
  }
}

async function handleAuthSubmit() {
  const input = document.getElementById('nickname-input');
  const hint  = document.getElementById('nickname-hint');
  const val   = input.value.trim().toLowerCase();

  const passwordInput = document.getElementById('password-input');
  const passwordHint  = document.getElementById('password-hint');
  const password      = passwordInput.value;

  const confirmInput  = document.getElementById('confirm-password-input');
  const confirmHint   = document.getElementById('confirm-password-hint');
  const confirmPass   = confirmInput.value;

  if (!val || val.length < 1) {
    hint.textContent = 'Enter a nickname (minimum 1 character)';
    input.focus();
    return;
  }

  if (state.auth.mode === 'signup') {
    if (!password || password.length < 4) {
      passwordHint.textContent = 'Enter a password (minimum 4 characters)';
      passwordInput.focus();
      return;
    }
    if (password !== confirmPass) {
      confirmHint.textContent = 'Passwords do not match';
      confirmInput.focus();
      return;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val, password })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        hint.textContent = 'Server error (invalid response)';
        return;
      }

      if (!res.ok) {
        hint.textContent = data.error || 'Registration failed';
        return;
      }

      if (!data.success) {
        hint.textContent = data.error || 'Registration failed';
        return;
      }

      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('username', val);

      state.currentUser = val;
      if (data.pageData) {
        state.page = normalizePageData({ ...state.page, ...data.pageData });
      }
      applyPhoneBlur();
      applyPhoneRadius();
      applyPhoneBackgroundOpacity();
      syncPhoneUiControls();
      state.page.displayName = '@' + val;
      state.page.displayNameHtml = escapeHtml(state.page.displayName);

      document.getElementById('greet-name').textContent = '@' + val;
      document.getElementById('nav-avatar').textContent = val[0].toUpperCase();
      syncPublicUrlLabels();

      document.getElementById('edit-display-name').value = '@' + val;
      document.getElementById('edit-bio').value = state.page.bio;

      updatePreview();

      showScreen('landing');
      updateLandingButtons();
      showToast('Account created! 🎉');

      originalPageState = JSON.parse(JSON.stringify(state.page));
      pageModified = false;

      resetAuthForm();
    } catch (e) {
      hint.textContent = 'Server error. Please try again.';
      console.error(e);
    }
  } else {
    if (!password) {
      passwordHint.textContent = 'Enter your password';
      passwordInput.focus();
      return;
    }

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: val, password })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (e) {
        hint.textContent = 'Server error (invalid response)';
        return;
      }

      if (!res.ok) {
        hint.textContent = data.error || 'Invalid credentials';
        return;
      }

      if (!data.success) {
        hint.textContent = data.error || 'Login failed';
        return;
      }

      authToken = data.token;
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('username', val);

      state.currentUser = val;
      if (data.pageData) {
        state.page = normalizePageData({ ...state.page, ...data.pageData });
      }
      applyPhoneBlur();
      applyPhoneRadius();
      applyPhoneBackgroundOpacity();
      syncPhoneUiControls();
      state.page.displayName = '@' + val;
      state.page.displayNameHtml = escapeHtml(state.page.displayName);

      document.getElementById('greet-name').textContent = '@' + val;
      document.getElementById('nav-avatar').textContent = val[0].toUpperCase();
      syncPublicUrlLabels();

      document.getElementById('edit-display-name').value = '@' + val;
      document.getElementById('edit-bio').value = state.page.bio || '';

      updatePreview();

      showScreen('landing');
      updateLandingButtons();
      showToast('Welcome back! 👋');

      originalPageState = JSON.parse(JSON.stringify(state.page));
      pageModified = false;

      resetAuthForm();
    } catch (e) {
      hint.textContent = 'Server error. Please try again.';
      console.error(e);
    }
  }
}

function resetAuthForm() {
  document.getElementById('nickname-input').value = '';
  document.getElementById('nickname-hint').textContent = '';
  document.getElementById('password-input').value = '';
  document.getElementById('password-hint').textContent = '';
  document.getElementById('confirm-password-input').value = '';
  document.getElementById('confirm-password-hint').textContent = '';
}

async function checkSession() {
  if (!authToken) {
    console.log('checkSession: no authToken');
    return false;
  }
  
  console.log('checkSession: sending request with token:', authToken.substring(0, 10) + '...');
  
  try {
    const res = await fetch('/api/check-session?token=' + encodeURIComponent(authToken), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('checkSession: response status:', res.status);
    const data = await res.json();
    console.log('checkSession: response data:', data);
    console.log('checkSession: pageData.customFonts:', JSON.stringify(data.pageData?.customFonts || []).substring(0, 100));
    console.log('checkSession: pageData.customFonts count:', (data.pageData?.customFonts || []).length);
    
    if (data.valid) {
      state.currentUser = data.username;
      if (data.pageData) {
        state.page = normalizePageData({ ...state.page, ...data.pageData });
      }
      // Apply phone blur and radius from saved data
      applyPhoneBlur();
      applyPhoneRadius();
      applyPhoneBackgroundOpacity();
      syncPhoneUiControls();
      state.page.displayName = '@' + data.username;
      const plainEscaped = escapeHtml(state.page.displayName);
      if (!state.page.displayNameHtml || state.page.displayNameHtml === plainEscaped) {
        state.page.displayNameHtml = plainEscaped;
      }
      
      console.log('checkSession loaded - displayNameHtml:', state.page.displayNameHtml);
      console.log('checkSession loaded - customObjects count:', (state.page.customObjects || []).length);
      console.log('checkSession loaded - customObjects:', JSON.stringify(state.page.customObjects));
      console.log('checkSession loaded - effects:', JSON.stringify(state.page.effects));
      console.log('checkSession loaded - layout.phone:', JSON.stringify(state.page.layout?.phone));
      console.log('checkSession loaded - layout.phone.tilt3D:', JSON.stringify(state.page.layout?.phone?.tilt3D));
      console.log('checkSession loaded - customFonts:', JSON.stringify(state.page.customFonts || []).substring(0, 100));
      console.log('checkSession loaded - customFonts count:', (state.page.customFonts || []).length);
      console.log('checkSession loaded - customFonts detail:', (state.page.customFonts || []).map(f => ({name: f.name, hasData: !!f.dataUrl})));
      
      // Restore custom fonts
      restoreCustomFonts();
      
      // Sync 3D Tilt profile toggle after loading
      if (window.syncTilt3DProfileToggle) window.syncTilt3DProfileToggle();
      
      document.getElementById('greet-name').textContent = '@' + data.username;
      document.getElementById('nav-avatar').textContent = data.username[0].toUpperCase();
      syncPublicUrlLabels();
      syncDiscordUI();
      
      document.getElementById('edit-display-name').value = state.page.displayName || '';
      document.getElementById('edit-bio').value = state.page.bio || '';
      syncUiFromState();
      
      localStorage.setItem('username', data.username);
      
      originalPageState = JSON.parse(JSON.stringify(state.page));
      pageModified = false;
      
      return true;
    } else {
      console.warn('[checkSession] Server returned valid:false — clearing authToken');
      console.warn('[checkSession] Response data:', JSON.stringify(data));
      localStorage.removeItem('authToken');
      localStorage.removeItem('username');
      authToken = null;
      return false;
    }
  } catch (e) {
    console.error('Session check failed:', e);
    console.error('Session check failed - authToken was:', authToken ? 'present' : 'missing');
    return false;
  }
}

function logout() {
  fetch('/api/logout', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  });
  
  authToken = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('username');
  
  state.currentUser = null;
  state.page = {
    displayName: '',
    displayNameHtml: '',
    bio: 'Hey, this is my page ✨',
    bioHtml: 'Hey, this is my page ✨',
    avatar: '',
    music: { src: '', name: '', gain: 1, volume: 1 },
    linksEnabled: false,
    links: [],
    bg: 'bg-black',
    bgImageGlobal: '',
    bgImagePhone: '',
    bgPhoneOpacity: 1,
    deleted: { avatar: false, name: false, bio: false, phone: false },
    btnStyle: '',
    accentColor: '#d6d6d6',
    font: 'Syne',
    nameSize: 22,
    textManualSize: { name: false, bio: false },
    customObjects: [],
    customObjectCounter: 0,
    animations: {},
    phoneFrameImage: '',
    cursorImage: '',
    cursorSize: 32,
    cursorTrail: { mode: 'none', image: '', config: {} },
    clickToEnter: { enabled: false, text: 'Click to enter' },
    layout: {
      avatar: { x: 230, y: 150, w: 82, h: 82 },
      name: { x: 219, y: 240, w: 140, h: 30 },
      bio: { x: 219, y: 300, w: 140, h: 50 },
      links: { x: 219, y: 434, w: 232, h: 44 },
      phone: { x: 0, y: 0, w: 280, h: 560 }
    }
  };
  
  showScreen('landing');
  updateLandingButtons();
  showToast('Logged out');
}

let pageModified = false;
let originalPageState = null;

function markPageModified() {
  pageModified = true;
}

function checkPageModified() {
  if (!originalPageState) return false;
  return JSON.stringify(state.page) !== JSON.stringify(originalPageState);
}

async function getStorageInfo() {
  if (!authToken) return null;
  
  try {
    const res = await fetch('/api/storage-info', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      }
    });
    return await res.json();
  } catch (e) {
    console.error('Storage info error:', e);
    return null;
  }
}

async function checkCanUpload(dataSize) {
  if (!authToken) return { allowed: false, error: 'Not logged in' };
  
  try {
    const res = await fetch('/api/check-upload', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ dataSize })
    });
    return await res.json();
  } catch (e) {
    console.error('Check upload error:', e);
    return { allowed: false, error: 'Server error' };
  }
}

function getDataUrlSize(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return 0;
  const base64 = dataUrl.split(',')[1];
  if (!base64) return 0;
  return Math.ceil((base64.length * 3) / 4);
}

async function savePageToServer(publish = false) {
  if (!authToken) {
    showToast('Please log in to save');
    return;
  }
  
  console.log('Saving pageData.customObjects:', JSON.stringify(state.page.customObjects).substring(0, 500));
  console.log('Saving pageData.layout:', JSON.stringify(state.page.layout).substring(0, 500));
  console.log('Saving layout.phone.tilt3D:', JSON.stringify(state.page.layout?.phone?.tilt3D));
  console.log('Saving customFonts count:', (state.page.customFonts || []).length);
  console.log('Saving customFonts:', JSON.stringify(state.page.customFonts || []).substring(0, 200));
  console.log('savePageToServer: authToken=', authToken ? `${authToken.substring(0, 30)}... (len=${authToken.length})` : 'null');
  console.log('savePageToServer: authToken (full, hidden):', authToken ? `${authToken.substring(0, 6)}...${authToken.slice(-4)}` : 'null');
  
  // Log rotation values
  Object.entries(state.page.layout || {}).forEach(([key, box]) => {
    if (box.rotate) {
      console.log(`[Save] ${key} rotation: ${box.rotate}°`);
    }
  });
  
  try {
    const res = await fetch('/api/save-page?token=' + encodeURIComponent(authToken), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ 
        pageData: state.page,
        publish: publish
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
    console.log('Save successful, response:', data);
    if (data.debug) {
      console.log('[Save Debug] Server saved layout.phone:', JSON.stringify(data.debug.layoutPhone));
      console.log('[Save Debug] Server saved customFonts:', JSON.stringify(data.debug.customFonts || []).substring(0, 100));
    }
    if (publish) {
        showToast('Page published! 🌟');
      } else {
        showToast('Page saved! 💾');
      }
      pageModified = false;
      originalPageState = JSON.parse(JSON.stringify(state.page));
    } else {
      console.log('Save failed:', data);
      console.log('Save failed — authToken at time of failure:', authToken ? `${authToken.substring(0, 10)}...` : 'null');
      console.log('Save failed — status:', res.status);
      if (data.error === 'Invalid token') {
        console.error('[CRITICAL] Server rejected token. Token in localStorage may differ from DB.');
        console.error('[CRITICAL] localStorage authToken (first/last 6):',
          authToken ? `${authToken.substring(0, 6)}...${authToken.slice(-6)}` : 'null');
      }
      showToast(data.error || 'Failed to save');
    }
  } catch (e) {
    console.error('Save failed:', e);
    showToast('Save error');
  }
}

async function autoSaveIfNeeded() {
  if (pageModified && authToken) {
    await savePageToServer(false);
  }
}

function setAuthMode(mode) {
  state.auth.mode = mode;
  const title   = document.getElementById('auth-title');
  const sub     = document.getElementById('auth-sub');
  const swText  = document.getElementById('auth-switch-text');
  const swLink  = document.getElementById('auth-switch-link');

  const passwordWrap = document.getElementById('password-wrap');
  const confirmWrap = document.getElementById('confirm-password-wrap');
  const discordBtn = document.getElementById('discord-btn');
  const authDivider = document.getElementById('auth-divider');

  if (mode === 'login') {
    title.textContent  = 'Welcome back';
    sub.textContent    = 'Enter your nickname and password';
    swText.textContent = "Don't have an account?";
    swLink.textContent = ' Sign up';
    passwordWrap.style.display = '';
    confirmWrap.style.display = 'none';
    if (discordBtn) discordBtn.style.display = '';
    authDivider.style.display = '';
    document.getElementById('password-input').placeholder = 'Your password';
    document.getElementById('auth-submit-btn').textContent = 'Log in →';
  } else {
    title.textContent  = 'Create account';
    sub.textContent    = 'Choose a nickname and password';
    swText.textContent = 'Already have an account?';
    swLink.textContent = ' Log in';
    passwordWrap.style.display = '';
    confirmWrap.style.display = '';
    if (discordBtn) discordBtn.style.display = '';
    authDivider.style.display = '';
    document.getElementById('password-input').placeholder = 'Create a password';
    document.getElementById('auth-submit-btn').textContent = 'Create account →';
  }
}

function toggleAuth() {
  setAuthMode(state.auth.mode === 'login' ? 'signup' : 'login');
}

function syncDiscordUI() {
  const discord = state.page.discord || {};
  const connectEl = document.getElementById('dash-discord-connect');
  const connectedEl = document.getElementById('dash-discord-connected');
  const section = document.getElementById('dash-discord');
  if (!connectEl || !connectedEl) return;

  if (discord.id) {
    connectEl.style.display = 'none';
    connectedEl.style.display = 'flex';
    if (section) section.classList.add('dash-section--discord-linked');
    const avatarEl = document.getElementById('dash-discord-avatar');
    const usernameEl = document.getElementById('dash-discord-username');
    if (avatarEl && discord.id && discord.avatar) {
      avatarEl.src = 'https://cdn.discordapp.com/avatars/' + discord.id + '/' + discord.avatar + '.png';
    }
    if (usernameEl) usernameEl.textContent = discord.username || '';
  } else {
    connectEl.style.display = '';
    connectedEl.style.display = 'none';
    if (section) section.classList.remove('dash-section--discord-linked');
  }
}

function setupDiscord() {
  const connectBtn = document.getElementById('dash-discord-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => {
      const clientId = '1505514252473991238';
      const redirectUri = encodeURIComponent('http://seya.lol/api/discord-callback.php');
      const scope = 'identify%20guilds%20email';
      const state = encodeURIComponent(authToken || '');
      const oauthUrl = 'https://discord.com/oauth2/authorize?client_id=' + clientId + '&redirect_uri=' + redirectUri + '&response_type=code&scope=' + scope + '&state=' + state;
      window.open(oauthUrl, 'discord-auth', 'width=600,height=700,popup=1');
    });
  }

  const unlinkBtn = document.getElementById('dash-discord-unlink-btn');
  if (unlinkBtn) {
    unlinkBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/discord-unlink.php', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + authToken }
        });
        const data = await res.json();
        if (data.success) {
          state.page.discord = { id: '', username: '', avatar: '', discriminator: '0' };
          syncDiscordUI();
        }
      } catch (e) {
        console.error('Failed to unlink Discord', e);
      }
    });
  }
}

window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'discord-linked') {
    if (e.data.success && e.data.discord) {
      state.page.discord = e.data.discord;
      syncDiscordUI();
      syncWidgetsSection();
      showToast('Discord connected!');
    }
  }
});

function setupWidgets() {
  const toggleBtn = document.getElementById('discord-widget-toggle');
  if (!toggleBtn) return;

  const syncUI = () => {
    const enabled = state.page.discordWidgets || false;
    toggleBtn.textContent = enabled ? 'On' : 'Off';
    toggleBtn.classList.toggle('btn--active', enabled);
  };

  syncUI();

  toggleBtn.addEventListener('click', () => {
    pushHistory();
  state.page.discordWidgets = !state.page.discordWidgets;
  syncUI();
  markPageModified();
    updateDiscordWidgets();
  });
}

function setupSpotifyWidget() {
  const urlInput = document.getElementById('spotify-widget-url');
  const addBtn = document.getElementById('spotify-widget-add');
  
  if (addBtn && urlInput) {
    addBtn.addEventListener('click', () => {
      const input = urlInput.value.trim();
      if (!input) {
        showToast('Please enter a Spotify track URL or iframe code');
        return;
      }
      
      let embedUrl = null;
      let fullIframe = null;
      
      if (input.includes('<iframe')) {
        const srcMatch = input.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
          embedUrl = srcMatch[1];
          fullIframe = input;
        } else {
          showToast('Could not extract URL from iframe code');
          return;
        }
      } else {
        const spotifyRegex = /(?:open\.spotify\.com\/track\/|spotify\.com\/track\/)([a-zA-Z0-9]+)/i;
        const match = input.match(spotifyRegex);
        if (match) {
          const trackId = match[1];
          embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator`;
        } else {
          showToast('Please enter a valid Spotify track URL or iframe code');
          return;
        }
      }
      
      pushHistory();
      state.page.spotifyWidget = {
        enabled: true,
        embedUrl: embedUrl,
        fullIframe: fullIframe || null
      };
      markPageModified();
      
updatePublicSpotifyWidget();
updatePreviewSpotifyWidget();

      
      showToast('Spotify track added!');
    });
  }
}

function updatePublicSpotifyWidget() {
  const container = document.getElementById('spotify-widget-container');
  const iframe = document.getElementById('spotify-player');
  
  if (!container || !iframe) return;
  
  const embedUrl = state.page.spotifyWidget && state.page.spotifyWidget.embedUrl;
  const fullIframe = state.page.spotifyWidget && state.page.spotifyWidget.fullIframe;
  
  if (embedUrl) {
    if (fullIframe) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fullIframe;
      const newIframe = tempDiv.firstChild;
      if (newIframe) {
        container.replaceWith(newIframe);
        newIframe.id = 'spotify-player';
        newIframe.className = 'spotify-widget-container';
        newIframe.style.display = 'block';
        return;
      }
    }
    iframe.src = embedUrl;
    container.style.display = 'block';
  } else {
    container.style.display = 'none';
  }
}

function updatePreviewSpotifyWidget() {
    const container = document.getElementById('preview-spotify-widget-container');
    const iframe = document.getElementById('preview-spotify-player');
    if (!container || !iframe) return;
    const embedUrl = state.page.spotifyWidget && state.page.spotifyWidget.embedUrl;
    const fullIframe = state.page.spotifyWidget && state.page.spotifyWidget.fullIframe;
    if (embedUrl) {
        if (fullIframe) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = fullIframe;
            const newIframe = tempDiv.firstChild;
            if (newIframe) {
                container.replaceWith(newIframe);
                newIframe.id = 'preview-spotify-player';
                newIframe.className = 'spotify-widget-container';
                newIframe.style.display = 'block';
                return;
            }
        }
        iframe.src = embedUrl;
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

/* ================================================
    BUILDER — sidebar panels
    ================================================ */
function setupBuilderNav() {
  document.querySelectorAll('.section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = btn.dataset.panel;
      // Deactivate all
      document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
      // Activate target
      btn.classList.add('active');
      const panelEl = document.getElementById('panel-' + panel);
      if (panelEl) panelEl.classList.add('active');
    });
  });
}

function ensureResizeHandle(el) {
  if (!el) return;
  if (!el.querySelector('.resize-handle')) {
    const handle = document.createElement('span');
    handle.className = 'resize-handle';
    handle.setAttribute('aria-hidden', 'true');
    el.appendChild(handle);
  }
}

function ensureRotateHandle(el) {
  if (!el) return;
  if (!el.querySelector('.rotate-handle')) {
    const handle = document.createElement('span');
    handle.className = 'rotate-handle';
    handle.setAttribute('aria-hidden', 'true');
    el.appendChild(handle);
  }
  if (!el.querySelector('.rotation-arc-svg')) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.className = 'rotation-arc-svg';
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.className = 'rotation-arc-path';
    path.setAttribute('d', 'M 50 50 L 50 0');
    svg.appendChild(path);
    el.appendChild(svg);
  }
  if (!el.querySelector('.rotation-angle-tooltip')) {
    const tooltip = document.createElement('div');
    tooltip.className = 'rotation-angle-tooltip';
    tooltip.textContent = '0°';
    el.appendChild(tooltip);
  }
}

function ensureRadiusHandles(el) {
  if (!el) return;
  if (el.querySelector('.radius-handle')) return;
  const corners = ['nw', 'ne', 'sw', 'se'];
  corners.forEach(corner => {
    const handle = document.createElement('span');
    handle.className = `radius-handle radius-${corner}`;
    handle.dataset.corner = corner;
    el.appendChild(handle);
  });
}

/* ================================================
   UNDO / REDO
   ================================================ */
const stateHistory = [];
let redoHistory = [];
const MAX_HISTORY = 50;

function pushHistory() {
  if (stateHistory.length >= MAX_HISTORY) stateHistory.shift();
  stateHistory.push(JSON.parse(JSON.stringify(state.page)));
  redoHistory = [];
}

function undo() {
  if (stateHistory.length === 0) {
    showToast('Nothing to undo');
    return;
  }
  redoHistory.push(JSON.parse(JSON.stringify(state.page)));
  state.page = stateHistory.pop();
  updatePreview();
  renderLinksList();
  updatePublicPage();
  syncUiFromState();
  showToast('Undone');
}

function redo() {
  if (redoHistory.length === 0) {
    showToast('Nothing to redo');
    return;
  }
  stateHistory.push(JSON.parse(JSON.stringify(state.page)));
  state.page = redoHistory.pop();
  updatePreview();
  renderLinksList();
  updatePublicPage();
  syncUiFromState();
  showToast('Redone');
}

function syncUiFromState() {
  console.log('[CustomFonts] === syncUiFromState called ===');
  console.log('[CustomFonts] state.page.customFonts:', state.page.customFonts ? state.page.customFonts.length : 'undefined');
  
  // Restore custom fonts first
  restoreCustomFonts();
  
  // Sync sidebar inputs from state.page
  const nameInput = document.getElementById('edit-display-name');
  if (nameInput) nameInput.value = state.page.displayName || '';
  const bioInput = document.getElementById('edit-bio');
  if (bioInput) bioInput.value = state.page.bio || '';
  // Sync opacity slider
  syncPhoneBgOpacityUi();
  // Sync font selection
  if (state.page.font) {
    document.querySelectorAll('#font-options .option-item').forEach((i) => i.classList.remove('active'));
    const fontItem = document.querySelector(`#font-options .option-item[data-font="${state.page.font}"]`);
    if (fontItem) fontItem.classList.add('active');
  }
  // Sync bg selection
  if (state.page.bg) {
    document.querySelectorAll('[data-bg]').forEach((i) => i.classList.remove('active'));
    const bgItem = document.querySelector(`[data-bg="${state.page.bg}"]`);
    if (bgItem) bgItem.classList.add('active');
  }
  // Sync button style
  if (state.page.btnStyle) {
    document.querySelectorAll('[data-btn-style]').forEach((i) => i.classList.remove('active'));
    const btnItem = document.querySelector(`[data-btn-style="${state.page.btnStyle}"]`);
    if (btnItem) btnItem.classList.add('active');
  }
  // Sync accent color
  if (state.page.accentColor) {
    document.querySelectorAll('[data-accent]').forEach((i) => i.classList.remove('active'));
    const colorItem = document.querySelector(`[data-accent="${state.page.accentColor}"]`);
    if (colorItem) colorItem.classList.add('active');
  }
  // Sync name size
  const nameSizeSlider = document.getElementById('name-size-slider');
  const nameSizeVal = document.getElementById('name-size-val');
  if (nameSizeSlider) nameSizeSlider.value = state.page.nameSize || 22;
  if (nameSizeVal) nameSizeVal.textContent = (state.page.nameSize || 22) + 'px';
  // Sync click-to-enter toggle
  const clickToEnterToggle = document.getElementById('click-to-enter-toggle');
  const clickToEnterControls = document.getElementById('click-to-enter-controls');
  const clickToEnterText = document.getElementById('click-to-enter-text');
  if (clickToEnterToggle) {
    clickToEnterToggle.textContent = state.page.clickToEnter && state.page.clickToEnter.enabled ? 'On' : 'Off';
    clickToEnterToggle.classList.toggle('btn--active', state.page.clickToEnter && state.page.clickToEnter.enabled);
  }
  if (clickToEnterControls) {
    clickToEnterControls.style.display = (state.page.clickToEnter && state.page.clickToEnter.enabled) ? '' : 'none';
  }
  if (clickToEnterText && state.page.clickToEnter) {
    clickToEnterText.value = state.page.clickToEnter.text || 'Click to enter';
  }
}

/* ================================================
   KEYBOARD SHORTCUTS
   ================================================ */

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (ev) => {
    if (ev.ctrlKey && ev.key === 'z') {
      ev.preventDefault();
      if (ev.shiftKey) redo();
      else undo();
    }
    if (ev.ctrlKey && ev.key === 'y') {
      ev.preventDefault();
      redo();
    }
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function setEditableText(el, html, fallbackText = '') {
  if (!el) return;
  const handle = el.querySelector('.resize-handle');
  const rotateHandle = el.querySelector('.rotate-handle');
  const existing = el.querySelector('.text-content');
  const newHtml = html || escapeHtml(fallbackText);
  if (existing) {
    const existingHtml = existing.innerHTML;
    if (existingHtml === newHtml) return;
    existing.innerHTML = newHtml;
    if (handle && !handle.parentNode) el.appendChild(handle);
    else if (!handle) ensureResizeHandle(el);
    if (rotateHandle && !rotateHandle.parentNode) el.appendChild(rotateHandle);
    else if (!rotateHandle) ensureRotateHandle(el);
    return;
  }
  const content = document.createElement('span');
  content.className = 'text-content';
  content.contentEditable = 'true';
  content.spellcheck = false;
  content.innerHTML = newHtml;
  el.textContent = '';
  el.appendChild(content);
  if (handle) el.appendChild(handle);
  else ensureResizeHandle(el);
  if (rotateHandle) el.appendChild(rotateHandle);
  else ensureRotateHandle(el);
}

function setStaticText(el, html, fallbackText = '') {
  if (!el) return;
  const content = document.createElement('span');
  content.className = 'text-content';
  content.contentEditable = 'false';
  content.spellcheck = false;
  content.innerHTML = html || escapeHtml(fallbackText);
  el.textContent = '';
  el.appendChild(content);
}

/* ================================================
   AVATAR UPLOAD
   ================================================ */
function setupAvatarUpload() {
  const input = document.getElementById('avatar-file-input');
  const hint = document.getElementById('avatar-hint');
  const uploadTitle = document.getElementById('avatar-upload-title');
  const deleteBtn = document.getElementById('delete-avatar-btn');
  if (!input) return;

  const updateAvatarUI = () => {
    if (uploadTitle) {
      uploadTitle.textContent = state.page.avatar ? 'Change avatar' : 'Upload image or GIF';
    }
    if (deleteBtn) {
      deleteBtn.style.display = state.page.avatar ? '' : 'none';
    }
  };
  updateAvatarUI();

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      hint.textContent = 'Please upload an image or GIF file.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      pushHistory();
      state.page.avatar = String(reader.result || '');
      hint.textContent = '';
      updatePreview();
      updateAvatarUI();
    };
    reader.onerror = () => {
      hint.textContent = 'Could not read this file. Try another one.';
    };
    reader.readAsDataURL(file);
    input.value = '';
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      pushHistory();
      state.page.avatar = '';
      updatePreview();
      updateAvatarUI();
      showToast('Avatar removed');
    });
  }
}

/* ================================================
   MUSIC UPLOAD (drop / click)
   ================================================ */
function setupMusicUpload() {
  const dropzone = document.getElementById('music-dropzone');
  const input = document.getElementById('music-file-input');
  const hint = document.getElementById('music-hint');
  const uploadTitle = document.getElementById('music-upload-title');
  const deleteBtn = document.getElementById('delete-music-btn');
  if (!dropzone || !input) return;

  const updateMusicUI = () => {
    if (uploadTitle) {
      uploadTitle.textContent = (state.page.music && state.page.music.src) ? 'Change music' : '+ Add music';
    }
    if (deleteBtn) {
      deleteBtn.style.display = (state.page.music && state.page.music.src) ? '' : 'none';
    }
  };
  updateMusicUI();

  const openPicker = () => input.click();
  dropzone.addEventListener('click', openPicker);
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    if (!file) return;
    handleMusicFile(file, hint, updateMusicUI);
    input.value = '';
  });

  const setDragActive = (active) => {
    dropzone.classList.toggle('is-dragover', active);
  };
  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(true);
    });
  });
  ['dragleave', 'dragend', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    handleMusicFile(file, hint, updateMusicUI);
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      pushHistory();
      state.page.music = { src: '', name: '', gain: 1, volume: 1 };
      updatePreview();
      updateMusicUI();
      showToast('Music removed');
    });
  }
}

function handleMusicFile(file, hintEl, onDone) {
  if (!file.type || !file.type.startsWith('audio/')) {
    if (hintEl) hintEl.textContent = 'Please upload an audio file (mp3, wav, ogg...).';
    showToast('Unsupported file type');
    return;
  }
  const maxBytes = 20 * 1024 * 1024;
  if (file.size > maxBytes) {
    if (hintEl) hintEl.textContent = 'File is too large (max 20 MB).';
    showToast('Audio file is too large');
    return;
  }
  Promise.all([readFileAsDataURL(file), readFileAsArrayBuffer(file)])
    .then(async ([dataUrl, arrayBuffer]) => {
      pushHistory();
      state.page.music.src = String(dataUrl || '');
      state.page.music.name = file.name || 'audio';
      state.page.music.gain = 1;
      state.page.music.volume = 1;
      try {
        const gain = await analyzeAudioPeakGain(arrayBuffer);
        if (Number.isFinite(gain) && gain > 0 && gain <= 1) {
          state.page.music.gain = gain;
        }
      } catch (_) {
        state.page.music.gain = 0.85;
      }
      if (hintEl) hintEl.textContent = '';
      updatePreview();
      if (onDone) onDone();
      showToast(state.page.music.gain < 0.99 ? 'Music added (volume normalized) 🎵' : 'Music added 🎵');
      playBgMusic();
    })
    .catch(() => {
      if (hintEl) hintEl.textContent = 'Could not read this file. Try another one.';
    });
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('readAsDataURL failed'));
    r.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error('readAsArrayBuffer failed'));
    r.readAsArrayBuffer(file);
  });
}

async function analyzeAudioPeakGain(arrayBuffer) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  let audioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    // Close to avoid keeping an AudioContext around
    try { await ctx.close(); } catch (_) { /* ignore */ }
  }

  const channels = audioBuffer.numberOfChannels || 1;
  let peak = 0;
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]);
      if (v > peak) peak = v;
    }
  }

  // Target peak so "100% volume" in player isn't ear-piercing
  const targetPeak = 0.85;
  if (!peak || !Number.isFinite(peak)) return 0.85;
  if (peak <= targetPeak) return 1;
  return Math.max(0.05, Math.min(1, targetPeak / peak));
}

/* ================================================
   SERVICE ICONS (for recognized URLs)
   ================================================ */
const serviceIcons = {
  instagram: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,
  x: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  twitter: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  youtube: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
  tiktok: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-3.11 6.24-2.21 1.54-5.09 1.76-7.46.3-1.61-.99-2.47-2.85-2.24-4.67.24-1.82 1.74-3.35 3.53-3.93 1.11-.36 2.32-.43 3.4-.37v4.11c-.63-.07-1.29-.01-1.92.15-1.05.27-1.91.99-2.27 2-.35.98.03 2.04.95 2.64.91.6 2.2.62 3.15.32v4.07c-1.14-.4-2.41-.55-3.59-.35-1.21.2-2.24.91-2.78 1.91-.54 1.01-.38 2.24.28 3.08 1.15 1.46 3.3 1.58 4.93.74 1.26-.65 2.07-1.87 2.07-3.17V.02z"/></svg>`,
  discord: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>`,
  telegram: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  spotify: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`,
  soundcloud: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M1.175 12.225c-.051 0-.094.046-.101.1l-.233 2.154.233 2.105c.007.058.05.098.101.098.05 0 .09-.04.099-.098l.255-2.105-.27-2.154c-.009-.06-.052-.1-.084-.1zm-.899-.825c-.06 0-.11.045-.116.1l-.233 2.205.233 2.113c.006.054.056.1.116.1.053 0 .096-.04.109-.098l.255-2.113-.27-2.205c-.013-.055-.056-.1-.094-.102zm1.83-1.305c-.061 0-.116.049-.122.11l-.255 2.438.255 2.317c.006.06.061.11.122.11.06 0 .11-.05.116-.11l.282-2.317-.282-2.438c-.006-.061-.056-.11-.116-.11zm.938-.168c-.071 0-.132.06-.138.132l-.282 2.576.282 2.457c.006.072.067.132.138.132.071 0 .132-.06.138-.132l.31-2.457-.31-2.576c-.006-.072-.067-.132-.138-.132zm.955-.154c-.081 0-.147.066-.153.147l-.31 2.701.31 2.583c.006.081.072.147.153.147.082 0 .148-.066.154-.147l.337-2.583-.337-2.701c-.006-.081-.072-.147-.154-.147zm.963-.166c-.092 0-.165.074-.17.165l-.337 2.838.337 2.631c.005.091.078.165.17.165.091 0 .164-.074.17-.165l.364-2.631-.364-2.838c-.006-.091-.079-.165-.17-.165zm.977-.178c-.102 0-.183.083-.188.184l-.364 2.913.364 2.752c.005.101.086.184.188.184.102 0 .183-.083.188-.184l.392-2.752-.392-2.913c-.005-.101-.086-.184-.188-.184zm.981-.191c-.113 0-.201.09-.206.201l-.392 3.018.392 2.765c.005.111.093.201.206.201.112 0 .201-.09.206-.201l.42-2.765-.42-3.018c-.005-.111-.094-.201-.206-.201zm.995-.204c-.123 0-.219.099-.223.221l-.42 3.114.42 2.777c.004.122.1.221.223.221.123 0 .219-.099.223-.221l.447-2.777-.447-3.114c-.004-.122-.1-.221-.223-.221zm1.006-.217c-.134 0-.237.107-.241.239l-.447 3.211.447 2.791c.004.132.107.239.241.239.133 0 .237-.107.241-.239l.475-2.791-.475-3.211c-.004-.132-.108-.239-.241-.239zm2.007-.337c-.143 0-.254.116-.256.259l-.475 3.392.475 2.792c.002.143.113.259.256.259.144 0 .255-.116.256-.259l.503-2.792-.503-3.392c-.001-.143-.112-.259-.256-.259zm1.012-.264c-.154 0-.271.125-.273.278l-.503 3.472.503 2.793c.002.154.119.278.273.278.155 0 .272-.124.274-.278l.531-2.793-.531-3.472c-.002-.154-.119-.278-.274-.278zm1.02-.287c-.165 0-.289.134-.291.299l-.531 3.534.531 2.783c.002.165.126.299.291.299.166 0 .29-.134.292-.299l.558-2.783-.558-3.534c-.002-.165-.126-.299-.292-.299zm1.033-.309c-.176 0-.305.144-.307.321l-.558 3.594.558 2.774c.002.177.131.321.307.321.177 0 .306-.144.308-.321l.586-2.774-.586-3.594c-.002-.177-.131-.321-.308-.321zm1.042-.33c-.186 0-.322.153-.323.341l-.586 3.656.586 2.774c.001.188.137.341.323.341.187 0 .323-.153.324-.341l.614-2.774-.614-3.656c-.001-.188-.137-.341-.324-.341zm1.055-.354c-.197 0-.339.163-.34.363l-.614 3.713.614 2.764c.001.2.143.363.34.363.198 0 .34-.163.341-.363l.641-2.764-.641-3.713c-.001-.2-.143-.363-.341-.363zm1.065-.377c-.208 0-.356.172-.357.383l-.641 3.759.641 2.754c.001.211.149.383.357.383.209 0 .357-.172.358-.383l.669-2.754-.669-3.759c-.001-.211-.149-.383-.358-.383zm1.076-.399c-.218 0-.373.18-.374.402l-.669 3.797.669 2.744c.001.222.156.402.374.402.219 0 .374-.18.375-.402l.696-2.744-.696-3.797c-.001-.222-.156-.402-.375-.402zm1.087-.421c-.229 0-.39.188-.391.42l-.696 3.824.696 2.733c.001.232.162.42.391.42.23 0 .391-.188.392-.42l.723-2.733-.723-3.824c-.001-.232-.162-.42-.392-.42zm1.1-.445c-.239 0-.406.196-.407.437l-.723 3.855.723 2.723c.001.241.168.437.407.437.24 0 .407-.196.408-.437l.75-2.723-.75-3.855c-.001-.241-.168-.437-.408-.437zm1.11-.468c-.25 0-.423.204-.424.454l-.75 3.871.75 2.712c.001.25.174.454.424.454.251 0 .424-.204.425-.454l.776-2.712-.776-3.871c-.001-.25-.174-.454-.425-.454zm1.122-.49c-.261 0-.44.212-.441.473l-.776 3.893.776 2.701c.001.261.18.473.441.473.262 0 .441-.212.442-.473l.803-2.701-.803-3.893c-.001-.261-.18-.473-.442-.473zm1.134-.514c-.272 0-.456.221-.457.493l-.803 3.91.803 2.69c.001.272.185.493.457.493.273 0 .457-.221.458-.493l.83-2.69-.83-3.91c-.001-.272-.185-.493-.458-.493zm3.457-2.504c-.549 0-.985.459-.986 1.023v3.583c0 .565.437 1.024.986 1.024.548 0 .985-.459.985-1.024v-3.583c0-.564-.437-1.023-.985-1.023zm-2.307.108c-.283 0-.529.238-.53.529v4.114c0 .291.247.529.53.529.284 0 .53-.238.53-.529v-4.114c0-.291-.246-.529-.53-.529z"/></svg>`,
  linkedin: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  github: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>`,
  twitch: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>`,
  whatsapp: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.162-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  facebook: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  vk: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.684 0H8.316C1.592 0 0 1.543 0 8.21v7.58C0 22.457 1.592 24 8.316 24h7.368c6.724 0 8.316-1.543 8.316-8.21V8.21C24 1.543 22.408 0 15.684 0zm3.692 17.027c-.438.948-1.352 1.64-2.455 1.768-.548.063-1.124.095-2.232.095-1.232 0-1.568-.024-2.292-.12-.688-.091-1.024-.42-1.456-1.228l-2.596-4.72c-.463-.846-.308-1.453.48-2.025.588-.427 1.412-.612 2.136-.745.488-.09.856-.155 1.104-.272.396-.188.484-.423.484-.832v-.87c-.053-.577-.456-.768-1.232-.936-.924-.2-1.872-.472-2.412-1.104-.72-.84-.9-1.664-.456-2.736.544-1.312 1.792-1.984 3.256-1.984.76 0 1.24.093 1.644.275.404.182.58.364.772.728l.576 1.16c.176.4.28.688.456.832.176.144.392.2.672.06.28-.14.596-.588.932-1.036.336-.448.568-.832.94-1.036.372-.204.768-.296 1.18-.296.676 0 1.084.28 1.448.888.576.96.664 1.712.596 2.64-.072.808-.332 1.28-.784 1.708-.36.34-.78.536-1.188.6-.408.064-.82.14-1.28.2-.92.12-1.52.448-1.768 1.104-.248.656-.248 1.22-.168 1.58.16.72.756 1.22 1.74 1.22.56 0 1.104-.096 1.584-.296.48-.2.864-.44 1.14-.7.62-.62.84-1.18 1.02-1.94.18-.76.18-1.48.12-2.04-.06-.56-.16-1.08-.24-1.44l-.36-1.28c-.2-.72-.48-1.44-1.08-1.92-.6-.48-1.26-.72-2.04-.72-.38 0-.76.04-1.08.12-.32.08-.56.24-.68.48z"/></svg>`,
  pinterest: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/></svg>`,
  onlyfans: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M23.924 11.34c-.14-.46-.7-.68-1.08-.53a9.43 9.43 0 0 0-.65-.22c-.39-.11-.76-.17-1.14-.22-1.12-.13-2.25-.19-3.37-.17-1.77.02-3.53.28-5.16.99-.32.14-.53.46-.5.81.03.35.27.64.61.68.34.04.68.04 1.02.05.83 0 1.67.03 2.49.22 1.1.25 2.19.58 3.18 1.11.23.13.39.34.56.52-.3-.06-.6-.13-.89-.19l-.89-.18a9.74 9.74 0 0 1-2.73-.9c-.33-.18-.65-.37-.93-.61-.08-.08-.18-.15-.21-.26-.05-.15-.03-.33.02-.48.07-.25.25-.45.49-.56.48-.22.98-.32 1.49-.33 1.37-.04 2.74.11 4.07.43.65.16 1.28.36 1.91.59.47.17.88.5 1.09.96.21.47.16 1.01-.11 1.44-.27.42-.69.72-1.16.87-.47.14-.97.16-1.46.17-.84.02-1.67-.04-2.5-.17-.37-.06-.74-.14-1.1-.24-.23-.06-.46-.13-.7-.19a7.67 7.67 0 0 1-2.32-1.03c-.33-.22-.63-.48-.88-.78-.11-.13-.21-.27-.26-.43-.07-.2-.03-.42.1-.6.14-.17.34-.28.56-.3.41-.05.82 0 1.23.04.55.05 1.09.14 1.63.27.84.2 1.67.42 2.5.65 1.1.3 2.19.62 3.26 1 .41.15.83.29 1.25.4.25.06.51.12.77.12.35 0 .69-.09.99-.27.3-.18.51-.45.6-.78.09-.33.04-.69-.13-.99z"/></svg>`,
  patreon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M15.386.524c-4.764 0-4.914.013-6.326.1-2.85.17-4.068.968-4.803 3.149-.548 1.624-.764 3.451-.776 6.571-.013 3.644.19 5.731.776 7.49.735 2.202 2.08 3.267 5.228 3.385 1.372.052 1.73.07 6.326.07 4.595 0 4.953-.018 6.325-.07 3.15-.118 4.49-1.183 5.23-3.385.585-1.759.79-3.846.776-7.49-.012-3.12-.228-4.947-.776-6.57-.737-2.18-1.956-2.98-4.804-3.15C20.3.538 20.15.526 15.386.526zm5.95 8.745c-1.37.65-3.477 1.31-6.02 1.31-2.528 0-4.636-.66-6.017-1.31C6.65 8.66 5.63 9.62 5.05 10.73c-.64 1.22-.97 2.84-.97 4.8 0 .37.03.74.08 1.1.21 1.52.97 2.68 2.25 3.47.86.53 1.95 1.02 3.21 1.5.63.24 1.34.51 1.86.76.64.31 1.02.77 1.03 1.25 0 .52-.46.97-1.2 1.2-1.04.32-2.8.67-5.13 1.05-.76.13-1.57.27-2.2.38-.7.13-1.22.5-1.37.98-.21.69.02 1.25.66 1.61.61.35 1.77.62 3.12.9 1.5.3 3.4.58 4.9 1.06 3.02.96 4.84 2.77 5.45 5.41.15.65.19 1.39.19 2.05 0 1.06-.2 2.16-.45 2.95-.38 1.2-.99 1.83-2.17 2.24-.79.28-1.72.4-3.22.4-2.08 0-2.8-.08-5.2-.42-1.24-.18-2.37-.24-3.4-.24-1.28 0-2.08.06-3.18.24-2.4.34-3.12.42-5.2.42-1.5 0-2.43-.12-3.22-.4-1.18-.41-1.79-1.04-2.17-2.24-.25-.79-.45-1.89-.45-2.95 0-.66.04-1.4.19-2.05.61-3.64 2.43-5.45 5.45-5.41 1.5-.48 3.4-.76 4.9-1.06 1.35-.28 2.51-.55 3.12-.9.64-.36.87-.92.66-1.61-.15-.48-.67-.85-1.37-.98-.63-.11-1.44-.25-2.2-.38-2.33-.38-4.09-.73-5.13-1.05-.74-.23-1.2-.68-1.2-1.2.01-.48.39-.94 1.03-1.25.52-.25 1.23-.52 1.86-.76 1.26-.48 2.35-.97 3.21-1.5 1.28-.79 2.04-1.95 2.25-3.47.05-.36.08-.73.08-1.1 0-1.96-.33-3.58-.97-4.8-.58-1.11-1.6-2.07-3.24-2.46z"/></svg>`,
  busty: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c-1.77 0-3.2-1.43-3.2-3.2S10.23 7.6 12 7.6s3.2 1.43 3.2 3.2S13.77 14 12 14zm0-5.4c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm7.5 13.4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm-15 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm8.5-6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm-4.5-4c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`,
};

function detectServiceFromUrl(url) {
  if (!url) return null;
  const urlLower = url.toLowerCase();
  if (urlLower.includes('instagram.com')) return 'instagram';
  if (urlLower.includes('x.com')) return 'x';
  if (urlLower.includes('twitter.com')) return 'twitter';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('tiktok.com')) return 'tiktok';
  if (urlLower.includes('discord.gg') || urlLower.includes('discord.com')) return 'discord';
  if (urlLower.includes('t.me') || urlLower.includes('telegram.me')) return 'telegram';
  if (urlLower.includes('spotify.com')) return 'spotify';
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';
  if (urlLower.includes('linkedin.com')) return 'linkedin';
  if (urlLower.includes('github.com') || urlLower.includes('github.io')) return 'github';
  if (urlLower.includes('twitch.tv')) return 'twitch';
  if (urlLower.includes('whatsapp.com') || urlLower.includes('wa.me')) return 'whatsapp';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) return 'facebook';
  if (urlLower.includes('vk.com') || urlLower.includes('vkontakte.ru')) return 'vk';
  if (urlLower.includes('pinterest.com') || urlLower.includes('pin.it')) return 'pinterest';
  if (urlLower.includes('onlyfans.com')) return 'onlyfans';
  if (urlLower.includes('patreon.com')) return 'patreon';
  if (urlLower.includes('busty.com') || urlLower.includes('busty.org')) return 'busty';
  return null;
}

function getServiceIconContent(url, fallbackEmoji) {
  const service = detectServiceFromUrl(url);
  if (service && serviceIcons[service]) {
    return serviceIcons[service];
  }
  return fallbackEmoji || '🔗';
}

/* ================================================
   LINKS
   ================================================ */
let editingLinkIndex = -1; // -1 = adding new, >= 0 = editing link at this index

function setupLinks() {
  // Links toggle button
  const toggleBtn = document.getElementById('links-toggle-btn');
  const controlsDiv = document.getElementById('links-controls');
  if (toggleBtn) {
    const updateToggleState = () => {
      toggleBtn.textContent = state.page.linksEnabled ? 'On' : 'Off';
      toggleBtn.classList.toggle('btn-primary', state.page.linksEnabled);
      toggleBtn.classList.toggle('btn-ghost', !state.page.linksEnabled);
      if (controlsDiv) {
        controlsDiv.style.display = state.page.linksEnabled ? '' : 'none';
      }
    };
    toggleBtn.addEventListener('click', () => {
      pushHistory();
      state.page.linksEnabled = !state.page.linksEnabled;
      updateToggleState();
      renderPreviewLinks();
      updatePublicPage();
      applyLayout();
    });
    updateToggleState();
  }

  document.querySelector('[data-action="add-link"]').addEventListener('click', saveLink);

  // Allow enter in label input to save
  document.getElementById('link-label').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveLink();
  });
  document.getElementById('link-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveLink();
  });

  // Cancel edit button
  const cancelBtn = document.getElementById('link-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      cancelLinkEdit();
    });
  }

  // Link style toggle (per-link)
  document.querySelectorAll('.link-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.link-style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Update current link being edited
      if (editingLinkIndex >= 0) {
        state.page.links[editingLinkIndex].style = btn.dataset.linkStyle;
        renderPreviewLinks();
        updatePublicPage();
      }
    });
  });

  // Link color picker
  const panelLinks = document.getElementById('panel-links');
  if (panelLinks) {
    panelLinks.addEventListener('input', (e) => {
      if (e.target.id === 'link-color' && editingLinkIndex >= 0) {
        state.page.links[editingLinkIndex].color = e.target.value;
        renderPreviewLinks();
        updatePublicPage();
      }
    });
    panelLinks.addEventListener('click', (e) => {
      if (e.target.id === 'link-glow-btn') {
        const isGlowOn = e.target.textContent.includes('On');
        const newGlowState = !isGlowOn;
        e.target.textContent = newGlowState ? 'Glow: On' : 'Glow: Off';
        e.target.classList.toggle('btn-primary', newGlowState);
        e.target.classList.toggle('btn-ghost', !newGlowState);
        if (editingLinkIndex >= 0) {
          state.page.links[editingLinkIndex].glow = newGlowState;
          renderPreviewLinks();
          updatePublicPage();
        }
      }
    });
  }
}

function cancelLinkEdit() {
  editingLinkIndex = -1;
  document.getElementById('link-label').value = '';
  document.getElementById('link-emoji').value = '';
  document.getElementById('link-url').value = '';
  
  // Reset style buttons to default
  document.querySelectorAll('.link-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.linkStyle === 'full');
  });
  
  updateLinkFormState();
  renderLinksList();
}

function updateLinkFormState() {
  const addBtn = document.querySelector('[data-action="add-link"]');
  const cancelBtn = document.getElementById('link-cancel-btn');
  const panelLabel = document.querySelector('#panel-links .panel-label');
  if (editingLinkIndex >= 0) {
    if (addBtn) addBtn.textContent = 'Save';
    if (cancelBtn) cancelBtn.style.display = '';
    if (panelLabel) panelLabel.textContent = 'Edit link';
  } else {
    if (addBtn) addBtn.textContent = '+ Add';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (panelLabel) panelLabel.textContent = 'Add link';
  }
}

function startEditLink(index) {
  const link = state.page.links[index];
  if (!link) return;
  editingLinkIndex = index;
  document.getElementById('link-label').value = link.label || '';
  document.getElementById('link-emoji').value = link.emoji === '🔗' ? '' : link.emoji;
  document.getElementById('link-url').value = link.url || '';
  
  // Sync style buttons
  const linkStyle = link.style || 'full';
  document.querySelectorAll('.link-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.linkStyle === linkStyle);
  });
  
  // Sync color and glow
  const colorInput = document.getElementById('link-color');
  const glowBtn = document.getElementById('link-glow-btn');
  if (colorInput) colorInput.value = link.color || '#d6d6d6';
  if (glowBtn) {
    const isGlowOn = link.glow || false;
    glowBtn.textContent = isGlowOn ? 'Glow: On' : 'Glow: Off';
    glowBtn.classList.toggle('btn-primary', isGlowOn);
    glowBtn.classList.toggle('btn-ghost', !isGlowOn);
  }
  
  document.getElementById('link-label').focus();
  updateLinkFormState();
  renderLinksList();
}

function saveLink() {
  const labelEl = document.getElementById('link-label');
  const emojiEl = document.getElementById('link-emoji');
  const urlEl   = document.getElementById('link-url');

  const label = labelEl.value.trim();
  const emoji = emojiEl.value.trim() || '🔗';
  const url   = urlEl.value.trim();
  
  // Get current link style from active button
  const activeStyleBtn = document.querySelector('.link-style-btn.active');
  const linkStyle = activeStyleBtn ? activeStyleBtn.dataset.linkStyle : 'full';

  if (!label) {
    showToast('Enter a link title');
    labelEl.focus();
    return;
  }

  const colorInput = document.getElementById('link-color');
  const glowBtn = document.getElementById('link-glow-btn');
  const linkColor = colorInput ? colorInput.value : '#d6d6d6';
  const linkGlow = glowBtn && glowBtn.textContent.includes('On');

  if (editingLinkIndex >= 0) {
    pushHistory();
    state.page.links[editingLinkIndex] = { emoji, label, url, style: linkStyle, color: linkColor, glow: linkGlow };
    editingLinkIndex = -1;
  } else {
    pushHistory();
    state.page.links.push({ emoji, label, url, style: linkStyle, color: linkColor, glow: linkGlow });
    ensureIndependentLinkLayouts();
    
    // Assign new link to active layer
    if (state.page.activeLayer) {
      const newLinkKey = `link-${state.page.links.length - 1}`;
      assignObjectToLayer(newLinkKey, state.page.activeLayer);
    }
  }

  labelEl.value = '';
  emojiEl.value = '';
  urlEl.value   = '';

  // Reset style buttons
  document.querySelectorAll('.link-style-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.linkStyle === 'full');
  });

  updateLinkFormState();
  renderLinksList();
  renderPreviewLinks();
  applyLayout();
}

function removeLink(index) {
  pushHistory();
  state.page.links.splice(index, 1);
  // Adjust editing index if needed
  if (editingLinkIndex === index) {
    editingLinkIndex = -1;
    document.getElementById('link-label').value = '';
    document.getElementById('link-emoji').value = '';
    document.getElementById('link-url').value = '';
    updateLinkFormState();
  } else if (editingLinkIndex > index) {
    editingLinkIndex--;
  }
  ensureIndependentLinkLayouts();
  renderLinksList();
  renderPreviewLinks();
  applyLayout();
}

function renderLinksList() {
  const list = document.getElementById('links-list');
  list.innerHTML = '';

  if (state.page.links.length === 0) {
    list.innerHTML = '<p style="font-size:12px;color:var(--muted);text-align:center;padding:12px 0;">No links yet</p>';
    return;
  }

  state.page.links.forEach((link, i) => {
    const item = document.createElement('div');
    item.className = 'link-item' + (i === editingLinkIndex ? ' link-item--editing' : '');
    item.innerHTML = `
      <span class="link-item-label">${link.emoji} ${link.label}</span>
      <button class="link-edit-btn" aria-label="Edit link ${link.label}" title="Edit">✏️</button>
      <button class="link-remove" aria-label="Remove link ${link.label}" title="Delete">×</button>
    `;
    item.querySelector('.link-edit-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      startEditLink(i);
    });
    item.querySelector('.link-remove').addEventListener('click', (ev) => {
      ev.stopPropagation();
      // If we were editing this link, cancel the edit
      if (editingLinkIndex === i) cancelLinkEdit();
      removeLink(i);
    });
    // Click the whole item to edit too
    item.addEventListener('click', () => startEditLink(i));
    list.appendChild(item);
  });
}

function renderPreviewLinks() {
  // Remove old link buttons from stageInner
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner) return;
  
  // Remove old link buttons (they have data-editable starting with 'link-')
  stageInner.querySelectorAll('[data-editable^="link-"]').forEach(el => el.remove());

  // Don't render if links are disabled
  if (!state.page.linksEnabled) return;

  // Ensure layout entries exist for all links
  if (!state.page.links) return;
  state.page.links.forEach((link, i) => {
    const key = `link-${i}`;
    const isIconMode = link.style === 'icon';
    if (!state.page.layout[key]) {
      const centerX = Math.round((state.page.layout.phone?.w || 280) / 2);
      const centerY = Math.round((state.page.layout.phone?.h || 560) / 2);
      state.page.layout[key] = {
        x: isIconMode ? centerX - 16 : centerX - 116,
        y: isIconMode ? centerY - 16 : centerY - 22,
        w: isIconMode ? 32 : 232,
        h: isIconMode ? 32 : 44,
        rotate: 0
      };
    }
  });

  // Remove stale link layouts
  Object.keys(state.page.layout)
    .filter(k => k.startsWith('link-'))
    .forEach(k => {
      const idx = Number(k.replace('link-', ''));
      if (!state.page.links || !Number.isFinite(idx) || idx < 0 || idx >= state.page.links.length) {
        delete state.page.layout[k];
      }
    });

  // Render each link as independent element in stageInner
  state.page.links.forEach((link, i) => {
    const key = `link-${i}`;
    const div = document.createElement('div');
    const isIconStyle = link.style === 'icon';
    const serviceIcon = getServiceIconContent(link.url, link.emoji);

    if (isIconStyle) {
      div.className = 'page-link-btn-icon editable mode-icon';
      div.style.width = '32px';
      div.style.height = '32px';
      if (link.color) {
        div.style.color = link.color;
      }
      if (link.glow) {
        div.style.filter = `drop-shadow(0 0 8px ${link.color || '#d6d6d6'})`;
      }
    } else {
      div.className = 'page-link-btn editable';
      const linkColor = link.color || '#d6d6d6';
      div.style.backgroundColor = linkColor;
      if (link.glow) {
        div.style.boxShadow = `0 0 15px ${linkColor}`;
      }
    }
    
    div.dataset.editable = key;
    div.dataset.label = link.label || '';
    div.dataset.linkUrl = link.url || '';
    div.dataset.linkStyle = link.style || 'full';
    
    if (isIconStyle) {
      div.innerHTML = serviceIcon;
    } else {
      const service = detectServiceFromUrl(link.url);
      if (service) {
        div.innerHTML = `${serviceIcon}<span class="link-label-text">${link.label || ''}</span>`;
      } else {
        div.textContent = `${link.emoji || '🔗'} ${link.label || ''}`;
      }
    }

    ensureResizeHandle(div);
    ensureRotateHandle(div);
    stageInner.appendChild(div);
  });

  // Apply layout positions
  applyLinkLayouts();
}

function applyLinkLayouts() {
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner || !state.page.links) return;

  state.page.links.forEach((_, i) => {
    const key = `link-${i}`;
    const btn = stageInner.querySelector(`[data-editable="${key}"]`);
    const box = state.page.layout[key];
    if (!btn || !box) return;

    btn.style.position = 'absolute';
    btn.style.left = `${box.x}px`;
    btn.style.top = `${box.y}px`;
    btn.style.width = `${box.w}px`;
    btn.style.height = `${box.h}px`;
    btn.style.transform = `rotate(${box.rotate || 0}deg)`;
  });
}

function getLinkLayoutKey(index) {
  return `link-${index}`;
}

function ensureIndependentLinkLayouts() {
  const phoneW = state.page.layout.phone?.w || 280;
  const phoneH = state.page.layout.phone?.h || 560;
  const centerX = Math.round(phoneW / 2);
  const centerY = Math.round(phoneH / 2);
  state.page.links.forEach((link, i) => {
    const key = getLinkLayoutKey(i);
    if (!state.page.layout[key]) {
      const isIconMode = link.style === 'icon';
      state.page.layout[key] = {
        x: isIconMode ? centerX - 16 : centerX - 116,
        y: isIconMode ? centerY - 16 : centerY - 22,
        w: isIconMode ? 32 : 232,
        h: isIconMode ? 32 : 44,
      };
    }
  });
  Object.keys(state.page.layout)
    .filter((k) => k.startsWith('link-'))
    .forEach((k) => {
      const idx = Number(k.replace('link-', ''));
      if (!Number.isFinite(idx) || idx < 0 || idx >= state.page.links.length) {
        delete state.page.layout[k];
      }
    });
}

function isObjectDeleted(key) {
  return !!(state.page.deleted && state.page.deleted[key]);
}

function deleteObjectByKey(key) {
  if (!key) return;
  pushHistory();
  if (key.startsWith('link-')) {
    const idx = Number(key.replace('link-', ''));
    if (Number.isFinite(idx) && idx >= 0 && idx < state.page.links.length) {
      removeLink(idx);
      showToast('Link deleted');
    }
    return;
  }
  if (key.startsWith('obj-')) {
    const id = Number(key.replace('obj-', ''));
    state.page.customObjects = state.page.customObjects.filter((o) => o.id !== id);
    delete state.page.layout[key];
    updatePreview();
    const publicScreen = document.getElementById('screen-public');
    if (publicScreen && publicScreen.classList.contains('active')) updatePublicPage();
    showToast('Object deleted');
    return;
  }
  if (key === 'phone') {
    state.page.deleted.phone = true;
    updatePreview();
    const publicScreen = document.getElementById('screen-public');
    if (publicScreen && publicScreen.classList.contains('active')) updatePublicPage();
    showToast('Phone frame deleted');
    return;
  }
  if (key === 'avatar' || key === 'name' || key === 'bio') {
    state.page.deleted[key] = true;
    updatePreview();
    const publicScreen = document.getElementById('screen-public');
    if (publicScreen && publicScreen.classList.contains('active')) updatePublicPage();
    showToast('Object deleted');
  }
}

function clampPhoneBgOpacity(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(0, Math.min(1, num));
}

function applyPhoneBackgroundOpacity() {
  const opacity = clampPhoneBgOpacity(state.page.bgPhoneOpacity);
  console.log('applyPhoneBackgroundOpacity called, opacity:', opacity);
  const previewLayer = document.querySelector('#preview-frame .phone-bg-layer');
  const publicLayer = document.querySelector('#public-frame .phone-bg-layer');
  console.log('Preview layer:', previewLayer ? 'found' : 'not found');
  console.log('Public layer:', publicLayer ? 'found' : 'not found');
  if (previewLayer) previewLayer.style.opacity = String(opacity);
  if (publicLayer) publicLayer.style.opacity = String(opacity);
}

function syncPhoneBgOpacityUi() {
  const percent = Math.round(clampPhoneBgOpacity(state.page.bgPhoneOpacity) * 100);
  const slider = document.getElementById('bg-opacity-slider');
  const value = document.getElementById('bg-opacity-value');
  const menuSlider = document.getElementById('bg-opacity-context-slider');
  const menuValue = document.getElementById('bg-opacity-context-value');
  const phoneSlider = document.getElementById('phone-opacity-context-slider');
  const phoneValue = document.getElementById('phone-opacity-context-value');
  if (slider) slider.value = String(percent);
  if (value) value.textContent = `${percent}%`;
  if (menuSlider) menuSlider.value = String(percent);
  if (menuValue) menuValue.textContent = `${percent}%`;
  if (phoneSlider) phoneSlider.value = String(percent);
  if (phoneValue) phoneValue.textContent = `${percent}%`;
}

function setPhoneBackgroundOpacity(nextOpacity) {
  state.page.bgPhoneOpacity = clampPhoneBgOpacity(nextOpacity);
  applyPhoneBackgroundOpacity();
  syncPhoneBgOpacityUi();
}

/* ================================================
   BACKGROUND
   ================================================ */
function setupBackground() {
  document.querySelectorAll('[data-bg]').forEach(item => {
    item.addEventListener('click', () => {
      pushHistory();
      document.querySelectorAll('[data-bg]').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      const frame = document.getElementById('preview-frame');
      // Remove all bg classes
      frame.className = frame.className.replace(/bg-\S+/g, '').trim();
      frame.classList.add(item.dataset.bg);
      state.page.bg = item.dataset.bg;
    });
  });
}

function setupBackgroundOpacityControls() {
  const slider = document.getElementById('bg-opacity-slider');
  if (slider) {
    slider.addEventListener('focus', () => pushHistory());
    slider.addEventListener('input', () => {
      setPhoneBackgroundOpacity(Number(slider.value) / 100);
    });
  }
  syncPhoneBgOpacityUi();

  const blurryBtn = document.getElementById('blurry-phone-btn');
  if (blurryBtn) {
    blurryBtn.addEventListener('click', () => {
      pushHistory();
      state.page.phoneBlur = !state.page.phoneBlur;
      blurryBtn.textContent = state.page.phoneBlur ? 'On' : 'Off';
      blurryBtn.classList.toggle('btn-primary', state.page.phoneBlur);
      blurryBtn.classList.toggle('btn-ghost', !state.page.phoneBlur);
      applyPhoneBlur();
      updatePublicPage();
    });
    blurryBtn.textContent = state.page.phoneBlur ? 'On' : 'Off';
    blurryBtn.classList.toggle('btn-primary', state.page.phoneBlur);
    blurryBtn.classList.toggle('btn-ghost', !state.page.phoneBlur);
  }

  const blurSlider = document.getElementById('blur-strength-slider');
  const blurValue = document.getElementById('blur-strength-value');
  if (blurSlider) {
    blurSlider.value = state.page.phoneBlurStrength || 3;
    if (blurValue) blurValue.textContent = `${blurSlider.value}px`;
    blurSlider.addEventListener('input', () => {
      state.page.phoneBlurStrength = Number(blurSlider.value);
      if (blurValue) blurValue.textContent = `${blurSlider.value}px`;
      applyPhoneBlur();
      updatePublicPage();
    });
  }

  const radiusSlider = document.getElementById('phone-radius-slider');
  const radiusValue = document.getElementById('phone-radius-value');
  if (radiusSlider) {
    radiusSlider.value = state.page.phoneBorderRadius || 42;
    if (radiusValue) radiusValue.textContent = `${radiusSlider.value}px`;
    radiusSlider.addEventListener('input', () => {
      pushHistory();
      state.page.phoneBorderRadius = Number(radiusSlider.value);
      if (radiusValue) radiusValue.textContent = `${radiusSlider.value}px`;
      applyPhoneRadius();
      updatePublicPage();
    });
  }

  applyPhoneBlur();
  applyPhoneRadius();
  
  // Sync UI controls with loaded data
  syncPhoneUiControls();
}

function syncPhoneUiControls() {
  const blurryBtn = document.getElementById('blurry-phone-btn');
  if (blurryBtn) {
    blurryBtn.textContent = state.page.phoneBlur ? 'On' : 'Off';
    blurryBtn.classList.toggle('btn-primary', state.page.phoneBlur);
    blurryBtn.classList.toggle('btn-ghost', !state.page.phoneBlur);
  }
  const blurSlider = document.getElementById('blur-strength-slider');
  const blurValue = document.getElementById('blur-strength-value');
  if (blurSlider) {
    blurSlider.value = state.page.phoneBlurStrength || 3;
    if (blurValue) blurValue.textContent = `${blurSlider.value}px`;
  }
  const radiusSlider = document.getElementById('phone-radius-slider');
  const radiusValue = document.getElementById('phone-radius-value');
  if (radiusSlider) {
    radiusSlider.value = state.page.phoneBorderRadius || 42;
    if (radiusValue) radiusValue.textContent = `${radiusSlider.value}px`;
  }
  const opacitySlider = document.getElementById('bg-opacity-slider');
  const opacityValue = document.getElementById('bg-opacity-value');
  if (opacitySlider) {
    opacitySlider.value = state.page.bgPhoneOpacity ?? 1;
    if (opacityValue) opacityValue.textContent = `${Math.round((state.page.bgPhoneOpacity ?? 1) * 100)}%`;
  }
}

function applyPhoneBlur() {
  const blurValue = state.page.phoneBlur ? (state.page.phoneBlurStrength || 3) : 0;
  const radius = state.page.phoneBorderRadius || 42;
  
  // Find or create blur layer behind phone
  const previewStage = document.getElementById('preview-stage-inner');
  const publicStage = document.querySelector('.public-stage-inner');
  
  const createOrUpdateBlurLayer = (stage, isPublic) => {
    let blurLayer = stage.querySelector('.phone-blur-layer');
    if (!blurLayer) {
      blurLayer = document.createElement('div');
      blurLayer.className = 'phone-blur-layer';
      // Insert after phone so it's above background but below other elements
      const phone = stage.querySelector('.phone-frame');
      if (phone && phone.nextSibling) {
        stage.insertBefore(blurLayer, phone.nextSibling);
      } else {
        stage.appendChild(blurLayer);
      }
    }
    if (blurValue > 0) {
      blurLayer.style.display = 'block';
      blurLayer.style.position = 'absolute';
      blurLayer.style.backdropFilter = `blur(${blurValue}px)`;
      blurLayer.style.webkitBackdropFilter = `blur(${blurValue}px)`;
      blurLayer.style.borderRadius = `${radius}px`;
      
      // Copy phone position and size
      const phone = stage.querySelector('.phone-frame');
      if (phone) {
        blurLayer.style.left = phone.style.left;
        blurLayer.style.top = phone.style.top;
        blurLayer.style.width = phone.style.width;
        blurLayer.style.height = phone.style.height;
      }
    } else {
      blurLayer.style.display = 'none';
    }
  };
  
  if (previewStage) createOrUpdateBlurLayer(previewStage, false);
  if (publicStage) createOrUpdateBlurLayer(publicStage, true);
}

function applyBackgroundImages() {
  // Global background (main background) should live INSIDE the preview frame (monitor),
  // not on the whole builder area.
  const stageInner = document.getElementById('preview-stage-inner');
  if (stageInner) {
    if (state.page.bgImageGlobal) {
      stageInner.style.backgroundImage = `url("${state.page.bgImageGlobal}")`;
      stageInner.style.backgroundSize = 'cover';
      stageInner.style.backgroundPosition = 'center';
      stageInner.style.backgroundRepeat = 'no-repeat';
    } else {
      stageInner.style.backgroundImage = '';
      stageInner.style.backgroundSize = '';
      stageInner.style.backgroundPosition = '';
      stageInner.style.backgroundRepeat = '';
    }
  }

  // Phone background image layer in builder preview
  const phoneBgLayer = document.querySelector('#preview-frame .phone-bg-layer');
  if (phoneBgLayer) {
    if (state.page.bgImagePhone) {
      phoneBgLayer.style.backgroundImage = `url("${state.page.bgImagePhone}")`;
      phoneBgLayer.style.backgroundSize = 'cover';
      phoneBgLayer.style.backgroundPosition = 'center';
      phoneBgLayer.style.backgroundRepeat = 'no-repeat';
    } else {
      phoneBgLayer.style.backgroundImage = '';
      phoneBgLayer.style.backgroundSize = '';
      phoneBgLayer.style.backgroundPosition = '';
      phoneBgLayer.style.backgroundRepeat = '';
    }
  }
  applyPhoneBackgroundOpacity();
}

function setupBackgroundImageUploads() {
  const globalDrop = document.getElementById('bg-global-dropzone');
  const globalInput = document.getElementById('bg-global-file-input');
  const globalHint = document.getElementById('bg-global-hint');
  const globalTitle = document.getElementById('bg-global-upload-title');

  const phoneDrop = document.getElementById('bg-phone-dropzone');
  const phoneInput = document.getElementById('bg-phone-file-input');
  const phoneHint = document.getElementById('bg-phone-hint');
  const phoneTitle = document.getElementById('bg-phone-upload-title');

  const phoneFrameDrop = document.getElementById('phone-frame-dropzone');
  const phoneFrameInput = document.getElementById('phone-frame-file-input');
  const phoneFrameHint = document.getElementById('phone-frame-hint');
  const phoneFrameTitle = document.getElementById('phone-frame-upload-title');

  const deleteGlobalBtn = document.getElementById('delete-global-bg-btn');
  const deletePhoneBgBtn = document.getElementById('delete-phone-bg-btn');
  const deleteFrameBtn = document.getElementById('delete-frame-btn');

  const updateDeleteButtons = () => {
    if (deleteGlobalBtn) deleteGlobalBtn.style.display = state.page.bgImageGlobal ? '' : 'none';
    if (deletePhoneBgBtn) deletePhoneBgBtn.style.display = state.page.bgImagePhone ? '' : 'none';
    if (deleteFrameBtn) deleteFrameBtn.style.display = state.page.phoneFrameImage ? '' : 'none';
  };

  const updateUploadTitles = () => {
    if (globalTitle) globalTitle.textContent = state.page.bgImageGlobal ? 'Change page bg' : '+ Page background';
    if (phoneTitle) phoneTitle.textContent = state.page.bgImagePhone ? 'Change phone bg' : '+ Phone background';
    if (phoneFrameTitle) phoneFrameTitle.textContent = state.page.phoneFrameImage ? 'Change frame' : '+ Change frame';
  };

  updateDeleteButtons();
  updateUploadTitles();

  const wire = (drop, input, hintEl, which) => {
    if (!drop || !input) return;
    const openPicker = () => input.click();
    drop.addEventListener('click', openPicker);
    drop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    });

    const handle = (file) => {
      if (!file) return;
      pushHistory();
      if (!file.type || !file.type.startsWith('image/')) {
        if (hintEl) hintEl.textContent = 'Please upload an image file.';
        showToast('Unsupported file type');
        return;
      }
      const maxBytes = (which === 'phoneFrame') ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
      if (file.size > maxBytes) {
        const maxMB = maxBytes / (1024 * 1024);
        if (hintEl) hintEl.textContent = `Image is too large (max ${maxMB} MB).`;
        showToast('Image is too large');
        return;
      }
      readFileAsDataURL(file)
        .then((dataUrl) => {
          if (which === 'global') state.page.bgImageGlobal = String(dataUrl || '');
          if (which === 'phone') state.page.bgImagePhone = String(dataUrl || '');
          if (which === 'phoneFrame') state.page.phoneFrameImage = String(dataUrl || '');
          if (hintEl) hintEl.textContent = '';
          applyBackgroundImages();
          updateDeleteButtons();
          updateUploadTitles();
          showToast(which === 'global' ? 'Page background updated' : which === 'phone' ? 'Phone background updated' : 'Frame changed');
        })
        .catch(() => {
          if (hintEl) hintEl.textContent = 'Could not read this file. Try another one.';
        });
    };

    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      handle(file);
      input.value = '';
    });

    const setDragActive = (active) => drop.classList.toggle('is-dragover', active);
    ['dragenter', 'dragover'].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(true);
      });
    });
    ['dragleave', 'dragend', 'drop'].forEach((evt) => {
      drop.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
      });
    });
    drop.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      handle(file);
    });
  };

  wire(globalDrop, globalInput, globalHint, 'global');
  wire(phoneDrop, phoneInput, phoneHint, 'phone');
  wire(phoneFrameDrop, phoneFrameInput, phoneFrameHint, 'phoneFrame');

  if (deleteGlobalBtn) {
    deleteGlobalBtn.addEventListener('click', () => {
      pushHistory();
      state.page.bgImageGlobal = '';
      applyBackgroundImages();
      updateDeleteButtons();
      updateUploadTitles();
      showToast('Page background removed');
    });
  }

  if (deletePhoneBgBtn) {
    deletePhoneBgBtn.addEventListener('click', () => {
      pushHistory();
      state.page.bgImagePhone = '';
      state.page.bgPhoneOpacity = 1;
      applyBackgroundImages();
      syncPhoneBgOpacityUi();
      updateDeleteButtons();
      updateUploadTitles();
      showToast('Phone background removed');
    });
  }

  if (deleteFrameBtn) {
    deleteFrameBtn.addEventListener('click', () => {
      pushHistory();
      state.page.phoneFrameImage = '';
      updatePreview();
      updatePublicPage();
      updateDeleteButtons();
      updateUploadTitles();
      showToast('Frame removed');
    });
  }

  updateDeleteButtons();
  updateUploadTitles();
}

/* ================================================
   BUTTON STYLES
   ================================================ */
function setupButtonStyles() {
  document.querySelectorAll('[data-btn-style]').forEach(chip => {
    chip.addEventListener('click', () => {
      pushHistory();
      document.querySelectorAll('[data-btn-style]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const frame = document.getElementById('preview-frame');
      // Remove all btn-style- classes
      frame.className = frame.className.replace(/btn-style-\S+/g, '').trim();

      const style = chip.dataset.btnStyle;
      if (style) frame.classList.add(style);
      state.page.btnStyle = style;
    });
  });
}

/* ================================================
   ACCENT COLORS
   ================================================ */
function setupAccentColors() {
  document.querySelectorAll('[data-accent]').forEach(swatch => {
    swatch.addEventListener('click', () => {
      pushHistory();
      document.querySelectorAll('[data-accent]').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');

      const color = swatch.dataset.accent;
      state.page.accentColor = color;
      applyAccentColor(color);
    });
  });
}

function applyAccentColor(color) {
  // Change CSS variable on preview phone only (optional: whole page)
  const frame = document.getElementById('preview-frame');
  frame.style.setProperty('--page-accent', color);

  // Tint link buttons with a subtle accent
  document.querySelectorAll('.page-link-btn').forEach(btn => {
    btn.style.borderColor = `${color}28`;
  });
}

/* ================================================
   FONT & TEXT
   ================================================ */
function setupTextOptions() {
  // Existing font option handling

  // Font options
  document.querySelectorAll('[data-font]').forEach(item => {
    item.addEventListener('click', () => {
      pushHistory();
      document.querySelectorAll('[data-font]').forEach(i => i.classList.remove('active'));
      item.classList.add('active');

      state.page.font = item.dataset.font;
      document.getElementById('prev-name').style.fontFamily = `'${state.page.font}', sans-serif`;
    });
  });

  // Name size slider
  const slider = document.getElementById('name-size-slider');
  const val    = document.getElementById('name-size-val');

  slider.addEventListener('focus', () => pushHistory());
  slider.addEventListener('input', () => {
    const size = parseInt(slider.value, 10);
    state.page.nameSize = size;
    val.textContent = size + 'px';
    document.getElementById('prev-name').style.fontSize = size + 'px';
  });
}

// ---------- Custom Font Upload ----------
function setupAddFonts() {
  const addBtnSidebar = document.getElementById('add-font-sidebar-btn');
  const addBtnContext = document.getElementById('add-font-btn');
  const fileInput = document.getElementById('font-file-input');
  if (!fileInput) return;
  const addBtn = addBtnSidebar || addBtnContext;
  if (addBtn) {
    addBtn.addEventListener('click', () => fileInput.click());
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    
    console.log('[CustomFonts] Loading font file:', file.name);
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const family = file.name.replace(/\.[^/.]+$/, '').replace(/\s+/g, '_');
      
      // Save to state
      if (!state.page.customFonts) state.page.customFonts = [];
      state.page.customFonts.push({ name: family, dataUrl });
      markPageModified();
      
      console.log('[CustomFonts] Saved to state, total fonts:', state.page.customFonts.length);
      console.log('[CustomFonts] Font data:', JSON.stringify(state.page.customFonts[state.page.customFonts.length - 1]).substring(0, 100));
      
      // Apply font
      applyCustomFontToPage(family, dataUrl);
      addCustomFontToUI(family);
      showToast(`Font "${family}" added`);
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });
}

function applyCustomFontToPage(family, dataUrl) {
  // Check if already applied
  const existing = document.querySelector(`style.custom-font-style[data-font-family="${family}"]`);
  if (existing) {
    console.log('[CustomFonts] Font already applied:', family);
    return;
  }
  
  console.log('[CustomFonts] Injecting @font-face for:', family);
  
  const style = document.createElement('style');
  style.className = 'custom-font-style';
  style.dataset.fontFamily = family;
  style.textContent = `@font-face { font-family: '${family}'; src: url('${dataUrl}'); }`;
  document.head.appendChild(style);
}

function addCustomFontToUI(family) {
  const fontList = document.getElementById('font-options');
  if (fontList) {
    const existing = fontList.querySelector(`[data-font="${family}"]`);
    if (!existing) {
      console.log('[CustomFonts] Adding to font-options list:', family);
      const div = document.createElement('div');
      div.className = 'option-item';
      div.dataset.font = family;
      div.style.fontFamily = `'${family}',sans-serif`;
      div.textContent = family + ' - Custom';
      fontList.appendChild(div);
      div.addEventListener('click', () => {
        document.querySelectorAll('#font-options .option-item').forEach(i => i.classList.remove('active'));
        div.classList.add('active');
        state.page.font = family;
        const nameEl = document.getElementById('prev-name');
        if (nameEl) nameEl.style.fontFamily = `'${family}', sans-serif`;
      });
    }
  }
  
  const select = document.getElementById('text-font-select');
  if (select) {
    const existing = select.querySelector(`option[value="'${family}', sans-serif"]`);
    if (!existing) {
      console.log('[CustomFonts] Adding to text-font-select:', family);
      const option = document.createElement('option');
      option.value = `'${family}', sans-serif`;
      option.textContent = family + ' - Custom';
      select.appendChild(option);
    }
  }
}

function restoreCustomFonts() {
  const fonts = state.page.customFonts || [];
  console.log('[CustomFonts] === restoreCustomFonts called ===');
  console.log('[CustomFonts] fonts in state:', fonts.length);
  console.log('[CustomFonts] fonts data preview:', fonts.map(f => ({name: f.name, hasData: !!f.dataUrl, dataLen: f.dataUrl?.length || 0})));
  
  if (fonts.length === 0) {
    console.log('[CustomFonts] No fonts to restore');
    return;
  }
  
  console.log('[CustomFonts] Restoring', fonts.length, 'fonts:', fonts.map(f => f.name).join(', '));
  
  fonts.forEach(font => {
    console.log('[CustomFonts] Applying font:', font.name, 'dataUrl length:', font.dataUrl ? font.dataUrl.length : 0);
    console.log('[CustomFonts] dataUrl preview:', font.dataUrl ? font.dataUrl.substring(0, 50) + '...' : 'null');
    applyCustomFontToPage(font.name, font.dataUrl);
    addCustomFontToUI(font.name);
  });
  
  console.log('[CustomFonts] Restoration complete');
}

/* ================================================
   PROFILE INPUTS (live preview)
   ================================================ */
function setupProfileInputs() {
  const nameInput = document.getElementById('edit-display-name');
  const bioInput = document.getElementById('edit-bio');
  if (nameInput) {
    nameInput.addEventListener('focus', () => pushHistory());
    nameInput.addEventListener('input', e => {
      state.page.displayName = e.target.value;
      state.page.displayNameHtml = escapeHtml(e.target.value || '@username');
      state.page.textManualSize.name = false;
      syncPublicUrlLabels();
      updatePreview();
    });
  }
  if (bioInput) {
    bioInput.addEventListener('focus', () => pushHistory());
    bioInput.addEventListener('input', e => {
      state.page.bio = e.target.value;
      state.page.bioHtml = escapeHtml(e.target.value || '');
      state.page.textManualSize.bio = false;
      updatePreview();
    });
  }
}

function setupClickToEnter() {
  const toggleBtn = document.getElementById('click-to-enter-toggle');
  const textInput = document.getElementById('click-to-enter-text');
  const controlsDiv = document.getElementById('click-to-enter-controls');

  const syncToggleUI = () => {
    if (!toggleBtn) return;
    toggleBtn.textContent = state.page.clickToEnter && state.page.clickToEnter.enabled ? 'On' : 'Off';
    toggleBtn.classList.toggle('btn--active', state.page.clickToEnter && state.page.clickToEnter.enabled);
  };

  const syncTextUI = () => {
    if (textInput && state.page.clickToEnter) {
      textInput.value = state.page.clickToEnter.text || 'Click to enter';
    }
    if (controlsDiv) {
      controlsDiv.style.display = (state.page.clickToEnter && state.page.clickToEnter.enabled) ? '' : 'none';
    }
  };

  syncToggleUI();
  syncTextUI();

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      pushHistory();
      if (!state.page.clickToEnter) {
        state.page.clickToEnter = { enabled: false, text: 'Click to enter' };
      }
      state.page.clickToEnter.enabled = !state.page.clickToEnter.enabled;
      syncToggleUI();
      syncTextUI();
      updatePreview();
      markPageModified();
    });
  }

  if (textInput) {
    textInput.addEventListener('input', e => {
      if (!state.page.clickToEnter) {
        state.page.clickToEnter = { enabled: false, text: 'Click to enter' };
      }
      state.page.clickToEnter.text = e.target.value || 'Click to enter';
      updatePreview();
      markPageModified();
    });
  }
}

function setupClickToEnterOverlay() {
  const overlay = document.getElementById('click-to-enter-overlay');
  if (overlay) {
    overlay.addEventListener('click', () => {
      overlay.classList.add('hidden');
      document.body.classList.remove('lock-scroll');
      setTimeout(() => {
        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
      }, 400);
    });
  }
}

function setupTilt3DProfileToggle() {
  const tiltToggleBtn = document.getElementById('tilt3d-profile-toggle');
  console.log('[Tilt3D Profile] setupTilt3DProfileToggle called, button found:', !!tiltToggleBtn);
  console.log('[Tilt3D Profile] state.page.layout:', JSON.stringify(state.page.layout).substring(0, 300));
  console.log('[Tilt3D Profile] state.page.layout.phone:', JSON.stringify(state.page.layout?.phone));
  
  const syncTiltToggleUI = () => {
    if (!tiltToggleBtn) return;
    const phoneLayout = state.page.layout?.phone || {};
    const tiltEnabled = !!phoneLayout.tilt3D;
    console.log('=== [TILT SYNC] syncTiltToggleUI called ===');
    console.log('[TILT SYNC] phoneLayout:', JSON.stringify(phoneLayout));
    console.log('[TILT SYNC] tiltEnabled:', tiltEnabled);
    tiltToggleBtn.textContent = tiltEnabled ? 'On' : 'Off';
    tiltToggleBtn.classList.toggle('btn--active', tiltEnabled);
  };
  
  syncTiltToggleUI();
  
  if (tiltToggleBtn) {
    tiltToggleBtn.addEventListener('click', async () => {
      console.log('=== [TILT CLICK] Button clicked ===');
      console.log('[TILT CLICK] BEFORE - state.page.layout.phone:', JSON.stringify(state.page.layout?.phone));
      console.log('[TILT CLICK] BEFORE - state.page.layout keys:', Object.keys(state.page.layout || {}));
      
      pushHistory();
      if (!state.page.layout) state.page.layout = {};
      if (!state.page.layout.phone) state.page.layout.phone = {};
      
      const current = state.page.layout.phone.tilt3D;
      if (current) {
        delete state.page.layout.phone.tilt3D;
        console.log('[TILT CLICK] Disabled tilt3D');
      } else {
        state.page.layout.phone.tilt3D = { maxX: 15, maxY: 15, perspective: 800, smoothing: 0.15 };
        console.log('[TILT CLICK] Enabled tilt3D');
      }
      
      console.log('[TILT CLICK] After - layout.phone:', JSON.stringify(state.page.layout?.phone));
      console.log('[TILT CLICK] After - tilt3D exists:', !!state.page.layout?.phone?.tilt3D);
      
      syncTiltToggleUI();
      updatePreview();
      
      console.log('[TILT CLICK] After updatePreview - layout.phone:', JSON.stringify(state.page.layout?.phone));
      console.log('[TILT CLICK] After updatePreview - tilt3D exists:', !!state.page.layout?.phone?.tilt3D);
      
      markPageModified();
      
      // Save immediately and wait for it
      await savePageToServer(false);
      
      const publicScreen = document.getElementById('screen-public');
      if (publicScreen && publicScreen.classList.contains('active')) {
        if (window.reset3DTilt) window.reset3DTilt();
        if (window.setup3DTilt) window.setup3DTilt();
      }
      
      showToast(state.page.layout.phone.tilt3D ? '3D Tilt enabled' : '3D Tilt disabled');
    });
  }
  
  window.syncTilt3DProfileToggle = syncTiltToggleUI;
}

function applyLayout() {
  const phoneInner = document.querySelector('.phone-inner');
  if (phoneInner) {
    applyLayoutTo(phoneInner, { autoTextSize: true, commit: true });
  }
  // Apply layout for default elements (avatar, name, bio) - they are in stageInner
  const stageInner = document.getElementById('preview-stage-inner');
  if (stageInner) {
    applyDefaultElementsLayout(stageInner, { autoTextSize: true, commit: true });
  }
  // Apply layout for link buttons (they are independent elements in stageInner)
  applyLinkLayouts();
  applyStageObjectLayout();
}

function applyDefaultElementsLayout(stageInner, opts = {}) {
  const { autoTextSize = true, commit = true } = opts;
  const defaultKeys = ['avatar', 'name', 'bio'];

  defaultKeys.forEach((key) => {
    const el = stageInner.querySelector(`[data-editable="${key}"]`);
    const box = state.page.layout[key];
    if (!el || !box) return;

    let w = box.w;
    let h = box.h;
    if (autoTextSize && (key === 'name' || key === 'bio') && !state.page.textManualSize[key]) {
      const content = el.querySelector('.text-content');
      if (content) {
        const hitboxPadding = 22;
        const nextW = Math.ceil(content.scrollWidth + hitboxPadding);
        const nextH = Math.ceil(content.scrollHeight + hitboxPadding * 0.5);
        w = Math.max(40, nextW);
        h = Math.max(24, nextH);
      }
    }

    if (commit) state.page.layout[key] = { ...box, w, h };
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `rotate(${box.rotate || 0}deg)`;
    el.style.whiteSpace = key === 'bio' ? 'pre-wrap' : 'nowrap';
    
    // Add resize and rotate handles
    if (key === 'name' || key === 'bio') {
      ensureResizeHandle(el);
      ensureRotateHandle(el);
    }
  });

  // Apply layout for individual link buttons
  state.page.links.forEach((_, i) => {
    const key = `link-${i}`;
    const btn = stageInner.querySelector(`.link-editable[data-editable="${key}"]`);
    const box = state.page.layout[key];
    if (!btn || !box) return;

    btn.style.left = `${box.x}px`;
    btn.style.top = `${box.y}px`;
    btn.style.width = `${box.w}px`;
    btn.style.height = `${box.h}px`;
    btn.style.transform = `rotate(${box.rotate || 0}deg)`;
  });
}

function applyPhoneLayout() {
  const stage = document.getElementById('preview-stage');
  const phone = document.getElementById('preview-frame');
  if (!stage || !phone) return;
  const box = state.page.layout && state.page.layout.phone ? state.page.layout.phone : null;
  if (!box) return;

  // Make sure the phone has a resize handle (builder only)
  ensureResizeHandle(phone);
  ensureRotateHandle(phone);
  ensureRadiusHandles(phone);

  const stageW = stage.clientWidth;
  const stageH = stage.clientHeight;
  if (stageW < 200 || stageH < 200) return;

  // Save canvas dimensions for public page rendering
  state.builder.canvasW = stageW;
  state.builder.canvasH = stageH;

  const w = Math.max(200, Math.min(Number(box.w || 280), stageW));
  const h = Math.max(320, Math.min(Number(box.h || 560), stageH));
  // Use stored position; only auto-center if not yet positioned
  let x = Number(box.x);
  let y = Number(box.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0 && box.w === 280 && box.h === 560)) {
    x = Math.max(0, Math.round((stageW - w) / 2));
    y = Math.max(0, Math.round((stageH - h) / 2));
  }

  state.page.layout.phone = { x, y, w, h, rotate: box.rotate || 0 };
  // Preserve tilt3D if it exists
  if (box.tilt3D) {
    state.page.layout.phone.tilt3D = box.tilt3D;
  }
  phone.style.display = state.page.deleted.phone ? 'none' : '';
  phone.style.left = `${x}px`;
  phone.style.top = `${y}px`;
  phone.style.width = `${w}px`;
  phone.style.height = `${h}px`;
  phone.style.transform = `rotate(${box.rotate || 0}deg)`;

  // Initialize default element positions - centered in stage, independent of phone
  // Only recalculate if phone was never moved (default position)
  const wasPhoneNeverMoved = (box.x === 0 && box.y === 0 && box.w === 280 && box.h === 560);
  if (wasPhoneNeverMoved) {
    const centerX = Math.round((stageW - 280) / 2);
    const centerY = Math.round((stageH - 560) / 2);

    state.page.layout.avatar = { x: centerX + 100, y: centerY + 80, w: 82, h: 82 };
    state.page.layout.name = { x: centerX + 100, y: centerY + 170, w: 140, h: 30 };
    state.page.layout.bio = { x: centerX + 100, y: centerY + 230, w: 140, h: 50 };
    state.page.layout.links = { x: centerX + 100, y: centerY + 364, w: 232, h: 44 };
  }
}

function applyPreviewView() {
  const builderPreview = document.querySelector('.builder-preview');
  const inner = document.getElementById('preview-stage-inner');
  if (!builderPreview || !inner) return;
  const v = state.builder && state.builder.view ? state.builder.view : { x: 0, y: 0, scale: 1 };
  const x = Number.isFinite(v.x) ? v.x : 0;
  const y = Number.isFinite(v.y) ? v.y : 0;
  const s = Number.isFinite(v.scale) ? v.scale : 1;
  inner.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
}

function setBuilderTool(tool) {
  state.builder.tool = tool;
  const preview = document.querySelector('.builder-preview');
  const btnCursor = document.getElementById('tool-cursor');
  const btnHand = document.getElementById('tool-hand');
  const btnSelect = document.getElementById('tool-select');
  if (btnCursor) btnCursor.classList.toggle('active', tool === 'cursor');
  if (btnHand) btnHand.classList.toggle('active', tool === 'hand');
  if (btnSelect) btnSelect.classList.toggle('active', tool === 'select');
  if (preview) preview.classList.toggle('is-hand-mode', tool === 'hand');
  if (tool === 'cursor') {
    state.builder.view = { x: 0, y: 0, scale: 1 };
    applyPreviewView();
  }
  document.dispatchEvent(new CustomEvent('builder-tool-changed', { detail: { tool } }));
}

function isHandTool() {
  return !!(state.builder && state.builder.tool === 'hand');
}

function isSelectTool() {
  return !!(state.builder && state.builder.tool === 'select');
}

function applyPhoneRadius() {
  const radius = state.page.phoneBorderRadius || 42;
  const previewPhone = document.getElementById('preview-frame');
  const publicPhone = document.getElementById('public-frame');
  if (previewPhone) previewPhone.style.borderRadius = `${radius}px`;
  if (publicPhone) publicPhone.style.borderRadius = `${radius}px`;
  // Update blur layer radius too
  if (state.page.phoneBlur) applyPhoneBlur();
}

function setupPreviewTools() {
  const btnCursor = document.getElementById('tool-cursor');
  const btnHand = document.getElementById('tool-hand');
  const btnSelect = document.getElementById('tool-select');
  if (btnCursor) btnCursor.addEventListener('click', () => setBuilderTool('cursor'));
  if (btnHand) btnHand.addEventListener('click', () => setBuilderTool('hand'));
  if (btnSelect) btnSelect.addEventListener('click', () => setBuilderTool('select'));
  setBuilderTool(state.builder.tool || 'cursor');
  applyPreviewView();
}

function setupPreviewPanZoom() {
  const stage = document.getElementById('preview-stage');
  const inner = document.getElementById('preview-stage-inner');
  if (!stage || !inner) return;

  let panning = false;
  let startX = 0;
  let startY = 0;
  let startView = null;

  const clampScale = (s) => Math.max(0.35, Math.min(3.5, s));

  stage.addEventListener('wheel', (ev) => {
    if (!isHandTool()) return;
    ev.preventDefault();
    const rect = stage.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    const v = state.builder.view;
    const oldScale = v.scale || 1;
    const delta = Math.max(-1, Math.min(1, ev.deltaY));
    const zoomFactor = delta > 0 ? 0.92 : 1.08;
    const nextScale = clampScale(oldScale * zoomFactor);

    // Keep mouse point stable: world = (mouse - pan) / scale
    const wx = (mx - v.x) / oldScale;
    const wy = (my - v.y) / oldScale;
    v.scale = nextScale;
    v.x = mx - wx * nextScale;
    v.y = my - wy * nextScale;
    applyPreviewView();
  }, { passive: false });

  stage.addEventListener('mousedown', (ev) => {
    if (!isHandTool()) return;
    // only left click pans
    if (ev.button !== 0) return;
    panning = true;
    startX = ev.clientX;
    startY = ev.clientY;
    startView = { ...state.builder.view };
    ev.preventDefault();
  });

  window.addEventListener('mousemove', (ev) => {
    if (!panning || !startView) return;
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    state.builder.view.x = startView.x + dx;
    state.builder.view.y = startView.y + dy;
    applyPreviewView();
  });

  window.addEventListener('mouseup', () => {
    panning = false;
    startView = null;
  });
}

function applyLayoutTo(phoneInner, opts = {}) {
  if (!phoneInner) return;
  const { autoTextSize = true, commit = true } = opts;
  const maxW = phoneInner.clientWidth;
  const maxH = phoneInner.clientHeight;
  if (maxW < 120 || maxH < 120) return;

  Object.entries(state.page.layout).forEach(([key, box]) => {
    const el = phoneInner.querySelector(`[data-editable="${key}"]`) || phoneInner.querySelector(`[data-public="${key}"]`);
    if (!el) return;
    let w = Math.max(40, Math.min(box.w, maxW));
    let h = Math.max(24, Math.min(box.h, maxH));
    if (autoTextSize && (key === 'name' || key === 'bio') && !state.page.textManualSize[key]) {
      const content = el.querySelector('.text-content');
      if (content) {
        const hitboxPadding = 22;
        const nextW = Math.ceil(content.scrollWidth + hitboxPadding);
        const nextH = Math.ceil(content.scrollHeight + hitboxPadding * 0.5);
        w = Math.max(40, Math.min(nextW, maxW));
        h = Math.max(24, Math.min(nextH, maxH));
      }
    }
    const x = Math.max(0, Math.min(box.x, maxW - w));
    const y = Math.max(0, Math.min(box.y, maxH - h));
    if (commit) state.page.layout[key] = { x, y, w, h };
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${w}px`;
    el.style.height = `${h}px`;
    el.style.transform = `rotate(${box.rotate || 0}deg)`;
    el.style.whiteSpace = key === 'bio' ? 'pre-wrap' : 'nowrap';
  });
}

function applyPublicScale() {
  const stage = document.querySelector('.public-stage');
  const inner = document.querySelector('.public-stage-inner');
  const frame = document.getElementById('public-frame');
  const phoneLayout = state.page.layout && state.page.layout.phone ? state.page.layout.phone : null;
  if (!stage || !inner || !frame) return;

  const stageW = stage.clientWidth;
  const stageH = stage.clientHeight;
  if (stageW < 1 || stageH < 1) return;

  // Use fixed dimensions for public page (matching builder preview size)
  const canvasW = 1200;
  const canvasH = 800;

  const scale = Math.min(stageW / canvasW, stageH / canvasH);
  const offsetX = (stageW - canvasW * scale) / 2;
  const offsetY = (stageH - canvasH * scale) / 2;

  inner.style.width = `${canvasW}px`;
  inner.style.height = `${canvasH}px`;
  inner.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;

  // Apply custom objects layout
  applyPublicCustomObjectsLayout(scale);

  // Position phone frame
  if (phoneLayout) {
    const baseW = Math.max(200, Number(phoneLayout.w || 280));
    const baseH = Math.max(320, Number(phoneLayout.h || 560));
    frame.style.position = 'absolute';
    frame.style.left = `${phoneLayout.x}px`;
    frame.style.top = `${phoneLayout.y}px`;
    frame.style.width = `${baseW}px`;
    frame.style.height = `${baseH}px`;
    
    // Don't override transform if 3D Tilt is active
    if (!phoneLayout.tilt3D) {
      frame.style.transform = `rotate(${phoneLayout.rotate || 0}deg)`;
    }
    
    frame.style.display = state.page.deleted.phone ? 'none' : '';
  }

  // Position default elements (avatar, name, bio, links) - they are in stageInner
  if (inner) {
    applyPublicDefaultElementsLayout(inner, scale);
  }
}

function applyPublicCustomObjectsLayout(scale = 1) {
  const inner = document.querySelector('.public-stage-inner');
  if (!inner) return;
  
  const centerOffsetY = 0;
  const phoneTiltEnabled = state.page.layout?.phone?.tilt3D;
  
  (state.page.customObjects || []).forEach((obj) => {
    const key = `obj-${obj.id}`;
    const el = inner.querySelector(`.public-custom-object[data-editable="${key}"]`);
    if (!el) return;
    
    const box = state.page.layout[key];
    if (!box) return;
    
    console.log(`[PublicLayout] Custom object ${key}: rotate=${box.rotate || 0}`);
    
    el.style.position = 'absolute';
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.w}px`;
    el.style.height = obj.type === 'text' ? 'auto' : `${box.h}px`;
    
    // Don't override transform if 3D Tilt is active
    if (!phoneTiltEnabled) {
      el.style.transform = `rotate(${box.rotate || 0}deg)`;
    }
  });
}

function applyPublicDefaultElementsLayout(inner, scale = 1) {
  const phoneLayout = state.page.layout?.phone;
  const phoneX = phoneLayout?.x || 0;
  const phoneY = phoneLayout?.y || 0;
  
  const centerOffsetY = 0;
  
  const defaultKeys = ['avatar', 'name', 'bio'];

  defaultKeys.forEach((key) => {
    const el = inner.querySelector(`[data-public="${key}"]`);
    const box = state.page.layout[key];
    if (!el || !box) return;

    console.log(`[PublicLayout] Default element ${key}: rotate=${box.rotate || 0}`);

    el.style.position = 'absolute';
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.w}px`;
    el.style.height = `${box.h}px`;
    
    // Don't override transform if 3D Tilt is active
    const phoneTiltEnabled = state.page.layout?.phone?.tilt3D;
    if (!phoneTiltEnabled) {
      el.style.transform = `rotate(${box.rotate || 0}deg)`;
    }
  });

  // Apply layout for individual link buttons
  if (state.page.links) {
    state.page.links.forEach((_, i) => {
      const key = `link-${i}`;
      const btn = inner.querySelector(`[data-public="${key}"]`);
      const box = state.page.layout[key];
      if (!btn || !box) return;

      console.log(`[PublicLayout] Link ${key}: rotate=${box.rotate || 0}`);

      btn.style.position = 'absolute';
      btn.style.left = `${box.x}px`;
      btn.style.top = `${box.y}px`;
      btn.style.width = `${box.w}px`;
      btn.style.height = `${box.h}px`;
      
      // Don't override transform if 3D Tilt is active
      const phoneTiltEnabled = state.page.layout?.phone?.tilt3D;
      if (!phoneTiltEnabled) {
        btn.style.transform = `rotate(${box.rotate || 0}deg)`;
      }
    });
  }
}

function ensurePublicStageInner() {
  const stage = document.querySelector('.public-stage');
  const frame = document.getElementById('public-frame');
  if (!stage || !frame) return null;
  let inner = stage.querySelector('.public-stage-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'public-stage-inner';
    inner.id = 'public-stage-inner';
    stage.insertBefore(inner, frame);
  }
  return inner;
}

function ensureBuilderStageInner() {
  const stage = document.querySelector('.builder-preview');
  const frame = document.getElementById('preview-frame');
  if (!stage || !frame) return null;
  let inner = stage.querySelector('.preview-stage-inner');
  if (!inner) {
    inner = document.createElement('div');
    inner.className = 'preview-stage-inner';
    inner.id = 'preview-stage-inner';
    stage.insertBefore(inner, frame);
    inner.appendChild(frame);
  }
  return inner;
}

function updatePublicPage() {
  ensurePublicStageInner();
  const frame = document.getElementById('public-frame');
  const inner = document.querySelector('.public-stage-inner');
  if (!frame) return;

  const phoneBgLayer = frame.querySelector('.phone-bg-layer');
  const stage = document.querySelector('.public-stage');

  // Apply phone border radius
  applyPhoneRadius();
  
  // Apply phone background opacity
  applyPhoneBackgroundOpacity();

  // Apply bg + button style + custom frame
  frame.className = 'phone-frame ' + state.page.bg;
  if (state.page.btnStyle) frame.classList.add(state.page.btnStyle);
  frame.style.setProperty('--page-accent', state.page.accentColor);
  frame.style.display = (isObjectDeleted('phone') || isObjectInHiddenLayer('phone')) ? 'none' : '';

  // Apply custom frame overlay if exists
  const previewOverlay = document.getElementById('preview-frame-overlay');
  if (previewOverlay) {
    if (state.page.phoneFrameImage) {
      previewOverlay.src = state.page.phoneFrameImage;
      previewOverlay.hidden = false;
    } else {
      previewOverlay.src = '';
      previewOverlay.hidden = true;
    }
  }

  // Apply custom cursor if exists
  const publicFrame = document.getElementById('public-frame');
  const publicStage = document.querySelector('.public-stage');
  const applyCursor = (el) => {
    if (el) {
      if (state.page.cursorImage) {
        el.style.setProperty('cursor', `url("${state.page.cursorImage}") ${Math.round(state.page.cursorSize / 2)} ${Math.round(state.page.cursorSize / 2)}, auto`, 'important');
      } else {
        el.style.cursor = 'default';
      }
    }
  };
  if (publicFrame) applyCursor(publicFrame);
  if (publicStage) applyCursor(publicStage);

  // Background
  const publicScreen = document.getElementById('screen-public');
  if (publicScreen) {
    if (state.page.bgImageGlobal) {
      publicScreen.style.backgroundImage = `url("${state.page.bgImageGlobal}")`;
      publicScreen.style.backgroundSize = 'cover';
      publicScreen.style.backgroundPosition = 'center';
      publicScreen.style.backgroundRepeat = 'no-repeat';
    } else {
      publicScreen.style.backgroundImage = '';
      publicScreen.style.backgroundSize = '';
      publicScreen.style.backgroundPosition = '';
      publicScreen.style.backgroundRepeat = '';
    }
  }

  // Phone background image layer
  if (phoneBgLayer) {
    if (state.page.bgImagePhone) {
      phoneBgLayer.style.backgroundImage = `url("${state.page.bgImagePhone}")`;
      phoneBgLayer.style.backgroundSize = 'cover';
      phoneBgLayer.style.backgroundPosition = 'center';
      phoneBgLayer.style.backgroundRepeat = 'no-repeat';
    } else {
      phoneBgLayer.style.backgroundImage = '';
      phoneBgLayer.style.backgroundSize = '';
      phoneBgLayer.style.backgroundPosition = '';
      phoneBgLayer.style.backgroundRepeat = '';
    }
  }
  applyPhoneBackgroundOpacity();
  syncPhoneBgOpacityUi();

  // Avatar
  const avatarEl = document.getElementById('pub-avatar');
  if (avatarEl) {
    const hidden = isObjectDeleted('avatar');
    avatarEl.style.display = hidden ? 'none' : '';
    if (state.page.avatar) {
      avatarEl.innerHTML = `<img src="${state.page.avatar}" alt="Avatar" class="page-avatar-image" />`;
    } else {
      avatarEl.innerHTML = `<img src="default_pfp.png" alt="Avatar" class="page-avatar-image" />`;
    }
  }

  // Name & bio (render saved HTML identically to builder)
  const nameEl = document.getElementById('pub-name');
  const bioEl = document.getElementById('pub-bio');
  if (nameEl) {
    const hidden = isObjectDeleted('name');
    nameEl.style.display = hidden ? 'none' : '';
    setStaticText(
      nameEl,
      state.page.displayNameHtml || escapeHtml(state.page.displayName || '@username'),
      state.page.displayName || '@username'
    );
    nameEl.style.fontFamily = `'${state.page.font}', sans-serif`;
    nameEl.style.fontSize = state.page.nameSize + 'px';
  }
  if (bioEl) {
    const hidden = isObjectDeleted('bio');
    bioEl.style.display = hidden ? 'none' : '';
    setStaticText(
      bioEl,
      state.page.bioHtml || escapeHtml(state.page.bio || ''),
      state.page.bio || ''
    );
  }

  // Links (clickable) - render as independent elements
  const pubStageInner = document.getElementById('public-stage-inner');
  if (pubStageInner) {
    // Remove old link elements
    pubStageInner.querySelectorAll('[data-public^="link-"]').forEach(el => el.remove());

    // Don't render if links are disabled
    if (!state.page.linksEnabled) {
      // Still apply layout but empty
    } else if (state.page.links) {
      state.page.links.forEach((link, i) => {
        const key = `link-${i}`;
        if (isObjectDeleted(key)) return;
        
        const isIconStyle = link.style === 'icon';
        const serviceIcon = getServiceIconContent(link.url, link.emoji);

        const a = document.createElement('a');
        if (isIconStyle) {
          a.className = 'page-link-btn-icon mode-icon';
          a.style.width = '32px';
          a.style.height = '32px';
          if (link.color) {
            a.style.color = link.color;
          }
          if (link.glow) {
            a.style.filter = `drop-shadow(0 0 8px ${link.color || '#d6d6d6'})`;
          }
        } else {
          a.className = 'page-link-btn';
          const linkColor = link.color || '#d6d6d6';
          a.style.backgroundColor = linkColor;
          if (link.glow) {
            a.style.boxShadow = `0 0 15px ${linkColor}`;
          }
        }
        a.dataset.public = key;
        a.href = link.url || '#';
        a.target = '_blank';
        a.rel = 'noopener noreferrer';

        if (isIconStyle) {
          a.innerHTML = serviceIcon;
        } else {
          const service = detectServiceFromUrl(link.url);
          if (service) {
            a.innerHTML = `${serviceIcon}<span class="link-label-text">${link.label || ''}</span>`;
          } else {
            a.textContent = `${link.emoji || '🔗'} ${link.label || ''}`;
          }
          a.style.borderColor = `${state.page.accentColor}28`;
        }

        pubStageInner.appendChild(a);
      });
    }
  }

  // Apply layer z-index on public page
  const pubInner = document.querySelector('.public-stage-inner');
  if (pubInner && state.page.layers) {
    state.page.layers.forEach((layer, layerIndex) => {
      const zBase = (state.page.layers.length - 1 - layerIndex) * 10;
      layer.objects.forEach((objKey) => {
        if (isCoreElement(objKey)) return;
        const el = pubInner.querySelector(`[data-public="${objKey}"], [data-editable="${objKey}"], .public-custom-object[data-editable="${objKey}"]`);
        if (el) el.style.zIndex = zBase;
      });
      const frame = document.getElementById('public-frame');
      if (layer.objects.includes('phone') && frame) {
        frame.style.zIndex = zBase;
      }
    });
  }
  
  CORE_ELEMENTS.forEach((key, i) => {
    const el = pubInner.querySelector(`[data-public="${key}"], [data-editable="${key}"]`);
    if (el) el.style.zIndex = CORE_Z_INDEX + i;
  });
  
  if (state.page.links && state.page.links.length) {
    state.page.links.forEach((_, i) => {
      const el = pubInner.querySelector(`[data-public="link-${i}"], [data-editable="link-${i}"]`);
      if (el) el.style.zIndex = CORE_Z_INDEX + 10 + i;
    });
  }

  // Custom objects
  renderPublicCustomObjects();

  // Click-to-enter overlay
  const overlay = document.getElementById('click-to-enter-overlay');
  const overlayMessage = document.getElementById('click-to-enter-message');
  const hasClickToEnter = state.page.clickToEnter;

  if (overlay) {
    if (hasClickToEnter) {
      overlay.style.display = 'flex';
      overlay.classList.remove('hidden');
      overlay.removeAttribute('aria-hidden');
      if (overlayMessage) {
        overlayMessage.textContent = state.page.clickToEnterText || 'Click to enter';
      }
    } else {
      overlay.style.display = 'none';
      overlay.setAttribute('aria-hidden', 'true');
    }
  }
  
updatePublicSpotifyWidget();
    updateDiscordWidgets();
}

function setupPublicPageResponsiveScale() {
  window.addEventListener('resize', () => {
    const publicScreen = document.getElementById('screen-public');
    if (publicScreen && publicScreen.classList.contains('active')) {
      applyPublicScale();
    }
  });

  let publicMouseX = 0;
  let publicMouseY = 0;

  document.addEventListener('mousemove', (e) => {
    publicMouseX = e.clientX;
    publicMouseY = e.clientY;
  });

  function updatePublicFollowCursor() {
    const objs = state.page.customObjects || [];
    objs.forEach((obj) => {
      if (!obj.followCursor) return;
      const key = `obj-${obj.id}`;
      const el = document.querySelector(`.public-custom-object[data-editable="${key}"]`);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(publicMouseY - centerY, publicMouseX - centerX) * (180 / Math.PI) + 90;
      const box = state.page.layout[key];
      const baseRotate = box.rotate || 0;
      el.style.transform = `rotate(${baseRotate + angle}deg)`;
    });
  }

  document.addEventListener('mousemove', updatePublicFollowCursor);
  
  let tilt3DRunning = false;
  let tiltMoveHandler = null;
  let isHoveringPhone = false;
  let tiltAnimFrameCount = 0;
  
  function setup3DTilt() {
    console.log('=== [3D TILT] setup3DTilt called ===');
    const publicScreen = document.getElementById('screen-public');
    if (!publicScreen || !publicScreen.classList.contains('active')) {
      console.log('[3D TILT] Public screen not active');
      return;
    }
    
    const phoneLayout = state.page.layout?.phone || {};
    const tiltEnabled = !!phoneLayout.tilt3D;
    console.log('[3D TILT] layout.phone:', JSON.stringify(phoneLayout));
    console.log('[3D TILT] tiltEnabled:', tiltEnabled);
    
    if (!tiltEnabled) {
      reset3DTilt();
      tilt3DRunning = false;
      return;
    }
    
    if (tilt3DRunning) {
      console.log('[3D Tilt] Already running, resetting first');
      reset3DTilt();
      tilt3DRunning = false;
    }
    
    tilt3DRunning = true;
    console.log('[3D Tilt] Starting tilt animation');
    
    const phoneEl = document.getElementById('public-frame');
    if (!phoneEl) {
      console.log('[3D Tilt] Phone element not found!');
      return;
    }
    
    console.log('[3D Tilt] Phone element found:', phoneEl);
    
    const tiltElements = {
      phone: { el: phoneEl, key: 'phone' },
      avatar: { el: document.getElementById('pub-avatar'), key: 'avatar' },
      name: { el: document.getElementById('pub-name'), key: 'name' },
      bio: { el: document.getElementById('pub-bio'), key: 'bio' }
    };
    
    console.log('[3D Tilt] tiltElements:', Object.entries(tiltElements).map(([k, v]) => `${k}=${!!v.el}`).join(', '));
    
    const linkElements = [];
    document.querySelectorAll('#screen-public [data-public^="link-"]').forEach(el => {
      const key = el.dataset.public;
      linkElements.push({ el, key });
    });
    
    const maxRotateX = phoneLayout.tilt3D.maxX || 15;
    const maxRotateY = phoneLayout.tilt3D.maxY || 15;
    const perspective = phoneLayout.tilt3D.perspective || 800;
    const smoothing = phoneLayout.tilt3D.smoothing || 0.15;
    
    let currentRotateX = 0;
    let currentRotateY = 0;
    let targetRotateX = 0;
    let targetRotateY = 0;
    
    const getBaseRotation = (key) => {
      const box = state.page.layout[key];
      return box && box.rotate ? box.rotate : 0;
    };
    
    const getTiltTransform = (key) => {
      const baseRotate = getBaseRotation(key);
      return `rotate(${baseRotate}deg) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`;
    };
    
    // Apply perspective to parent container (no preserve-3d — elements stay in 2D stacking order)
    const stageInner = document.querySelector('.public-stage-inner');
    if (stageInner) {
      stageInner.style.perspective = `${perspective}px`;
    }
    
    function animateTilt() {
      tiltAnimFrameCount++;
      
      currentRotateX += (targetRotateX - currentRotateX) * smoothing;
      currentRotateY += (targetRotateY - currentRotateY) * smoothing;
      
      if (tiltAnimFrameCount % 30 === 0) {
        console.log('[3D Tilt] Animating, current:', currentRotateX.toFixed(1), currentRotateY.toFixed(1));
      }
      
      Object.values(tiltElements).forEach(({ el, key }) => {
        if (el) {
          const transform = getTiltTransform(key);
          el.style.transform = transform;
          if (tiltAnimFrameCount % 60 === 0) {
            console.log('[3D Tilt] Applied transform to', key, ':', transform);
          }
        }
      });
      
      linkElements.forEach(({ el, key }) => {
        el.style.transform = getTiltTransform(key);
      });
      
      requestAnimationFrame(animateTilt);
    }
    
    animateTilt();
    console.log('[3D Tilt] Animation loop started');
    console.log('[3D Tilt] Tilt elements:', Object.entries(tiltElements).map(([k, v]) => `${k}=${v.el?.id}`).join(', '));
    console.log('[3D Tilt] Link elements count:', linkElements.length);
    
    // Set initial transform for all elements
    Object.values(tiltElements).forEach(({ el, key }) => {
      if (el) {
        el.style.transform = getTiltTransform(key);
        console.log('[3D Tilt] Initial transform for', key, ':', getTiltTransform(key));
      }
    });
    
    linkElements.forEach(({ el, key }) => {
      el.style.transform = getTiltTransform(key);
    });
    
    // Remove old handler if exists
    if (tiltMoveHandler) {
      document.removeEventListener('mousemove', tiltMoveHandler);
    }
    
    // Use phone element mousemove like custom objects
    tiltMoveHandler = (e) => {
      const phoneRect = phoneEl.getBoundingClientRect();
      const isOver = e.clientX >= phoneRect.left && e.clientX <= phoneRect.right && 
                     e.clientY >= phoneRect.top && e.clientY <= phoneRect.bottom;
      
      if (isOver && !isHoveringPhone) {
        isHoveringPhone = true;
        console.log('[3D Tilt] Hovering phone: true');
      } else if (!isOver && isHoveringPhone) {
        isHoveringPhone = false;
        targetRotateX = 0;
        targetRotateY = 0;
        console.log('[3D Tilt] Hovering phone: false');
      }
      
      if (!isHoveringPhone) return;
      
      // Calculate relative to phone center (like custom objects)
      const centerX = phoneRect.left + phoneRect.width / 2;
      const centerY = phoneRect.top + phoneRect.height / 2;
      
      const mouseX = e.clientX - centerX;
      const mouseY = e.clientY - centerY;
      
      const maxOffsetX = phoneRect.width / 2;
      const maxOffsetY = phoneRect.height / 2;
      
      targetRotateY = -(mouseX / maxOffsetX) * maxRotateY;
      targetRotateX = (mouseY / maxOffsetY) * maxRotateX;
      
      if (tiltAnimFrameCount % 30 === 0) {
        console.log('[3D Tilt] handleTiltMove fired, target:', targetRotateX.toFixed(1), targetRotateY.toFixed(1));
      }
    };
    
    document.addEventListener('mousemove', tiltMoveHandler);
    console.log('[3D Tilt] Global mousemove handler attached');
  }
  
  function reset3DTilt() {
    const phoneEl = document.getElementById('public-frame');
    const tiltElements = {
      phone: { el: phoneEl, key: 'phone' },
      avatar: { el: document.getElementById('pub-avatar'), key: 'avatar' },
      name: { el: document.getElementById('pub-name'), key: 'name' },
      bio: { el: document.getElementById('pub-bio'), key: 'bio' }
    };
    
    const linkElements = [];
    document.querySelectorAll('#screen-public [data-public^="link-"]').forEach(el => {
      linkElements.push({ el, key: el.dataset.public });
    });
    
    const getBaseRotation = (key) => {
      const box = state.page.layout[key];
      return box && box.rotate ? box.rotate : 0;
    };
    
    Object.values(tiltElements).forEach(({ el, key }) => {
      if (el) {
        const baseRotate = getBaseRotation(key);
        el.style.transform = baseRotate ? `rotate(${baseRotate}deg)` : '';
        console.log('[3D Tilt] Reset transform for', key, ':', el.style.transform);
      }
    });
    
    linkElements.forEach(({ el, key }) => {
      const baseRotate = getBaseRotation(key);
      el.style.transform = baseRotate ? `rotate(${baseRotate}deg)` : '';
    });
    
    // Reset custom objects
    (state.page.customObjects || []).forEach((obj) => {
      const key = `obj-${obj.id}`;
      const el = document.querySelector(`.public-custom-object[data-editable="${key}"]`);
      if (el) {
        const box = state.page.layout[key];
        const baseRotate = box && box.rotate ? box.rotate : 0;
        el.style.transform = baseRotate ? `rotate(${baseRotate}deg)` : '';
      }
    });
    
    // Remove mousemove handler
    if (tiltMoveHandler) {
      document.removeEventListener('mousemove', tiltMoveHandler);
      tiltMoveHandler = null;
    }
    
    // Remove perspective from parent
    const stageInner = document.querySelector('.public-stage-inner');
    if (stageInner) {
      stageInner.style.perspective = '';
    }
    
    isHoveringPhone = false;
    
    tilt3DRunning = false;
    console.log('[3D Tilt] Reset complete');
  }
  
  // Handle custom objects with their own 3D tilt
  function setupCustomObject3DTilt() {
    const customObjs = state.page.customObjects || [];
    customObjs.forEach((obj) => {
      if (!obj.tilt3D) return;
      const key = `obj-${obj.id}`;
      const el = document.querySelector(`.public-custom-object[data-editable="${key}"]`);
      if (!el) return;
      
      const maxRotateX = obj.tilt3D.maxX || 15;
      const maxRotateY = obj.tilt3D.maxY || 15;
      const perspective = obj.tilt3D.perspective || 800;
      const smoothing = obj.tilt3D.smoothing || 0.15;
      
      let currentRotateX = 0;
      let currentRotateY = 0;
      let targetRotateX = 0;
      let targetRotateY = 0;
      
      const getBaseRotation = () => {
        const box = state.page.layout[key];
        return box && box.rotate ? box.rotate : 0;
      };
      
      el.addEventListener('mouseenter', () => {
        el.style.willChange = 'transform';
      });
      
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const mouseX = e.clientX - centerX;
        const mouseY = e.clientY - centerY;
        
        const maxOffsetX = rect.width / 2;
        const maxOffsetY = rect.height / 2;
        
        targetRotateY = -(mouseX / maxOffsetX) * maxRotateY;
        targetRotateX = (mouseY / maxOffsetY) * maxRotateX;
      });
      
      el.addEventListener('mouseleave', () => {
        targetRotateX = 0;
        targetRotateY = 0;
      });
      
      function animateCustomTilt() {
        currentRotateX += (targetRotateX - currentRotateX) * smoothing;
        currentRotateY += (targetRotateY - currentRotateY) * smoothing;
        
        const baseRotate = getBaseRotation();
        el.style.transform = `rotate(${baseRotate}deg) perspective(${perspective}px) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`;
        
        requestAnimationFrame(animateCustomTilt);
      }
      
      animateCustomTilt();
    });
  }
  
  window.setupCustomObject3DTilt = setupCustomObject3DTilt;
  window.setup3DTilt = setup3DTilt;
  window.reset3DTilt = reset3DTilt;
}

function syncTextStateFromPreview() {
  const nameContent = document.querySelector('[data-editable="name"] .text-content');
  const bioContent = document.querySelector('[data-editable="bio"] .text-content');
  if (nameContent) {
    state.page.displayNameHtml = nameContent.innerHTML;
    state.page.displayName = nameContent.textContent || '@username';
  }
  if (bioContent) {
    state.page.bioHtml = bioContent.innerHTML;
    state.page.bio = bioContent.textContent || '';
  }
  
  (state.page.customObjects || []).forEach((obj) => {
    if (obj.type === 'text') {
      const key = `obj-${obj.id}`;
      const el = document.querySelector(`[data-editable="${key}"] .text-content`);
      if (el) {
        obj.html = el.innerHTML;
        obj.text = el.textContent || '';
      }
    }
  });
  
  console.log('syncTextStateFromPreview - customObjects:', JSON.stringify(state.page.customObjects).substring(0, 200));
}

function applyStyleToSelectedText(targetKey, styleMap) {
  const selection = window.getSelection();
  console.log('applyStyleToSelectedText called, targetKey:', targetKey);
  console.log('Selection:', selection, 'rangeCount:', selection ? selection.rangeCount : 0);
  if (!selection || selection.rangeCount === 0) {
    console.log('No selection');
    return false;
  }
  const range = selection.getRangeAt(0);
  const target = document.querySelector(`[data-editable="${targetKey}"] .text-content`);
  console.log('Target element:', target);
  if (!target) {
    console.log('Target not found');
    return false;
  }
  console.log('Range collapsed:', range.collapsed);
  if (range.collapsed) {
    console.log('Range is collapsed, no text selected');
    return false;
  }
  console.log('Target contains range:', target.contains(range.commonAncestorContainer));
  if (!target.contains(range.commonAncestorContainer)) {
    console.log('Selection not in target');
    return false;
  }

  const span = document.createElement('span');
  Object.entries(styleMap).forEach(([prop, value]) => {
    if (value !== undefined && value !== null && value !== '') span.style[prop] = value;
  });
  span.appendChild(range.extractContents());
  range.insertNode(span);
  selection.removeAllRanges();
  syncTextStateFromPreview();
  return true;
}

function setupPreviewEditor() {
  const stage = document.getElementById('preview-stage');
  const frame = document.querySelector('.phone-inner');
  if (!stage || !frame) return;
  const textMenu = document.getElementById('text-menu');
  const objectMenu = document.getElementById('object-menu');
  const editTextBtn = document.getElementById('edit-text-btn');
  const textFontSelect = document.getElementById('text-font-select');
  const textSizeSlider = document.getElementById('text-size-slider');
  const textSizeValue = document.getElementById('text-size-value');
  const textColorBtn = document.getElementById('text-color-btn');
  const textColorInput = document.getElementById('text-color-input');
  const applyTextStyleBtn = document.getElementById('apply-text-style-btn');
  const deleteTextBtn = document.getElementById('delete-text-btn');
  const deleteObjectBtn = document.getElementById('delete-object-btn');
  let active = null;
  let mode = null;
  let startX = 0;
  let startY = 0;
  let startBox = null;
  let groupStartBoxes = null;
  let menuTargetKey = null;
  let objectMenuTargetKey = null;
  let marquee = null;
  let marqueeStart = null;
  let marqueeArmTimer = null;
  let marqueePendingStart = null;
  const MARQUEE_HOLD_MS = 190;
  const selectedKeys = new Set();

  const hideTextMenu = () => {
    if (!textMenu) return;
    textMenu.classList.remove('show');
    textMenu.setAttribute('aria-hidden', 'true');
    menuTargetKey = null;
  };

  const hideObjectMenu = () => {
    if (!objectMenu) return;
    objectMenu.classList.remove('show');
    objectMenu.setAttribute('aria-hidden', 'true');
    objectMenuTargetKey = null;
  };

  stage.addEventListener('contextmenu', (ev) => {
    const linkTarget = ev.target.closest('[data-editable^="link-"]');
    if (linkTarget) {
      ev.preventDefault();
      const linkMenu = document.getElementById('link-context-menu');
      if (!linkMenu) return;
      const linkKey = linkTarget.dataset.editable;
      linkMenu.dataset.targetKey = linkKey;
      linkMenu.style.left = `${ev.clientX}px`;
      linkMenu.style.top = `${ev.clientY}px`;
      linkMenu.classList.add('show');
      linkMenu.setAttribute('aria-hidden', 'false');
      return;
    }
  });

  const syncFollowCursorBtnState = () => {
    if (!followCursorBtn) return;
    if (!objectMenuTargetKey || !objectMenuTargetKey.startsWith('obj-')) return;
    const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
    if (!obj) return;
    if (obj.followCursor) {
      followCursorBtn.textContent = 'Follow Cursor: ON';
      followCursorBtn.style.background = 'rgba(214, 214, 214, 0.2)';
      followCursorBtn.style.color = '#fff';
    } else {
      followCursorBtn.textContent = 'Follow Cursor: OFF';
      followCursorBtn.style.background = '';
      followCursorBtn.style.color = '';
    }
  };

  const syncTilt3dObjectBtnState = () => {
    const tilt3dObjectBtn = document.getElementById('tilt3d-object-btn');
    if (!tilt3dObjectBtn) return;
    if (!objectMenuTargetKey || !objectMenuTargetKey.startsWith('obj-')) return;
    const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
    if (!obj) return;
    if (obj.tilt3D) {
      tilt3dObjectBtn.textContent = '3D Tilt: ON';
      tilt3dObjectBtn.classList.add('btn--active');
    } else {
      tilt3dObjectBtn.textContent = '3D Tilt: OFF';
      tilt3dObjectBtn.classList.remove('btn--active');
    }
  };

  const clearActive = () => {
    document.querySelectorAll('.editable').forEach((el) => {
      el.classList.remove('active', 'dragging');
    });
  };

  const getEditableByKey = (key) => frame.querySelector(`.editable[data-editable="${key}"]`);

  const syncSelectedUi = () => {
    const applySelection = (el) => {
      const key = el.dataset.editable;
      el.classList.toggle('selected', !!(key && selectedKeys.has(key)));
    };
    frame.querySelectorAll('.editable').forEach(applySelection);
    stage.querySelectorAll('.editable').forEach(applySelection);
  };

  const resetMultiSelection = () => {
    selectedKeys.clear();
    groupStartBoxes = null;
    if (marquee) {
      marquee.remove();
      marquee = null;
      marqueeStart = null;
    }
    clearMarqueeArming();
    syncSelectedUi();
  };

  const setSingleSelection = (key) => {
    selectedKeys.clear();
    if (key) selectedKeys.add(key);
    syncSelectedUi();
  };

  const toggleSelection = (key) => {
    if (!key) return;
    if (selectedKeys.has(key)) selectedKeys.delete(key);
    else selectedKeys.add(key);
    syncSelectedUi();
  };

  const startMarquee = (ev) => {
    const rect = stage.getBoundingClientRect();
    marqueeStart = {
      x: ev.clientX - rect.left,
      y: ev.clientY - rect.top,
    };
    if (marquee) marquee.remove();
    marquee = document.createElement('div');
    marquee.className = 'selection-marquee';
    marquee.style.left = `${marqueeStart.x}px`;
    marquee.style.top = `${marqueeStart.y}px`;
    marquee.style.width = '0px';
    marquee.style.height = '0px';
    stage.appendChild(marquee);
  };

  const clearMarqueeArming = () => {
    if (marqueeArmTimer) {
      clearTimeout(marqueeArmTimer);
      marqueeArmTimer = null;
    }
    marqueePendingStart = null;
  };

  const updateMarqueeSelection = (ev) => {
    if (!marquee || !marqueeStart) return;
    const rect = stage.getBoundingClientRect();
    const cx = ev.clientX - rect.left;
    const cy = ev.clientY - rect.top;
    const x1 = Math.max(0, Math.min(marqueeStart.x, cx));
    const y1 = Math.max(0, Math.min(marqueeStart.y, cy));
    const x2 = Math.min(rect.width, Math.max(marqueeStart.x, cx));
    const y2 = Math.min(rect.height, Math.max(marqueeStart.y, cy));

    marquee.style.left = `${x1}px`;
    marquee.style.top = `${y1}px`;
    marquee.style.width = `${Math.max(0, x2 - x1)}px`;
    marquee.style.height = `${Math.max(0, y2 - y1)}px`;

    selectedKeys.clear();
    stage.querySelectorAll('.editable[data-editable]').forEach((el) => {
      const key = el.dataset.editable;
      const box = state.page.layout[key];
      if (!box) return;
      const elRect = el.getBoundingClientRect();
      const elX = elRect.left - rect.left;
      const elY = elRect.top - rect.top;
      const elRight = elX + elRect.width;
      const elBottom = elY + elRect.height;
      const intersects = !(elRight < x1 || elX > x2 || elBottom < y1 || elY > y2);
      if (intersects) selectedKeys.add(key);
    });
    syncSelectedUi();
  };

  const isPhoneKey = (k) => k === 'phone';
  const getStageBounds = () => stage.getBoundingClientRect();

  const startDrag = (targetEl, key, nextMode, ev, boundsRootEl, corner) => {
    if (!targetEl) return;
    const isDefaultElement = ['avatar', 'name', 'bio'].includes(key);
    if (!isDefaultElement && !state.page.layout[key]) return;
    pushHistory();
    clearActive();
    targetEl.classList.add('active');
    active = targetEl;
    mode = nextMode;
    if (mode === 'drag') targetEl.classList.add('dragging');
    startX = ev.clientX;
    startY = ev.clientY;
    startBox = { ...state.page.layout[key] };
    startBox._phoneRadius = state.page.phoneBorderRadius || 42;
    groupStartBoxes = null;
    if (nextMode === 'drag' && selectedKeys.has(key) && selectedKeys.size > 1) {
      groupStartBoxes = {};
      selectedKeys.forEach((selectedKey) => {
        if (state.page.layout[selectedKey]) groupStartBoxes[selectedKey] = { ...state.page.layout[selectedKey] };
      });
    }
    // Rotation-specific data
    if (nextMode === 'rotate') {
      const rect = targetEl.getBoundingClientRect();
      startBox._centerX = rect.left + rect.width / 2;
      startBox._centerY = rect.top + rect.height / 2;
      startBox._startAngle = Math.atan2(ev.clientY - startBox._centerY, ev.clientX - startBox._centerX) * 180 / Math.PI;
      startBox._startRotation = startBox.rotate || 0;
    }
    // Radius-specific data
    if (nextMode === 'radius') {
      startBox._corner = corner;
    }
    // Store which bounds we should clamp against
    active.__boundsRoot = boundsRootEl;
  };

  frame.addEventListener('input', (ev) => {
    const textContent = ev.target.closest('.text-content');
    if (!textContent) return;
    syncTextStateFromPreview();
    const editable = textContent.closest('[data-editable]');
    if (!editable) return;
    const key = editable.dataset.editable;
    if (key === 'name' || key === 'bio') {
      state.page.textManualSize[key] = false;
      applyLayout();
    }
  });

  frame.addEventListener('mousedown', (ev) => {
    if (isHandTool()) return;
    if (ev.button !== 0) return;
    const multiSelectEnabled = isSelectTool();
    let target = ev.target.closest('.editable');
    
    if (!target) {
      // Don't clear selection when clicking on link buttons (they handle their own interaction)
      if (!ev.target.closest('.text-content') && !ev.target.closest('a, button, input, textarea, select, .link-editable')) {
      clearActive();
      resetMultiSelection();
      clearMarqueeArming();
      if (marquee) {
        marquee.remove();
        marquee = null;
        marqueeStart = null;
      }
      startMarquee(ev);
      }
      return;
    }
    const key = target.dataset.editable;
    const isDefaultElement = ['phone', 'avatar', 'name', 'bio'].includes(key);
    const isLinkButton = key && key.startsWith('link-');
    const isTextObject = key === 'name' || key === 'bio';

    if (!isDefaultElement && !isLinkButton && !state.page.layout[key]) return;
    const isMultiSelectIntent = multiSelectEnabled && (ev.shiftKey || ev.ctrlKey || ev.metaKey);
    const isResizeHandle = ev.target.classList.contains('resize-handle');
    const isRotateHandle = ev.target.classList.contains('rotate-handle');

// For text objects (name/bio): handles work, text is selectable, background starts drag
    if (isTextObject) {
      // Handles should start resize/rotate
      if (ev.target.classList.contains('resize-handle') || ev.target.closest('.resize-handle') || ev.target.closest('.rotate-handle')) {
        ev.preventDefault();
        const isRotate = ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle');
        startDrag(target, key, isRotate ? 'rotate' : 'resize', ev, frame);
        ev.stopPropagation();
        return;
      }

      // If clicking directly on text node or inside .text-content, allow selection
      const isTextNode = ev.target.nodeType === Node.TEXT_NODE;
      const isInTextContent = ev.target.closest('.text-content');
      if (isTextNode || isInTextContent) {
        // Allow native text selection
        return;
      }

      // Otherwise, start drag
      ev.preventDefault();
      startDrag(target, key, 'drag', ev, frame);
      ev.stopPropagation();
      return;
    }

    // For links container, allow dragging via resize handle
    // Individual link buttons should work normally
    if (key === 'links') {
      // If clicking on a link button inside, check if it's an individual link
      if (ev.target.closest('.link-editable')) {
        const linkKey = ev.target.closest('.link-editable').dataset.editable;
        if (linkKey && linkKey.startsWith('link-')) {
          // Handle individual link button - allow drag/resize
          if (ev.target.classList.contains('resize-handle') || ev.target.closest('.resize-handle')) {
            ev.preventDefault();
            startDrag(target, linkKey, 'resize', ev, frame);
            ev.stopPropagation();
            return;
          }
          if (ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle')) {
            ev.preventDefault();
            startDrag(target, linkKey, 'rotate', ev, frame);
            ev.stopPropagation();
            return;
          }
          ev.preventDefault();
          startDrag(target, linkKey, 'move', ev, frame);
          ev.stopPropagation();
          return;
        }
        return;
      }
      // For links container resize handle
      if (ev.target.classList.contains('resize-handle') || ev.target.closest('.resize-handle') || ev.target.closest('.rotate-handle')) {
        ev.preventDefault();
        const isRotate = ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle');
        startDrag(target, key, isRotate ? 'rotate' : 'resize', ev, frame);
        ev.stopPropagation();
        return;
      }
      // Allow dragging links container on regular click
      ev.preventDefault();
      startDrag(target, key, 'move', ev, frame);
      ev.stopPropagation();
      return;
    }

    // For text objects (name/bio): handles work, text is selectable, background starts drag
    if (isTextObject) {
      // If clicking directly on text node or inside .text-content, allow selection
      const isTextNode = ev.target.nodeType === Node.TEXT_NODE;
      const isInTextContent = ev.target.closest('.text-content');
      if (isTextNode || isInTextContent) {
        // Allow native text selection
        return;
      }

      // Otherwise, start drag
      ev.preventDefault();
      startDrag(target, key, 'drag', ev, frame);
      ev.stopPropagation();
      return;
    }

    // For links container, allow dragging via resize handle
    // Individual link buttons should work normally
    if (key === 'links') {
      // If clicking on a link button inside, check if it's an individual link
      if (ev.target.closest('.link-editable')) {
        const linkKey = ev.target.closest('.link-editable').dataset.editable;
        if (linkKey && linkKey.startsWith('link-')) {
          // Handle individual link button - allow drag/resize
          if (ev.target.classList.contains('resize-handle') || ev.target.closest('.resize-handle')) {
            ev.preventDefault();
            startDrag(target, linkKey, 'resize', ev, frame);
            ev.stopPropagation();
            return;
          }
          if (ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle')) {
            ev.preventDefault();
            startDrag(target, linkKey, 'rotate', ev, frame);
            ev.stopPropagation();
            return;
          }
          ev.preventDefault();
          startDrag(target, linkKey, 'move', ev, frame);
          ev.stopPropagation();
          return;
        }
        return;
      }
      // For links container resize handle
      if (ev.target.classList.contains('resize-handle') || ev.target.classList.contains('rotate-handle') || ev.target.closest('.resize-handle') || ev.target.closest('.rotate-handle')) {
        ev.preventDefault();
        const isRotate = ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle');
        startDrag(target, key, isRotate ? 'rotate' : 'resize', ev, frame);
        return;
      }
      // Allow dragging links container on regular click
      ev.preventDefault();
      startDrag(target, key, 'move', ev, frame);
      return;
    }

    if (isRotateHandle || ev.target.closest('.rotate-handle')) {
      ev.preventDefault();
      startDrag(target, key, 'rotate', ev, frame);
      ev.stopPropagation();
      return;
    }
    if ((isResizeHandle || ev.target.closest('.resize-handle')) && isPhoneKey(key)) {
      ev.preventDefault();
      startDrag(target, key, 'resize', ev, frame);
      return;
    }
    if (isMultiSelectIntent) {
      toggleSelection(key);
      return;
    }

    // For custom text objects, allow text selection if clicking on .text-content
    if (key && key.startsWith('obj-')) {
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === key);
      if (obj && obj.type === 'text' && ev.target.closest('.text-content')) {
        return;
      }
    }

    if (multiSelectEnabled) {
      if (!selectedKeys.has(key)) setSingleSelection(key);
      // In select mode, allow dragging selected objects
      if (selectedKeys.size > 0) {
        ev.preventDefault();
        startDrag(target, key, 'drag', ev, frame);
        ev.stopPropagation();
      }
    } else {
      resetMultiSelection();
      ev.preventDefault();
      const hasResize = isResizeHandle || ev.target.closest('.resize-handle');
      const hasRotate = isRotateHandle || ev.target.closest('.rotate-handle');
      const dragMode = hasRotate ? 'rotate' : hasResize ? 'resize' : 'drag';
      startDrag(target, key, dragMode, ev, frame);
      ev.stopPropagation();
    }
  });

  // Phone frame + stage-level custom objects editing (drag/resize on the preview stage)
  stage.addEventListener('mousedown', (ev) => {
    if (isHandTool()) return;

    // Check for phone frame, custom objects, or default elements on the stage
    let phone = ev.target.closest('[data-editable="phone"]');
    const customObj = ev.target.closest('.custom-object[data-editable]');
    const defaultObj = ev.target.closest('#preview-stage-inner > [data-editable="avatar"], #preview-stage-inner > [data-editable="name"], #preview-stage-inner > [data-editable="bio"]');
    const linkBtn = ev.target.closest('[data-editable^="link-"]');
    const target = phone || customObj || defaultObj || linkBtn;
    
    if (!target) return;

    if (!target) {
      if (isSelectTool()) {
        clearActive();
        resetMultiSelection();
        clearMarqueeArming();
        if (marquee) {
          marquee.remove();
          marquee = null;
          marqueeStart = null;
        }
        startMarquee(ev);
      }
      return;
    }

    const key = target.dataset.editable;
    const isDefaultElement = ['phone', 'avatar', 'name', 'bio'].includes(key);
    const isLinkButton = key && key.startsWith('link-');
    const isTextObject = key === 'name' || key === 'bio';

    if (!isDefaultElement && !isLinkButton && !state.page.layout[key]) return;

    const isResizeHandle = ev.target.classList.contains('resize-handle');
    const isRotateHandle = ev.target.classList.contains('rotate-handle');

    // For text objects (name/bio): handles work, text is selectable, background starts drag
    if (isTextObject) {
      // Handles should start resize/rotate
      if (ev.target.classList.contains('resize-handle') || ev.target.classList.contains('rotate-handle') || ev.target.closest('.resize-handle') || ev.target.closest('.rotate-handle')) {
        ev.preventDefault();
        const isRotate = ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle');
        startDrag(target, key, isRotate ? 'rotate' : 'resize', ev, stage);
        return;
      }

      // If clicking directly on text node or inside .text-content, allow selection
      const isTextNode = ev.target.nodeType === Node.TEXT_NODE;
      const isInTextContent = ev.target.closest('.text-content');
      if (isTextNode || isInTextContent) {
        // Allow native text selection
        return;
      }

      // Otherwise, start drag
      ev.preventDefault();
      startDrag(target, key, 'drag', ev, stage);
      return;
    }

    // For links container, allow dragging via resize handle
    // Individual link buttons should work normally
    if (key === 'links') {
      // If clicking on a link button inside, check if it's an individual link
      if (ev.target.closest('.link-editable')) {
        const linkKey = ev.target.closest('.link-editable').dataset.editable;
        if (linkKey && linkKey.startsWith('link-')) {
          // Handle individual link button - allow drag/resize
          if (ev.target.classList.contains('resize-handle') || ev.target.closest('.resize-handle')) {
            ev.preventDefault();
            startDrag(target, linkKey, 'resize', ev, stage);
            return;
          }
          if (ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle')) {
            ev.preventDefault();
            startDrag(target, linkKey, 'rotate', ev, stage);
            return;
          }
          ev.preventDefault();
          startDrag(target, linkKey, 'drag', ev, stage);
          return;
        }
        return;
      }
      // For links container resize handle
      if (ev.target.classList.contains('resize-handle') || ev.target.classList.contains('rotate-handle') || ev.target.closest('.resize-handle') || ev.target.closest('.rotate-handle')) {
        ev.preventDefault();
        const isRotate = ev.target.classList.contains('rotate-handle') || ev.target.closest('.rotate-handle');
        startDrag(target, key, isRotate ? 'rotate' : 'resize', ev, stage);
        return;
      }
      // Allow dragging links container on regular click
      ev.preventDefault();
      startDrag(target, key, 'drag', ev, stage);
      return;
    }

    // For custom text objects, allow text selection if clicking on .text-content
    if (key && key.startsWith('obj-')) {
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === key);
      if (obj && obj.type === 'text' && ev.target.closest('.text-content')) {
        // Allow text selection and editing, don't start drag
        return;
      }
    }

    ev.preventDefault();

    // Allow drag for all stage-level objects
    startDrag(target, key, (isRotateHandle ? 'rotate' : isResizeHandle ? 'resize' : 'drag'), ev, stage);
  });

  window.addEventListener('mousemove', (ev) => {
    if (!isSelectTool() && marquee) {
      marquee.remove();
      marquee = null;
      marqueeStart = null;
    }
    if (marquee) {
      updateMarqueeSelection(ev);
      return;
    }
    if (!active || !startBox) return;
    const key = active.dataset.editable;
    const boundsRoot = active.__boundsRoot === stage ? stage : frame;
    const bounds = boundsRoot === stage ? getStageBounds() : frame.getBoundingClientRect();
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    const next = { ...startBox };

    if (isSelectTool() && mode === 'drag' && groupStartBoxes) {
      const minX = Math.min(...Object.values(groupStartBoxes).map((b) => b.x));
      const minY = Math.min(...Object.values(groupStartBoxes).map((b) => b.y));
      const maxRight = Math.max(...Object.values(groupStartBoxes).map((b) => b.x + b.w));
      const maxBottom = Math.max(...Object.values(groupStartBoxes).map((b) => b.y + b.h));
      const clampedDx = Math.max(-minX, Math.min(dx, bounds.width - maxRight));
      const clampedDy = Math.max(-minY, Math.min(dy, bounds.height - maxBottom));
      Object.entries(groupStartBoxes).forEach(([groupKey, box]) => {
        state.page.layout[groupKey] = {
          ...box,
          x: box.x + clampedDx,
          y: box.y + clampedDy,
        };
      });
      applyLayout();
      return;
    } else if (mode === 'drag') {
      next.x = startBox.x + dx;
      next.y = startBox.y + dy;
    } else if (mode === 'rotate') {
      const angle = Math.atan2(ev.clientY - startBox._centerY, ev.clientX - startBox._centerX) * 180 / Math.PI;
      let rotation = startBox._startRotation + (angle - startBox._startAngle);
      const snappedRotation = Math.round(rotation);
      state.page.layout[key] = { ...state.page.layout[key], rotate: snappedRotation };
      active.style.transform = `rotate(${snappedRotation}deg)`;
      
      const arcSvg = active.querySelector('.rotation-arc-svg');
      const angleTooltip = active.querySelector('.rotation-angle-tooltip');
      
      if (arcSvg) {
        arcSvg.classList.add('visible');
        const arcPath = arcSvg.querySelector('.rotation-arc-path');
        if (arcPath) {
          const radius = Math.max(startBox.w, startBox.h) / 2 + 30;
          const startAngle = -90;
          const endAngle = startAngle + snappedRotation;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 50 + 50 * Math.cos(startRad);
          const y1 = 50 + 50 * Math.sin(startRad);
          const x2 = 50 + 50 * Math.cos(endRad);
          const y2 = 50 + 50 * Math.sin(endRad);
          const largeArc = Math.abs(snappedRotation) > 180 ? 1 : 0;
          const sweep = snappedRotation >= 0 ? 1 : 0;
          arcPath.setAttribute('d', `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} ${sweep} ${x2} ${y2} Z`);
        }
      }
      
      if (angleTooltip) {
        angleTooltip.classList.add('visible');
        angleTooltip.textContent = `${Math.round(snappedRotation)}°`;
        const tooltipX = 50 + 55 * Math.cos(((startBox._startRotation + (angle - startBox._startAngle)) * Math.PI) / 180 - Math.PI / 2);
        const tooltipY = 50 + 55 * Math.sin(((startBox._startRotation + (angle - startBox._startAngle)) * Math.PI) / 180 - Math.PI / 2);
        angleTooltip.style.left = `${tooltipX}%`;
        angleTooltip.style.top = `${tooltipY}%`;
      }
      
      return;
    } else if (mode === 'radius') {
      const corner = startBox._corner;
      const maxRadius = Math.min(startBox.w, startBox.h) / 2;
      let newRadius = startBox._phoneRadius + (corner === 'se' || corner === 'sw' ? dy : -dy);
      newRadius = Math.max(0, Math.min(newRadius, maxRadius));
      state.page.phoneBorderRadius = Math.round(newRadius);
      applyPhoneRadius();
      return;
    } else {
      next.w = startBox.w + dx;
      next.h = startBox.h + dy;
      
      // For icon-style links, maintain square shape
      if (active.dataset.linkStyle === 'icon') {
        const size = Math.max(next.w, next.h);
        next.w = size;
        next.h = size;
      }
      
      if (key === 'name' || key === 'bio') {
        state.page.textManualSize[key] = true;
      }
    }

    const minW = key === 'phone' ? 200 : 40;
    const minH = key === 'phone' ? 320 : 24;
    
    // For icon-style links, use square minimum
    const isIconLink = active.dataset.linkStyle === 'icon';
    const iconMinSize = 30;
    
    next.w = Math.max(isIconLink ? iconMinSize : minW, Math.min(next.w, bounds.width));
    next.h = Math.max(isIconLink ? iconMinSize : minH, Math.min(next.h, bounds.height));
    
    // For icon-style links, enforce square size
    if (isIconLink) {
      const size = Math.max(next.w, next.h);
      next.w = size;
      next.h = size;
    }
    // Allow phone and stage-level objects to move freely beyond bounds
    const isStageObj = key === 'phone' || key.startsWith('obj-');
    if (!isStageObj) {
      next.x = Math.max(0, Math.min(next.x, bounds.width - next.w));
      next.y = Math.max(0, Math.min(next.y, bounds.height - next.h));
    }

    state.page.layout[key] = next;
    if (key === 'phone') {
      applyPhoneLayout();
      if (state.page.phoneBlur) applyPhoneBlur();
    }
    else if (key.startsWith('obj-')) applyStageObjectLayout();
    else applyLayout();
    
    // Update smart guides while dragging
    const currentBounds = state.page.layout[key];
    if (currentBounds) {
      showSmartGuides(key, {
        x: currentBounds.x,
        y: currentBounds.y,
        w: currentBounds.w,
        h: currentBounds.h,
        centerX: currentBounds.x + currentBounds.w / 2,
        centerY: currentBounds.y + currentBounds.h / 2,
        right: currentBounds.x + currentBounds.w,
        bottom: currentBounds.y + currentBounds.h
      });
    }
  });

  window.addEventListener('mouseup', () => {
    if (marqueePendingStart && !marquee) {
      // Quick click on empty area: keep legacy behavior (deselect).
      if (isSelectTool()) {
        selectedKeys.clear();
        syncSelectedUi();
      } else {
        resetMultiSelection();
      }
    }
    clearMarqueeArming();
    if (marquee) {
      marquee.remove();
      marquee = null;
      marqueeStart = null;
    }
    if (!active) return;
    active.classList.remove('dragging');
    const arcSvg = active.querySelector('.rotation-arc-svg');
    const angleTooltip = active.querySelector('.rotation-angle-tooltip');
    if (arcSvg) arcSvg.classList.remove('visible');
    if (angleTooltip) angleTooltip.classList.remove('visible');
    try { delete active.__boundsRoot; } catch (_) { /* ignore */ }
    active = null;
    mode = null;
    startBox = null;
    groupStartBoxes = null;
    hideSmartGuides();
  });

  document.addEventListener('builder-tool-changed', (ev) => {
    const nextTool = ev && ev.detail ? ev.detail.tool : '';
    if (nextTool !== 'select') resetMultiSelection();
  });

  frame.addEventListener('contextmenu', (ev) => {
    const target = ev.target.closest('[data-editable="name"], [data-editable="bio"], [data-editable^="obj-"]');
    if (!target || !textMenu) return;
    const key = target.dataset.editable;

    if (key && key.startsWith('obj-')) {
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === key);
      if (obj && obj.type === 'text') {
        ev.preventDefault();
        hideObjectMenu();
        menuTargetKey = key;
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          savedSelection = sel.getRangeAt(0).cloneRange();
        }
        if (textFontSelect) textFontSelect.value = '';
        if (textSizeSlider) { textSizeSlider.value = '16'; if (textSizeValue) textSizeValue.textContent = '16px'; }
        if (textColorInput) textColorInput.value = '#ffffff';
        textMenu.style.left = `${ev.clientX}px`;
        textMenu.style.top = `${ev.clientY}px`;
        textMenu.classList.add('show');
        textMenu.setAttribute('aria-hidden', 'false');
        return;
      }
    }

    if (key === 'name' || key === 'bio') {
      ev.preventDefault();
      hideObjectMenu();
      menuTargetKey = key;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        savedSelection = sel.getRangeAt(0).cloneRange();
      }
      if (textFontSelect) textFontSelect.value = '';
      if (textSizeSlider) { textSizeSlider.value = '16'; if (textSizeValue) textSizeValue.textContent = '16px'; }

      if (textColorInput) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          const range = sel.getRangeAt(0);
          const colorSpan = range.commonAncestorContainer.parentElement;
          if (colorSpan && colorSpan.style && colorSpan.style.color) {
            textColorInput.value = colorSpan.style.color;
          } else {
            textColorInput.value = '#ffffff';
          }
        } else {
          textColorInput.value = '#ffffff';
        }
      }

      textMenu.style.left = `${ev.clientX}px`;
      textMenu.style.top = `${ev.clientY}px`;
      textMenu.classList.add('show');
      textMenu.setAttribute('aria-hidden', 'false');
      return;
    }
  });

  frame.addEventListener('contextmenu', (ev) => {
    const linkTarget = ev.target.closest('[data-editable^="link-"]');
    if (linkTarget) {
      ev.preventDefault();
      const linkMenu = document.getElementById('link-context-menu');
      if (!linkMenu) return;
      const linkKey = linkTarget.dataset.editable;
      linkMenu.dataset.targetKey = linkKey;
      linkMenu.style.left = `${ev.clientX}px`;
      linkMenu.style.top = `${ev.clientY}px`;
      linkMenu.classList.add('show');
      linkMenu.setAttribute('aria-hidden', 'false');
      return;
    }
    const target = ev.target.closest('.editable[data-editable]');
    if (!target || !objectMenu) return;
    const key = target.dataset.editable;
    if (!key) return;

    // Show text menu for default text elements (name/bio)
    if (key === 'name' || key === 'bio') return;

    // For custom text objects, show text menu
    if (key.startsWith('obj-')) {
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === key);
      if (obj && obj.type === 'text') {
        ev.preventDefault();
        hideObjectMenu();
        menuTargetKey = key;
        textMenu.style.left = `${ev.clientX}px`;
        textMenu.style.top = `${ev.clientY}px`;
        textMenu.classList.add('show');
        textMenu.setAttribute('aria-hidden', 'false');
        return;
      }
    }

    ev.preventDefault();
    ev.stopPropagation();
    hideTextMenu();
    objectMenuTargetKey = key;
    objectMenu.style.left = `${ev.clientX}px`;
    objectMenu.style.top = `${ev.clientY}px`;
    objectMenu.classList.add('show');
    objectMenu.setAttribute('aria-hidden', 'false');
    syncFollowCursorBtnState();
    syncTilt3dObjectBtnState();
  });
  
  // Stage-level context menu for phone frame and custom objects
  stage.addEventListener('contextmenu', (ev) => {
    // Link buttons handled in dedicated listener above
    if (ev.target.closest('[data-editable^="link-"]')) return;

    const target = ev.target.closest('.editable[data-editable]');
    if (!target) return;
    const key = target.dataset.editable;
    if (!key) return;

    // Show text menu for default text elements (name/bio)
    if (key === 'name' || key === 'bio') {
      ev.preventDefault();
      ev.stopPropagation();
      hideObjectMenu();
      menuTargetKey = key;
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        savedSelection = sel.getRangeAt(0).cloneRange();
      }
        if (textFontSelect) textFontSelect.value = '';
        if (textSizeSlider) { textSizeSlider.value = '16'; if (textSizeValue) textSizeValue.textContent = '16px'; }
        if (textColorInput) textColorInput.value = '#ffffff';
        textMenu.style.left = `${ev.clientX}px`;
        textMenu.style.top = `${ev.clientY}px`;
        textMenu.classList.add('show');
        textMenu.setAttribute('aria-hidden', 'false');
        return;
    }

    // Show text menu for custom text objects
    if (key.startsWith('obj-')) {
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === key);
      if (obj && obj.type === 'text') {
        ev.preventDefault();
        ev.stopPropagation();
        hideObjectMenu();
        menuTargetKey = key;
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          savedSelection = sel.getRangeAt(0).cloneRange();
        }
        if (textFontSelect) textFontSelect.value = '';
        if (textSizeSlider) { textSizeSlider.value = '16'; if (textSizeValue) textSizeValue.textContent = '16px'; }
        if (textColorInput) textColorInput.value = '#ffffff';
        textMenu.style.left = `${ev.clientX}px`;
        textMenu.style.top = `${ev.clientY}px`;
        textMenu.classList.add('show');
        textMenu.setAttribute('aria-hidden', 'false');
        return;
      }
    }

    ev.preventDefault();
    ev.stopPropagation();
    hideTextMenu();
    objectMenuTargetKey = key;
    objectMenu.style.left = `${ev.clientX}px`;
    objectMenu.style.top = `${ev.clientY}px`;
    objectMenu.classList.add('show');
    objectMenu.setAttribute('aria-hidden', 'false');
    syncFollowCursorBtnState();
    syncTilt3dObjectBtnState();
    return;
  });

  function syncPhoneFrameMenu() {
    const phoneMenu = document.getElementById('phone-context-menu');
    const removeFrameBtn = document.getElementById('remove-frame-btn');
    if (phoneMenu && removeFrameBtn) {
      removeFrameBtn.style.display = state.page.phoneFrameImage ? '' : 'none';
    }
  }

  if (editTextBtn) {
    editTextBtn.addEventListener('click', () => {
      if (!menuTargetKey) return;
      pushHistory();
      if (menuTargetKey === 'name') {
        const current = state.page.displayName || '@username';
        showPromptModal({
          title: 'Edit Name',
          placeholder: '@username',
          value: current,
          onConfirm: (next) => {
            state.page.displayName = next;
            state.page.displayNameHtml = escapeHtml(next || '@username');
            updatePreview();
          }
        });
      } else if (menuTargetKey === 'bio') {
        const current = state.page.bio || '';
        showPromptModal({
          title: 'Edit Bio',
          placeholder: 'Your bio',
          value: current,
          onConfirm: (next) => {
            state.page.bio = next;
            state.page.bioHtml = escapeHtml(next || '');
            updatePreview();
          }
        });
      } else if (menuTargetKey.startsWith('obj-')) {
        const obj = state.page.customObjects.find(o => `obj-${o.id}` === menuTargetKey);
        if (obj && obj.type === 'text') {
          showPromptModal({
            title: 'Edit Text',
            placeholder: 'Enter text',
            value: obj.text || '',
            onConfirm: (next) => {
              obj.text = next;
              obj.html = escapeHtml(next);
              renderCustomObjects();
              updatePreview();
            }
          });
        }
      }
      hideTextMenu();
    });
  }

  if (applyTextStyleBtn) {
    applyTextStyleBtn.addEventListener('click', () => {
      if (!menuTargetKey) return;
      pushHistory();
      const styleMap = {};
      if (textFontSelect && textFontSelect.value) styleMap.fontFamily = textFontSelect.value;
      if (textSizeSlider && textSizeSlider.value) styleMap.fontSize = `${Number(textSizeSlider.value)}px`;
      if (!styleMap.fontFamily && !styleMap.fontSize) return;
      const applied = applyStyleToSelectedText(menuTargetKey, styleMap);
      if (applied) {
        state.page.textManualSize[menuTargetKey] = false;
        applyLayout();
      }
      hideTextMenu();
    });
  }

  if (textSizeSlider) {
    textSizeSlider.addEventListener('input', () => {
      if (textSizeValue) textSizeValue.textContent = `${textSizeSlider.value}px`;
      if (!menuTargetKey) return;
      const styleMap = { fontSize: `${Number(textSizeSlider.value)}px` };
      applyStyleToSelectedText(menuTargetKey, styleMap);
    });
  }

  if (deleteTextBtn) {
    deleteTextBtn.addEventListener('click', () => {
      if (!menuTargetKey) return;
      deleteObjectByKey(menuTargetKey);
      hideTextMenu();
    });
  }

  if (deleteObjectBtn) {
    deleteObjectBtn.addEventListener('click', () => {
      if (!objectMenuTargetKey) return;
      deleteObjectByKey(objectMenuTargetKey);
      objectMenuTargetKey = null;
      hideObjectMenu();
    });
  }

  const objectAnimationBtn = document.getElementById('object-animation-btn');
  const objectAnimationGrid = document.getElementById('object-animation-grid');
  const objectAnimationSpeed = document.getElementById('object-animation-speed');
  const objectAnimationSpeedInput = document.getElementById('object-animation-speed-input');
  const removeAnimationBtn = document.getElementById('remove-animation-btn');

  if (objectAnimationBtn && objectAnimationGrid) {
    objectAnimationBtn.addEventListener('click', () => {
      const isAnimatable = objectMenuTargetKey && (
        objectMenuTargetKey.startsWith('obj-') ||
        ['avatar', 'name', 'bio', 'phone', 'links'].includes(objectMenuTargetKey)
      );
      if (!isAnimatable) {
        return;
      }

      if (objectAnimationGrid.classList.contains('show')) {
        objectAnimationGrid.classList.remove('show');
        objectAnimationGrid.setAttribute('hidden', '');
        if (objectAnimationSpeed) objectAnimationSpeed.style.display = 'none';
      } else {
        objectAnimationGrid.classList.add('show');
        objectAnimationGrid.removeAttribute('hidden');
        if (objectAnimationSpeed) objectAnimationSpeed.style.display = 'block';
      }

      const currentAnim = state.page.animations[objectMenuTargetKey];
      if (currentAnim && currentAnim.speed && objectAnimationSpeedInput) {
        objectAnimationSpeedInput.value = currentAnim.speed;
      }
    });

    objectAnimationGrid.querySelectorAll('.text-effect-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        console.log('CLICK on animation item', item.dataset.animation);
        e.preventDefault();
        e.stopPropagation();
        if (!objectMenuTargetKey) {
          console.log('No objectMenuTargetKey');
          return;
        }
        console.log('Target key:', objectMenuTargetKey);

        const animation = item.dataset.animation;
        const speed = parseFloat(objectAnimationSpeedInput ? objectAnimationSpeedInput.value : 1) || 1;
        console.log('Animation:', animation, 'Speed:', speed);

        if (objectMenuTargetKey.startsWith('obj-')) {
          const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
          console.log('Found obj:', obj);
          if (obj) {
            pushHistory();
            obj.animation = animation;
            obj.animationSpeed = speed;
            applyAnimationToElement(objectMenuTargetKey);
          }
        } else {
          pushHistory();
          state.page.animations[objectMenuTargetKey] = { animation, speed };
          applyAnimationToElement(objectMenuTargetKey);
        }

        updatePreview();

        const el = document.querySelector(`[data-editable="${objectMenuTargetKey}"]`);
        console.log('Element after updatePreview:', el, 'dataset.animation:', el ? el.dataset.animation : 'no element');

        const pubScreen = document.getElementById('screen-public');
        if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
        showToast('Animation applied');
        console.log('Toast shown');

        objectAnimationGrid.classList.remove('show');
        objectAnimationGrid.setAttribute('hidden', '');
        if (objectAnimationSpeed) objectAnimationSpeed.style.display = 'none';
        console.log('Grid closed');
      });
    });

    if (objectAnimationSpeedInput) {
      objectAnimationSpeedInput.addEventListener('input', () => {
        if (!objectMenuTargetKey) return;
        const speed = parseFloat(objectAnimationSpeedInput.value) || 1;
        const currentAnim = state.page.animations[objectMenuTargetKey];
        if (currentAnim) {
          currentAnim.speed = speed;
          applyAnimationToElement(objectMenuTargetKey);
          const pubScreen = document.getElementById('screen-public');
          if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
        }
      });
    }

    if (removeAnimationBtn) {
      removeAnimationBtn.addEventListener('click', () => {
        if (!objectMenuTargetKey) return;
        pushHistory();
        delete state.page.animations[objectMenuTargetKey];
        const el = document.querySelector(`[data-editable="${objectMenuTargetKey}"]`);
        if (el) {
          delete el.dataset.animation;
        }
        const pubScreen = document.getElementById('screen-public');
        if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
        showToast('Animation removed');
        if (objectAnimationGrid) {
          objectAnimationGrid.classList.remove('show');
          objectAnimationGrid.setAttribute('hidden', '');
        }
        if (objectAnimationSpeed) objectAnimationSpeed.style.display = 'none';
      });
    }
  }

  const objectEffectsBtn = document.getElementById('object-effects-btn');
  const objectEffectsGrid = document.getElementById('object-effects-grid');
  const objectHalftoneControls = document.getElementById('object-halftone-controls');
  const objectHalftoneSizeInput = document.getElementById('object-halftone-size-input');
  const objectHalftoneSizeVal = document.getElementById('object-halftone-size-val');
  const removeEffectBtn = document.getElementById('remove-effect-btn');

  if (!state.page.effects) state.page.effects = {};

  const syncEffectControls = () => {
    if (!objectMenuTargetKey || !objectHalftoneControls) return;
    const effect = state.page.effects[objectMenuTargetKey];
    if (effect && effect.type === 'halftone') {
      objectHalftoneControls.style.display = 'block';
      if (objectHalftoneSizeInput) objectHalftoneSizeInput.value = effect.pixelSize || 6;
      if (objectHalftoneSizeVal) objectHalftoneSizeVal.textContent = effect.pixelSize || 6;
    } else {
      if (objectHalftoneControls) objectHalftoneControls.style.display = 'none';
    }
  };

  if (objectEffectsBtn && objectEffectsGrid) {
    objectEffectsBtn.addEventListener('click', () => {
      if (objectEffectsGrid.classList.contains('show')) {
        objectEffectsGrid.classList.remove('show');
        objectEffectsGrid.setAttribute('hidden', '');
        if (objectHalftoneControls) objectHalftoneControls.style.display = 'none';
      } else {
        objectEffectsGrid.classList.add('show');
        objectEffectsGrid.removeAttribute('hidden');
        syncEffectControls();
      }
    });

    objectEffectsGrid.querySelectorAll('.text-effect-item').forEach((item) => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!objectMenuTargetKey) return;

        const effectType = item.dataset.effect;
        if (effectType === 'halftone') {
          pushHistory();
          const pixelSize = parseInt(objectHalftoneSizeInput ? objectHalftoneSizeInput.value : 6) || 6;
          state.page.effects[objectMenuTargetKey] = {
            type: 'halftone',
            pixelSize: pixelSize
          };
          
          const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
          if (obj && obj.src) {
            const isGif = obj.originalSrc && (
              obj.originalSrc.toLowerCase().endsWith('.gif') ||
              obj.originalSrc.toLowerCase().includes('.gif') ||
              obj.src.toLowerCase().endsWith('.gif') ||
              obj.src.toLowerCase().includes('.gif')
            );
            
            if (isGif) {
              showToast('Halftone not supported for GIF');
              return;
            }
            
            if (!obj.originalSrc) {
              obj.originalSrc = obj.src;
            }
            
            let imageSrc = obj.originalSrc;
            if (obj.originalSrc.startsWith('http')) {
              try {
                const res = await fetch('/api/proxy-image?url=' + encodeURIComponent(obj.originalSrc));
                if (res.ok) {
                  const data = await res.json();
                  if (data.dataUrl) {
                    imageSrc = data.dataUrl;
                  }
                }
              } catch (_) {}
            }
            
            if (imageSrc.startsWith('http')) {
              showToast('Cannot process external image');
              return;
            }
            
            const canvasData = await applyHalftoneToImage(imageSrc, pixelSize);
            if (canvasData) {
              obj.src = canvasData;
            } else {
              showToast('Could not process image');
            }
            updatePreview();
          }
          
          syncEffectControls();
          markPageModified();
          const pubScreen = document.getElementById('screen-public');
          if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
          showToast('Halftone applied');
        }

        objectEffectsGrid.classList.remove('show');
        objectEffectsGrid.setAttribute('hidden', '');
      });
    });

    if (objectHalftoneSizeInput) {
      objectHalftoneSizeInput.addEventListener('input', async () => {
        if (!objectMenuTargetKey) return;
        const pixelSize = parseInt(objectHalftoneSizeInput.value) || 6;
        if (objectHalftoneSizeVal) objectHalftoneSizeVal.textContent = pixelSize;
        const effect = state.page.effects[objectMenuTargetKey];
        if (effect && effect.type === 'halftone') {
          effect.pixelSize = pixelSize;
          
          const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
          if (obj && obj.originalSrc) {
            const isGif = obj.originalSrc && (
              obj.originalSrc.toLowerCase().endsWith('.gif') ||
              obj.originalSrc.toLowerCase().includes('.gif')
            );
            if (isGif) return;
            
            let imageSrc = obj.originalSrc;
            if (obj.originalSrc.startsWith('http')) {
              try {
                const res = await fetch('/api/proxy-image?url=' + encodeURIComponent(obj.originalSrc));
                if (res.ok) {
                  const data = await res.json();
                  if (data.dataUrl) {
                    imageSrc = data.dataUrl;
                  }
                }
              } catch (_) {}
            }
            
            if (imageSrc.startsWith('http')) {
              return;
            }
            
            const canvasData = await applyHalftoneToImage(imageSrc, pixelSize);
            if (canvasData) {
              obj.src = canvasData;
            }
            updatePreview();
          }
          
          markPageModified();
          const pubScreen = document.getElementById('screen-public');
          if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
        }
      });
    }

    if (removeEffectBtn) {
      removeEffectBtn.addEventListener('click', () => {
        if (!objectMenuTargetKey) return;
        pushHistory();
        delete state.page.effects[objectMenuTargetKey];
        
        const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
        if (obj && obj.originalSrc) {
          obj.src = obj.originalSrc;
          delete obj.originalSrc;
          updatePreview();
        }
        
        if (objectHalftoneControls) objectHalftoneControls.style.display = 'none';
        markPageModified();
        const pubScreen = document.getElementById('screen-public');
        if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
        showToast('Effect removed');
        if (objectEffectsGrid) {
          objectEffectsGrid.classList.remove('show');
          objectEffectsGrid.setAttribute('hidden', '');
        }
      });
    }
  }

const followCursorBtn = document.getElementById('follow-cursor-btn');
  let mouseX = 0;
  let mouseY = 0;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  if (followCursorBtn) {
    followCursorBtn.addEventListener('click', () => {
      if (!objectMenuTargetKey || !objectMenuTargetKey.startsWith('obj-')) return;
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
      if (!obj) return;
      pushHistory();
      obj.followCursor = !obj.followCursor;
      const box = state.page.layout[objectMenuTargetKey];
      const baseRotate = box && box.rotate ? box.rotate : 0;
      const el = document.querySelector(`[data-editable="${objectMenuTargetKey}"]`);
      if (obj.followCursor) {
        followCursorBtn.textContent = 'Follow Cursor: ON';
        followCursorBtn.style.background = 'rgba(214, 214, 214, 0.2)';
        followCursorBtn.style.color = '#fff';
      } else {
        followCursorBtn.textContent = 'Follow Cursor: OFF';
        followCursorBtn.style.background = '';
        followCursorBtn.style.color = '';
        if (el) {
          el.style.transform = `rotate(${baseRotate}deg)`;
        }
      }
      updatePreview();
      const pubScreen = document.getElementById('screen-public');
      if (pubScreen && pubScreen.classList.contains('active')) updatePublicPage();
    });
  }

  const tilt3dObjectBtn = document.getElementById('tilt3d-object-btn');
  if (tilt3dObjectBtn) {
    tilt3dObjectBtn.addEventListener('click', () => {
      if (!objectMenuTargetKey || !objectMenuTargetKey.startsWith('obj-')) return;
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === objectMenuTargetKey);
      if (!obj) return;
      pushHistory();
      
      if (obj.tilt3D) {
        delete obj.tilt3D;
        tilt3dObjectBtn.textContent = '3D Tilt: OFF';
        tilt3dObjectBtn.classList.remove('btn--active');
      } else {
        obj.tilt3D = { maxX: 15, maxY: 15, perspective: 800, smoothing: 0.15 };
        tilt3dObjectBtn.textContent = '3D Tilt: ON';
        tilt3dObjectBtn.classList.add('btn--active');
      }
      
      updatePreview();
      updatePublicPage();
    });
  }

  function applyAnimationToElement(key) {
    let anim = state.page.animations[key];
    if (!anim && key.startsWith('obj-')) {
      const obj = state.page.customObjects.find(o => `obj-${o.id}` === key);
      if (obj && obj.animation) {
        anim = { animation: obj.animation, speed: obj.animationSpeed || 1 };
      }
    }
    let el = document.querySelector(`[data-editable="${key}"]`);
    if (!el) {
      el = document.querySelector(`.public-custom-object[data-editable="${key}"]`);
    }
    if (!el) return;

    if (anim && anim.animation) {
      const dur = anim.speed ? `${1/anim.speed}s` : '1s';
      el.style.setProperty('--anim-dur', dur);
      el.dataset.animation = anim.animation;
      el.style.animation = `${anim.animation} ${dur} infinite`;
    } else {
      delete el.dataset.animation;
      el.style.animation = '';
    }
  }

  function applyEffectToElement(key) {
    let el = document.querySelector(`[data-editable="${key}"]`);
    if (!el) {
      el = document.querySelector(`.public-custom-object[data-editable="${key}"]`);
    }
    if (!el) return;

    const effect = state.page.effects[key];
    if (effect && effect.type === 'halftone') {
      el.dataset.effectType = 'halftone';
      el.dataset.effectPixelSize = effect.pixelSize || 6;
    } else {
      delete el.dataset.effectType;
      delete el.dataset.effectPixelSize;
    }
  }

  let savedSelection = null;

  const textEffectsBtn = document.getElementById('text-effects-btn');
  const textEffectsGrid = document.getElementById('text-effects-grid');

  if (textEffectsBtn && textEffectsGrid) {
    textEffectsBtn.addEventListener('mousedown', () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        savedSelection = sel.getRangeAt(0).cloneRange();
      }
    });
    textEffectsBtn.addEventListener('click', () => {
      textEffectsGrid.classList.toggle('show');
    });

    textEffectsGrid.querySelectorAll('.text-effect-item').forEach((item) => {
      item.addEventListener('mousedown', () => {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
          savedSelection = sel.getRangeAt(0).cloneRange();
        }
      });
      item.addEventListener('click', () => {
        console.log('Effect clicked, menuTargetKey:', menuTargetKey);
        if (!menuTargetKey) return;
        if (savedSelection) {
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(savedSelection);
          console.log('Restored selection from savedSelection');
        } else {
          console.log('No savedSelection to restore');
        }
        const effect = item.dataset.effect;
        pushHistory();
        const effectStyles = {
          'glow-cyan': { textShadow: '0 0 10px #00ffff, 0 0 20px #00ffff' },
          'glow-pink': { textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff' },
          'glow-gold': { textShadow: '0 0 10px #ffd700, 0 0 20px #ffd700' },
          'neon-green': { textShadow: '0 0 5px #00ff00, 0 0 15px #00ff00, 0 0 30px #00ff00' },
          'fire': { textShadow: '0 0 5px #ff4500, 0 0 10px #ff4500, 0 0 20px #ff0000' },
          'ice': { textShadow: '0 0 5px #87ceeb, 0 0 15px #add8e6' },
          'mirror': { textShadow: '-2px 0 #ff00ff, 2px 0 #00ffff' },
          'outline': { WebkitTextStroke: '1px #fff' },
          'shadow-dark': { textShadow: '3px 3px 6px rgba(0,0,0,0.8)' },
          'rainbow': { background: 'linear-gradient(90deg, red, orange, yellow, green, blue, purple)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
          'typewriter': { display: 'inline-block', overflow: 'hidden', whiteSpace: 'nowrap', borderRight: '2px solid #fff', animation: 'typewriter 2s steps(40) infinite, blink 0.5s step-end infinite' }
        };
        const styleMap = effectStyles[effect] || {};
        const applied = applyStyleToSelectedText(menuTargetKey, styleMap);
        if (applied) {
          syncTextStateFromPreview();
          if (menuTargetKey.startsWith('obj-')) {
            const obj = state.page.customObjects.find(o => `obj-${o.id}` === menuTargetKey);
            if (obj && obj.type === 'text') {
              const el = document.querySelector(`[data-editable="${menuTargetKey}"] .text-content`);
              if (el) obj.html = el.innerHTML;
            }
          }
          const pubScreen = document.getElementById('screen-public');
          const isVisible = pubScreen && pubScreen.classList.contains('active');
          updatePreview();
          if (isVisible) updatePublicPage();
        }
        textEffectsGrid.classList.remove('show');
      });
    });
  }

  if (textColorBtn && textColorInput) {
    const saveSelection = () => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
        savedSelection = sel.getRangeAt(0).cloneRange();
      }
    };

    const restoreSelection = () => {
      if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
      }
    };

    textColorBtn.addEventListener('click', () => {
      saveSelection();
      textColorInput.click();
    });

    textColorInput.addEventListener('mousedown', () => {
      saveSelection();
    });

    textColorInput.addEventListener('input', () => {
      if (!menuTargetKey) return;
      restoreSelection();
      pushHistory();
      const color = textColorInput.value;
      const styleMap = { color };
      const applied = applyStyleToSelectedText(menuTargetKey, styleMap);
      if (applied) {
        syncTextStateFromPreview();
        if (menuTargetKey.startsWith('obj-')) {
          const obj = state.page.customObjects.find(o => `obj-${o.id}` === menuTargetKey);
          if (obj && obj.type === 'text') {
            const el = document.querySelector(`[data-editable="${menuTargetKey}"] .text-content`);
            if (el) obj.html = el.innerHTML;
          }
        }
        const pubScreen = document.getElementById('screen-public');
        const isVisible = pubScreen && pubScreen.classList.contains('active');
        updatePreview();
        if (isVisible) updatePublicPage();
      }
    });
  }

  document.addEventListener('mousedown', (ev) => {
    if (!textMenu) return;
    if (!textMenu.contains(ev.target)) hideTextMenu();
    if (objectMenu && !objectMenu.contains(ev.target)) hideObjectMenu();
  });

  // (preview music drop removed)
}

function setupLinkContextMenu() {
  const linkMenu = document.getElementById('link-context-menu');
  if (!linkMenu) return;

  const hideLinkMenu = () => {
    linkMenu.classList.remove('show');
    linkMenu.setAttribute('aria-hidden', 'true');
  };

  document.addEventListener('mousedown', (ev) => {
    if (linkMenu && !linkMenu.contains(ev.target)) hideLinkMenu();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hideLinkMenu();
  });

  const linkUrlItem = document.getElementById('link-url-item');
  const linkLabelItem = document.getElementById('link-label-item');
  const linkStyleItem = document.getElementById('link-style-item');
  const linkDeleteItem = document.getElementById('link-delete-item');

  if (linkUrlItem) {
    linkUrlItem.addEventListener('click', () => {
      const key = linkMenu.dataset.targetKey;
      if (!key) return;
      const idx = parseInt(key.replace('link-', ''));
      const link = state.page.links[idx];
      if (!link) return;
      showPromptModal({
        title: 'Change URL',
        placeholder: 'https://example.com',
        value: link.url || '',
        hint: 'Enter the full URL for this link',
        onConfirm: (newUrl) => {
          pushHistory();
          link.url = newUrl;
          updatePreview();
          showToast('URL updated');
        }
      });
      hideLinkMenu();
    });
  }

  if (linkLabelItem) {
    linkLabelItem.addEventListener('click', () => {
      const key = linkMenu.dataset.targetKey;
      if (!key) return;
      const idx = parseInt(key.replace('link-', ''));
      const link = state.page.links[idx];
      if (!link) return;
      showPromptModal({
        title: 'Change Label',
        placeholder: 'My Link',
        value: link.label || '',
        onConfirm: (newLabel) => {
          pushHistory();
          link.label = newLabel;
          updatePreview();
          showToast('Label updated');
        }
      });
      hideLinkMenu();
    });
  }

  if (linkStyleItem) {
    linkStyleItem.addEventListener('click', () => {
      const key = linkMenu.dataset.targetKey;
      if (!key) return;
      const idx = parseInt(key.replace('link-', ''));
      const link = state.page.links[idx];
      if (!link) return;
      const styles = ['full', 'outline', 'minimal'];
      const current = styles.indexOf(link.style || 'full');
      const next = styles[(current + 1) % styles.length];
      pushHistory();
      link.style = next;
      updatePreview();
      showToast(`Style: ${next}`);
      hideLinkMenu();
    });
  }

  if (linkDeleteItem) {
    linkDeleteItem.addEventListener('click', () => {
      const key = linkMenu.dataset.targetKey;
      if (!key) return;
      const idx = parseInt(key.replace('link-', ''));
      if (confirm('Delete this link?')) {
        pushHistory();
        state.page.links.splice(idx, 1);
        delete state.page.layout[key];
        updatePreview();
        showToast('Link deleted');
      }
      hideLinkMenu();
    });
  }
}

function setupPhoneBackgroundContextMenu() {
  const previewFrame = document.getElementById('preview-frame');
  const menu = document.getElementById('bg-opacity-menu');
  const addObjectBgBtn = document.getElementById('add-object-bg-btn');
  const deleteBgBtn = document.getElementById('delete-bg-btn');
  const objectFileInput = document.getElementById('object-file-input');

  if (!previewFrame || !menu) return;

  const hideMenu = () => {
    menu.classList.remove('show');
    menu.setAttribute('aria-hidden', 'true');
  };

  previewFrame.addEventListener('contextmenu', (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const insidePhone = !!target.closest('#preview-frame .phone-inner');
    if (!insidePhone) return;

    const isInteractive =
      !!target.closest('.editable') ||
      !!target.closest('.text-content, .page-link-btn, a, button, input, textarea, select, [data-editable^="link-"]');
    if (isInteractive) return;

    ev.preventDefault();
    menu.style.left = `${ev.clientX}px`;
    menu.style.top = `${ev.clientY}px`;
    menu.classList.add('show');
    menu.setAttribute('aria-hidden', 'false');
  });

  if (addObjectBgBtn) {
    addObjectBgBtn.addEventListener('click', () => {
      hideMenu();
      if (objectFileInput) objectFileInput.click();
    });
  }

  if (deleteBgBtn) {
    deleteBgBtn.addEventListener('click', () => {
      state.page.bgImagePhone = '';
      setPhoneBackgroundOpacity(0);
      updatePreview();
      hideMenu();
      showToast('Background deleted');
    });
  }

  document.addEventListener('mousedown', (ev) => {
    if (!menu.contains(ev.target)) hideMenu();
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') hideMenu();
  });
}

function setupPhoneContextMenu() {
  const phoneMenu = document.getElementById('phone-context-menu');
  const changeFrameBtn = document.getElementById('change-frame-btn');
  const addObjectBtn = document.getElementById('add-object-bg-btn');

  const hidePhoneMenu = () => {
    if (phoneMenu) {
      phoneMenu.classList.remove('show');
      phoneMenu.setAttribute('aria-hidden', 'true');
    }
  };

  if (addObjectBtn) {
    addObjectBtn.addEventListener('click', () => {
      hidePhoneMenu();
      const objectFileInput = document.getElementById('object-file-input');
      if (objectFileInput) objectFileInput.click();
    });
  }

  if (changeFrameBtn) {
    changeFrameBtn.addEventListener('click', () => {
      hidePhoneMenu();
      const phoneFrameDrop = document.getElementById('phone-frame-dropzone');
      if (phoneFrameDrop) phoneFrameDrop.click();
    });
  }
}

/* ================================================
   AUTH
   ================================================ */
function applyStageObjectLayout() {
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner) return;
  (state.page.customObjects || []).forEach((obj) => {
    const key = `obj-${obj.id}`;
    const el = stageInner.querySelector(`[data-editable="${key}"]`);
    if (!el) return;
    const box = state.page.layout[key];
    if (!box) return;
    el.style.position = 'absolute';
    el.style.left = `${box.x}px`;
    el.style.top = `${box.y}px`;
    el.style.width = `${box.w}px`;
    el.style.height = obj.type === 'text' ? 'auto' : `${box.h}px`;
    el.style.transform = `rotate(${box.rotate || 0}deg)`;
  });
}

function renderCustomObjects() {
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner) return;
  
  console.log('renderCustomObjects called, customObjects:', JSON.stringify(state.page.customObjects));

  stageInner.querySelectorAll('.custom-object').forEach((el) => el.remove());

  (state.page.customObjects || []).forEach((obj) => {
    const key = `obj-${obj.id}`;
    const div = document.createElement('div');
    div.className = 'custom-object editable';
    div.dataset.editable = key;

    if (obj.type === 'text') {
      const content = document.createElement('span');
      content.className = 'text-content';
      content.contentEditable = 'true';
      content.spellcheck = false;
      content.innerHTML = obj.html || escapeHtml(obj.text || '');
      div.appendChild(content);
    } else {
      const img = document.createElement('img');
      img.src = obj.src;
      img.alt = obj.name || 'image';
      img.className = 'custom-object-img';
      div.appendChild(img);
    }

    if (obj.animation) {
      div.dataset.animation = obj.animation;
      const speed = obj.animationSpeed || 1;
      div.style.setProperty('--anim-dur', `${1/speed}s`);
      div.style.animation = `${obj.animation} ${1/speed}s infinite`;
    } else {
      const anim = state.page.animations[key];
      if (anim && anim.animation) {
        div.dataset.animation = anim.animation;
        const dur = anim.speed ? `${1/anim.speed}s` : '1s';
        div.style.setProperty('--anim-dur', dur);
        div.style.animation = `${anim.animation} ${dur} infinite`;
      }
    }

    ensureResizeHandle(div);
    ensureRotateHandle(div);
    stageInner.appendChild(div);
  });
  applyStageObjectLayout();
}

function applyHalftoneToImage(imageSrc, pixelSize = 6) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const maxSize = 800;
      let W = img.width;
      let H = img.height;
      
      if (W > maxSize || H > maxSize) {
        const ratio = Math.min(maxSize / W, maxSize / H);
        W = Math.round(W * ratio);
        H = Math.round(H * ratio);
      }
      
      canvas.width = W;
      canvas.height = H;
      
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);
      
      ctx.clearRect(0, 0, W, H);
      
      const sz = pixelSize;
      
      for (let y = sz / 2; y < H; y += sz) {
        for (let x = sz / 2; x < W; x += sz) {
          const i = (Math.floor(y) * W + Math.floor(x)) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const bright = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
          const radius = (sz / 2) * bright;
          ctx.beginPath();
          ctx.arc(x, y, Math.max(radius, 0.5), 0, Math.PI * 2);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.fill();
        }
      }
      
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = imageSrc;
  });
}

function renderPublicCustomObjects() {
  const inner = document.querySelector('.public-stage-inner');
  if (!inner) return;

  inner.querySelectorAll('.public-custom-object').forEach((el) => el.remove());

  (state.page.customObjects || []).forEach((obj) => {
    const key = `obj-${obj.id}`;
    if (isObjectInHiddenLayer(key)) return;
    
    const box = state.page.layout[key];
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'custom-object public-custom-object';
    div.dataset.public = key;
    div.dataset.editable = key;

    const effect = state.page.effects[key];

    if (obj.type === 'text') {
      const content = document.createElement('span');
      content.className = 'text-content';
      content.contentEditable = 'false';
      content.innerHTML = obj.html || escapeHtml(obj.text || '');
      div.appendChild(content);
    } else {
      const img = document.createElement('img');
      img.alt = obj.name || 'image';
      img.className = 'custom-object-img';
      
      const loadImageWithProxy = (src) => {
        if (src && src.startsWith('http')) {
          fetch('/api/proxy-image?url=' + encodeURIComponent(src))
            .then(res => res.json())
            .then(data => {
              if (data.dataUrl) {
                img.src = data.dataUrl;
              } else {
                img.src = src;
              }
            })
            .catch(() => {
              img.src = src;
            });
        } else {
          img.src = src;
        }
      };
      
      if (effect && effect.type === 'halftone' && obj.src) {
        img.src = obj.src;
      } else {
        loadImageWithProxy(obj.src);
      }
      
      div.appendChild(img);
    }

    if (obj.animation) {
      div.dataset.animation = obj.animation;
      const speed = obj.animationSpeed || 1;
      div.style.setProperty('--anim-dur', `${1/speed}s`);
      div.style.animation = `${obj.animation} ${1/speed}s infinite`;
    }

    if (box) {
      div.style.position = 'absolute';
      div.style.left = `${box.x}px`;
      div.style.top = `${box.y}px`;
      div.style.width = `${box.w}px`;
      div.style.height = obj.type === 'text' ? 'auto' : `${box.h}px`;
      div.style.transform = `rotate(${box.rotate || 0}deg)`;
    }

    inner.appendChild(div);
  });

  applyPublicLayerZIndex();
}

function setupAddObjectMenu() {
  const objectFileInput = document.getElementById('object-file-input');
  const addObjectContextBtn = document.getElementById('add-object-context-btn');
  const addObjectStageBtn = document.getElementById('add-object-stage-btn');
  const addObjectUrlBtn = document.getElementById('add-object-url-btn');
  const addTextStageBtn = document.getElementById('add-text-stage-btn');
  const bgOpacityMenu = document.getElementById('bg-opacity-menu');
  const addObjectMenu = document.getElementById('add-object-menu');
  const previewStage = document.getElementById('preview-stage');
  const urlModal = document.getElementById('url-modal');
  const urlModalInput = document.getElementById('url-modal-input');
  const urlModalConfirm = document.getElementById('url-modal-confirm');
  const urlModalCancel = document.getElementById('url-modal-cancel');
  let urlModalCoords = null;

  const MAX_BYTES = 70 * 1024 * 1024;

  const hideMenus = () => {
    const focusedInMenu = addObjectMenu && addObjectMenu.contains(document.activeElement);
    const focusedInBgOpacity = bgOpacityMenu && bgOpacityMenu.contains(document.activeElement);
    
    if (bgOpacityMenu) {
      bgOpacityMenu.classList.remove('show');
      bgOpacityMenu.setAttribute('aria-hidden', 'true');
    }
    if (addObjectMenu) {
      addObjectMenu.classList.remove('show');
      addObjectMenu.setAttribute('aria-hidden', 'true');
    }
    if (urlModal) {
      urlModal.classList.remove('show');
      urlModal.setAttribute('aria-hidden', 'true');
    }
    
    if (focusedInMenu) {
      document.body.focus();
    }
    if (focusedInBgOpacity) {
      document.body.focus();
    }
  };

  const getMenuClickCoords = () => {
    const menu =
      bgOpacityMenu && bgOpacityMenu.classList.contains('show')
        ? bgOpacityMenu
        : addObjectMenu && addObjectMenu.classList.contains('show')
        ? addObjectMenu
        : null;
    if (!menu) return null;
    const rect = menu.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!file.type || !file.type.startsWith('image/')) {
      showToast('Please upload an image file (png, jpg, gif).');
      return;
    }
    if (file.size > MAX_BYTES) {
      showToast('Image is too large (max 70 MB).');
      return;
    }
    readFileAsDataURL(file)
      .then((dataUrl) => {
        pushHistory();
        const coords = getMenuClickCoords();
        const stageInner = document.getElementById('preview-stage-inner');
        const stage = document.getElementById('preview-stage');
        let x = 200;
        let y = 200;
        const w = 120;
        const h = 120;
        if (coords && stage && stageInner) {
          const stageRect = stage.getBoundingClientRect();
          const v = state.builder.view || { x: 0, y: 0, scale: 1 };
          x = Math.round((coords.x - stageRect.left - v.x) / v.scale - w / 2);
          y = Math.round((coords.y - stageRect.top - v.y) / v.scale - h / 2);
        }

        const id = state.page.customObjectCounter++;
        const key = `obj-${id}`;
        state.page.customObjects.push({
          id,
          src: String(dataUrl || ''),
          name: file.name || 'image',
          followCursor: false,
        });
        state.page.layout[key] = { x, y, w, h };
        
        // Assign to active layer
        if (state.page.activeLayer) {
          assignObjectToLayer(key, state.page.activeLayer);
        }
        
        renderCustomObjects();
        applyLayout();
        showToast('Object added');
      })
      .catch(() => {
        showToast('Could not read this file. Try another one.');
      });
  };

  if (objectFileInput) {
    objectFileInput.addEventListener('change', () => {
      const file = objectFileInput.files && objectFileInput.files[0];
      handleFile(file);
      objectFileInput.value = '';
    });
  }

  const openPicker = () => {
    if (objectFileInput) objectFileInput.click();
  };

if (addObjectContextBtn) {
    addObjectContextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideMenus();
      openPicker();
    });
  }

  if (addTextStageBtn) {
    addTextStageBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hideMenus();
      showPromptModal({
        title: 'Add Text',
        placeholder: 'Enter text',
        value: '',
        onConfirm: (text) => {
          if (!text) return;
          pushHistory();
          const id = Date.now();
          const key = `obj-${id}`;
          state.page.customObjects = state.page.customObjects || [];
          state.page.customObjects.push({
            id,
            type: 'text',
            text,
            html: escapeHtml(text),
            followCursor: false,
          });
          state.page.layout[key] = { x: 60, y: 60, w: 120, h: 40, rotate: 0 };
          renderCustomObjects();
          updatePreview();
        }
      });
    });
  }

  // Inline URL input for adding images
  const addUrlWrapper = document.getElementById('add-url-input-wrapper');
  const addUrlInput = document.getElementById('add-url-input');
  
  if (addUrlWrapper && addUrlInput) {
    let urlInputVisible = false;
    let urlInputCoords = null;
    
    const showUrlInput = (coords) => {
      urlInputCoords = coords;
      addUrlWrapper.style.display = 'block';
      addUrlInput.value = '';
      addUrlInput.focus();
      urlInputVisible = true;
    };
    
    const hideUrlInput = () => {
      addUrlWrapper.style.display = 'none';
      urlInputVisible = false;
      urlInputCoords = null;
    };
    
    const addObjectFromUrl = (url) => {
      if (!url) return;
      let trimmed = url.trim();
      
      const imgurMatch = trimmed.match(/^https?:\/\/(www\.)?imgur\.com\/([a-zA-Z0-9]+)(\..+)?(\?.*)?$/i);
      if (imgurMatch) {
        const imgId = imgurMatch[2];
        const ext = imgurMatch[3] || '.png';
        trimmed = `https://i.imgur.com/${imgId}${ext}`;
      }
      
      const isHttpUrl = trimmed.match(/^https?:\/\/.+/i);
      const isDataUrl = trimmed.startsWith('data:');
      
      if (!isHttpUrl && !isDataUrl) {
        showToast('Please enter a valid URL');
        return;
      }
      
      pushHistory();
      const stage = document.getElementById('preview-stage');
      const stageInner = document.getElementById('preview-stage-inner');
      let x = 200, y = 200;
      const w = 120, h = 120;
      if (urlInputCoords && stage && stageInner) {
        const stageRect = stage.getBoundingClientRect();
        const v = state.builder.view || { x: 0, y: 0, scale: 1 };
        x = Math.round((urlInputCoords.x - stageRect.left - v.x) / v.scale - w / 2);
        y = Math.round((urlInputCoords.y - stageRect.top - v.y) / v.scale - h / 2);
      }
      
      const id = state.page.customObjectCounter++;
      const key = `obj-${id}`;
      state.page.customObjects = state.page.customObjects || [];
      state.page.customObjects.push({
        id,
        type: 'image',
        src: trimmed,
        name: 'Image',
        followCursor: false,
      });
      state.page.layout[key] = { x, y, w, h };
      if (state.page.activeLayer) {
        assignObjectToLayer(key, state.page.activeLayer);
      }
      renderCustomObjects();
      applyLayout();
      hideUrlInput();
      showToast('Image added');
    };
    
    addUrlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addObjectFromUrl(addUrlInput.value);
      } else if (e.key === 'Escape') {
        hideUrlInput();
      }
    });
    
    addUrlInput.addEventListener('blur', () => {
      setTimeout(() => {
        if (!addUrlInput.value) {
          hideUrlInput();
        }
      }, 200);
    });
    
    document.getElementById('add-object-url-btn').addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (urlInputVisible) {
        if (addUrlInput.value.trim()) {
          addObjectFromUrl(addUrlInput.value);
        } else {
          hideUrlInput();
        }
      } else {
        const rect = addObjectMenu ? addObjectMenu.getBoundingClientRect() : null;
        showUrlInput(rect ? { x: rect.left, y: rect.top } : null);
      }
    });
  }

  // Right-click on preview stage background (outside phone) to show add-object menu
  if (previewStage && addObjectMenu) {
    previewStage.addEventListener('contextmenu', (ev) => {
      // Don't open add menu for default elements - they use objectMenu instead
      if (ev.target.closest('[data-editable="avatar"]')) return;
      if (ev.target.closest('[data-editable="name"]')) return;
      if (ev.target.closest('[data-editable="bio"]')) return;
      if (ev.target.closest('[data-editable="links"]')) return;
      if (ev.target.closest('#preview-frame') && !ev.target.closest('.custom-object')) return;
      if (ev.target.closest('.custom-object')) return;
      if (ev.target.closest('a, button, input, textarea, select, .text-menu, .bg-opacity-menu, #add-object-menu, [data-editable^="link-"]')) return;

      ev.preventDefault();
      hideMenus();
      addObjectMenu.style.left = `${ev.clientX}px`;
      addObjectMenu.style.top = `${ev.clientY}px`;
      addObjectMenu.classList.add('show');
      addObjectMenu.setAttribute('aria-hidden', 'false');
    });
  }

  document.addEventListener('mousedown', (ev) => {
    if (addObjectMenu && !addObjectMenu.contains(ev.target)) {
      addObjectMenu.classList.remove('show');
      addObjectMenu.setAttribute('aria-hidden', 'true');
      if (addUrlWrapper) addUrlWrapper.style.display = 'none';
    }
  });

  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && addObjectMenu) {
      addObjectMenu.classList.remove('show');
      addObjectMenu.setAttribute('aria-hidden', 'true');
      if (addUrlWrapper) addUrlWrapper.style.display = 'none';
    }
  });
}

function setupPromptModal() {
  const modal = document.getElementById('prompt-modal');
  const input = document.getElementById('prompt-modal-input');
  const title = document.getElementById('prompt-modal-title');
  const hint = document.getElementById('prompt-modal-hint');
  const cancelBtn = document.getElementById('prompt-modal-cancel');
  const confirmBtn = document.getElementById('prompt-modal-confirm');

  document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(0);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(0);
      btn.style.setProperty('--mx', x + '%');
      btn.style.setProperty('--my', y + '%');
    });
  });

  if (!modal || !input) return;

  let promptCallback = null;

  const hideModal = () => {
    modal.classList.remove('show');
    modal.style.display = 'none';
    input.value = '';
    promptCallback = null;
  };

  const showModal = (opts = {}) => {
    title.textContent = opts.title || 'Enter text';
    input.placeholder = opts.placeholder || '';
    hint.textContent = opts.hint || '';
    hint.style.display = opts.hint ? 'block' : 'none';
    input.value = opts.value || '';
    promptCallback = opts.onConfirm || null;
    modal.classList.add('show');
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 50);
  };

  window.showPromptModal = showModal;

  confirmBtn.addEventListener('click', () => {
    if (promptCallback) {
      promptCallback(input.value);
    }
    hideModal();
  });

  cancelBtn.addEventListener('click', hideModal);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (promptCallback) {
        promptCallback(input.value);
      }
      hideModal();
    }
    if (e.key === 'Escape') {
      hideModal();
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  const glossyBtn = modal.querySelector('.glossy-btn');
  if (glossyBtn) {
    modal.addEventListener('mousemove', (e) => {
      const rect = glossyBtn.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width * 100).toFixed(0);
      const y = ((e.clientY - rect.top) / rect.height * 100).toFixed(0);
      glossyBtn.style.setProperty('--mx', x + '%');
      glossyBtn.style.setProperty('--my', y + '%');
    });
  }
}

function updatePreview() {
  if (state.currentUser && !pageModified) {
    if (checkPageModified()) {
      markPageModified();
    }
  }
  
  const previewStage = document.getElementById('preview-stage');
  
  // Debug: track frame changes
  const frame = document.getElementById('preview-frame');
  if (frame) {
    const frameClasses = frame.className;
    const frameBgClass = (frameClasses.match(/bg-\w+/g) || []).join(' ');
    console.log('[updatePreview] frame found, bg:', frameBgClass, 'btnStyle:', state.page.btnStyle, 'cursor:', state.page.cursorImage ? 'SET' : 'none');
  } else {
    console.log('[updatePreview] frame NOT found!');
  }
  
  setEditableText(
    document.getElementById('prev-name'),
    state.page.displayNameHtml || escapeHtml(state.page.displayName || '@username'),
    state.page.displayName || '@username'
  );
  const nameEl = document.getElementById('prev-name');
  ensureResizeHandle(nameEl);
  ensureRotateHandle(nameEl);
  
  setEditableText(
    document.getElementById('prev-bio'),
    state.page.bioHtml || escapeHtml(state.page.bio || ''),
    state.page.bio || ''
  );
  const bioEl = document.getElementById('prev-bio');
  ensureResizeHandle(bioEl);
  ensureRotateHandle(bioEl);
  
  const avatarEl = document.getElementById('prev-avatar');
  avatarEl.style.display = isObjectDeleted('avatar') ? 'none' : '';
  if (state.page.avatar) {
    avatarEl.innerHTML = `<img src="${state.page.avatar}" alt="Avatar" class="page-avatar-image" />`;
  } else {
    avatarEl.innerHTML = `<img src="default_pfp.png" alt="Avatar" class="page-avatar-image" />`;
  }
  ensureResizeHandle(avatarEl);
  ensureRotateHandle(avatarEl);
  renderPreviewLinks();
  renderCustomObjects();
  applyLayerZIndex();
  applyLayerVisibility();
  applyAccentColor(state.page.accentColor);
  syncBgAudioFromState();

  const applyCursor = (el) => {
    if (el) {
      if (state.page.cursorImage) {
        el.style.setProperty('cursor', `url("${state.page.cursorImage}") ${Math.round(state.page.cursorSize / 2)} ${Math.round(state.page.cursorSize / 2)}, auto`, 'important');
      } else {
        el.style.cursor = 'default';
      }
    }
  };
  if (frame) applyCursor(frame);
  if (previewStage) applyCursor(previewStage);

  // Sync 3D Tilt profile toggle
  console.log('[Tilt3D Profile] updatePreview calling syncTilt3DProfileToggle');
  if (window.syncTilt3DProfileToggle) window.syncTilt3DProfileToggle();

  // Show resize handle for phone in builder
  const resizeHandle = frame.querySelector('.resize-handle');
  if (resizeHandle) {
    resizeHandle.style.opacity = '1';
    resizeHandle.style.visibility = 'visible';
  }

  // Apply custom frame overlay if exists
  const publicOverlay = document.getElementById('public-frame-overlay');
  if (publicOverlay) {
    if (state.page.phoneFrameImage) {
      publicOverlay.src = state.page.phoneFrameImage;
      publicOverlay.hidden = false;
    } else {
      publicOverlay.src = '';
      publicOverlay.hidden = true;
    }
  }

  // Re-apply bg class and btn style to builder frame
  if (frame) {
    frame.className = frame.className.replace(/bg-\S+/g, '').trim();
    frame.classList.add(state.page.bg);
    if (state.page.btnStyle) frame.classList.add(state.page.btnStyle);
    frame.style.setProperty('--page-accent', state.page.accentColor);
    const afterBg = (frame.className.match(/bg-\w+/g) || []).join(' ');
    console.log('[updatePreview] after apply: bg:', afterBg, 'btnStyle:', state.page.btnStyle);
  }

  // Re-apply font & size
  document.getElementById('prev-name').style.fontFamily = `'${state.page.font}', sans-serif`;
  document.getElementById('prev-name').style.fontSize   = state.page.nameSize + 'px';
  document.getElementById('prev-name').style.display = isObjectDeleted('name') ? 'none' : '';
  document.getElementById('prev-bio').style.display = isObjectDeleted('bio') ? 'none' : '';
  applyBackgroundImages();

  // Apply layout with requestAnimationFrame to ensure DOM is ready
  requestAnimationFrame(() => {
    applyPhoneLayout();
    applyLayout();
  });

  ['avatar', 'name', 'bio'].forEach(key => {
    const el = document.getElementById(`prev-${key}`);
    if (!el) return;
    if (state.page.animations && state.page.animations[key]) {
      const anim = state.page.animations[key];
      el.style.setProperty('--anim-dur', `${1/anim.speed}s`);
      el.dataset.animation = anim.animation;
    } else {
      el.style.animation = '';
      delete el.dataset.animation;
    }
  });

  const phoneFrame = document.querySelector('.phone-frame');
  if (phoneFrame && state.page.animations && state.page.animations['phone']) {
    const anim = state.page.animations['phone'];
    phoneFrame.style.setProperty('--anim-dur', `${1/anim.speed}s`);
    phoneFrame.dataset.animation = anim.animation;
  } else if (phoneFrame) {
    delete phoneFrame.dataset.animation;
  }
updatePreviewSpotifyWidget();
  renderDiscordWidget('preview-discord-widget-container');
}

// Unified Discord widget renderer
function renderDiscordWidget(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Show widget only if Discord is linked and widget is enabled
  const enabled = state.page.discordWidgets && state.page.discord && state.page.discord.id;
  if (!enabled) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const d = state.page.discord;
  const avatarUrl = d.avatar ? `https://cdn.discordapp.com/avatars/${d.id}/${d.avatar}.png` : '';
  const discriminator = d.discriminator ? `#${d.discriminator}` : '';
  const statusHtml = `<div class="discord-widget-status"><span class="discord-widget-status-indicator online"></span>Online</div>`;
  const discordIcon = `<svg class="discord-widget-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M22.7 2.5c-5.2-2.2-10.4-2.2-15.6 0-0.5 0.2-0.7 0.8-0.5 1.2l1.5 2.8c-2.7 0.8-5.2 2-7.4 3.7-0.5 0.4-0.5 1.2 0 1.6l2.3 2.1c-0.1 0.5-0.2 1-0.2 1.5 0 0.5 0.1 1 0.2 1.5l-2.3 2.1c-0.5 0.5-0.5 1.2 0 1.6 2.2 1.7 4.8 2.9 7.5 3.7l-1.5 2.8c-0.2 0.5 0.1 1 0.5 1.2 2.6 1.1 5.4 1.7 8.2 1.7 2.8 0 5.5-0.6 8.2-1.7 0.5-0.2 0.7-0.8 0.5-1.2l-1.5-2.8c2.7-0.8 5.2-2 7.4-3.7 0.5-0.4 0.5-1.2 0-1.6l-2.3-2.1c0.1-0.5 0.2-1 0.2-1.5 0-0.5-0.1-1-0.2-1.5l2.3-2.1c0.5-0.5 0.5-1.2 0-1.6-2.2-1.7-4.8-2.9-7.5-3.7l1.5-2.8c0.2-0.5-0.1-1-0.5-1.2zM17 10c-1.1 0-2 0.9-2 2 0 1.2 0.9 2 2 2 1.1 0 2-0.9 2-2 0-1.1-0.9-2-2-2zm-6 0c-1.1 0-2 0.9-2 2 0 1.2 0.9 2 2 2 1.1 0 2-0.9 2-2 0-1.1-0.9-2-2-2z"/></svg>`;
  container.innerHTML = `
    <img class="discord-widget-avatar" src="${avatarUrl}" alt="Discord avatar">
    <div class="discord-widget-info">
      <div class="discord-widget-username">${d.username || ''}${discriminator}</div>
      ${statusHtml}
    </div>
    ${discordIcon}
  `;
  container.style.display = 'flex';
}

// Update both public and preview Discord widgets
function updateDiscordWidgets() {
  renderDiscordWidget('discord-widget-container');
  renderDiscordWidget('preview-discord-widget-container');
}

function savePage() {
  savePageToServer(false);
}

function publishPage() {
  savePageToServer(true);
}


/* ================================================
   COPY LINK
   ================================================ */
function copyLink() {
  const url = 'https://seya.lol/' + getPublicSlug();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).catch(() => {});
  }
  showToast('Link copied!');
}

/* ================================================
   TOAST
   ================================================ */
let toastTimer = null;

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}

/* ================================================
   GLOBAL CLICK DELEGATION
   ================================================ */
function setupGlobalActions() {
  console.log('setupGlobalActions called - registering document click');
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    console.log('data-action click:', el.dataset.action);
    switch (el.dataset.action) {
      case 'goto-signup':
        console.log('Processing goto-signup');
        setAuthMode('signup');
        showScreen('auth', { payload: { authMode: 'signup' } });
        break;

      case 'goto-login':
        console.log('Processing goto-login');
        setAuthMode('login');
        showScreen('auth', { payload: { authMode: 'login' } });
        break;

      case 'toggle-auth':
        e.preventDefault();
        toggleAuth();
        break;

      case 'goto-landing':
        showScreen('landing');
        break;

      case 'goto-dashboard':
        showScreen('dashboard');
        break;

      case 'goto-builder':
        showScreen('builder');
        break;

      case 'toggle-analytics':
        toggleAnalyticsPanel();
        break;

      case 'goto-public':
        const slug = getPublicSlug();
        window.open('/' + slug, '_blank');
        break;

      case 'logout':
        logout();
        break;

      case 'copy-link':
        copyLink();
        break;

      case 'save-page':
        savePage();
        break;

      case 'publish-page':
        publishPage();
        break;

      default:
        break;
    }
  });
}

/* ================================================
   KEYBOARD — dash-card "Enter" as click
   ================================================ */
function setupKeyboard() {
  document.querySelectorAll('.dash-card[tabindex]').forEach(card => {
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card.click();
      }
    });
  });
}

/* ================================================
   CURSOR UPLOAD
   ================================================ */
function setupCursorUpload() {
  const cursorDrop = document.getElementById('cursor-dropzone');
  const cursorInput = document.getElementById('cursor-file-input');
  const cursorHint = document.getElementById('cursor-hint');
  const cursorPreview = document.getElementById('cursor-preview');
  const cursorPreviewImg = document.getElementById('cursor-preview-img');
  const uploadTitle = document.getElementById('cursor-upload-title');
  const deleteBtn = document.getElementById('delete-cursor-btn');
  const removeCursorBtn = document.getElementById('remove-cursor-btn');

  if (!cursorDrop || !cursorInput) return;

  const updateCursorUI = () => {
    if (uploadTitle) {
      uploadTitle.textContent = state.page.cursorImage ? 'Change cursor' : '+ Upload cursor';
    }
    if (deleteBtn) {
      deleteBtn.style.display = state.page.cursorImage ? '' : 'none';
    }
    if (cursorPreview && cursorPreviewImg) {
      if (state.page.cursorImage) {
        cursorPreviewImg.src = state.page.cursorImage;
        cursorPreview.hidden = false;
      } else {
        cursorPreview.hidden = true;
        cursorPreviewImg.src = '';
      }
    }
  };
  updateCursorUI();

  const openPicker = () => cursorInput.click();
  cursorDrop.addEventListener('click', openPicker);
  cursorDrop.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openPicker();
    }
  });

  const applyCursorToAll = (dataUrl) => {
    pushHistory();
    state.page.cursorImage = dataUrl;
    if (cursorHint) cursorHint.textContent = '';
    updateCursorUI();
    updatePublicPage();
    const previewStage = document.getElementById('preview-stage');
    const publicStage = document.querySelector('.public-stage');
    const size = state.page.cursorSize;
    const applyCursor = (el) => {
      if (el) el.style.setProperty('cursor', `url("${state.page.cursorImage}") ${Math.round(size / 2)} ${Math.round(size / 2)}, auto`, 'important');
    };
    if (frame) applyCursor(frame);
    if (previewStage) applyCursor(previewStage);
    if (publicStage) applyCursor(publicStage);
    showToast('Cursor updated');
  };

  cursorInput.addEventListener('change', () => {
    const file = cursorInput.files && cursorInput.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      if (cursorHint) cursorHint.textContent = 'Please upload an image file.';
      showToast('Unsupported file type');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, 64, 64);
        const resizedDataUrl = canvas.toDataURL('image/png');
        applyCursorToAll(resizedDataUrl);
      };
      img.onerror = () => {
        if (cursorHint) cursorHint.textContent = 'Could not load image.';
        showToast('Could not load image');
      };
      img.src = e.target.result;
    };
    reader.onerror = () => {
      if (cursorHint) cursorHint.textContent = 'Could not read this file.';
    };
    reader.readAsDataURL(file);
    cursorInput.value = '';
  });

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      pushHistory();
      state.page.cursorImage = '';
      const clearCursor = (el) => { if (el) el.style.cursor = ''; };
      clearCursor(document.getElementById('preview-frame'));
      clearCursor(document.getElementById('preview-stage'));
      clearCursor(document.querySelector('.public-stage'));
      updateCursorUI();
      updatePublicPage();
      showToast('Cursor removed');
    });
  }

  if (removeCursorBtn) {
    removeCursorBtn.addEventListener('click', () => {
      if (deleteBtn) deleteBtn.click();
    });
  }
}

/* ================================================
   CURSOR TRAIL — particle effects
   ================================================ */
const TRAIL_PRESETS = {
  stars: { color: '#ffd700', size: 6, lifetime: 600, speed: 3, count: 1, opacity: 0.9, shape: 'star' },
  sparkles: { color: '#ffffff', size: 4, lifetime: 400, speed: 2, count: 2, opacity: 0.8, shape: 'dot' },
  smoke: { color: '#aaaaaa', size: 14, lifetime: 900, speed: 1, count: 1, opacity: 0.3, shape: 'circle' },
  bubbles: { color: '#87ceeb', size: 10, lifetime: 700, speed: 1.5, count: 1, opacity: 0.5, shape: 'circle' },
  neon: { color: '#00ffff', size: 5, lifetime: 350, speed: 4, count: 3, opacity: 0.9, shape: 'line' }
};

let trailCanvas = null;
let trailCtx = null;
let trailParticles = [];
let trailAnimId = null;
let trailRunning = false;
let trailLastX = 0;
let trailLastY = 0;
let trailMouseX = 0;
let trailMouseY = 0;
let trailNewPos = false;
let trailCustomImage = null;
let trailCustomImageSrc = '';

function ensureTrailCanvas() {
  if (trailCanvas && trailCanvas.parentNode) return trailCanvas;
  trailCanvas = document.createElement('canvas');
  trailCanvas.id = 'cursor-trail-canvas';
  trailCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99999;';
  document.body.appendChild(trailCanvas);
  trailCtx = trailCanvas.getContext('2d');
  return trailCanvas;
}

function resizeTrailCanvas() {
  if (!trailCanvas) return;
  trailCanvas.width = window.innerWidth;
  trailCanvas.height = window.innerHeight;
}

function drawStar(ctx, cx, cy, r, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.4;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function spawnTrailParticles(x, y, config) {
  const trail = state.page.cursorTrail;
  const mode = trail.mode;
  if (mode === 'none' || !mode) return;
  
  const preset = TRAIL_PRESETS[mode] || {};
  const shape = preset.shape || 'dot';
  const count = trail.config.count || preset.count || 1;
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 8;
    trailParticles.push({
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist,
      vx: (Math.random() - 0.5) * (trail.config.speed || preset.speed || 2),
      vy: (Math.random() - 0.5) * (trail.config.speed || preset.speed || 2) - 0.5,
      size: (trail.config.size || preset.size || 6) * (0.5 + Math.random() * 0.5),
      life: trail.config.lifetime || preset.lifetime || 500,
      maxLife: trail.config.lifetime || preset.lifetime || 500,
      opacity: (trail.config.opacity != null ? trail.config.opacity / 100 : preset.opacity || 0.8) * (0.6 + Math.random() * 0.4),
      color: trail.mode === 'custom' && trail.image ? '#ffffff' : preset.color || '#ffffff',
      shape: shape,
      rotation: Math.random() * Math.PI * 2
    });
  }
}

function updateTrailParticles() {
  for (let i = trailParticles.length - 1; i >= 0; i--) {
    const p = trailParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 16;
    p.rotation += 0.05;
    if (p.shape !== 'line') p.vy += 0.02;
    if (p.life <= 0) {
      trailParticles.splice(i, 1);
    }
  }
}

function drawTrailParticles() {
  if (!trailCtx) return;
  const w = trailCanvas.width;
  const h = trailCanvas.height;
  trailCtx.clearRect(0, 0, w, h);
  
  trailParticles.forEach(p => {
    const lifeRatio = Math.max(0, p.life / p.maxLife);
    const alpha = p.opacity * lifeRatio;
    const size = p.size * lifeRatio;
    
    trailCtx.globalAlpha = alpha;
    
    if (p.shape === 'star') {
      trailCtx.fillStyle = p.color;
      drawStar(trailCtx, p.x, p.y, size, 5);
    } else if (p.shape === 'dot') {
      trailCtx.fillStyle = p.color;
      trailCtx.beginPath();
      trailCtx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      trailCtx.fill();
    } else if (p.shape === 'circle') {
      trailCtx.fillStyle = p.color;
      trailCtx.beginPath();
      trailCtx.arc(p.x, p.y, size * 0.5, 0, Math.PI * 2);
      trailCtx.fill();
    } else if (p.shape === 'line') {
      trailCtx.strokeStyle = p.color;
      trailCtx.lineWidth = size * 0.5;
      trailCtx.beginPath();
      trailCtx.moveTo(p.x, p.y);
      trailCtx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3);
      trailCtx.stroke();
    }
  });
  
  trailCtx.globalAlpha = 1;
  
  // Draw custom image if mode is custom
  const trail = state.page.cursorTrail;
  if (trail.mode === 'custom' && trail.image && trailCtx) {
    if (trail.image !== trailCustomImageSrc) {
      trailCustomImage = new Image();
      trailCustomImage.src = trail.image;
      trailCustomImageSrc = trail.image;
    }
    if (trailCustomImage && trailCustomImage.complete && trailCustomImage.naturalWidth) {
      trailParticles.forEach(p => {
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        trailCtx.globalAlpha = p.opacity * lifeRatio;
        const s = p.size;
        trailCtx.drawImage(trailCustomImage, p.x - s / 2, p.y - s / 2, s, s);
      });
      trailCtx.globalAlpha = 1;
    }
  }
}

function trailLoop() {
  if (trailNewPos) {
    spawnTrailParticles(trailMouseX, trailMouseY, {});
    trailNewPos = false;
  }
  updateTrailParticles();
  drawTrailParticles();
  trailAnimId = requestAnimationFrame(trailLoop);
}

function startTrail() {
  const trailData = state.page.cursorTrail;
  console.log('[Trail] startTrail called, cursorTrail:', JSON.stringify(trailData));
  const mode = trailData?.mode;
  if (!mode || mode === 'none') {
    console.log('[Trail] Skipping, mode:', mode);
    return;
  }
  ensureTrailCanvas();
  resizeTrailCanvas();
  trailParticles = [];
  trailRunning = true;
  trailNewPos = false;
  
  const handler = (e) => {
    trailMouseX = e.clientX;
    trailMouseY = e.clientY;
    trailNewPos = true;
  };
  trailCanvas._trailHandler = handler;
  document.addEventListener('mousemove', handler);
  
  window.addEventListener('resize', resizeTrailCanvas);
  
  if (trailAnimId) cancelAnimationFrame(trailAnimId);
  trailAnimId = requestAnimationFrame(trailLoop);
}

function stopTrail() {
  trailRunning = false;
  if (trailAnimId) {
    cancelAnimationFrame(trailAnimId);
    trailAnimId = null;
  }
  if (trailCanvas && trailCanvas._trailHandler) {
    document.removeEventListener('mousemove', trailCanvas._trailHandler);
    delete trailCanvas._trailHandler;
  }
  window.removeEventListener('resize', resizeTrailCanvas);
  trailParticles = [];
  if (trailCtx) {
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  }
  if (trailCanvas && trailCanvas.parentNode) {
    trailCanvas.parentNode.removeChild(trailCanvas);
  }
  trailCanvas = null;
  trailCtx = null;
  trailCustomImage = null;
  trailCustomImageSrc = '';
}

function setupCursorTrail() {
  const modeItems = document.querySelectorAll('.trail-mode-item');
  const trailUpload = document.getElementById('trail-upload');
  const trailFileInput = document.getElementById('trail-file-input');
  const trailPreview = document.getElementById('trail-preview');
  const trailPreviewImg = document.getElementById('trail-preview-img');
  const trailUploadWrap = document.getElementById('trail-upload-wrap');
  const trailConfig = document.getElementById('trail-config');
  const trailHint = document.getElementById('trail-hint');
  
  const configSliders = {
    size: { slider: document.getElementById('trail-size'), val: document.getElementById('trail-size-val') },
    lifetime: { slider: document.getElementById('trail-lifetime'), val: document.getElementById('trail-lifetime-val') },
    speed: { slider: document.getElementById('trail-speed'), val: document.getElementById('trail-speed-val') },
    opacity: { slider: document.getElementById('trail-opacity'), val: document.getElementById('trail-opacity-val') },
    count: { slider: document.getElementById('trail-count'), val: document.getElementById('trail-count-val') }
  };
  
  const syncTrailUI = () => {
    const trail = state.page.cursorTrail;
    modeItems.forEach(item => {
      item.classList.toggle('active', item.dataset.trail === trail.mode);
    });
    if (trailUploadWrap) trailUploadWrap.style.display = trail.mode === 'custom' ? '' : 'none';
    if (trailConfig) trailConfig.style.display = trail.mode !== 'none' ? '' : 'none';
    
    // Sync sliders from state
    if (trail.config.size != null && configSliders.size.slider) configSliders.size.slider.value = trail.config.size;
    if (trail.config.lifetime != null && configSliders.lifetime.slider) configSliders.lifetime.slider.value = trail.config.lifetime;
    if (trail.config.speed != null && configSliders.speed.slider) configSliders.speed.slider.value = trail.config.speed;
    if (trail.config.opacity != null && configSliders.opacity.slider) configSliders.opacity.slider.value = trail.config.opacity;
    if (trail.config.count != null && configSliders.count.slider) configSliders.count.slider.value = trail.config.count;
    
    // Sync trail image preview
    if (trail.mode === 'custom' && trail.image && trailPreviewImg) {
      trailPreviewImg.src = trail.image;
      if (trailPreview) trailPreview.style.display = '';
    } else {
      if (trailPreview) trailPreview.style.display = 'none';
      if (trailPreviewImg) trailPreviewImg.src = '';
    }
    
    // Update config values display
    Object.entries(configSliders).forEach(([key, { slider, val }]) => {
      if (!slider || !val) return;
      let v = trail.config[key];
      if (v == null) v = TRAIL_PRESETS[trail.mode]?.[key] ?? slider.defaultValue;
      if (key === 'lifetime') val.textContent = v + 'ms';
      else if (key === 'opacity') val.textContent = v + '%';
      else val.textContent = v;
    });
  };
  
  const applyTrailConfig = () => {
    if (!state.page.cursorTrail) state.page.cursorTrail = { mode: 'none', image: '', config: {} };
    if (Array.isArray(state.page.cursorTrail.config)) state.page.cursorTrail.config = {};
    const trail = state.page.cursorTrail;
    trail.config.size = parseInt(configSliders.size.slider?.value) || 8;
    trail.config.lifetime = parseInt(configSliders.lifetime.slider?.value) || 500;
    trail.config.speed = parseInt(configSliders.speed.slider?.value) || 2;
    trail.config.opacity = parseInt(configSliders.opacity.slider?.value) || 80;
    trail.config.count = parseInt(configSliders.count.slider?.value) || 1;
  };
  
  // Mode selection
  modeItems.forEach(item => {
    item.addEventListener('click', () => {
      pushHistory();
      if (!state.page.cursorTrail) state.page.cursorTrail = { mode: 'none', image: '', config: {} };
      state.page.cursorTrail.mode = item.dataset.trail;
      
      // Apply preset defaults if switching to a new mode
      const preset = TRAIL_PRESETS[item.dataset.trail];
      if (preset && !state.page.cursorTrail.config.size) {
        state.page.cursorTrail.config = {
          size: preset.size || 8,
          lifetime: preset.lifetime || 500,
          speed: preset.speed || 2,
          opacity: Math.round((preset.opacity || 0.8) * 100),
          count: preset.count || 1
        };
      }
      
      syncTrailUI();
      markPageModified();
    });
  });
  
  // Config sliders
  Object.entries(configSliders).forEach(([key, { slider }]) => {
    if (!slider) return;
    slider.addEventListener('input', () => {
      applyTrailConfig();
      syncTrailUI();
      markPageModified();
    });
  });
  
  // Custom image upload
  if (trailUpload && trailFileInput) {
    trailUpload.addEventListener('click', () => trailFileInput.click());
    trailFileInput.addEventListener('change', () => {
      const file = trailFileInput.files && trailFileInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        if (trailHint) trailHint.textContent = 'Please upload an image file.';
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        pushHistory();
        if (!state.page.cursorTrail) state.page.cursorTrail = { mode: 'none', image: '', config: {} };
        state.page.cursorTrail.image = e.target.result;
        state.page.cursorTrail.mode = 'custom';
        syncTrailUI();
        markPageModified();
        if (trailHint) trailHint.textContent = '';
      };
      reader.readAsDataURL(file);
      trailFileInput.value = '';
    });
  }
  
  syncTrailUI();
}

/* ================================================
   SMART GUIDES
   ================================================ */
let smartGuidesContainer = null;
let smartGuideLines = [];
const SMART_GUIDE_THRESHOLD = 5;

function initSmartGuides() {
  if (smartGuidesContainer) return;
  const previewStage = document.getElementById('preview-stage');
  if (!previewStage) return;
  
  smartGuidesContainer = document.createElement('div');
  smartGuidesContainer.className = 'smart-guides-container';
  smartGuidesContainer.innerHTML = `
    <div class="smart-guide-line vertical" data-guide="left" style="display:none;"></div>
    <div class="smart-guide-line vertical" data-guide="right" style="display:none;"></div>
    <div class="smart-guide-line vertical center-x" data-guide="center-x" style="display:none;"></div>
    <div class="smart-guide-line horizontal" data-guide="top" style="display:none;"></div>
    <div class="smart-guide-line horizontal" data-guide="bottom" style="display:none;"></div>
    <div class="smart-guide-line horizontal center-y" data-guide="center-y" style="display:none;"></div>
    <div class="smart-guide-label" id="smart-guide-label" style="display:none;"></div>
  `;
  previewStage.appendChild(smartGuidesContainer);
  smartGuideLines = smartGuidesContainer.querySelectorAll('.smart-guide-line');
}

function hideSmartGuides() {
  if (!smartGuidesContainer) return;
  smartGuidesContainer.querySelectorAll('.smart-guide-line').forEach(line => {
    line.style.display = 'none';
  });
  const label = smartGuidesContainer.querySelector('#smart-guide-label');
  if (label) label.style.display = 'none';
}

function getStageInnerElements() {
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner) return [];
  
  return Array.from(stageInner.querySelectorAll('[data-editable]')).filter(el => {
    return !el.classList.contains('phone-frame') && el.style.display !== 'none';
  });
}

function getElementBounds(el, layoutKey) {
  const box = state.page.layout[layoutKey];
  if (!box) return null;
  
  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    centerX: box.x + box.w / 2,
    centerY: box.y + box.h / 2,
    right: box.x + box.w,
    bottom: box.y + box.h
  };
}

function showSmartGuides(movingKey, movingBounds) {
  if (!smartGuidesContainer || !movingBounds) return;
  
  const previewStage = document.getElementById('preview-stage');
  const stageInner = document.getElementById('preview-stage-inner');
  if (!previewStage || !stageInner) return;
  
  const stageRect = stageInner.getBoundingClientRect();
  const previewStageRect = previewStage.getBoundingClientRect();
  
  // Calculate offset between preview-stage and stageInner
  const offsetX = stageRect.left - previewStageRect.left;
  const offsetY = stageRect.top - previewStageRect.top;
  
  const elements = getStageInnerElements();
  
  if (elements.length === 0) return;
  
  const guides = [];
  
  elements.forEach(el => {
    const key = el.dataset.editable;
    if (key === movingKey || !key || key === 'phone') return;
    
    const bounds = getElementBounds(el, key);
    if (!bounds) return;
    
    // Adjust bounds to be relative to preview-stage
    const adjBounds = {
      x: bounds.x + offsetX,
      y: bounds.y + offsetY,
      w: bounds.w,
      h: bounds.h,
      centerX: bounds.centerX + offsetX,
      centerY: bounds.centerY + offsetY,
      right: bounds.right + offsetX,
      bottom: bounds.bottom + offsetY
    };
    
    const adjMovingBounds = {
      x: movingBounds.x + offsetX,
      y: movingBounds.y + offsetY,
      w: movingBounds.w,
      h: movingBounds.h,
      centerX: movingBounds.centerX + offsetX,
      centerY: movingBounds.centerY + offsetY,
      right: movingBounds.right + offsetX,
      bottom: movingBounds.bottom + offsetY
    };
    
    // Left edge alignment
    if (Math.abs(adjMovingBounds.x - adjBounds.x) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'vertical', pos: adjBounds.x, label: 'Left', targetX: adjBounds.x });
    }
    // Right edge alignment
    if (Math.abs(adjMovingBounds.right - adjBounds.right) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'vertical', pos: adjBounds.right, label: 'Right', targetX: adjBounds.right });
    }
    // Left to Right alignment
    if (Math.abs(adjMovingBounds.x - adjBounds.right) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'vertical', pos: adjBounds.right, label: 'Right', targetX: adjBounds.right });
    }
    // Right to Left alignment
    if (Math.abs(adjMovingBounds.right - adjBounds.x) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'vertical', pos: adjBounds.x, label: 'Left', targetX: adjBounds.x });
    }
    // Center X alignment
    if (Math.abs(adjMovingBounds.centerX - adjBounds.centerX) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'vertical', pos: adjBounds.centerX, label: 'Center', targetX: adjBounds.centerX, isCenter: true });
    }
    
    // Top edge alignment
    if (Math.abs(adjMovingBounds.y - adjBounds.y) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'horizontal', pos: adjBounds.y, label: 'Top', targetY: adjBounds.y });
    }
    // Bottom edge alignment
    if (Math.abs(adjMovingBounds.bottom - adjBounds.bottom) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'horizontal', pos: adjBounds.bottom, label: 'Bottom', targetY: adjBounds.bottom });
    }
    // Top to Bottom alignment
    if (Math.abs(adjMovingBounds.y - adjBounds.bottom) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'horizontal', pos: adjBounds.bottom, label: 'Bottom', targetY: adjBounds.bottom });
    }
    // Bottom to Top alignment
    if (Math.abs(adjMovingBounds.bottom - adjBounds.y) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'horizontal', pos: adjBounds.y, label: 'Top', targetY: adjBounds.y });
    }
    // Center Y alignment
    if (Math.abs(adjMovingBounds.centerY - adjBounds.centerY) < SMART_GUIDE_THRESHOLD) {
      guides.push({ type: 'horizontal', pos: adjBounds.centerY, label: 'Center', targetY: adjBounds.centerY, isCenter: true });
    }
  });
  
  // Hide all first
  hideSmartGuides();
  
  if (guides.length === 0) return;
  
  // Show guides - positions are relative to stageInner, so use directly
  const usedGuides = new Set();
  guides.forEach(guide => {
    const key = guide.type + guide.pos.toFixed(0);
    if (usedGuides.has(key)) return;
    usedGuides.add(key);
    
    const line = smartGuidesContainer.querySelector(`[data-guide="${guide.type === 'vertical' ? (guide.isCenter ? 'center-x' : (guide.label === 'Left' ? 'left' : 'right')) : (guide.isCenter ? 'center-y' : (guide.label === 'Top' ? 'top' : 'bottom'))}"]`);
    if (line) {
      if (guide.type === 'vertical') {
        line.style.left = guide.pos + 'px';
        line.style.display = 'block';
      } else {
        line.style.top = guide.pos + 'px';
        line.style.display = 'block';
      }
    }
  });
}

/* ================================================
   LAYERS SYSTEM
    ================================================ */
let layersDragData = null;
let layersDragEl = null;
let _initRan = false;

function setupLayers() {
  const toggleBtn = document.getElementById('layers-toggle-btn');
  const menu = document.getElementById('layers-menu');
  const addBtn = document.getElementById('add-layer-btn');
  
  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('show');
      menu.style.right = '16px';
      menu.style.left = 'auto';
      menu.style.top = '50px';
      renderLayersList();
    });
  }

  if (menu) {
    menu.addEventListener('contextmenu', (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    let menuDragOffset = { x: 0, y: 0 };
    let menuDragging = false;
    
    const menuHeader = menu.querySelector('.layers-menu-header');
    if (menuHeader) {
      menuHeader.style.cursor = 'grab';
      
      menuHeader.addEventListener('mousedown', (e) => {
        if (e.target.closest('button')) return;
        e.preventDefault();
        menuDragging = true;
        menu.classList.add('dragging');
        menu.style.right = 'auto';
        menu.style.left = e.clientX + 'px';
        menu.style.top = e.clientY + 'px';
        const rect = menu.getBoundingClientRect();
        menuDragOffset.x = e.clientX - rect.left;
        menuDragOffset.y = e.clientY - rect.top;
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!menuDragging) return;
        e.preventDefault();
        menu.style.left = (e.clientX - menuDragOffset.x) + 'px';
        menu.style.top = (e.clientY - menuDragOffset.y) + 'px';
      });
      
      document.addEventListener('mouseup', () => {
        if (menuDragging) {
          menuDragging = false;
          menu.classList.remove('dragging');
        }
      });
    }
    
    menu.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (layersDragData && layersDragData.type === 'layer') {
        e.dataTransfer.dropEffect = 'move';
      }
    });
    menu.addEventListener('drop', (e) => {
      e.preventDefault();
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      addLayer();
    });
  }

  renderLayersList();
}

function renderLayersList() {
  const list = document.getElementById('layers-list');
  if (!list) return;
  
  list.innerHTML = '';
  
  state.page.layers.forEach((layer, index) => {
    const isActive = state.page.activeLayer === layer.id;
    const isBottom = index === 0;
    const isTop = index === state.page.layers.length - 1;
    
    const item = document.createElement('div');
    item.className = 'layer-item' + (isActive ? ' active' : '');
    if (layer.hidden) item.className += ' hidden-layer';
    if (layer.locked) item.className += ' locked-layer';
    item.dataset.layerId = layer.id;
    item.draggable = true;
    item.style.zIndex = state.page.layers.length - index;
    
    const objects = layer.objects || [];
    const objectCount = objects.length;
    
    let previewIcons = '';
    if (objectCount > 0) {
      const maxIcons = 8;
      const displayObjects = objects.slice(0, maxIcons);
      previewIcons = '<div class="layer-preview-icons">';
      displayObjects.forEach(objKey => {
        const label = getObjectLabel(objKey);
        previewIcons += `<div class="layer-preview-icon" title="${label}">${getObjectIcon(objKey)}</div>`;
      });
      if (objectCount > maxIcons) {
        previewIcons += `<div class="layer-preview-icon">+${objectCount - maxIcons}</div>`;
      }
      previewIcons += '</div>';
    } else {
      previewIcons = '<span class="layer-empty">empty</span>';
    }
    
    const visClass = layer.hidden ? ' hidden' : ' active';
    const lockClass = layer.locked ? ' locked' : '';
    
    item.innerHTML = `
      <div class="layer-item-indicator"></div>
      <button class="layer-vis-btn${visClass}" title="${layer.hidden ? 'Show layer' : 'Hide layer'}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>
      <div class="layer-name-wrap">
        <span class="layer-name" title="${layer.name}">${layer.name}</span>
      </div>
      <button class="layer-lock-btn${lockClass}" title="${layer.locked ? 'Unlock layer' : 'Lock layer'}">
        ${layer.locked
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}
      </button>
      <button class="layer-del-btn" title="Delete layer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      <div class="layer-preview">${previewIcons}</div>
    `;
    
    // Click to select layer
    item.addEventListener('click', (e) => {
      const target = e.target;
      if (target.closest('.layer-vis-btn')) return;
      if (target.closest('.layer-lock-btn')) return;
      if (target.closest('.layer-del-btn')) return;
      selectLayer(layer.id);
    });
    
    // Double-click on name to rename
    const nameEl = item.querySelector('.layer-name');
    nameEl.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      nameEl.contentEditable = 'true';
      nameEl.focus();
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.target.contentEditable = 'false';
        e.target.blur();
      }
      if (e.key === 'Escape') {
        e.target.textContent = layer.name;
        e.target.contentEditable = 'false';
        e.target.blur();
      }
    });
    nameEl.addEventListener('blur', () => {
      if (nameEl.contentEditable === 'true') {
        nameEl.contentEditable = 'false';
        const newName = nameEl.textContent.trim();
        if (newName && newName !== layer.name) {
          pushHistory();
          layer.name = newName;
          showToast(`Layer renamed to "${newName}"`);
        } else {
          nameEl.textContent = layer.name;
        }
      }
    });
    
    // Visibility toggle
    item.querySelector('.layer-vis-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLayerVisibility(layer.id);
    });
    
    // Lock toggle
    item.querySelector('.layer-lock-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLayerLock(layer.id);
    });
    
    // Delete layer
    item.querySelector('.layer-del-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLayer(layer.id);
    });
    
    // Drag-and-drop to reorder layers
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      layersDragData = { type: 'layer', layerId: layer.id, fromIndex: index };
      layersDragEl = item;
      setTimeout(() => { item.style.opacity = '0.4'; }, 0);
    });
    
    item.addEventListener('dragend', () => {
      item.style.opacity = '';
      layersDragEl = null;
      document.querySelectorAll('.layer-item').forEach(el => {
        el.classList.remove('drag-over-top', 'drag-over-bottom');
      });
    });
    
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!layersDragData || layersDragData.type !== 'layer') return;
      e.dataTransfer.dropEffect = 'move';
    });
    
    item.addEventListener('dragleave', (e) => {
      if (e.target === item && item.contains(e.relatedTarget)) return;
      item.classList.remove('drag-over-top', 'drag-over-bottom');
    });
    
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!layersDragData || layersDragData.type !== 'layer') return;
      
      const fromLayerId = layersDragData.layerId;
      if (!fromLayerId || fromLayerId === layer.id) return;
      
      const fromIndex = state.page.layers.findIndex(l => l.id === fromLayerId);
      const toIndex = index;
      if (fromIndex === -1) return;
      
      let finalIndex = toIndex;
      const rect = item.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY >= midY) {
        finalIndex = toIndex + 1;
      }
      
      if (finalIndex !== fromIndex && finalIndex >= 0 && finalIndex <= state.page.layers.length) {
        reorderLayersByIndex(fromIndex, finalIndex);
      }
    });
    
    list.appendChild(item);
  });
}

function getObjectLabel(key) {
  const labels = {
    'phone': 'Phone',
    'avatar': 'Avatar',
    'name': 'Name',
    'bio': 'Bio',
    'link-0': 'Link 1',
    'link-1': 'Link 2',
    'link-2': 'Link 3',
    'link-3': 'Link 4',
    'link-4': 'Link 5'
  };
  if (key.startsWith('obj-')) return 'Object';
  return labels[key] || key;
}

function getObjectIcon(key) {
  const icons = {
    'phone': '📱',
    'avatar': '👤',
    'name': 'T',
    'bio': '📝',
    'link-0': '🔗',
    'link-1': '🔗',
    'link-2': '🔗',
    'link-3': '🔗',
    'link-4': '🔗'
  };
  if (key.startsWith('obj-')) return '🖼';
  return icons[key] || '●';
}

function selectLayer(layerId) {
  state.page.activeLayer = layerId;
  renderLayersList();
  showToast(`Layer "${state.page.layers.find(l => l.id === layerId)?.name}" selected`);
}

function addLayer() {
  pushHistory();
  const usedNums = state.page.layers
    .map(l => {
      const m = l.id.match(/^layer-(\d+)$/);
      return m ? parseInt(m[1]) : 0;
    })
    .filter(n => n > 0)
    .sort((a, b) => a - b);

  let nextNum = 1;
  for (let i = 0; i < usedNums.length; i++) {
    if (usedNums[i] !== i + 1) { nextNum = i + 1; break; }
    nextNum = i + 2;
  }
  state.page.layerCounter = nextNum;
  const newLayer = {
    id: `layer-${nextNum}`,
    name: `Layer ${nextNum}`,
    objects: []
  };
  state.page.layers.push(newLayer);
  renderLayersList();
}

function deleteLayer(layerId) {
  if (state.page.layers.length <= 1) {
    showToast('Cannot delete the last layer');
    return;
  }
  pushHistory();
  state.page.layers = state.page.layers.filter(l => l.id !== layerId);
  renderLayersList();
}

function reorderLayersByIndex(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;
  if (fromIndex < 0 || toIndex < 0) return;
  if (fromIndex >= state.page.layers.length || toIndex >= state.page.layers.length) return;
  pushHistory();
  const layer = state.page.layers.splice(fromIndex, 1)[0];
  state.page.layers.splice(toIndex, 0, layer);
  renderLayersList();
  applyLayerZIndex();
  showToast(`Layer moved`);
}

function reorderLayers(fromId, toId) {
  pushHistory();
  const fromIndex = state.page.layers.findIndex(l => l.id === fromId);
  const toIndex = state.page.layers.findIndex(l => l.id === toId);
  if (fromIndex === -1 || toIndex === -1) return;
  
  const [layer] = state.page.layers.splice(fromIndex, 1);
  state.page.layers.splice(toIndex, 0, layer);
  renderLayersList();
  applyLayerZIndex();
}

function getTopLayer() {
  if (!state.page.layers || state.page.layers.length === 0) {
    return null;
  }
  return state.page.layers[state.page.layers.length - 1];
}

function assignObjectToLayer(objectKey, layerId) {
  const layer = state.page.layers.find(l => l.id === layerId);
  if (!layer) return;
  
  // Remove from all other layers
  state.page.layers.forEach(l => {
    l.objects = l.objects.filter(k => k !== objectKey);
  });
  
  // Add to target layer
  if (!layer.objects.includes(objectKey)) {
    layer.objects.push(objectKey);
  }
}

function removeObjectFromLayers(objectKey) {
  state.page.layers.forEach(l => {
    l.objects = l.objects.filter(k => k !== objectKey);
  });
}

function toggleLayerVisibility(layerId) {
  const layer = state.page.layers.find(l => l.id === layerId);
  if (!layer) return;
  pushHistory();
  layer.hidden = !layer.hidden;
  renderLayersList();
  applyLayerVisibility();
  showToast(layer.hidden ? `Layer "${layer.name}" hidden` : `Layer "${layer.name}" shown`);
}

function toggleLayerLock(layerId) {
  const layer = state.page.layers.find(l => l.id === layerId);
  if (!layer) return;
  pushHistory();
  layer.locked = !layer.locked;
  renderLayersList();
  showToast(layer.locked ? `Layer "${layer.name}" locked` : `Layer "${layer.name}" unlocked`);
}

function isObjectInHiddenLayer(objectKey) {
  for (const layer of state.page.layers) {
    if (layer.objects.includes(objectKey)) {
      return layer.hidden;
    }
  }
  return false;
}

function applyLayerVisibility() {
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner) return;
  
  stageInner.querySelectorAll('[data-editable]').forEach(el => {
    const key = el.dataset.editable;
    if (!key) return;
    if (isCoreElement(key)) return;
    const hidden = isObjectInHiddenLayer(key);
    el.style.display = hidden ? 'none' : '';
  });
  
  const phone = document.getElementById('preview-frame');
  if (phone && isObjectInHiddenLayer('phone')) {
    phone.style.display = 'none';
  }
}

function applyLayerZIndex() {
  const stageInner = document.getElementById('preview-stage-inner');
  if (!stageInner) return;
  
  if (!state.page.layers || !Array.isArray(state.page.layers)) {
    state.page.layers = [
      { id: 'layer-0', name: 'Main Layer', objects: ['phone', 'avatar', 'name', 'bio', 'link-0', 'link-1', 'link-2', 'link-3', 'link-4'] }
    ];
  }
  
  state.page.layers.forEach((layer, layerIndex) => {
    const zBase = (state.page.layers.length - 1 - layerIndex) * 10;
    layer.objects.forEach((objKey, objIndex) => {
      if (isCoreElement(objKey)) return;
      const el = stageInner.querySelector(`[data-editable="${objKey}"]`);
      if (el) {
        el.style.zIndex = zBase + objIndex;
      }
    });
    
    if (layer.objects.includes('phone')) {
      const phone = document.getElementById('preview-frame');
      if (phone) phone.style.zIndex = zBase;
    }
  });
  
  CORE_ELEMENTS.forEach((key, i) => {
    const el = stageInner.querySelector(`[data-editable="${key}"]`);
    if (el) el.style.zIndex = CORE_Z_INDEX + i;
  });
  
      if (state.page.links && state.page.links.length) {
    state.page.links.forEach((_, i) => {
      const el = stageInner.querySelector(`[data-editable="link-${i}"]`);
      if (el) el.style.zIndex = CORE_Z_INDEX + 10 + i;
    });
  }
}

function applyPublicLayerZIndex() {
  const inner = document.querySelector('.public-stage-inner');
  if (!inner) return;

  if (!state.page.layers || !Array.isArray(state.page.layers)) {
    state.page.layers = [
      { id: 'layer-0', name: 'Main Layer', objects: ['phone', 'avatar', 'name', 'bio', 'link-0', 'link-1', 'link-2', 'link-3', 'link-4'] }
    ];
  }

  state.page.layers.forEach((layer, layerIndex) => {
    const zBase = (state.page.layers.length - 1 - layerIndex) * 10;
    layer.objects.forEach((objKey, objIndex) => {
      if (isCoreElement(objKey)) return;
      const el = inner.querySelector(`[data-public="${objKey}"]`);
      if (el) {
        el.style.zIndex = zBase + objIndex;
      }
    });
  });
}

/* ================================================
   INIT
   ================================================ */
function init() {
  if (_initRan) return;
  _initRan = true;
  console.log('init called, __PAGE_DATA__:', !!window.__PAGE_DATA__, '__PUBLIC_USER__:', window.__PUBLIC_USER__);
  
  // If this is a public page (has page data), handle it immediately
  if (window.__PAGE_DATA__) {
    console.log('Public page detected, initializing...');
    setupGlobalActions();
    setupClickToEnterOverlay();
    setupCursorTrail();
    setupHistoryRouting();
    return;
  }
  
  initSmartGuides();
  setupLayers();
  setupHistoryRouting();
  setupGlobalActions();
  setupAuth();
  setupDiscord();
  setupWidgets();
  setupSpotifyWidget();
  setupBuilderNav();
  setupAvatarUpload();
  setupClickToEnter();
  setupMusicUpload();
  setupMusicDemoControls();
  setupLinks();
  setupBackground();
  setupBackgroundOpacityControls();
  setupBackgroundImageUploads();
  setupButtonStyles();
  setupAccentColors();
  setupTextOptions();
  setupAddFonts();
  setupCursorUpload();
  setupProfileInputs();
  setupClickToEnter();
  setupClickToEnterOverlay();
  setupTilt3DProfileToggle();
  setupPreviewTools();
  setupPreviewPanZoom();
  setupPreviewEditor();
  setupLinkContextMenu();
  setupPhoneBackgroundContextMenu();
  setupPhoneContextMenu();
  setupAddObjectMenu();
  setupPromptModal();
  setupCursorTrail();
  setupPublicPageResponsiveScale();
  setupKeyboard();
  setupKeyboardShortcuts();

  renderLinksList();

  if (window.__PUBLIC_USER__) {
    return;
  }

  if (window.__INITIAL_PATH__) {
    return;
  }

checkSession().then(isLoggedIn => {
    updateLandingButtons();
    if (isLoggedIn) {
      updatePreview();
      // Sync 3D Tilt profile toggle after session check
      console.log('[Tilt3D Profile] After checkSession, calling sync');
      if (window.syncTilt3DProfileToggle) {
        window.syncTilt3DProfileToggle();
      }
    }
    syncAllUploadUI();
  });

  function syncAllUploadUI() {
    const avatarTitle = document.getElementById('avatar-upload-title');
    const avatarDel = document.getElementById('delete-avatar-btn');
    if (avatarTitle) avatarTitle.textContent = state.page.avatar ? 'Change avatar' : 'Upload image or GIF';
    if (avatarDel) avatarDel.style.display = state.page.avatar ? '' : 'none';

    const musicTitle = document.getElementById('music-upload-title');
    const musicDel = document.getElementById('delete-music-btn');
    if (musicTitle) musicTitle.textContent = (state.page.music && state.page.music.src) ? 'Change music' : '+ Add music';
    if (musicDel) musicDel.style.display = (state.page.music && state.page.music.src) ? '' : 'none';

    const bgGlobalTitle = document.getElementById('bg-global-upload-title');
    const bgGlobalDel = document.getElementById('delete-global-bg-btn');
    if (bgGlobalTitle) bgGlobalTitle.textContent = state.page.bgImageGlobal ? 'Change page bg' : '+ Page background';
    if (bgGlobalDel) bgGlobalDel.style.display = state.page.bgImageGlobal ? '' : 'none';

    const bgPhoneTitle = document.getElementById('bg-phone-upload-title');
    const bgPhoneDel = document.getElementById('delete-phone-bg-btn');
    if (bgPhoneTitle) bgPhoneTitle.textContent = state.page.bgImagePhone ? 'Change phone bg' : '+ Phone background';
    if (bgPhoneDel) bgPhoneDel.style.display = state.page.bgImagePhone ? '' : 'none';

    const frameTitle = document.getElementById('phone-frame-upload-title');
    const frameDel = document.getElementById('delete-frame-btn');
    if (frameTitle) frameTitle.textContent = state.page.phoneFrameImage ? 'Change frame' : '+ Change frame';
    if (frameDel) frameDel.style.display = state.page.phoneFrameImage ? '' : 'none';

    const cursorTitle = document.getElementById('cursor-upload-title');
    const cursorDel = document.getElementById('delete-cursor-btn');
    if (cursorTitle) cursorTitle.textContent = state.page.cursorImage ? 'Change cursor' : '+ Upload cursor';
    if (cursorDel) cursorDel.style.display = state.page.cursorImage ? '' : 'none';
    
    if (window.syncTilt3DProfileToggle) window.syncTilt3DProfileToggle();
  }

  syncAllUploadUI();

  // If not a public page and not logged in, show landing buttons
  if (!window.__PUBLIC_USER__) {
    var btnSignup = document.getElementById('btn-signup');
    var btnLogin = document.getElementById('btn-login');
    if (btnSignup) btnSignup.addEventListener('click', function() {
      setAuthMode('signup');
      showScreen('auth', { payload: { authMode: 'signup' } });
    });
    if (btnLogin) btnLogin.addEventListener('click', function() {
      setAuthMode('login');
      showScreen('auth', { payload: { authMode: 'login' } });
    });
  }
}

function updateLandingButtons() {
  const guestCta = document.getElementById('landing-cta-guest');
  const userCta = document.getElementById('landing-cta-user');
  if (!guestCta || !userCta) return;
  
  if (authToken && state.currentUser) {
    guestCta.style.display = 'none';
    userCta.style.display = 'flex';
  } else {
    guestCta.style.display = 'flex';
    userCta.style.display = 'none';
  }
}

document.addEventListener('click', function(e) {
  if (e.target.id === 'btn-toggle-leaderboard' || e.target.closest('#btn-toggle-leaderboard')) {
    const btn = document.getElementById('btn-toggle-leaderboard');
    const section = document.getElementById('users-pages-section');
    if (!section || !btn) return;
    const isOpen = section.style.display !== 'none';
    if (isOpen) {
      section.style.display = 'none';
      btn.textContent = 'Leaderboard ▸';
    } else {
      section.style.display = 'block';
      btn.textContent = 'Leaderboard ▾';
      const list = document.getElementById('vz-list');
      if (list && !list.children.length) loadUsersPages(window.__LB_RANGE__ || 'all');
    }
  }

  const filterBtn = e.target.closest('.lb-filter-btn');
  if (filterBtn) {
    const range = filterBtn.dataset.range;
    window.__LB_RANGE__ = range;
    document.querySelectorAll('.lb-filter-btn').forEach(b => b.classList.remove('lb-filter-btn--active'));
    filterBtn.classList.add('lb-filter-btn--active');
    loadUsersPages(range);
  }
});

async function loadUsersPages(range = 'all') {
  const list = document.getElementById('vz-list');
  const emptyMsg = document.getElementById('users-empty');
  const errorMsg = document.getElementById('users-error');
  const section = document.getElementById('users-pages-section');
  if (!list) return;
  
  try {
    const res = await fetch('/api/list-users?range=' + range);
    const data = await res.json();
    
    if (data.users && data.users.length > 0) {
      if (emptyMsg) emptyMsg.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';
      
      const medals = ['01', '02', '03'];
      const maxViews = data.users[0] ? data.users[0].views : 1;
      
      function fmt(n) {
        if (!n || n <= 0) return '0';
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
        return n.toString();
      }
      
      function getInitials(name) {
        if (!name) return '??';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
          return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.length >= 2 ? name.substring(0, 2).toUpperCase() : name[0].toUpperCase() + '?';
      }
      
      list.innerHTML = '';
      
      const colors = {
        surface: '#111111',
        surface2: '#1a1a1a',
        border: 'rgba(255,255,255,0.07)',
        border12: 'rgba(255,255,255,0.12)',
        border22: 'rgba(255,255,255,0.22)',
        accent: '#d6d6d6',
        muted: '#888888',
        text: '#f0f0f0',
        surface3: '#222222'
      };
      
      data.users.forEach((user, i) => {
        const rank = i + 1;
        const barPct = maxViews > 0 ? Math.round((user.views / maxViews) * 100) : 0;
        const rankLabel = rank <= 3 ? medals[i] : String(rank).padStart(2, '0');
        const initials = getInitials(user.displayName);
        const avatarContent = user.avatar && user.avatar !== '/default_pfp.png'
          ? `<img src="${user.avatar}" alt="${escapeHtml(user.displayName)}" style="width:100%;height:100%;object-fit:cover;" />`
          : `<img src="/default_pfp.png" alt="${escapeHtml(user.displayName)}" style="width:100%;height:100%;object-fit:cover;" />`;
        
const medalColors = [
          { bg: '#e8a800', glow: 'rgba(255,215,0,0.6)', text: '#ffffff', shadow: 'rgba(255,200,0,0.5)' },
          { bg: '#b0b8bd', glow: 'rgba(192,192,192,0.6)', text: '#ffffff', shadow: 'rgba(200,200,210,0.4)' },
          { bg: '#a06830', glow: 'rgba(180,100,40,0.6)', text: '#ffffff', shadow: 'rgba(200,130,60,0.4)' }
        ];

        let rowBg = colors.surface;
        let rowBorder = colors.border;
        let barOpacity = '0.45';
        let avatarBorder = '1px solid rgba(255,255,255,0.14)';
        let avatarShadow = '';
        let rankColor = colors.muted;
        let rankBg = 'transparent';
        let rankTextShadow = '';
        let showShimmer = false;
        
        if (rank === 1) { rowBg = '#131008'; rowBorder = 'rgba(255,215,0,0.35)'; barOpacity = '1'; avatarBorder = '2px solid rgba(255,215,0,0.65)'; avatarShadow = 'box-shadow:0 0 20px rgba(255,215,0,0.25)'; const m = medalColors[0]; rankColor = m.text; rankBg = m.bg; rankTextShadow = 'text-shadow:0 1px 3px rgba(180,140,0,0.8), 0 0 16px rgba(255,215,0,1)'; showShimmer = true; }
        else if (rank === 2) { rowBg = '#0e0f12'; rowBorder = 'rgba(192,192,192,0.3)'; barOpacity = '0.8'; const m = medalColors[1]; rankColor = m.text; rankBg = m.bg; rankTextShadow = 'text-shadow:0 1px 3px rgba(100,100,110,0.8), 0 0 14px rgba(220,220,230,1)'; showShimmer = true; }
        else if (rank === 3) { rowBg = '#110e09'; rowBorder = 'rgba(180,100,40,0.3)'; const m = medalColors[2]; rankColor = m.text; rankBg = m.bg; rankTextShadow = 'text-shadow:0 1px 3px rgba(140,80,20,0.8), 0 0 14px rgba(220,150,60,1)'; showShimmer = true; }
        
        if (rank === 4) {
          const sep = document.createElement('div');
          sep.style.cssText = 'height:1px;background:rgba(255,255,255,0.07);margin:4px 0;flex-shrink:0;';
          list.appendChild(sep);
        }
        
        const rowClass = rank === 1 ? 'vz-list-row-gold' : rank === 2 ? 'vz-list-row-silver' : rank === 3 ? 'vz-list-row-bronze' : '';
        const row = document.createElement('a');
        row.href = '/' + user.username;
        row.className = rowClass;
        row.style.cssText = `display:flex;align-items:center;gap:12px;${rank===1||rank===2||rank===3?'':('background:'+rowBg+';')}border:1px solid ${rowBorder};border-radius:14px;padding:11px 14px;text-decoration:none;transition:border-color 0.2s,background 0.2s,transform 0.18s;box-sizing:border-box;animation:row-in 0.4s ease both;animation-delay:${i * 0.05}s;`;
        const shimmerStyle = showShimmer ? `background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,0.55) 50%,transparent 80%);background-size:200% 100%;animation:leaderboard-shimmer 2s linear infinite;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;` : '';
        const rankEl = showShimmer
          ? `<div style="min-width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${rankBg};border-radius:6px;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:${rankColor};${rankTextShadow};${shimmerStyle}">${rankLabel}</div>`
          : `<div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:${rankColor};min-width:20px;text-align:center;letter-spacing:0.04em;flex-shrink:0;">${rankLabel}</div>`;
        row.innerHTML = `
          ${rankEl}
          <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;border:${avatarBorder};background:${colors.surface3};color:${colors.accent};overflow:hidden;${avatarShadow}">${avatarContent}</div>
          <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
            <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:${colors.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-0.01em;">${escapeHtml(user.displayName)}</div>
            <span style="display:block;font-size:11px;color:${colors.muted};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">seya.lol/${escapeHtml(user.username)}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
            <div style="width:52px;height:2px;background:${colors.surface3};border-radius:1px;overflow:hidden;">
              <div style="height:100%;border-radius:1px;background:${colors.accent};opacity:${barOpacity};transition:width 1s;width:0%;" class="vz-bar" data-pct="${barPct}"></div>
            </div>
            <div>
              <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:${colors.text};min-width:48px;text-align:right;letter-spacing:-0.02em;">${fmt(user.views)}</div>
              <span style="font-size:9px;color:${colors.muted};display:block;text-align:right;letter-spacing:0.06em;text-transform:uppercase;margin-top:1px;">views</span>
            </div>
          </div>
        `;
        list.appendChild(row);
      });

      const count = data.users.length;
      if (count < 30) {
        for (let emptyRank = count + 1; emptyRank <= 30; emptyRank++) {
          const rankLabel = String(emptyRank).padStart(2, '0');
          const placeHolder = document.createElement('div');
          placeHolder.style.cssText = `display:flex;align-items:center;gap:12px;background:${colors.surface};border:1px solid ${colors.border};border-radius:14px;padding:11px 14px;text-decoration:none;box-sizing:border-box;opacity:0.35;`;
          placeHolder.innerHTML = `
            <div style="font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:${colors.muted};min-width:20px;text-align:center;letter-spacing:0.04em;flex-shrink:0;">${rankLabel}</div>
            <div style="width:36px;height:36px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;border:1px solid ${colors.border};background:${colors.surface3};color:${colors.muted};">?</div>
            <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;">
              <div style="font-family:'Syne',sans-serif;font-size:13px;font-weight:700;color:${colors.text};">Empty spot</div>
              <span style="display:block;font-size:11px;color:${colors.muted};">seya.lol/---</span>
            </div>
            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
              <div style="width:52px;height:2px;background:${colors.surface3};border-radius:1px;overflow:hidden;">
                <div style="height:100%;border-radius:1px;background:${colors.accent};opacity:0.2;"></div>
              </div>
              <div>
                <div style="font-family:'Syne',sans-serif;font-size:14px;font-weight:700;color:${colors.text};min-width:48px;text-align:right;letter-spacing:-0.02em;">—</div>
                <span style="font-size:9px;color:${colors.muted};display:block;text-align:right;letter-spacing:0.06em;text-transform:uppercase;margin-top:1px;">views</span>
              </div>
            </div>
          `;
          list.appendChild(placeHolder);
        }
      }
      
      setTimeout(() => {
        list.querySelectorAll('.vz-bar').forEach(b => {
          b.style.width = b.dataset.pct + '%';
        });
      }, 150);
      
      if (section) section.style.display = 'block';
    } else {
      if (emptyMsg) emptyMsg.style.display = 'block';
      if (errorMsg) errorMsg.style.display = 'none';
      list.innerHTML = '';
    }
  } catch (e) {
    console.error('Failed to load users pages:', e);
    if (errorMsg) errorMsg.style.display = 'block';
    if (emptyMsg) emptyMsg.style.display = 'none';
    list.innerHTML = '';
  }
}

/* ================================================
   ANALYTICS
   ================================================ */
let analyticsPeriod = '7d';
let analyticsData = null;
let analyticsLoaded = false;

function toggleAnalyticsPanel() {
  const panel = document.getElementById('analytics-panel');
  if (!panel) {
    console.log('Analytics panel not found');
    return;
  }
  
  console.log('toggleAnalyticsPanel, has hidden class:', panel.classList.contains('hidden'));
  
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    if (!analyticsLoaded) {
      loadAnalytics();
      analyticsLoaded = true;
    }
  } else {
    panel.classList.add('hidden');
  }
}

async function loadAnalytics() {
  console.log('loadAnalytics called, authToken:', authToken ? authToken.substring(0, 20) + '...' : 'null');
  
  if (!authToken) {
    showToast('Please log in first');
    return;
  }

  try {
    const res = await fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ period: analyticsPeriod })
    });
    console.log('Analytics response status:', res.status);
    const data = await res.json();
    console.log('Analytics response:', data);
    analyticsData = data;
    updateAnalyticsUI();
  } catch (e) {
    console.error('Failed to load analytics:', e);
  }
}

function updateAnalyticsUI() {
  console.log('updateAnalyticsUI called, data:', analyticsData);
  if (!analyticsData || analyticsData.error) {
    console.error('Analytics error:', analyticsData?.error);
    return;
  }

  const statTotal = document.getElementById('stat-total');
  if (!statTotal) return;

  statTotal.textContent = formatNumber(analyticsData.totalViews || 0);
  document.getElementById('stat-avg').textContent = formatNumber(analyticsData.avgDaily || 0);
  document.getElementById('stat-best').textContent = formatNumber(analyticsData.bestDay || 0);
  document.getElementById('stat-best-date').textContent = analyticsData.bestDayDate || '—';
  document.getElementById('stat-visitors').textContent = formatNumber(analyticsData.totalVisitors || 0);

  drawAnalyticsChart(analyticsData.chart || []);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function drawAnalyticsChart(data) {
  const canvas = document.getElementById('analytics-chart-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  ctx.scale(2, 2);

  const width = rect.width;
  const height = rect.height;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  ctx.clearRect(0, 0, width, height);

  if (!data || data.length === 0) {
    ctx.fillStyle = '#888';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data available', width / 2, height / 2);
    return;
  }

  const maxValue = Math.max(...data.map(d => d.views), 1);
  const minValue = 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(width - padding.right, y);
    ctx.stroke();
  }

  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = maxValue - (maxValue / 4) * i;
    const y = padding.top + (chartHeight / 4) * i;
    ctx.fillText(formatNumber(Math.round(value)), padding.left - 8, y + 4);
  }

  const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
  gradient.addColorStop(0, 'rgba(214,214,214,0.3)');
  gradient.addColorStop(1, 'rgba(214,214,214,0)');

  ctx.beginPath();
  ctx.moveTo(padding.left, height - padding.bottom);

  data.forEach((d, i) => {
    const x = padding.left + (chartWidth / (data.length - 1 || 1)) * i;
    const y = padding.top + chartHeight - ((d.views - minValue) / (maxValue - minValue)) * chartHeight;
    if (i === 0) ctx.lineTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.strokeStyle = '#d6d6d6';
  ctx.lineWidth = 2;

  data.forEach((d, i) => {
    const x = padding.left + (chartWidth / (data.length - 1 || 1)) * i;
    const y = padding.top + chartHeight - ((d.views - minValue) / (maxValue - minValue)) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#d6d6d6';
  data.forEach((d, i) => {
    const x = padding.left + (chartWidth / (data.length - 1 || 1)) * i;
    const y = padding.top + chartHeight - ((d.views - minValue) / (maxValue - minValue)) * chartHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#888';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  
  const step = data.length > 14 ? Math.ceil(data.length / 7) : 1;
  data.forEach((d, i) => {
    if (i % step === 0 || i === data.length - 1 || i === 0) {
      const x = padding.left + (chartWidth / (data.length - 1 || 1)) * i;
      const label = d.dateDisplay || `${i + 1}`;
      ctx.fillText(label, x, height - 8);
    }
  });
}

function setupAnalyticsPeriodTabs() {
  document.querySelectorAll('.period-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      analyticsPeriod = tab.dataset.period;
      loadAnalytics();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupAnalyticsPeriodTabs();
});

document.addEventListener('DOMContentLoaded', init);
