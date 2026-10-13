/* js/ticket-animation.js
 * Ticket stage for the home page.
 * Flow: loading -> first movie ticket (with Book now) holds for TICKET_HOLD_MS
 *       -> slides out right to left -> next movie ticket slides in at the same place.
 * Clicking Book now dispatches a "book-film" event, which js/movies.js listens for.
 */
(function () {
  "use strict";

  /* ===== SETTINGS ===== */
  var CONFIG = {
    TICKET_PRICE: 99,              // shown on the ticket (payment amount is set in movies.js)
    FIRST_TICKET_DELAY_MS: 3500,   // loading time before the first ticket appears
    TICKET_HOLD_MS: 4000,          // how long each ticket stays on screen
    SLIDE_GAP_MS: 0                // pause between one ticket leaving and the next entering
  };

  /* ===== FILMS ===== */
  var FILMS = {
    prahaar: {
      title: 'Prahaar',
      status: 'Now showing',
      poster: '',                  // paste the Prahaar poster image URL here
      shows: [{ time: '12:00 PM', seats: 27 }]
    },
    ranabaali: {
      title: 'Ranabaali',
      status: 'Coming soon',
      poster: '',                  // paste the Ranabaali poster image URL here
      language: 'Telugu',
      genre: 'Period action drama',
      cast: 'Vijay Deverakonda, Rashmika Mandanna',
      shows: [{ time: '12:00 PM', seats: 30 }]
    }
  };
  window.FILMS = FILMS;            // shared with js/movies.js

  var stage = document.getElementById('stage');
  var dotsEl = document.getElementById('dots');
  if (!stage || !dotsEl) return;

  var keys = Object.keys(FILMS);
  var current = null;
  var timers = [];

  /* ===== MARKUP ===== */
  function ticketHTML(key) {
    var f = FILMS[key];
    var s = f.shows[0];
    var meta = key === 'prahaar'
      ? '<div class="meta"><small>Next show</small><strong>' + s.time + ', ' + s.seats + ' seats left</strong></div>'
      : '<div class="meta"><small>' + f.language + ' · ' + f.genre + '</small><strong>' + f.cast + '</strong></div>';
    var posterImg = f.poster
      ? '<img src="' + f.poster + '" alt="' + f.title + ' poster" onerror="this.remove()">'
      : '';

    return '' +
      '<div class="ticket is-wait" data-film="' + key + '">' +
        '<div class="ticket-card">' +
          '<div class="tk-left">' +
            '<div>' +
              '<div class="tag">' + f.status + '</div>' +
              '<h3 class="film">' + f.title + '</h3>' +
              '<div class="price">₹' + CONFIG.TICKET_PRICE + ' a ticket</div>' +
            '</div>' +
            meta +
          '</div>' +
          '<div class="tk-right">' +
            '<div class="poster"><span class="ph">' + f.title.charAt(0) + '</span>' + posterImg + '</div>' +
            '<button class="btn-book" data-film="' + key + '">Book now</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  stage.innerHTML =
    '<div class="skeleton" id="skeleton"><span>Loading shows…</span></div>' +
    keys.map(function (k) { return ticketHTML(k); }).join('');

  dotsEl.innerHTML = keys
    .map(function (k) {
      return '<button class="dot" data-film="' + k + '" aria-label="' + FILMS[k].title + '"></button>';
    })
    .join('');

  /* ===== ANIMATION ===== */
  function goTo(key) {
    var target = stage.querySelector('.ticket[data-film="' + key + '"]');
    if (!target) return;

    if (current && current !== key) {
      var prev = stage.querySelector('.ticket[data-film="' + current + '"]');
      if (prev) {
        prev.classList.remove('is-active');
        prev.classList.add('is-out');          // slides out to the left
      }
    }

    if (!target.classList.contains('is-active')) {
      // place the new ticket off-screen on the right, then slide it in
      target.classList.add('snap');
      target.classList.remove('is-out', 'is-active');
      target.classList.add('is-wait');
      void target.offsetWidth;
      target.classList.remove('snap');
      void target.offsetWidth;
      target.classList.remove('is-wait');
      target.classList.add('is-active');
    }

    current = key;
    document.querySelectorAll('.dot').forEach(function (d) {
      d.classList.toggle('on', d.dataset.film === key);
    });
  }

  function play() {
    var skeleton = document.getElementById('skeleton');

    keys.forEach(function (key, i) {
      var at = CONFIG.FIRST_TICKET_DELAY_MS + i * (CONFIG.TICKET_HOLD_MS + CONFIG.SLIDE_GAP_MS);

      timers.push(setTimeout(function () {
        if (i === 0 && skeleton) skeleton.classList.add('hide');
        goTo(key);
      }, at));
    });
  }

  function stop() {
    timers.forEach(clearTimeout);
    timers = [];
    var skeleton = document.getElementById('skeleton');
    if (skeleton) skeleton.classList.add('hide');
  }

  /* ===== EVENTS ===== */
  dotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.dot');
    if (!b) return;
    stop();
    goTo(b.dataset.film);
  });

  stage.addEventListener('click', function (e) {
    var b = e.target.closest('.btn-book');
    if (!b) return;
    stop();
    document.dispatchEvent(new CustomEvent('book-film', { detail: { film: b.dataset.film } }));
  });

  /* ===== START ===== */
  play();
})();
