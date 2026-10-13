/* =========================================================
   2B ZONE · script.js
   Film carousel, show data, booking, UPI and WhatsApp links.
   ========================================================= */
(() => {
  'use strict';

  document.documentElement.classList.replace('no-js', 'js');

  /* ---------- Settings: edit these ---------- */
  const CONFIG = {
    dataUrl: 'data/shows.json',
    ticketPrice: 99,                 // ₹ per ticket
    maxSeats: 30,                    // maximum tickets per show
    unlockAt: 5,                     // tickets needed to confirm a show
    minTickets: 1,                   // minimum tickets per booking
    slideMs: 4500,                   // time each film stays on screen
    upiId: 'yourname@upi',           // TODO: your UPI ID
    upiName: '2B Zone',
    whatsapp: '919999999999',        // TODO: 91 + your 10-digit number, no + or spaces
    phone: '+91 99999 99999',        // TODO: your phone number shown on the site
  };

  /* ---------- Helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');
  const enc = encodeURIComponent;
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const seatsLeft = (show) => Math.max(0, CONFIG.maxSeats - show.confirmed);
  const shownCount = (show) => Math.min(show.confirmed, CONFIG.unlockAt);

  // Hide broken or missing images, so the designed placeholder shows instead
  function guardImages(root) {
    $$('img', root).forEach((img) => {
      const fail = () => { img.hidden = true; };
      img.addEventListener('error', fail, { once: true });
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
    });
  }

  /* ---------- Data ---------- */
  let films = [];

  function normalise(raw) {
    return (raw.films || []).map((f) => ({
      id: String(f.id || ''),
      title: f.title || 'Untitled',
      status: f.status || 'Coming Soon',
      language: f.language || '',
      genre: f.genre || '',
      cast: f.cast || '',
      synopsis: f.synopsis || '',
      poster: f.poster || '',
      shows: (f.shows || []).map((s) => ({
        time: String(s.time || ''),
        confirmed: Math.max(0, Number(s.confirmed) || 0),
      })),
    }));
  }

  /* ---------- Rendering: film cards ---------- */
  const track = $('#track');
  const dotsEl = $('#dots');
  const counter = $('#counter');
  const carousel = $('#carousel');
  const progress = $('#progressBar');
  const toggleBtn = $('#toggleBtn');

  function meterHTML(count) {
    const pct = (shownCount({ confirmed: count }) / CONFIG.unlockAt) * 100;
    return `<span class="meter" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
  }

  function showsHTML(film, filmIdx) {
    if (!film.shows.length) {
      return `
        <p class="timing">Show timing: <strong>Soon</strong></p>
        <p class="unlock">0/${CONFIG.unlockAt} tickets confirmed</p>
        ${meterHTML(0)}`;
    }
    const rows = film.shows.map((s, j) => {
      const done = s.confirmed >= CONFIG.unlockAt;
      return `
        <li class="show-row">
          <div class="show-info">
            <span class="show-time">${esc(s.time)}</span>
            <span class="unlock">${shownCount(s)}/${CONFIG.unlockAt} tickets confirmed${done ? ' · show confirmed' : ''}</span>
            ${meterHTML(s.confirmed)}
            <span class="seats">${seatsLeft(s)} of ${CONFIG.maxSeats} seats left</span>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" data-pick="${filmIdx}" data-show="${j}">Book</button>
        </li>`;
    }).join('');
    return `<ul class="show-list">${rows}</ul>`;
  }

  function slideHTML(film, i) {
    const label = `${i + 1} of ${films.length}: ${film.title}`;
    return `
      <article class="slide" data-index="${i}" role="group" aria-roledescription="slide"
               aria-label="${esc(label)}" aria-hidden="true">
        <div class="slide-inner">
          <figure class="poster">
            ${film.poster ? `<img src="${esc(film.poster)}" alt="${esc(film.title)} poster" width="400" height="600" loading="${i === 0 ? 'eager' : 'lazy'}">` : ''}
            <figcaption class="poster-placeholder">${esc(film.title)}</figcaption>
          </figure>
          <div class="slide-info">
            <p class="status">${esc(film.status)}</p>
            <h3 class="slide-title">${esc(film.title)}</h3>
            <dl class="facts">
              <div><dt>Language</dt><dd>${esc(film.language)}</dd></div>
              <div><dt>Genre</dt><dd>${esc(film.genre)}</dd></div>
              <div><dt>Cast</dt><dd>${esc(film.cast)}</dd></div>
            </dl>
            <p class="synopsis">${esc(film.synopsis)}</p>
            <p class="notice"><span aria-hidden="true">⭐</span> 5 Tickets Complete Hone Par Next Show Confirm Hoga!</p>
            ${showsHTML(film, i)}
          </div>
        </div>
      </article>`;
  }

  function renderTrack() {
    track.innerHTML = films.map(slideHTML).join('');
    dotsEl.innerHTML = films.map((f, i) =>
      `<li><button type="button" class="dot" data-go="${i}" aria-label="Show film ${i + 1}: ${esc(f.title)}"></button></li>`
    ).join('');
    guardImages(track);
  }

  /* ---------- Carousel ---------- */
  const cs = { index: 0, timer: null, started: 0, remaining: CONFIG.slideMs, reasons: new Set() };
  const isPaused = () => cs.reasons.size > 0;

  function setSlide(n) {
    const slides = $$('.slide', track);
    if (!slides.length) return;
    const target = ((n % slides.length) + slides.length) % slides.length;
    const prev = slides[cs.index];
    const next = slides[target];

    if (prev && prev !== next) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      prev.setAttribute('aria-hidden', 'true');
    }
    next.classList.remove('is-leaving', 'is-active');
    void next.offsetWidth;           // restart the entrance animation
    next.classList.add('is-active');
    next.setAttribute('aria-hidden', 'false');

    cs.index = target;
    $$('.dot', dotsEl).forEach((d, k) => d.setAttribute('aria-current', String(k === target)));
    counter.textContent = `${pad(target + 1)} / ${pad(slides.length)}`;
  }

  function restartProgress() {
    progress.classList.remove('is-running');
    void progress.offsetWidth;
    progress.style.animationDuration = `${CONFIG.slideMs}ms`;
    progress.classList.add('is-running');
  }

  function scheduleNext(ms) {
    clearTimeout(cs.timer);
    cs.started = Date.now();
    cs.timer = setTimeout(() => go(cs.index + 1), ms);
  }

  function go(n) {
    setSlide(n);
    cs.remaining = CONFIG.slideMs;
    restartProgress();
    if (!isPaused()) scheduleNext(CONFIG.slideMs);
  }

  function syncPauseUI() {
    const userPaused = cs.reasons.has('user');
    carousel.classList.toggle('is-paused', isPaused());
    toggleBtn.textContent = userPaused ? 'Play' : 'Pause';
    toggleBtn.setAttribute('aria-pressed', String(userPaused));
    toggleBtn.setAttribute('aria-label', userPaused ? 'Play films' : 'Pause films');
  }

  function pause(reason) {
    if (cs.reasons.has(reason)) return;
    const wasRunning = !isPaused();
    cs.reasons.add(reason);
    if (wasRunning && cs.timer) {
      clearTimeout(cs.timer);
      cs.timer = null;
      cs.remaining = Math.max(300, cs.remaining - (Date.now() - cs.started));
    }
    syncPauseUI();
  }

  function resume(reason) {
    if (!cs.reasons.delete(reason)) return;
    if (!isPaused()) scheduleNext(cs.remaining);
    syncPauseUI();
  }

  function initCarousel() {
    setSlide(0);
    restartProgress();
    if (reduceMotion) pause('user');   // start paused for users who prefer less motion
    else scheduleNext(CONFIG.slideMs);
    syncPauseUI();
  }

  track.addEventListener('animationend', (e) => {
    if (e.target.classList.contains('is-leaving')) e.target.classList.remove('is-leaving');
  });

  $('#prevBtn').addEventListener('click', () => go(cs.index - 1));
  $('#nextBtn').addEventListener('click', () => go(cs.index + 1));
  toggleBtn.addEventListener('click', () => {
    if (cs.reasons.has('user')) resume('user');
    else pause('user');
  });

  dotsEl.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-go]');
    if (dot) go(Number(dot.dataset.go));
  });

  carousel.addEventListener('mouseenter', () => pause('hover'));
  carousel.addEventListener('mouseleave', () => resume('hover'));
  carousel.addEventListener('focusin', (e) => {
    if (e.target.matches(':focus-visible')) pause('focus');
  });
  carousel.addEventListener('focusout', (e) => {
    if (!carousel.contains(e.relatedTarget)) resume('focus');
  });
  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(cs.index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(cs.index - 1); }
  });

  // Swipe on touch screens
  let swipeX = null;
  carousel.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') swipeX = e.clientX;
  });
  carousel.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? cs.index + 1 : cs.index - 1);
  });
  carousel.addEventListener('pointercancel', () => { swipeX = null; });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause('tab');
    else resume('tab');
  });

  /* ---------- Booking dialog ---------- */
  const dlg = $('#bookingDialog');
  const form = $('#bookingForm');
  const el = {
    film: $('#bkFilm'),
    show: $('#bkShow'),
    date: $('#bkDate'),
    qty: $('#bkQty'),
    name: $('#bkName'),
    phone: $('#bkPhone'),
    ref: $('#bkRef'),
    seats: $('#bkSeats'),
    total: $('#bkTotal'),
    pay: $('#payBtn'),
    error: $('#bkError'),
    done: $('#bkDone'),
    doneText: $('#bkDoneText'),
    upi: $('#upiText'),
    copy: $('#copyUpi'),
  };
  let lastTrigger = null;

  const currentFilm = () => films[Number(el.film.value)];
  const currentShow = () => {
    const film = currentFilm();
    return film ? film.shows[Number(el.show.value)] : undefined;
  };

  function fillFilms(selected) {
    el.film.innerHTML = films.map((f, i) => `<option value="${i}">${esc(f.title)}</option>`).join('');
    el.film.value = String(selected);
  }

  function fillShows(filmIdx, showIdx) {
    const film = films[filmIdx];
    if (!film.shows.length) {
      el.show.innerHTML = '<option value="">Show timing soon</option>';
      el.show.disabled = true;
      return;
    }
    el.show.disabled = false;
    el.show.innerHTML = film.shows.map((s, j) =>
      `<option value="${j}">${esc(s.time)} · ${shownCount(s)}/${CONFIG.unlockAt} confirmed · ${seatsLeft(s)} seats left</option>`
    ).join('');
    el.show.value = String(Math.max(0, showIdx));
  }

  function setDate() {
    const today = todayISO();
    el.date.min = today;
    if (!el.date.value || el.date.value < today) el.date.value = today;
  }

  function syncSummary() {
    const show = currentShow();
    const left = show ? seatsLeft(show) : 0;
    el.qty.min = String(CONFIG.minTickets);
    el.qty.max = String(Math.max(left, CONFIG.minTickets));

    let qty = parseInt(el.qty.value, 10);
    if (Number.isNaN(qty)) qty = CONFIG.minTickets;
    const total = qty * CONFIG.ticketPrice;

    el.seats.textContent = show
      ? `${left} of ${CONFIG.maxSeats} seats left for this show.`
      : 'This film has no show timing yet.';
    el.total.textContent = inr(total);
    el.pay.textContent = `Pay ${inr(total)} with UPI`;
  }

  function openBooking(filmIdx, showIdx, trigger) {
    if (!films.length) {
      $('#now').scrollIntoView();
      return;
    }
    lastTrigger = trigger || null;
    form.reset();
    el.error.textContent = '';
    el.done.hidden = true;
    form.hidden = false;

    fillFilms(filmIdx);
    fillShows(filmIdx, showIdx);
    setDate();
    syncSummary();

    if (!dlg.open) {
      pause('dialog');
      dlg.showModal();
    }
    el.name.focus();
  }

  function closeBooking() { dlg.close(); }

  dlg.addEventListener('close', () => {
    resume('dialog');
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) closeBooking(); });
  $('#dialogClose').addEventListener('click', closeBooking);
  $('#doneClose').addEventListener('click', closeBooking);

  el.film.addEventListener('change', () => {
    fillShows(Number(el.film.value), 0);
    syncSummary();
  });
  el.show.addEventListener('change', syncSummary);
  el.qty.addEventListener('input', syncSummary);

  el.upi.textContent = CONFIG.upiId;
  el.copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(CONFIG.upiId);
      el.copy.textContent = 'Copied';
    } catch {
      el.copy.textContent = 'Copy failed';
    }
    setTimeout(() => { el.copy.textContent = 'Copy'; }, 1600);
  });

  // Open booking from a show row or from the header button
  track.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pick]');
    if (btn) openBooking(Number(btn.dataset.pick), Number(btn.dataset.show), btn);
  });
  $$('[data-open-booking]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const first = films.findIndex((f) => f.shows.length > 0);
      openBooking(Math.max(0, first), 0, btn);
    });
  });

  function validate({ needRef }) {
    const show = currentShow();
    const qty = parseInt(el.qty.value, 10);
    const name = el.name.value.trim();
    const phone = el.phone.value.replace(/\s+/g, '');
    const ref = el.ref.value.trim().toUpperCase();

    if (!show) return { field: el.show, msg: 'This film has no show timing yet. Please choose another film.' };
    if (!el.date.value || el.date.value < todayISO()) return { field: el.date, msg: 'Choose today or a later date.' };
    if (!Number.isInteger(qty) || qty < CONFIG.minTickets) {
      return { field: el.qty, msg: `Enter at least ${CONFIG.minTickets} ticket.` };
    }
    if (qty > seatsLeft(show)) {
      return { field: el.qty, msg: `Only ${seatsLeft(show)} seats are left for this show.` };
    }
    if (name.length < 2) return { field: el.name, msg: 'Enter your name.' };
    if (!/^[6-9]\d{9}$/.test(phone)) return { field: el.phone, msg: 'Enter a valid 10-digit mobile number.' };
    if (needRef && !/^[A-Z0-9]{8,22}$/.test(ref)) {
      return { field: el.ref, msg: 'Enter the UPI reference number from your payment app.' };
    }
    return null;
  }

  function showProblem(problem) {
    el.error.textContent = problem.msg;
    $$('[aria-invalid="true"]', form).forEach((n) => n.removeAttribute('aria-invalid'));
    problem.field.setAttribute('aria-invalid', 'true');
    problem.field.focus();
  }

  // Opens the UPI app with the amount filled in (works on Android phones)
  function upiLink(total, note) {
    return `upi://pay?pa=${enc(CONFIG.upiId)}&pn=${enc(CONFIG.upiName)}&am=${total}&cu=INR&tn=${enc(note)}`;
  }

  el.pay.addEventListener('click', () => {
    const problem = validate({ needRef: false });
    if (problem) return showProblem(problem);

    const film = currentFilm();
    const show = currentShow();
    const qty = parseInt(el.qty.value, 10);
    const total = qty * CONFIG.ticketPrice;
    el.error.textContent = '';
    window.location.href = upiLink(total, `${film.title} ${show.time} x${qty}`);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const problem = validate({ needRef: true });
    if (problem) return showProblem(problem);

    const film = currentFilm();
    const show = currentShow();
    const qty = parseInt(el.qty.value, 10);
    const total = qty * CONFIG.ticketPrice;
    const ref = el.ref.value.trim().toUpperCase();

    const message = [
      'Hello 2B Zone, I have paid for my tickets.',
      '',
      `Name: ${el.name.value.trim()}`,
      `Mobile: ${el.phone.value.replace(/\s+/g, '')}`,
      `Film: ${film.title}`,
      `Show: ${show.time} on ${fmtDate(el.date.value)}`,
      `Tickets: ${qty}`,
      `Amount paid: ${inr(total)}`,
      `UPI reference: ${ref}`,
    ].join('\n');

    window.open(`https://wa.me/${CONFIG.whatsapp}?text=${enc(message)}`, '_blank', 'noopener');

    form.hidden = true;
    el.done.hidden = false;
    el.doneText.textContent =
      `WhatsApp has opened with your booking for ${qty} ticket${qty > 1 ? 's' : ''}. ` +
      `Send the message. We will check the payment and confirm your seats. ` +
      `A show is confirmed once ${CONFIG.unlockAt} tickets are paid.`;
    $('#doneClose').focus();
  });

  /* ---------- Navigation ---------- */
  const navToggle = $('#navToggle');
  const primaryNav = $('#primaryNav');
  const siteHeader = $('#siteHeader');

  function setNav(open) {
    primaryNav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  }

  navToggle.addEventListener('click', () => setNav(!primaryNav.classList.contains('is-open')));
  primaryNav.addEventListener('click', (e) => {
    if (e.target.closest('a')) setNav(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primaryNav.classList.contains('is-open')) {
      setNav(false);
      navToggle.focus();
    }
  });
  window.matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
    if (e.matches) setNav(false);
  });
  window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- Contact links (set once from CONFIG) ---------- */
  function setContactLinks() {
    $$('[data-phone]').forEach((a) => {
      a.href = 'tel:' + CONFIG.phone.replace(/\s+/g, '');
      a.textContent = CONFIG.phone;
    });
    $$('[data-whatsapp]').forEach((a) => {
      a.href = `https://wa.me/${CONFIG.whatsapp}`;
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((n) => n.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((n) => io.observe(n));
  }

  /* ---------- Init ---------- */
  async function init() {
    guardImages(document);
    setContactLinks();
    initReveal();
    $('#year').textContent = new Date().getFullYear();

    try {
      const res = await fetch(CONFIG.dataUrl, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      films = normalise(await res.json());
      if (!films.length) throw new Error('No films in data file');
    } catch (err) {
      console.error('Could not load films:', err);
      track.innerHTML = '<p class="load-error">Films could not be loaded right now. Please call or message us on WhatsApp to book.</p>';
      return;
    }

    renderTrack();
    initCarousel();
  }

  init();
})();
