// ═══ LinkBase – Main App ═══
'use strict';

// ── PWA Install ──
let deferredInstall = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstall = e;
});

// ── State ──
let state = {
  links: [], collections: [],
  view: 'all',       // all | favorites | col:<id>
  sort: 'newest',
  layout: 'grid',
  query: '',
  editId: null,
  deleteId: null
};




// ── Helpers ──
const $  = id => document.getElementById(id);
const qs = sel => document.querySelector(sel);

function toast(msg, type = 'info', dur = 3000) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  $('toasts').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(()=>el.remove(), 300); }, dur);
}

function openModal(id)  { $(id).classList.remove('hidden'); }
function closeModal(id) { $(id).classList.add('hidden'); }

function domain(url) {
  try { return new URL(url).hostname.replace('www.',''); } catch { return url; }
}
function faviconUrl(url) {
  try { const u = new URL(url); return `https://www.google.com/s2/favicons?sz=32&domain=${u.hostname}`; } catch { return ''; }
}
function isYoutube(url) { return /youtube\.com|youtu\.be/.test(url); }
function ytThumb(url) {
  const m = url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?]+)/);
  return m ? `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg` : '';
}
function isImage(url) { return /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?.*)?$/i.test(url); }

// ── Fetch meta ──
async function fetchMeta(url) {
  try {
    const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
    const j = await r.json();
    const dp = new DOMParser();
    const doc = dp.parseFromString(j.contents, 'text/html');
    const title = doc.querySelector('meta[property="og:title"]')?.content
      || doc.querySelector('title')?.textContent || '';
    const desc = doc.querySelector('meta[property="og:description"]')?.content
      || doc.querySelector('meta[name="description"]')?.content || '';
    const img = doc.querySelector('meta[property="og:image"]')?.content || '';
    return { title: title.trim(), description: desc.trim(), image: img };
  } catch { return {}; }
}

// ── Render helpers ──
function cardThumb(link) {
  if (isYoutube(link.url)) {
    const t = link.image || ytThumb(link.url);
    return `<div class="card-thumb">
      <img src="${t}" alt="thumbnail" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove()"/>
      <div class="yt-badge"><svg viewBox="0 0 68 48" fill="none"><path d="M66.5 7.5s-.8-5.3-3.2-7.6c-3-3.2-6.5-3.2-8-3.4C46.2-4 34-4 34-4s-12.2 0-21.3.5c-1.5.2-5 .2-8 3.4C2.2 2.2 1.5 7.5 1.5 7.5S.7 13.7.7 20v5.9C.7 32 1.5 38.1 1.5 38.1s.8 5.3 3.2 7.6c3 3.2 7 3.1 8.8 3.4C19.4 49.8 34 50 34 50s12.2 0 21.3-.5c1.5-.2 5-.2 8-3.4 2.4-2.3 3.2-7.6 3.2-7.6S67.3 32 67.3 26v-5.9C67.3 13.7 66.5 7.5 66.5 7.5z" fill="#f00"/><path d="M27 35l18-10.5L27 14v21z" fill="white"/></svg></div>
    </div>`;
  }
  if (link.image) {
    return `<div class="card-thumb">
      <img src="${link.image}" alt="preview" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove()"/>
    </div>`;
  }
  if (isImage(link.url)) {
    return `<div class="card-thumb">
      <img src="${link.url}" alt="image" loading="lazy" onerror="this.parentElement.classList.add('no-img');this.remove()"/>
    </div>`;
  }
  const fav = faviconUrl(link.url);
  return `<div class="card-thumb no-img">
    ${fav ? `<img class="site-ico" src="${fav}" alt="icon" onerror="this.remove()"/>` : `<span class="fallback-ico">🔗</span>`}
  </div>`;
}

