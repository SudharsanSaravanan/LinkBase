// ═══ Export: JSON + PDF ═══
const Export = {
  async toJSON() {
    const links = await DB.getAllLinks();
    const cols  = await DB.getAllCollections();
    const colMap = new Map(cols.map(c => [c.id, c.name]));
    
    // Map links to include collectionName
    const exportedLinks = links.map(l => {
      const copy = { ...l };
      if (copy.collection) {
        copy.collectionName = colMap.get(copy.collection) || null;
      } else {
        copy.collectionName = null;
      }
      return copy;
    });

    const blob = new Blob([JSON.stringify({ links: exportedLinks, collections: cols, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    _download(blob, `linkbase-backup-${_dateStr()}.json`);
  },

  async fromJSON(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!data || !Array.isArray(data.links)) {
        toast('Invalid JSON file format. Must contain a "links" array.', 'error');
        return;
      }

      let collectionsCount = 0;
      let linksCount = 0;
      let updatedCount = 0;
      
      // 1. Get current collections and links
      const localCols = await DB.getAllCollections();
      const localLinks = await DB.getAllLinks();
      
      // Create a map of name -> local ID
      const localColByName = new Map(localCols.map(c => [c.name.toLowerCase().trim(), c.id]));
      
      // Map of imported collection ID -> local collection ID
      const colIdMap = new Map();
      
      // 2. Import collections from collections list
      if (Array.isArray(data.collections)) {
        for (const col of data.collections) {
          if (!col || !col.name) continue;
          const nameClean = col.name.toLowerCase().trim();
          if (localColByName.has(nameClean)) {
            colIdMap.set(col.id, localColByName.get(nameClean));
          } else {
            // Add new collection
            const newId = await DB.addCollection({ name: col.name });
            colIdMap.set(col.id, newId);
            localColByName.set(nameClean, newId);
            collectionsCount++;
          }
        }
      }
      
      // 3. Scan links for any collectionName that is not yet created
      for (const link of data.links) {
        if (link && link.collectionName) {
          const nameClean = link.collectionName.toLowerCase().trim();
          if (!localColByName.has(nameClean)) {
            // Add new collection based on link's collectionName
            const newId = await DB.addCollection({ name: link.collectionName });
            localColByName.set(nameClean, newId);
            collectionsCount++;
          }
        }
      }
      
      // 4. Import links
      for (const link of data.links) {
        if (!link || !link.url) continue;
        
        // Determine collection ID
        let localColId = null;
        if (link.collectionName) {
          const nameClean = link.collectionName.toLowerCase().trim();
          localColId = localColByName.get(nameClean) || null;
        } else if (link.collection) {
          localColId = colIdMap.get(link.collection) || null;
        }
        
        // Normalize tags
        const tags = Array.isArray(link.tags) ? link.tags : [];
        
        // Check if this URL is already in the database in the same collection
        const dup = localLinks.find(l => l.url.toLowerCase() === link.url.toLowerCase() && l.collection === localColId);
        
        if (dup) {
          // Update / Merge
          const mergedTags = Array.from(new Set([...(dup.tags || []), ...tags]));
          const updated = {
            ...dup,
            title: dup.title || link.title || '',
            description: dup.description || link.description || '',
            image: dup.image || link.image || '',
            tags: mergedTags,
            favorite: dup.favorite || link.favorite || false,
          };
          await DB.updateLink(updated);
          updatedCount++;
        } else {
          // Add new
          const newLink = {
            url: link.url,
            title: link.title || '',
            description: link.description || '',
            tags: tags,
            collection: localColId,
            favorite: link.favorite || false,
            image: link.image || '',
          };
          await DB.addLink(newLink);
          linksCount++;
        }
      }
      
      if (linksCount === 0 && updatedCount === 0 && collectionsCount === 0) {
        toast('No new links or collections found in file.', 'info');
      } else {
        let msg = `Imported ${linksCount} links`;
        if (updatedCount > 0) msg += `, merged ${updatedCount} duplicates`;
        if (collectionsCount > 0) msg += `, created ${collectionsCount} collections`;
        toast(msg + '!', 'success');
      }
      
      if (window.loadData) {
        await window.loadData();
      }
    } catch (err) {
      console.error(err);
      toast('Failed to import JSON file.', 'error');
    }
  },

  async toPDF() {
    const links = await DB.getAllLinks();
    const cols  = await DB.getAllCollections();
    const colMap = Object.fromEntries(cols.map(c => [c.id, c]));
    const theme = document.documentElement.getAttribute('data-theme');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>LinkBase Export</title>
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
  @media print{@page{margin:0}body{background:white;color:black;padding:20mm}.card{background:white;border-color:#000}.card-url{color:black}.card-desc,.card-meta{color:#333}.tag{border-color:#000;color:black}}
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
