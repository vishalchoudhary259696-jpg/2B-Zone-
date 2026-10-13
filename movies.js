/* ===== SETTINGS ===== */
var CONFIG = {
  UPI_ID: '2bzone@upi',          // your business UPI ID
  PAYEE_NAME: '2B Zone',         // name shown in the UPI app
  TICKET_PRICE: 99,              // fixed price per ticket (₹)
  MAX_TICKETS: 10,

  // Animation timing (milliseconds)
  FIRST_TICKET_DELAY_MS: 3500,   // loading time before the first ticket appears
  TICKET_HOLD_MS: 4000,          // how long each ticket stays on screen (with Book now)
  SLIDE_GAP_MS: 0                // pause between one ticket leaving and the next one entering
};

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

/* ===== TICKET MARKUP ===== */
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

var stage = document.getElementById('stage');
var dotsEl = document.getElementById('dots');

stage.innerHTML =
  '<div class="skeleton" id="skeleton"><span>Loading shows…</span></div>' +
  ticketHTML('prahaar') +
  ticketHTML('ranabaali');

dotsEl.innerHTML = Object.keys(FILMS)
  .map(function (k) {
    return '<button class="dot" data-film="' + k + '" aria-label="' + FILMS[k].title + '"></button>';
  })
  .join('');

/* ===== ANIMATION ===== */
var current = null;
var timers = [];

