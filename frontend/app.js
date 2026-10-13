/* =========================================================
   2B ZONE — Script
   ========================================================= */

/* ================== SETTINGS ================== */
const SLIDE_MS    = 3500;          // how long each movie stays (3.5 seconds)
const MAX_PER_SHOW = 30;           // max tickets per show
const UNLOCK_AT   = 5;             // paid tickets needed to unlock a show
const PRICE       = 99;            // ₹ per ticket
const UPI_ID      = "2bzone@upi";  // TODO: replace with your real UPI ID

/* ================== MOVIE DATA ==================
   poster: paste an image URL or path here (e.g. "images/jailer2.jpg").
           Empty = a styled fallback poster is shown.
   times:  sold = tickets already booked for that show (demo values). */
const movies = [
  {
    title: "Drishyam: The Conclusion",
    tag: "Now Showing",
    lang: "Hindi",
    genre: "Crime · Thriller",
    meta: "Ajay Devgn · Tabu · Jaideep Ahlawat",
    desc: "Vijay Salgaonkar and his family come under pressure again as SP Rajveer Singh Tomar enters the story. The final chapter of the Hindi Drishyam franchise.",
    c1: "#4a2f14", c2: "#b57a2a",
    poster: "",
    times: [{ t: "10:30 AM", sold: 12 }, { t: "2:15 PM", sold: 4 }, { t: "7:00 PM", sold: 22 }]
  },
  {
    title: "Jailer 2",
    tag: "Coming 15 Oct",
    lang: "Tamil",
    genre: "Action · Drama",
    meta: "Rajinikanth",
    desc: "Rajinikanth returns in the sequel to the hit film Jailer, scheduled for release on 15 October 2026.",
    c1: "#3b1a10", c2: "#c2452c",
    poster: "",
    times: [{ t: "11:00 AM", sold: 0 }, { t: "3:30 PM", sold: 7 }, { t: "9:00 PM", sold: 18 }]
  },
  {
    title: "Prahaar",
    tag: "Coming 16 Oct",
    lang: "Hindi",
    genre: "Drama",
    meta: "Rajkummar Rao · The Untold Story of Ujjwal Nikam",
    desc: "Rajkummar Rao's Hindi film on the untold story of Ujjwal Nikam, releasing 16 October 2026.",
    c1: "#1d2a1a", c2: "#6a8f3a",
    poster: "",
    times: [{ t: "12:00 PM", sold: 3 }, { t: "4:45 PM", sold: 9 }, { t: "8:15 PM", sold: 0 }]
  },
  {
    title: "Ranabaali",
    tag: "Coming 16 Oct",
    lang: "Telugu",
    genre: "Period Action Drama",
    meta: "Vijay Deverakonda · Rashmika Mandanna",
    desc: "A period action drama set in 1870s South India during the great famine, starring Vijay Deverakonda and Rashmika Mandanna.",
    c1: "#14213a", c2: "#3c6fb5",
    poster: "",
    times: [{ t: "1:00 PM", sold: 6 }, { t: "5:30 PM", sold: 15 }, { t: "10:00 PM", sold: 1 }]
  }
];

/* ================== ELEMENTS ================== */
const $ = (id) => document.getElementById(id);
const slidesEl = $("slides");
const dotsEl   = $("dots");
const bar      = $("bar");
const stage    = $("stage");
const modal    = $("modal");

let current = 0;
let timer = null;
let hovering = false;
let modalOpen = false;
let paused = false;

/* ================== HEADER MENU ================== */
$("menuBtn").addEventListener("click", () => $("links").classList.toggle("open"));
document.querySelectorAll("#links a").forEach((a) =>
  a.addEventListener("click", () => $("links").classList.remove("open"))
);

/* ================== CAROUSEL ================== */
function timesHTML(i) {
  return movies[i].times.map((s, j) => {
    const left = MAX_PER_SHOW - s.sold;
    const need = Math.max(0, UNLOCK_AT - s.sold);
    return `
      <button class="time-chip ${need ? "" : "unlocked"}" data-movie="${i}" data-time="${j}">
        <b>${s.t}</b>
        <small>${left} seats left · ${need ? need + " more to unlock" : "Unlocked ✓"}</small>
      </button>`;
  }).join("");
}

