/* ================================================================
   LPPM Universitas Sapta Mandiri — Main JavaScript
   ================================================================ */

'use strict';

/* ── Mobile Menu ──────────────────────────────────────────────── */
function initMobileMenu() {
  const btn  = document.getElementById('menu-btn');
  const menu = document.getElementById('mobile-menu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    const isOpen = !menu.classList.contains('hidden');
    menu.classList.toggle('hidden', isOpen);
    btn.setAttribute('aria-expanded', String(!isOpen));
    btn.querySelector('.icon-open')?.classList.toggle('hidden', !isOpen);
    btn.querySelector('.icon-close')?.classList.toggle('hidden', isOpen);
  });

  // Close menu on link click
  menu.querySelectorAll('a').forEach(a =>
    a.addEventListener('click', () => {
      menu.classList.add('hidden');
      btn.querySelector('.icon-open')?.classList.remove('hidden');
      btn.querySelector('.icon-close')?.classList.add('hidden');
    })
  );
}

/* ── Desktop Dropdowns ────────────────────────────────────────── */
function initDropdowns() {
  // Close all when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    }
  });

  document.querySelectorAll('.dropdown-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const dd = btn.closest('.dropdown');
      const wasOpen = dd.classList.contains('open');
      document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
      if (!wasOpen) dd.classList.add('open');
    });
  });
}

/* ── Mobile Sub-Accordion ─────────────────────────────────────── */
function initMobileAccordion() {
  document.querySelectorAll('[data-mobile-acc]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.dataset.mobileAcc;
      const sub = document.getElementById(id);
      if (!sub) return;
      const isOpen = !sub.classList.contains('hidden');
      sub.classList.toggle('hidden', isOpen);
      const arrow = btn.querySelector('[data-arrow]');
      arrow && arrow.classList.toggle('rotate-180', !isOpen);
    });
  });
}

/* ── Navbar scroll shadow ─────────────────────────────────────── */
function initScrollNav() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const update = () => nav.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', update, { passive: true });
  update();
}

/* ── Animated counters ────────────────────────────────────────── */
function animateCounter(el, target, duration = 1600) {
  let start = null;
  const step = (ts) => {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    const val = Math.floor((1 - Math.pow(1 - p, 3)) * target);
    el.textContent = val.toLocaleString('id-ID');
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target.toLocaleString('id-ID');
  };
  requestAnimationFrame(step);
}

function initCounters() {
  const els = document.querySelectorAll('[data-counter]');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        animateCounter(e.target, +e.target.dataset.counter);
      }
    });
  }, { threshold: 0.5 });
  els.forEach(el => obs.observe(el));
}

/* ── Tab switching ────────────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('[data-tabs]').forEach(wrap => {
    const btns   = wrap.querySelectorAll('[data-tab-btn]');
    const panels = wrap.querySelectorAll('[data-tab-panel]');

    btns.forEach(btn => {
      btn.addEventListener('click', () => {
        const t = btn.dataset.tabBtn;
        btns.forEach(b   => b.classList.toggle('active',   b.dataset.tabBtn   === t));
        panels.forEach(p => p.classList.toggle('active',   p.dataset.tabPanel === t));
      });
    });

    // Activate first by default unless URL hash matches
    const hash = location.hash.replace('#', '');
    const matched = [...btns].find(b => b.dataset.tabBtn === hash);
    (matched || btns[0])?.click();
  });
}

/* ── Accordion ────────────────────────────────────────────────── */
function initAccordion() {
  document.querySelectorAll('[data-accordion-header]').forEach(header => {
    header.addEventListener('click', () => {
      const item  = header.closest('[data-accordion-item]');
      const body  = item?.querySelector('.accordion-body');
      const icon  = header.querySelector('[data-acc-icon]');
      if (!body) return;

      const isOpen = body.classList.contains('open');

      // Close siblings in same group
      const group = item?.dataset.accordionItem;
      if (group) {
        document.querySelectorAll(`[data-accordion-item="${group}"]`).forEach(sib => {
          sib.querySelector('.accordion-body')?.classList.remove('open');
          sib.querySelector('[data-acc-icon]')?.classList.remove('rotate-180');
        });
      }

      if (!isOpen) {
        body.classList.add('open');
        icon?.classList.add('rotate-180');
      }
    });
  });
}