function renderCard(link) {
  const tags = (link.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');
  const badgeFav  = link.favorite ? '<span class="mini-badge fav">Fav</span>' : '';
  const col = state.collections.find(c => c.id === link.collection);
  const siteLabel = col ? col.name : domain(link.url);

  const el = document.createElement('div');
  el.className = 'card';
  el.setAttribute('role','listitem');
  el.dataset.id = link.id;
  el.innerHTML = `
    ${cardThumb(link)}
    <div class="card-body">
      <div class="card-site">
        ${!col ? `<img src="${faviconUrl(link.url)}" width="14" height="14" alt="" onerror="this.remove()"/>` : ''}
        <span>${siteLabel}</span>
      </div>
      <div class="card-title"><a href="${link.url}" target="_blank" rel="noopener">${link.title||link.url}</a></div>
      ${link.description ? `<div class="card-desc">${link.description}</div>` : ''}
      ${tags ? `<div class="card-tags">${tags}</div>` : ''}
      <div class="card-badges">${badgeFav}</div>
    </div>
    <div class="card-footer">
      <div class="card-actions">
        <button class="card-action fav-btn ${link.favorite?'fav-on':''}" data-id="${link.id}" title="${link.favorite?'Unfavorite':'Favorite'}">
          <svg viewBox="0 0 24 24" stroke="currentColor" fill="${link.favorite?'currentColor':'none'}" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
        <button class="card-action edit-btn" data-id="${link.id}" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="card-action del-btn" data-id="${link.id}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>
    </div>`;
  return el;
}

// ── Filter / sort links ──
function filterLinks(all) {
  let list = [...all];

  // View filter
  if (state.view === 'favorites') list = list.filter(l => l.favorite);
  else if (state.view.startsWith('col:')) {
    const colId = parseInt(state.view.replace('col:',''));
    list = list.filter(l => l.collection === colId);
  }

  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter(l =>
      (l.title||'').toLowerCase().includes(q) ||
      (l.url||'').toLowerCase().includes(q) ||
      (l.description||'').toLowerCase().includes(q) ||
      (l.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }

  // Sort
  list.sort((a,b) => {
    if (state.sort === 'newest') return b.createdAt - a.createdAt;
    if (state.sort === 'oldest') return a.createdAt - b.createdAt;
    const ta = (a.title||a.url||'').toLowerCase();
    const tb = (b.title||b.url||'').toLowerCase();
    if (state.sort === 'az') return ta < tb ? -1 : ta > tb ? 1 : 0;
    return ta > tb ? -1 : ta < tb ? 1 : 0;
  });
  return list;
}

// ── Render grid ──
async function renderGrid(overrideLinks) {
  const grid = $('grid');
  grid.innerHTML = '';

  const toShow = overrideLinks !== undefined ? overrideLinks : filterLinks(state.links);

  // Badges
  $('b-all').textContent  = state.links.length;
  $('b-fav').textContent  = state.links.filter(l=>l.favorite).length;

  if (!toShow.length) {
    $('empty').classList.remove('hidden');
    if (state.query) {
      $('empty-title').textContent = 'No results found';
      $('empty-msg').textContent   = 'Try different keywords.';
    } else {
      $('empty-title').textContent = 'No links here yet';
      $('empty-msg').innerHTML     = 'Click <strong>Add Link</strong> to get started.';
    }
    return;
  }
  $('empty').classList.add('hidden');

  const frag = document.createDocumentFragment();
  toShow.forEach(l => frag.appendChild(renderCard(l)));
  grid.appendChild(frag);
}

// ── Collections nav ──
function renderCollectionsNav() {
  const nav = $('col-nav');
  nav.innerHTML = '';
  state.collections.forEach(col => {
    const btn = document.createElement('button');
    btn.className = 'nav-btn';
    btn.dataset.view = `col:${col.id}`;
    if (state.view === `col:${col.id}`) btn.classList.add('active');
    const count = state.links.filter(l => l.collection === col.id).length;
    btn.innerHTML = `<span>${col.name}</span><em class="bdg">${count}</em>`;
    btn.addEventListener('click', () => setView(`col:${col.id}`));
    nav.appendChild(btn);
  });

  // Update collection selects
  const opts = state.collections.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  $('f-col').innerHTML = '<option value="">None</option>' + opts;
}

function setView(v) {
  state.view = v;
  // Update active nav
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.view === v);
  });
  // Title
  const titles = { all:'All Links', favorites:'Favorites' };
  if (titles[v]) {
    $('view-title').textContent = titles[v];
    $('view-sub').textContent = { all:'Your personal knowledge base', favorites:'Your starred links' }[v];
  } else if (v.startsWith('col:')) {
    const col = state.collections.find(c => c.id === parseInt(v.replace('col:','')));
    $('view-title').textContent = col ? col.name : 'Collection';
    $('view-sub').textContent   = 'Collection links';
  }
  renderGrid();
  // Mobile: close sidebar
  if (window.innerWidth < 769) closeSidebar();
}

