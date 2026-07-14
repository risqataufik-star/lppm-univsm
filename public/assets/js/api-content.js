/* ================================================================
   LPPM UnivSM — Pengisi konten dinamis dari API panel admin.
   Konten statis di HTML adalah fallback: hanya diganti bila
   fetch sukses dan data tersedia.
   ================================================================ */

'use strict';

(function () {
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fmtTgl = (iso) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

  const fmtSize = (b) =>
    b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

  async function getJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  /* Markdown mini: ## judul, **tebal**, - daftar, paragraf */
  function md(text) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    let html = '';
    let inList = false;
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line) { if (inList) { html += '</ul>'; inList = false; } continue; }
      if (line.startsWith('- ')) {
        if (!inList) { html += '<ul class="list-disc pl-6 mb-4 space-y-1">'; inList = true; }
        html += '<li>' + inline(line.slice(2)) + '</li>';
        continue;
      }
      if (inList) { html += '</ul>'; inList = false; }
      if (line.startsWith('## ')) {
        html += '<h3 class="text-xl font-bold text-navy-800 mt-6 mb-3">' + inline(line.slice(3)) + '</h3>';
        continue;
      }
      html += '<p class="mb-4 leading-relaxed">' + inline(line) + '</p>';
    }
    if (inList) html += '</ul>';
    return html;
  }

  /* ── Statistik beranda ── */
  async function fillStats() {
    const els = document.querySelectorAll('[data-stat]');
    if (!els.length) return;
    const stats = await getJson('/api/pengaturan');
    els.forEach((el) => {
      const v = stats['stat_' + el.dataset.stat];
      if (v === undefined) return;
      el.dataset.counter = v;
      if (el.dataset.done) el.textContent = Number(v).toLocaleString('id-ID');
    });
  }

  /* ── Kartu berita ── */
  const KAT_BADGE = {
    berita: 'bg-blue-100 text-blue-700',
    pengumuman: 'bg-amber-100 text-amber-700',
    agenda: 'bg-green-100 text-green-700',
  };

  function beritaCard(b) {
    const img = b.gambar_url
      ? '<img src="' + esc(b.gambar_url) + '" alt="' + esc(b.judul) + '" class="w-full h-44 object-cover">'
      : '<div class="w-full h-44 bg-navy-100 flex items-center justify-center text-navy-300 text-4xl"><i class="ri-newspaper-line"></i></div>';
    return (
      '<article class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden card-hover">' + img +
      '<div class="p-5">' +
      '<div class="flex items-center gap-2 mb-2">' +
      '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ' + (KAT_BADGE[b.kategori] || KAT_BADGE.berita) + '">' + esc(b.kategori) + '</span>' +
      '<span class="text-xs text-gray-400">' + fmtTgl(b.tanggal) + '</span>' +
      '</div>' +
      '<h3 class="font-bold text-navy-800 mb-2 leading-snug"><a href="berita.html?slug=' + encodeURIComponent(b.slug) + '" class="hover:text-navy-600">' + esc(b.judul) + '</a></h3>' +
      '<p class="text-gray-500 text-sm">' + esc(b.ringkasan) + '</p>' +
      '</div></article>'
    );
  }

  async function fillBeritaIndex() {
    const wrap = document.getElementById('list-berita-index');
    if (!wrap) return;
    const data = await getJson('/api/berita?limit=3');
    if (data.length) wrap.innerHTML = data.map(beritaCard).join('');
  }

  async function fillBeritaPage() {
    const wrap = document.getElementById('list-berita');
    if (!wrap) return;
    const slug = new URLSearchParams(location.search).get('slug');
    if (slug) return showBeritaDetail(slug);
    const data = await getJson('/api/berita');
    if (data.length) wrap.innerHTML = data.map(beritaCard).join('');
  }

  async function showBeritaDetail(slug) {
    const detail = document.getElementById('berita-detail');
    if (!detail) return;
    const b = await getJson('/api/berita/' + encodeURIComponent(slug));
    detail.querySelector('[data-d-judul]').textContent = b.judul;
    detail.querySelector('[data-d-meta]').textContent =
      b.kategori.charAt(0).toUpperCase() + b.kategori.slice(1) + ' — ' + fmtTgl(b.tanggal);
    const img = detail.querySelector('[data-d-gambar]');
    if (b.gambar_url) { img.src = b.gambar_url; img.alt = b.judul; img.classList.remove('hidden'); }
    detail.querySelector('[data-d-konten]').innerHTML = md(b.konten);
    const list = document.getElementById('berita-list-section');
    if (list) list.classList.add('hidden');
    detail.classList.remove('hidden');
    document.title = b.judul + ' — LPPM Universitas Sapta Mandiri';
  }

  /* ── Dokumen ── */
  const DOK_STYLE = {
    pedoman: { icon: 'ri-book-2-line', cls: 'bg-blue-100 text-blue-600' },
    template: { icon: 'ri-file-word-line', cls: 'bg-indigo-100 text-indigo-600' },
    sk: { icon: 'ri-stamp-line', cls: 'bg-red-100 text-red-600' },
    laporan: { icon: 'ri-file-chart-line', cls: 'bg-green-100 text-green-600' },
    lainnya: { icon: 'ri-file-line', cls: 'bg-gray-100 text-gray-600' },
  };

  async function fillDokumen() {
    const wrap = document.getElementById('list-dokumen');
    if (!wrap) return;
    const data = await getJson('/api/dokumen');
    if (!data.length) return;
    wrap.innerHTML = data.map((d) => {
      const st = DOK_STYLE[d.kategori] || DOK_STYLE.lainnya;
      return (
        '<a href="' + esc(d.file_url) + '" target="_blank" rel="noopener" class="doc-card" ' +
        'data-doc-item="' + esc(d.judul) + '" data-doc-cat="' + esc(d.kategori) + '">' +
        '<div class="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ' + st.cls + '"><i class="' + st.icon + '"></i></div>' +
        '<div class="min-w-0">' +
        '<p class="font-semibold text-sm text-gray-800 leading-snug">' + esc(d.judul) + '</p>' +
        (d.deskripsi ? '<p class="text-xs text-gray-500 mt-0.5">' + esc(d.deskripsi) + '</p>' : '') +
        '<p class="text-xs text-gray-400 mt-1"><i class="ri-download-2-line"></i> ' + esc(d.nama_file) + ' · ' + fmtSize(d.ukuran_bytes) + '</p>' +
        '</div></a>'
      );
    }).join('');
  }

  /* ── Tabel penelitian / PkM / publikasi ── */
  const BADGE = { aktif: 'badge-aktif', proses: 'badge-proses', selesai: 'badge-selesai' };

  const rowKegiatan = (r) =>
    '<tr>' +
    '<td><span class="font-medium text-gray-800">' + esc(r.judul) + '</span><br>' +
    '<span class="text-xs text-gray-500">' + esc(r.ketua) + (r.anggota ? '; ' + esc(r.anggota) : '') + '</span></td>' +
    '<td>' + esc(r.skema) + '</td>' +
    '<td>' + esc(r.tahun) + '</td>' +
    '<td><span class="' + (BADGE[r.status] || 'badge-proses') + ' capitalize">' + esc(r.status) + '</span></td>' +
    '</tr>';

  const rowPublikasi = (r) =>
    '<tr>' +
    '<td>' + (r.tautan
      ? '<a href="' + esc(r.tautan) + '" target="_blank" rel="noopener" class="font-medium text-navy-700 hover:underline">' + esc(r.judul) + '</a>'
      : '<span class="font-medium text-gray-800">' + esc(r.judul) + '</span>') + '</td>' +
    '<td>' + esc(r.penulis) + '</td>' +
    '<td class="capitalize">' + esc(r.jenis) + '</td>' +
    '<td>' + esc(r.penerbit) + '</td>' +
    '<td>' + esc(r.tahun) + '</td>' +
    '</tr>';

  async function fillTable(id, url, rowFn) {
    const tbody = document.getElementById(id);
    if (!tbody) return;
    const data = await getJson(url);
    if (data.length) tbody.innerHTML = data.map(rowFn).join('');
  }

  /* ── Init (kegagalan dibiarkan senyap — fallback statis tampil) ── */
  document.addEventListener('DOMContentLoaded', () => {
    [
      fillStats(),
      fillBeritaIndex(),
      fillBeritaPage(),
      fillDokumen(),
      fillTable('list-penelitian', '/api/penelitian', rowKegiatan),
      fillTable('list-pkm', '/api/pkm', rowKegiatan),
      fillTable('list-publikasi', '/api/publikasi', rowPublikasi),
    ].forEach((p) => p.catch((err) => console.warn('api-content:', err.message)));
  });
})();