/* ── Document filter/search ───────────────────────────────────── */
function initDocSearch() {
  const input = document.getElementById('doc-search');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    document.querySelectorAll('[data-doc-item]').forEach(item => {
      const match = item.dataset.docItem.toLowerCase().includes(q);
      item.style.display = match ? '' : 'none';
    });
  });

  // Category filter
  document.querySelectorAll('[data-cat-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-cat-filter]').forEach(b =>
        b.classList.toggle('active', b === btn)
      );
      const cat = btn.dataset.catFilter;
      document.querySelectorAll('[data-doc-cat]').forEach(item => {
        item.style.display = (cat === 'all' || item.dataset.docCat === cat) ? '' : 'none';
      });
    });
  });
}

/* ── Fade-up on scroll ────────────────────────────────────────── */
function initFadeUp() {
  const els = document.querySelectorAll('.fade-up');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.delay || '0');
        setTimeout(() => e.target.classList.add('visible'), delay);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

/* ── Active nav highlight ─────────────────────────────────────── */
function initActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('a[data-nav]').forEach(a => {
    if (a.getAttribute('href') === page) {
      a.classList.add('!text-yellow-300', 'font-semibold');
    }
  });
}

/* ── Contact / consultation form (POST nyata ke /api/pesan) ────── */
function initForms() {
  document.querySelectorAll('form[data-ajax-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg class="animate-spin w-4 h-4 mr-2 inline" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/></svg>Mengirim...';
      btn.disabled = true;

      const fd = new FormData(form);
      // Formulir kerjasama.html punya field "Nama Institusi/Mitra" dan "Jenis Mitra"
      // yang tidak ada kolomnya di pesanSchema — dilipat ke subjek/isi di sini agar
      // tetap terkirim tanpa mengubah bentuk payload {nama,email,telepon,jenis,subjek,isi,website}.
      const institusi = fd.get('institusi');
      const jenisMitra = fd.get('jenis_mitra');
      let subjek = fd.get('subjek') || '';
      let isi = fd.get('isi') || '';
      if (institusi) subjek = 'Kerjasama - ' + institusi + (subjek ? ' — ' + subjek : '');
      if (jenisMitra) isi = 'Jenis Mitra: ' + jenisMitra + '\n\n' + isi;

      const body = {
        nama: fd.get('nama') || '',
        email: fd.get('email') || '',
        telepon: fd.get('telepon') || '',
        jenis: form.dataset.jenis || 'kontak',
        subjek: subjek,
        isi: isi,
        website: fd.get('website') || '', // honeypot
      };

      try {
        const res = await fetch('/api/pesan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Gagal mengirim pesan.');

        const wrapper = form.closest('[data-form-wrap]') || form.parentElement;
        wrapper.innerHTML = `
          <div class="text-center py-14">
            <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg class="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-800 mb-2">Pesan Berhasil Terkirim!</h3>
            <p class="text-gray-500 max-w-sm mx-auto">Tim LPPM akan menghubungi Anda melalui email atau telepon dalam 1–2 hari kerja.</p>
          </div>`;
      } catch (err) {
        btn.innerHTML = orig;
        btn.disabled = false;
        alert(err.message + '\nJika masalah berlanjut, silakan kirim email langsung ke LPPM.');
      }
    });
  });
}

/* ── Lightbox for gallery ──────────────────────────────────────── */
function initGallery() {
  const imgs = document.querySelectorAll('[data-lightbox]');
  if (!imgs.length) return;

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/85 z-[200] flex items-center justify-center p-4 hidden';
  overlay.innerHTML = `
    <button class="absolute top-4 right-4 text-white/80 hover:text-white text-4xl leading-none" id="lb-close">&times;</button>
    <img id="lb-img" src="" alt="" class="max-w-full max-h-[85vh] rounded-xl shadow-2xl">
    <p id="lb-cap" class="absolute bottom-6 left-0 right-0 text-center text-white/80 text-sm"></p>`;
  document.body.appendChild(overlay);

  imgs.forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      overlay.querySelector('#lb-img').src = img.src;
      overlay.querySelector('#lb-cap').textContent = img.alt || '';
      overlay.classList.remove('hidden');
    });
  });

  overlay.querySelector('#lb-close').addEventListener('click', () => overlay.classList.add('hidden'));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.classList.add('hidden'); });
}

/* ── Back to top ──────────────────────────────────────────────── */
function initBackToTop() {
  const btn = document.getElementById('back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => btn.classList.toggle('opacity-0', window.scrollY < 300), { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/* ── Init all ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initDropdowns();
  initMobileAccordion();
  initScrollNav();
  initCounters();
  initTabs();
  initAccordion();
  initDocSearch();
  initFadeUp();
  initActiveNav();
  initForms();
  initGallery();
  initBackToTop();
});
