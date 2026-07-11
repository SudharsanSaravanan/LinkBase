// ═══ Export: JSON + PDF ═══
const Export = {
  async toJSON() {
    const links = await DB.getAllLinks();
    const cols  = await DB.getAllCollections();
    const blob = new Blob([JSON.stringify({ links, collections: cols, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    _download(blob, `linkbase-backup-${_dateStr()}.json`);
  },

  async toPDF() {
    const links = await DB.getAllLinks();
    const cols  = await DB.getAllCollections();
    const colMap = Object.fromEntries(cols.map(c => [c.id, c]));
    const theme = document.documentElement.getAttribute('data-theme');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Inter,system-ui,sans-serif;background:#000000;color:#ffffff;padding:40px;font-size:14px}
  h1{font-size:2rem;font-weight:800;border-bottom:2px solid #ffffff;padding-bottom:10px;margin-bottom:6px}
  .meta{color:#cccccc;font-size:.85rem;margin-bottom:32px}
  .card{background:#000000;border:1px solid rgba(255,255,255,.2);border-radius:12px;padding:16px 20px;margin-bottom:14px;page-break-inside:avoid}
  .card-title{font-size:1rem;font-weight:700;margin-bottom:4px}
  .card-url{font-size:.8rem;color:#ffffff;text-decoration:underline;margin-bottom:8px;word-break:break-all}
  .card-desc{color:#cccccc;font-size:.85rem;line-height:1.5;margin-bottom:8px}
  .card-meta{display:flex;gap:10px;flex-wrap:wrap;font-size:.75rem;color:#888888}
  .tag{border:1px solid #ffffff;color:#ffffff;padding:2px 8px;border-radius:20px}
  @media print{body{background:white;color:black}.card{background:white;border-color:#000}.card-url{color:black}.card-desc,.card-meta{color:#333}.tag{border-color:#000;color:black}}
</style></head><body>
<h1>LinkBase Export</h1>
<p class="meta">${links.length} links · Exported ${new Date().toLocaleString()}</p>
${links.map(l => {
  const col = l.collection ? colMap[l.collection] : null;
  return `<div class="card">
    <div class="card-title">${_esc(l.title || 'Untitled')}</div>
    <div class="card-url">${_esc(l.url)}</div>
    ${l.description ? `<div class="card-desc">${_esc(l.description)}</div>` : ''}
    <div class="card-meta">
      ${col ? `<span>Collection: ${_esc(col.name)}</span>` : ''}
      ${(l.tags||[]).map(t=>`<span class="tag">${_esc(t)}</span>`).join('')}
      ${l.favorite ? '<span>Favorite</span>' : ''}
      <span>Created: ${new Date(l.createdAt).toLocaleDateString()}</span>
    </div>
  </div>`;
}).join('')}
</body></html>`;

    const w = window.open('','_blank');
    w.document.write(html);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  }
};

function _download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function _dateStr() {
  return new Date().toISOString().slice(0,10);
}
function _esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