function slideHTML(m, i) {
  return `
    <article class="slide" data-i="${i}">
      <div class="slide-inner">
        <div class="poster" style="--c1:${m.c1};--c2:${m.c2}">
          <div class="poster-fallback"><span>${m.title}</span></div>
          ${m.poster ? `<img src="${m.poster}" alt="${m.title} poster" onerror="this.remove()" />` : ""}
          <span class="poster-tag">${m.tag}</span>
        </div>
        <div class="info">
          <p class="genre fx" style="--d:.2s">${m.lang} · ${m.genre}</p>
          <h3 class="fx" style="--d:.25s">${m.title}</h3>
          <p class="meta fx" style="--d:.3s">${m.meta}</p>
          <p class="desc fx" style="--d:.35s">${m.desc}</p>
          <p class="label fx" style="--d:.4s">Show timings</p>
          <div class="times fx" style="--d:.45s">${timesHTML(i)}</div>
          <div class="actions fx" style="--d:.6s">
            <button class="btn btn-primary" data-book="${i}">Book the ticket →</button>
          </div>
        </div>
      </div>
    </article>`;
}

function build() {
  slidesEl.innerHTML = movies.map((m, i) => slideHTML(m, i)).join("");
  dotsEl.innerHTML = movies.map((m, i) =>
    `<button class="dot" data-i="${i}" aria-label="Show ${m.title}"></button>`
  ).join("");
}

function renderTimes(i) {
  document.querySelector(`.slide[data-i="${i}"] .times`).innerHTML = timesHTML(i);
}

// Animation: the new movie slides in from the LEFT, the old one exits to the RIGHT
function activate(n) {
  const slides = slidesEl.querySelectorAll(".slide");
  if (slides[current]) slides[current].classList.replace("active", "leaving");

  current = (n + movies.length) % movies.length;
  const next = slides[current];
  next.classList.remove("leaving", "active");
  void next.offsetWidth;           // restart the CSS animation
  next.classList.add("active");

  dotsEl.querySelectorAll(".dot").forEach((d, k) => d.classList.toggle("on", k === current));
  restartProgress();
}

function restartProgress() {
  bar.style.animation = "none";
  void bar.offsetWidth;
  bar.style.animation = `fill ${SLIDE_MS}ms linear forwards`;
  bar.style.animationPlayState = paused ? "paused" : "running";
}

function schedule() {
  clearTimeout(timer);
  if (paused) return;
  timer = setTimeout(() => {
    activate(current + 1);
    schedule();
  }, SLIDE_MS);
}

function go(n) {
  activate(n);
  schedule();
}

// Pause while hovering or while the booking modal is open
function syncPlay() {
  const shouldPause = hovering || modalOpen;
  if (shouldPause) {
    paused = true;
    clearTimeout(timer);
    bar.style.animationPlayState = "paused";
  } else if (paused) {
    paused = false;
    restartProgress();
    schedule();
  }
}

// Remove "leaving" once the exit animation finishes
slidesEl.addEventListener("animationend", (e) => {
  if (e.target.classList.contains("leaving")) e.target.classList.remove("leaving");
});

// Controls
$("prevBtn").addEventListener("click", () => go(current - 1));
$("nextBtn").addEventListener("click", () => go(current + 1));
dotsEl.addEventListener("click", (e) => {
  const d = e.target.closest(".dot");
  if (d) go(+d.dataset.i);
});

// Hover pause
stage.addEventListener("mouseenter", () => { hovering = true; syncPlay(); });
stage.addEventListener("mouseleave", () => { hovering = false; syncPlay(); });

// Swipe support (mobile)
let touchX = null;
stage.addEventListener("touchstart", (e) => {
  touchX = e.touches[0].clientX;
  hovering = true;
  syncPlay();
}, { passive: true });

