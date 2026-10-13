/* js/movies.js
 * Booking sheet and UPI payment.
 * Listens for the "book-film" event dispatched by js/ticket-animation.js.
 * Load order in index.html: ticket-animation.js first, then movies.js.
 */
(function () {
  "use strict";

  var FILMS = window.FILMS;
  if (!FILMS) return;

  /* ===== SETTINGS: payment ===== */
  var CONFIG = {
    UPI_ID: '2bzone@upi',        // your business UPI ID
    PAYEE_NAME: '2B Zone',       // name shown in the UPI app
    TICKET_PRICE: 99,            // fixed price per ticket (₹)
    MAX_TICKETS: 10
  };

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

  /* ===== ELEMENTS ===== */
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

  if (!overlay) return;

  var booking = { film: null, qty: 1 };

  /* ===== HELPERS ===== */
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

  /* ===== BOOKING SHEET ===== */
  function openBooking(key) {
    var f = FILMS[key];
    if (!f) return;
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

  document.addEventListener('book-film', function (e) {
    openBooking(e.detail.film);
  });

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

  document.getElementById('exploreMovies').addEventListener('click', function () {
    document.getElementById('showing').scrollIntoView({ behavior: 'smooth' });
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
})();