// ── Sidebar ──
function openSidebar()  { $('sidebar').classList.add('open'); $('overlay').classList.remove('hidden'); setTimeout(()=>$('overlay').classList.add('show'),10); }
function closeSidebar() { $('sidebar').classList.remove('open'); $('overlay').classList.remove('show'); setTimeout(()=>$('overlay').classList.add('hidden'),200); }

// ── Load data ──
async function loadData() {
  [state.links, state.collections] = await Promise.all([DB.getAllLinks(), DB.getAllCollections()]);
  renderCollectionsNav();
  renderGrid();
}

// ── Open add/edit modal ──
function openLinkModal(link = null) {
  state.editId = link ? link.id : null;
  $('ml-title').textContent = link ? 'Edit Link' : 'Add New Link';
  $('f-url').value   = link?.url         || '';
  $('f-title').value = link?.title       || '';
  $('f-desc').value  = link?.description || '';
  $('f-tags').value  = (link?.tags||[]).join(', ');
  $('f-fav').checked  = link?.favorite   || false;
  $('f-col').value   = link?.collection  || '';
  $('preview-card').classList.add('hidden');
  if (link?.image || link?.url) showPreview({ image: link.image, title: link.title, url: link.url });
  openModal('m-link');
  setTimeout(() => $('f-url').focus(), 50);
}

function showPreview({ image, title, url }) {
  const thumb = $('prev-thumb');
  if (image) thumb.innerHTML = `<img src="${image}" alt="preview" onerror="this.remove()"/>`;
  else if (url && isImage(url)) thumb.innerHTML = `<img src="${url}" alt="img" onerror="this.remove()"/>`;
  else thumb.innerHTML = `<img src="${faviconUrl(url||'')}" style="width:32px;height:32px" alt="" onerror="this.remove()"/>`;
  $('prev-site').textContent  = domain(url||'');
  $('prev-title').textContent = title || url || '';
  $('preview-card').classList.remove('hidden');
}

// ── Save link ──
async function saveLink() {
  const url = $('f-url').value.trim();
  if (!url) { toast('Please enter a URL', 'error'); return; }
  const tags = $('f-tags').value.split(',').map(t=>t.trim()).filter(Boolean);
  const data = {
    url,
    title:       $('f-title').value.trim() || domain(url),
    description: $('f-desc').value.trim(),
    tags,
    collection:  $('f-col').value ? parseInt($('f-col').value) : null,
    favorite:    $('f-fav').checked,
    image:       $('prev-thumb').querySelector('img')?.src || '',
  };
  if (state.editId) {
    const existing = await DB.getLink(state.editId);
    await DB.updateLink({ ...existing, ...data });
    toast('Link updated', 'success');
  } else {
    await DB.addLink(data);
    toast('Link saved!', 'success');
  }
  closeModal('m-link');
  await loadData();
}

// ── Delete ──
function confirmDelete(id, title) {
  state.deleteId = id;
  $('del-name').textContent = title || 'this link';
  openModal('m-del');
}
async function doDelete() {
  if (!state.deleteId) return;
  await DB.deleteLink(state.deleteId);
  state.deleteId = null;
  closeModal('m-del');
  toast('Link deleted', 'info');
  await loadData();
}