stage.addEventListener("touchend", (e) => {
  if (touchX !== null) {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 40) go(dx < 0 ? current + 1 : current - 1);
  }
  touchX = null;
  hovering = false;
  syncPlay();
});

// Book / showtime clicks
slidesEl.addEventListener("click", (e) => {
  const t = e.target.closest("[data-time]");
  if (t) { openModal(+t.dataset.movie, +t.dataset.time); return; }
  const b = e.target.closest("[data-book]");
  if (b) openModal(+b.dataset.book, 0);
});

/* ================== BOOKING MODAL ================== */
const bookingView = $("bookingView");
const successView = $("successView");
const fMovie = $("fMovie"), fTime = $("fTime"), fDate = $("fDate"), fQty = $("fQty");
const fName  = $("fName"),  fPhone = $("fPhone"), fRef = $("fRef"), fError = $("fError");
const fTotal = $("fTotal");

$("upiId").textContent = UPI_ID;

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fillTimes(movieIdx, selected = 0) {
  fTime.innerHTML = movies[movieIdx].times.map((s, j) =>
    `<option value="${j}">${s.t} (${MAX_PER_SHOW - s.sold} seats left)</option>`
  ).join("");
  fTime.value = selected;
}

function updateTotal() {
  fTotal.textContent = "₹" + PRICE * (parseInt(fQty.value, 10) || 0);
}

function openModal(movieIdx, timeIdx) {
  fMovie.innerHTML = movies.map((m, i) => `<option value="${i}">${m.title}</option>`).join("");
  fMovie.value = movieIdx;
  fillTimes(movieIdx, timeIdx ?? 0);
  fDate.min = todayISO();
  if (!fDate.value) fDate.value = todayISO();
  fQty.value = 1;
  updateTotal();
  fError.textContent = "";
  bookingView.hidden = false;
  successView.hidden = true;
  modal.classList.add("open");
  modalOpen = true;
  syncPlay();
}

function closeModal() {
  modal.classList.remove("open");
  modalOpen = false;
  syncPlay();
}

fMovie.addEventListener("change", () => { fillTimes(+fMovie.value); updateTotal(); });
fQty.addEventListener("input", updateTotal);
$("closeModal").addEventListener("click", closeModal);
$("doneBtn").addEventListener("click", closeModal);
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
});

$("copyUpi").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(UPI_ID);
    e.target.textContent = "Copied!";
    setTimeout(() => (e.target.textContent = "Copy"), 1500);
  } catch {
    alert("UPI ID: " + UPI_ID);
  }
});

$("bookingForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const i = +fMovie.value;
  const j = +fTime.value;
  const qty = parseInt(fQty.value, 10);
  const show = movies[i].times[j];
  const seatsLeft = MAX_PER_SHOW - show.sold;
  const name = fName.value.trim();
  const phone = fPhone.value.trim();
  const ref = fRef.value.trim();

  let err = "";
  if (!fDate.value) err = "Please choose a date.";
  else if (!name) err = "Please enter your name.";
  else if (!/^[6-9]\d{9}$/.test(phone)) err = "Enter a valid 10-digit mobile number.";
  else if (!qty || qty < 1) err = "Tickets must be at least 1.";
  else if (qty > seatsLeft) err = `Only ${seatsLeft} seats left for this show.`;
  else if (!ref) err = "Please enter the UPI reference number.";

  if (err) { fError.textContent = err; return; }

  // Demo only: in a real site, send this to your server / sheet and verify the payment there.
  show.sold += qty;
  renderTimes(i);

  $("successText").textContent =
    `${qty} ticket(s) for ${movies[i].title} at ${show.t} on ${fDate.value}. ` +
    `Total ₹${qty * PRICE}. We will verify your payment (ref: ${ref}) and confirm your seats. ` +
    `The show is unlocked after ${UNLOCK_AT} paid tickets.`;

  bookingView.hidden = true;
  successView.hidden = false;
});

/* ================== INIT ================== */
build();
activate(0);
schedule();
  