function goTo(key) {
  var target = stage.querySelector('.ticket[data-film="' + key + '"]');

  if (current && current !== key) {
    var prev = stage.querySelector('.ticket[data-film="' + current + '"]');
    prev.classList.remove('is-active');
    prev.classList.add('is-out');              // current ticket slides out to the left
  }

  if (!target.classList.contains('is-active')) {
    // new ticket is placed on the right, then slides in from right to left
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
  var order = Object.keys(FILMS);

  order.forEach(function (key, i) {
    var at = CONFIG.FIRST_TICKET_DELAY_MS + i * (CONFIG.TICKET_HOLD_MS + CONFIG.SLIDE_GAP_MS);

    timers.push(setTimeout(function () {
      if (i === 0) {
        document.getElementById('skeleton').classList.add('hide');
      }
      goTo(key);
    }, at));
  });
}

function stopAutoplay() {
  timers.forEach(clearTimeout);
  timers = [];
  document.getElementById('skeleton').classList.add('hide');
}

/* ===== EVENTS ===== */
dotsEl.addEventListener('click', function (e) {
  var b = e.target.closest('.dot');
  if (!b) return;
  stopAutoplay();
  goTo(b.dataset.film);
});

stage.addEventListener('click', function (e) {
  var b = e.target.closest('.btn-book');
  if (!b) return;
  openBooking(b.dataset.film);
});

document.getElementById('exploreMovies').addEventListener('click', function () {
  document.getElementById('showing').scrollIntoView({ behavior: 'smooth' });
});

/* ===== BOOKING SHEET ===== */
var overlay = document.getElementById('overlay');
var sheetTitle = document.getElementById('sheetTitle');
var showSel = document.getElementById('showSel');
var dateIn = document.getElementById('dateIn');
var qtyIn = document.getElementById('qtyIn');
var nameIn = document.getElementById('nameIn');
var phoneIn = document.getElementById('phoneIn');
var msgEl = document.getElementById('msg');
var sumFilm = document.getElementById('sumFilm');
var sumShow = document.getElementById('sumShow');
var sumDate = document.getElementById('sumDate');
var sumTickets = document.getElementById('sumTickets');
var sumUpi = document.getElementById('sumUpi');
var sumTotal = document.getElementById('sumTotal');
var payAmt = document.getElementById('payAmt');

var booking = { film: null, qty: 1 };

var APP_SCHEMES = {
  gpay: 'gpay://upi/pay?',
  phonepe: 'phonepe://pay?',
  paytm: 'paytmmp://pay?',
  upi: 'upi://pay?'
};

var APP_LABELS = {
  gpay: 'Google Pay',
  phonepe: 'PhonePe',
  paytm: 'Paytm',
  upi: 'UPI app'
};

function todayISO() {
  var d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function showMsg(text) {
  msgEl.textContent = text;
}

function refreshSummary() {
  var f = FILMS[booking.film];
  var show = f.shows[Number(showSel.value)] || f.shows[0];
  var amount = booking.qty * CONFIG.TICKET_PRICE;

  sumFilm.textContent = f.title;
  sumShow.textContent = show.time;
  sumDate.textContent = dateIn.value || '-';
  sumTickets.textContent = booking.qty;
  sumUpi.textContent = CONFIG.UPI_ID;
  sumTotal.textContent = '₹' + amount;
  payAmt.textContent = '₹' + amount;
}

function setQty(n) {
  booking.qty = Math.min(CONFIG.MAX_TICKETS, Math.max(1, n));
  qtyIn.value = booking.qty;
  refreshSummary();
}

function openBooking(key) {
  stopAutoplay();
  var f = FILMS[key];
  booking = { film: key, qty: 1 };

  sheetTitle.textContent = f.title + ' · Book seats';
  showSel.innerHTML = f.shows
    .map(function (s, i) {
      return '<option value="' + i + '">' + s.time + ' (' + s.seats + ' seats left)</option>';
    })
    .join('');

  dateIn.min = todayISO();
  dateIn.value = todayISO();
  nameIn.value = '';
  phoneIn.value = '';
  qtyIn.value = 1;
  showMsg('');
  refreshSummary();

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBooking() {
  overlay.classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('minus').addEventListener('click', function () { setQty(booking.qty - 1); });
document.getElementById('plus').addEventListener('click', function () { setQty(booking.qty + 1); });
showSel.addEventListener('change', refreshSummary);
dateIn.addEventListener('change', refreshSummary);
document.getElementById('closeBtn').addEventListener('click', closeBooking);
overlay.addEventListener('click', function (e) { if (e.target === overlay) closeBooking(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBooking(); });

phoneIn.addEventListener('input', function () {
  phoneIn.value = phoneIn.value.replace(/\D/g, '').slice(0, 10);
});

/* ===== PAYMENT: opens the chosen UPI app with a fixed amount ===== */
function validateForm() {
  var name = nameIn.value.trim();
  var phone = phoneIn.value.trim();

  if (name.length < 2) { showMsg('Please enter your name.'); return null; }
  if (!/^[6-9]\d{9}$/.test(phone)) { showMsg('Please enter a valid 10-digit mobile number.'); return null; }
  if (!dateIn.value) { showMsg('Please choose a date.'); return null; }
  return { name: name };
}

function payWith(app) {
  var check = validateForm();
  if (!check) return;

  var f = FILMS[booking.film];
  var show = f.shows[Number(showSel.value)] || f.shows[0];
  var amount = booking.qty * CONFIG.TICKET_PRICE;   // always tickets × ₹99
  var note = (f.title + ' ' + show.time + ' ' + dateIn.value + ' x' + booking.qty + ' ' + check.name).slice(0, 60);
  var ref = 'BZ' + Date.now().toString(36).toUpperCase();

  var params = [
    ['pa', CONFIG.UPI_ID],
    ['pn', CONFIG.PAYEE_NAME],
    ['am', amount.toFixed(2)],
    ['cu', 'INR'],
    ['tn', note],
    ['tr', ref]
  ];
  var query = params
    .map(function (p) { return p[0] + '=' + encodeURIComponent(p[1]); })
    .join('&');

  showMsg('');
  window.location.href = APP_SCHEMES[app] + query;

  setTimeout(function () {
    if (!document.hidden) {
      showMsg(APP_LABELS[app] + ' did not open. Try "Any UPI app" or pay ₹' + amount + ' to UPI ID: ' + CONFIG.UPI_ID);
    }
  }, 1800);
}

document.querySelectorAll('.pay-app').forEach(function (btn) {
  btn.addEventListener('click', function () { payWith(btn.dataset.app); });
});

/* ===== START ===== */
play();
