/* =========================================================
   2B ZONE · script.js
   Film carousel, showtime booking, form checks, mobile menu.
   ========================================================= */
(() => {
  'use strict';

  document.documentElement.classList.replace('no-js', 'js');

  /* ---------- Configuration ---------- */
  const CONFIG = {
    slideMs: 4500,          // how long each film stays on screen (ms)
    ticketPrice: 99,        // ₹ per ticket
    maxSeatsPerShow: 30,    // maximum tickets for one show
    unlockAt: 5,            // paid tickets needed to open a show
    upiId: '2bzone@upi',    // TODO: replace with your real UPI ID
  };

  /* ---------- Film data ----------
     Replace these with your own films.
     poster: path inside images/posters/ (empty or missing file = title placeholder)
     opens:  first day bookings are possible (YYYY-MM-DD), or null if already showing
     times:  sold = tickets already booked for that show (sample values) */
  const films = [
    {
      id: 'drishyam-conclusion',
      title: 'Drishyam: The Conclusion',
      status: 'Now showing',
      opens: null,
      genre: 'Crime thriller',
      language: 'Hindi',
      cast: 'Ajay Devgn, Tabu, Jaideep Ahlawat',
      synopsis: 'Vijay Salgaonkar and his family come under pressure again when SP Rajveer Singh Tomar enters the story. The final chapter of the Drishyam series.',
      poster: 'images/posters/drishyam-conclusion.jpg',
      times: [
        { time: '10:30 AM', sold: 12 },
        { time: '2:15 PM', sold: 4 },
        { time: '7:00 PM', sold: 22 },
      ],
    },
    {
      id: 'jailer-2',
      title: 'Jailer 2',
      status: 'Opens 15 Oct 2026',
      opens: '2026-10-15',
      genre: 'Action drama',
      language: 'Tamil',
      cast: 'Rajinikanth',
      synopsis: 'Rajinikanth returns in the sequel to the hit film Jailer.',
      poster: 'images/posters/jailer-2.jpg',
      times: [
        { time: '11:00 AM', sold: 0 },
        { time: '3:30 PM', sold: 7 },
        { time: '9:00 PM', sold: 18 },
      ],
    },
    {
      id: 'prahaar',
      title: 'Prahaar',
      status: 'Opens 16 Oct 2026',
      opens: '2026-10-16',
      genre: 'Drama',
      language: 'Hindi',
      cast: 'Rajkummar Rao',
      synopsis: "Rajkummar Rao's Hindi film on the untold story of Ujjwal Nikam.",
      poster: 'images/posters/prahaar.jpg',
      times: [
        { time: '12:00 PM', sold: 3 },
        { time: '4:45 PM', sold: 9 },
        { time: '8:15 PM', sold: 0 },
      ],
    },
    {
      id: 'ranabaali',
      title: 'Ranabaali',
      status: 'Opens 16 Oct 2026',
      opens: '2026-10-16',
      genre: 'Period action drama',
      language: 'Telugu',
      cast: 'Vijay Deverakonda, Rashmika Mandanna',
      synopsis: 'A period action drama set in 1870s South India during the great famine.',
      poster: 'images/posters/ranabaali.jpg',
      times: [
        { time: '1:00 PM', sold: 6 },
        { time: '5:30 PM', sold: 15 },
        { time: '10:00 PM', sold: 1 },
      ],
    },
  ];

  /* ---------- Helpers ---------- */
  const byId = (id) => document.getElementById(id);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const pad = (n) => String(n).padStart(2, '0');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);

  const inr = (amount) => '₹' + amount.toLocaleString('en-IN');

  const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const fmtDate = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // "10:30 AM" -> minutes after midnight
  const toMinutes = (label) => {
    const match = label.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === 'PM') hour += 12;
    return hour * 60 + Number(match[2]);
  };

  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const seatsLeft = (show) => CONFIG.maxSeatsPerShow - show.sold;
  const ticketsNeeded = (show) => Math.max(0, CONFIG.unlockAt - show.sold);

  // Shows a fallback look if an image is missing or fails to load
  function watchImage(img) {
    const box = img.closest('figure');
    const markEmpty = () => box && box.classList.add('is-empty');
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) markEmpty();
    img.addEventListener('error', markEmpty, { once: true });
  }

  /* ---------- Elements ---------- */
  const siteHeader = byId('siteHeader');
  const navToggle = byId('navToggle');
  const primaryNav = byId('primaryNav');

  const carousel = byId('carousel');
  const track = byId('track');
  const dotsBox = byId('dots');
  const counter = byId('counter');
  const progressBar = byId('progressBar');
  const prevBtn = byId('prevBtn');
  const nextBtn = byId('nextBtn');
  const toggleBtn = byId('toggleBtn');

  const dialog = byId('bookingDialog');
  const bookingForm = byId('bookingForm');
  const bookingView = bookingForm;
  const bookingSuccess = byId('bookingSuccess');
  const filmSelect = byId('filmSelect');
  const timeSelect = byId('timeSelect');
  const dateInput = byId('bookingDate');
  const qtyInput = byId('bookingQty');
  const nameInput = byId('bookingName');
  const phoneInput = byId('bookingPhone');
  const refInput = byId('bookingRef');
  const bookingError = byId('bookingError');
  const payTotal = byId('payTotal');
  const unitPrice = byId('unitPrice');
  const upiText = byId('upiText');
  const successText = byId('successText');

  /* ---------- Rendering ---------- */
  function timeButtonsHTML(filmIdx) {
    return films[filmIdx].times.map((show, t) => {
      const need = ticketsNeeded(show);
      const status = need ? `${need} more to open` : 'Confirmed';
      return `
        <li>
          <button type="button" class="time-btn${need ? '' : ' is-open'}" data-film="${filmIdx}" data-time="${t}">
            <span class="time-value">${esc(show.time)}</span>
            <span class="time-meta">${seatsLeft(show)} seats left · ${status}</span>
          </button>
        </li>`;
    }).join('');
  }

  function slideHTML(film, i) {
    const n = films.length;
    return `
      <article class="slide" data-index="${i}" role="group" aria-roledescription="slide"
               aria-label="${i + 1} of ${n}: ${esc(film.title)}" aria-hidden="true">
        <div class="slide-inner">
          <figure class="poster">
            <img src="${esc(film.poster)}" alt="${esc(film.title)} poster" width="400" height="600"
                 loading="${i === 0 ? 'eager' : 'lazy'}" data-media>
            <span class="poster-placeholder">${esc(film.title)}</span>
          </figure>
          <div class="slide-info">
            <p class="status">${esc(film.status)}</p>
            <h3 class="slide-title">${esc(film.title)}</h3>
            <dl class="facts">
              <div><dt>Genre</dt><dd>${esc(film.genre)}</dd></div>
              <div><dt>Language</dt><dd>${esc(film.language)}</dd></div>
              <div><dt>Cast</dt><dd>${esc(film.cast)}</dd></div>
            </dl>
            <p class="synopsis">${esc(film.synopsis)}</p>
            <h4 class="times-title">Showtimes</h4>
            <ul class="time-list">${timeButtonsHTML(i)}</ul>
            <button type="button" class="btn btn-primary" data-book="${i}">Book tickets</button>
          </div>
        </div>
      </article>`;
  }

  function renderCarousel() {
    track.innerHTML = films.map(slideHTML).join('');
    dotsBox.innerHTML = films.map((film, i) =>
      `<li><button type="button" class="dot" data-go="${i}" aria-label="Show ${i + 1}: ${esc(film.title)}"></button></li>`
    ).join('');
    $$('[data-media]', track).forEach(watchImage);
  }

  function renderTimesFor(filmIdx) {
    const list = track.querySelector(`.slide[data-index="${filmIdx}"] .time-list`);
    if (list) list.innerHTML = timeButtonsHTML(filmIdx);
  }

  /* ---------- Carousel state ---------- */
  let index = 0;
  let timer = null;
  let timerActive = false;
  let timerStart = 0;
  let remaining = CONFIG.slideMs;
  const pauseReasons = new Set();
  let lastTrigger = null;

  const isPaused = () => pauseReasons.size > 0;

  function setActive(n) {
    const slides = $$('.slide', track);
    const target = (n + slides.length) % slides.length;
    const prev = slides[index];

    if (prev && target !== index) {
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      prev.setAttribute('aria-hidden', 'true');
    }

    index = target;
    const next = slides[index];
    next.classList.remove('is-leaving');
    next.classList.remove('is-active');
    void next.offsetWidth;            // restart the entrance animation
    next.classList.add('is-active');
    next.setAttribute('aria-hidden', 'false');

    $$('.dot', dotsBox).forEach((dot, k) => dot.setAttribute('aria-current', String(k === index)));
    counter.textContent = `${pad(index + 1)} / ${pad(films.length)}`;
  }

  function restartProgress() {
    progressBar.classList.remove('is-running');
    void progressBar.offsetWidth;
    progressBar.classList.add('is-running');
  }

  function scheduleNext(ms) {
    clearTimeout(timer);
    timerStart = Date.now();
    timerActive = true;
    timer = setTimeout(() => {
      timerActive = false;
      go(index + 1);
    }, ms);
  }

  function go(n) {
    clearTimeout(timer);
    timerActive = false;
    setActive(n);
    remaining = CONFIG.slideMs;
    restartProgress();
    if (!isPaused()) scheduleNext(remaining);
  }

  function syncPauseUI() {
    carousel.classList.toggle('is-paused', isPaused());
    const userPaused = pauseReasons.has('user');
    toggleBtn.dataset.state = userPaused ? 'paused' : 'playing';
    toggleBtn.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
  }

  function pause(reason) {
    if (pauseReasons.has(reason)) return;
    const wasPlaying = !isPaused();
    pauseReasons.add(reason);
    if (wasPlaying && timerActive) {
      clearTimeout(timer);
      timerActive = false;
      remaining = Math.max(0, remaining - (Date.now() - timerStart));
    }
    syncPauseUI();
  }

  function resume(reason) {
    if (!pauseReasons.delete(reason)) return;
    if (!isPaused()) scheduleNext(remaining);
    syncPauseUI();
  }

  /* ---------- Carousel events ---------- */
  track.addEventListener('animationend', (e) => {
    if (e.target.classList.contains('is-leaving')) e.target.classList.remove('is-leaving');
  });

  prevBtn.addEventListener('click', () => go(index - 1));
  nextBtn.addEventListener('click', () => go(index + 1));

  toggleBtn.addEventListener('click', () => {
    if (pauseReasons.has('user')) resume('user');
    else pause('user');
  });

  dotsBox.addEventListener('click', (e) => {
    const dot = e.target.closest('[data-go]');
    if (dot) go(Number(dot.dataset.go));
  });

  carousel.addEventListener('mouseenter', () => pause('hover'));
  carousel.addEventListener('mouseleave', () => resume('hover'));
  carousel.addEventListener('focusin', () => pause('focus'));
  carousel.addEventListener('focusout', (e) => {
    if (!carousel.contains(e.relatedTarget)) resume('focus');
  });

  carousel.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
  });

  // Swipe on touch screens
  let swipeStartX = null;
  carousel.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') swipeStartX = e.clientX;
  });
  carousel.addEventListener('pointerup', (e) => {
    if (swipeStartX === null) return;
    const dx = e.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? index + 1 : index - 1);
  });
  carousel.addEventListener('pointercancel', () => { swipeStartX = null; });

  // Pause when the tab is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause('tab');
    else resume('tab');
  });

  // Open booking from a showtime or the "Book tickets" button
  track.addEventListener('click', (e) => {
    const timeBtn = e.target.closest('.time-btn');
    if (timeBtn) {
      openBooking(Number(timeBtn.dataset.film), Number(timeBtn.dataset.time), timeBtn);
      return;
    }
    const bookBtn = e.target.closest('[data-book]');
    if (bookBtn) openBooking(Number(bookBtn.dataset.book), 0, bookBtn);
  });

  function initCarousel() {
    renderCarousel();
    carousel.style.setProperty('--slide-ms', CONFIG.slideMs + 'ms');
    setActive(0);
    if (reduceMotion) {
      pauseReasons.add('user');      // respect the phone's reduced-motion setting
    } else {
      restartProgress();
      scheduleNext(remaining);
    }
    syncPauseUI();
  }

  /* ---------- Mobile navigation ---------- */
  function closeNav() {
    primaryNav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', () => {
    const open = primaryNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });

  primaryNav.addEventListener('click', (e) => {
    if (e.target.closest('a')) closeNav();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && primaryNav.classList.contains('is-open')) {
      closeNav();
      navToggle.focus();
    }
  });

  window.matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
    if (e.matches) closeNav();
  });

  window.addEventListener('scroll', () => {
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 8);
  }, { passive: true });

  /* ---------- Booking dialog ---------- */
  unitPrice.textContent = inr(CONFIG.ticketPrice);
  upiText.textContent = CONFIG.upiId;
  filmSelect.innerHTML = films.map((film, i) =>
    `<option value="${i}">${esc(film.title)}</option>`
  ).join('');

  function fillTimes(filmIdx, selectedIdx = 0) {
    timeSelect.innerHTML = films[filmIdx].times.map((show, t) =>
      `<option value="${t}">${esc(show.time)} · ${seatsLeft(show)} seats left</option>`
    ).join('');
    timeSelect.value = String(selectedIdx);
  }

  function setDateLimits() {
    const film = films[Number(filmSelect.value)];
    const today = todayISO();
    const min = film.opens && film.opens > today ? film.opens : today;
    dateInput.min = min;
    if (!dateInput.value || dateInput.value < min) dateInput.value = min;
  }

  function updateTotal() {
    const qty = Number(qtyInput.value) || 0;
    payTotal.textContent = inr(qty * CONFIG.ticketPrice);
  }

  function openBooking(filmIdx, timeIdx, trigger) {
    lastTrigger = trigger || null;
    bookingForm.reset();
    bookingForm.hidden = false;
    bookingSuccess.hidden = true;
    bookingError.textContent = '';
    $$('[aria-invalid="true"]', bookingForm).forEach((el) => el.removeAttribute('aria-invalid'));

    filmSelect.value = String(filmIdx);
    fillTimes(filmIdx, timeIdx);
    setDateLimits();
    updateTotal();

    if (!dialog.open) {
      pause('dialog');
      dialog.showModal();
    }
    nameInput.focus();
  }

  function closeBooking() {
    dialog.close();
  }

  dialog.addEventListener('close', () => {
    resume('dialog');
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });

  // Close when the backdrop is clicked
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) closeBooking();
  });

  byId('dialogClose').addEventListener('click', closeBooking);
  byId('successClose').addEventListener('click', closeBooking);

  filmSelect.addEventListener('change', () => {
    fillTimes(Number(filmSelect.value));
    setDateLimits();
    updateTotal();
  });
  qtyInput.addEventListener('input', updateTotal);

  byId('copyUpi').addEventListener('click', async (e) => {
    const button = e.currentTarget;
    try {
      await navigator.clipboard.writeText(CONFIG.upiId);
      button.textContent = 'Copied';
    } catch {
      button.textContent = CONFIG.upiId;
    }
    setTimeout(() => { button.textContent = 'Copy'; }, 1800);
  });

  function validateBooking() {
    const film = films[Number(filmSelect.value)];
    const show = film.times[Number(timeSelect.value)];
    const today = todayISO();
    const date = dateInput.value;
    const qty = Number(qtyInput.value);
    const name = nameInput.value.trim();
    const phone = phoneInput.value.replace(/\s+/g, '');
    const ref = refInput.value.trim().toUpperCase();

    if (!date) return { field: dateInput, message: 'Choose a date for your visit.' };
    if (date < today) return { field: dateInput, message: 'Choose today or a later date.' };
    if (film.opens && date < film.opens) {
      return { field: dateInput, message: `${film.title} opens on ${fmtDate(film.opens)}. Choose a later date.` };
    }
    if (date === today && toMinutes(show.time) <= nowMinutes() + 15) {
      return { field: timeSelect, message: 'This showtime has started or is about to start. Choose a later show.' };
    }
    if (!Number.isInteger(qty) || qty < 1) return { field: qtyInput, message: 'Enter at least one ticket.' };
    if (qty > seatsLeft(show)) {
      return { field: qtyInput, message: `Only ${seatsLeft(show)} seats are left for this show.` };
    }
    if (name.length < 2) return { field: nameInput, message: 'Enter your name.' };
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return { field: phoneInput, message: 'Enter a valid 10-digit mobile number.' };
    }
    if (!/^[A-Z0-9]{8,22}$/.test(ref)) {
      return { field: refInput, message: 'Enter the UPI reference number from your payment app.' };
    }
    return null;
  }

  bookingForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const problem = validateBooking();
    if (problem) {
      bookingError.textContent = problem.message;
      $$('[aria-invalid="true"]', bookingForm).forEach((el) => el.removeAttribute('aria-invalid'));
      problem.field.setAttribute('aria-invalid', 'true');
      problem.field.focus();
      return;
    }

    const filmIdx = Number(filmSelect.value);
    const film = films[filmIdx];
    const show = film.times[Number(timeSelect.value)];
    const qty = Number(qtyInput.value);
    const total = qty * CONFIG.ticketPrice;
    const date = dateInput.value;
    const ref = refInput.value.trim().toUpperCase();

    // TODO: send this order to your booking backend here (see the setup notes).
    // Until a backend is connected, seat counts only change in this browser session.
    show.sold += qty;
    renderTimesFor(filmIdx);

    successText.textContent =
      `${qty} ticket${qty > 1 ? 's' : ''} for ${film.title} at ${show.time} on ${fmtDate(date)}. ` +
      `Total ${inr(total)}. We will check payment reference ${ref} and confirm your seats. ` +
      `A show opens once ${CONFIG.unlockAt} tickets are paid.`;

    bookingForm.hidden = true;
    bookingSuccess.hidden = false;
    byId('successClose').focus();
  });

  /* ---------- Contact form ---------- */
  const contactForm = byId('contactForm');
  const formStatus = byId('formStatus');
  const contactSubmit = byId('contactSubmit');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!contactForm.reportValidity()) return;

    if (contactForm.action.includes('YOUR_FORM_ID')) {
      formStatus.textContent = 'The contact form is not connected yet. Please call us using the number above.';
      formStatus.className = 'form-status is-error';
      return;
    }

    contactSubmit.disabled = true;
    formStatus.textContent = 'Sending…';
    formStatus.className = 'form-status';

    try {
      const response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) throw new Error('Request failed');
      contactForm.reset();
      formStatus.textContent = 'Thank you. We will reply within one working day.';
      formStatus.className = 'form-status is-success';
    } catch {
      formStatus.textContent = 'Your message could not be sent. Please call us instead.';
      formStatus.className = 'form-status is-error';
    } finally {
      contactSubmit.disabled = false;
    }
  });

  /* ---------- Scroll reveal ---------- */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((el) => observer.observe(el));
  }

  /* ---------- Init ---------- */
  $$('[data-media]').forEach(watchImage);
  byId('year').textContent = new Date().getFullYear();
  initCarousel();
  initReveal();
})();
