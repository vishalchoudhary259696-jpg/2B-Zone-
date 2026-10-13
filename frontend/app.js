/* =========================================================
   2B ZONE: script.js
   Path: js/script.js
   ========================================================= */

/* ================== SETTINGS ================== */
const SLIDE_MS     = 3500;          // how long each movie stays (3.5 seconds)
const MAX_PER_SHOW = 30;            // max tickets per show
const UNLOCK_AT    = 5;             // paid tickets needed to unlock a show
const PRICE        = 99;            // ₹ per ticket
const UPI_ID       = "2bzone@upi";  // TODO: replace with your real UPI ID

/* ================== MOVIE DATA ==================
   poster: image path or URL (e.g. "images/jailer2.jpg"). Empty = styled fallback.
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

let current   = 0;
let timer     = null;
let hovering  = false;
let modalOpen = false;
let paused    = false;

/* ================== HEADER MENU ================== */
$("menuBtn").addEventListener("click", () => $("links").classList.toggle("open"));
document.querySelectorAll("#links a").forEach((a) =>
  a.addEventListener("click", () => $("links").classList.remove("open"))
);

/* ================== CAROUSEL: RENDERING ================== */
function timesHTML(i) {
  return movies[i].times.map((s, j) => {
    const left = MAX_PER_SHOW - s.