// ── Collections ──
async function saveCollection() {
  const name = $('c-name').value.trim();
  if (!name) { toast('Enter a collection name', 'error'); return; }
  await DB.addCollection({ name });
  closeModal('m-col');
  $('c-name').value = '';
  toast(`Collection "${name}" created`, 'success');
  await loadData();
}


// ── Search ──
let searchTimer;
async function handleSearch(q) {
  state.query = q;
  renderGrid();
}

// ── Voice search ──
function startVoiceSearch() {
  if (!Voice.supported) { toast('Voice not supported in this browser', 'error'); return; }
  $('voice-banner').classList.remove('hidden');
  $('btn-voice').classList.add('active');
  Voice.start({
    lang: 'en-US',
    onResult({ final, interim }) {
      $('search-inp').value = final || interim;
      $('v-label').textContent = final || interim || 'Listening…';
      if (final) { handleSearch(final); stopVoice(); }
    },
    onEnd: stopVoice,
  });
}
function stopVoice() {
  Voice.stop();
  $('voice-banner').classList.add('hidden');
  $('btn-voice').classList.remove('active');
}

// ── Voice dictate (fields) ──
let activeDictateBtn = null;
function startDictate(inputId, btnId) {
  if (!Voice.supported) { toast('Voice not supported in this browser', 'error'); return; }
  const btn = $(btnId);
  const input = $(inputId);

  if (activeDictateBtn) {
    Voice.stop();
    if (activeDictateBtn === btn) {
      activeDictateBtn = null;
      return;
    }
  }

  activeDictateBtn = btn;
  btn.classList.add('active');

  Voice.start({
    lang: 'en-US',
    onResult({ final, interim }) {
      input.value = final || interim;
    },
    onEnd() {
      btn.classList.remove('active');
      if (activeDictateBtn === btn) activeDictateBtn = null;
    }
  });
}

// ── Theme ──
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next    = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('lb-theme', next);
  updateThemeBtn(next);
}
function updateThemeBtn(theme) {
  $('theme-lbl').textContent = theme === 'dark' ? 'Light' : 'Dark';
  $('theme-ico').innerHTML = theme === 'dark'
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
}

// ── Wire Events ──
function wireEvents() {
  // Sidebar
  $('btn-open-sb').addEventListener('click', openSidebar);
  $('btn-close-sb').addEventListener('click', closeSidebar);
  $('overlay').addEventListener('click', closeSidebar);

  // Nav items (static)
  document.querySelectorAll('[data-view]').forEach(b => {
    b.addEventListener('click', e => {
      const v = e.currentTarget.dataset.view;
      if (v) setView(v);
    });
  });

  // Add link
  $('btn-add').addEventListener('click', () => openLinkModal());

  // Save link
  $('btn-save').addEventListener('click', saveLink);

  // Fetch meta
  $('btn-fetch').addEventListener('click', async () => {
    const url = $('f-url').value.trim();
    if (!url) { toast('Enter a URL first', 'error'); return; }
    $('btn-fetch').textContent = '…';
    const meta = await fetchMeta(url);
    if (meta.title) $('f-title').value = meta.title;
    if (meta.description) $('f-desc').value = meta.description;
    showPreview({ ...meta, url });
    $('btn-fetch').textContent = 'Fetch';
  });

  // Delete confirm
  $('btn-del-confirm').addEventListener('click', doDelete);

  // New collection
  $('btn-new-col').addEventListener('click', () => { $('c-name').value=''; openModal('m-col'); });
  $('btn-save-col').addEventListener('click', saveCollection);



  // Close modals
  document.querySelectorAll('.cls-modal').forEach(b => {
    b.addEventListener('click', () => closeModal(b.dataset.m));
  });
  document.querySelectorAll('.backdrop').forEach(el => {
    el.addEventListener('click', e => { if (e.target === el) closeModal(el.id); });
  });

  // Search
  $('search-inp').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => handleSearch(e.target.value.trim()), 300);
  });

  // Voice search
  $('btn-voice').addEventListener('click', startVoiceSearch);
  $('btn-stop-v').addEventListener('click', stopVoice);

  // Dictation
  $('btn-dictate-title').addEventListener('click', () => startDictate('f-title', 'btn-dictate-title'));
  $('btn-dictate-desc').addEventListener('click', () => startDictate('f-desc', 'btn-dictate-desc'));



  // Grid / list toggle
  $('btn-gv').addEventListener('click', () => {
    state.layout = 'grid';
    $('grid').classList.remove('list-view');
    $('btn-gv').classList.add('is-active');
    $('btn-lv').classList.remove('is-active');
  });
  $('btn-lv').addEventListener('click', () => {
    state.layout = 'list';
    $('grid').classList.add('list-view');
    $('btn-lv').classList.add('is-active');
    $('btn-gv').classList.remove('is-active');
  });

  // Sort
  $('sort-sel').addEventListener('change', e => { state.sort = e.target.value; renderGrid(); });

  // Theme
  $('btn-theme').addEventListener('click', toggleTheme);

  // Export
  $('btn-json').addEventListener('click', () => Export.toJSON());
  $('btn-pdf').addEventListener('click',  () => Export.toPDF());

  // Card actions (delegated)
  $('grid').addEventListener('click', async e => {
    const favBtn  = e.target.closest('.fav-btn');
    const editBtn = e.target.closest('.edit-btn');
    const delBtn  = e.target.closest('.del-btn');

    if (favBtn) {
      const id   = parseInt(favBtn.dataset.id);
      const link = await DB.getLink(id);
      await DB.updateLink({ ...link, favorite: !link.favorite });
      await loadData();
    }
    if (editBtn) {
      const id   = parseInt(editBtn.dataset.id);
      const link = await DB.getLink(id);
      openLinkModal(link);
    }
    if (delBtn) {
      const id   = parseInt(delBtn.dataset.id);
      const link = await DB.getLink(id);
      confirmDelete(id, link?.title || link?.url);
    }
  });


}

// ── Install Prompt ──
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
}
function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

function showInstallPrompt() {
  if (isInStandaloneMode()) return; // already installed
  const prompt = $('install-prompt');

  if (isIOS()) {
    // iOS: show manual instructions
    $('ios-instructions').classList.remove('hidden');
    $('btn-install-yes').textContent = 'Got it!';
    $('btn-install-yes').addEventListener('click', () => prompt.classList.add('hidden'), { once: true });
  } else if (deferredInstall) {
    // Chrome/Android: native install
    $('btn-install-yes').addEventListener('click', async () => {
      prompt.classList.add('hidden');
      deferredInstall.prompt();
      const { outcome } = await deferredInstall.userChoice;
      deferredInstall = null;
      if (outcome === 'accepted') toast('LinkBase installed! 🎉', 'info');
    }, { once: true });
  } else {
    // Not installable (already installed or browser doesn't support)
    return;
  }

  // Only show if installable
  prompt.classList.remove('hidden');

  $('btn-install-no').addEventListener('click', () => {
    prompt.classList.add('hidden');
    sessionStorage.setItem('lb-install-dismissed', '1');
  }, { once: true });
}

// ── Init ──
async function init() {
  // Theme
  const saved = localStorage.getItem('lb-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeBtn(saved);

  // Service worker
  if ('serviceWorker' in navigator) {
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      navigator.serviceWorker.getRegistrations().then(regs => {
        for (let r of regs) r.unregister();
      }).catch(()=>{});
    } else {
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    }
  }

  // Show app immediately (no splash)
  await loadData();
  wireEvents();
  $('app').classList.remove('hidden');

  // Show install prompt shortly after load
  if (!sessionStorage.getItem('lb-install-dismissed')) {
    setTimeout(showInstallPrompt, 1200);
  }

}

init();
