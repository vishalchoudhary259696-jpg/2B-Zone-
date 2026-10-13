
"use strict";

// ======================================
// 2B ZONE WEBSITE SETTINGS
// ======================================

// Replace this with your actual UPI ID before using payment.
const UPI_ID = "YOUR-UPI-ID@upi";
const TICKET_PRICE = 99;

// Demo movie data. Replace with your actual movie list.
const movies = [
  {
    id: "movie1",
    title: "Interstellar",
    genre: "Sci-Fi · Adventure",
    year: "2014",
    poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
    confirmed: 2
  },
  {
    id: "movie2",
    title: "Inception",
    genre: "Sci-Fi · Thriller",
    year: "2010",
    poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg",
    confirmed: 3
  },
  {
    id: "movie3",
    title: "The Batman",
    genre: "Action · Crime",
    year: "2022",
    poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
    confirmed: 1
  },
  {
    id: "movie4",
    title: "Dune: Part Two",
    genre: "Sci-Fi · Adventure",
    year: "2024",
    poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
    confirmed: 4
  }
];

const movieGrid = document.getElementById("movieGrid");
const movieSelect = document.getElementById("movieSelect");
const ticketCount = document.getElementById("ticketCount");
const totalPrice = document.getElementById("totalPrice");
const bookingForm = document.getElementById("bookingForm");
const formMessage = document.getElementById("formMessage");
const payButton = document.getElementById("payButton");

// Safely escape text before placing it in HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

// ======================================
// DISPLAY MOVIE CARDS
// ======================================

function displayMovies() {
  movieGrid.innerHTML = movies.map(movie => {
    const confirmed = Math.max(0, Number(movie.confirmed) || 0);
    const progress = Math.min(100, confirmed / 5 * 100);

    return `
      <article class="movie-card reveal">
        <div class="movie-poster">
          <img
            src="${escapeHTML(movie.poster)}"
            alt="${escapeHTML(movie.title)} movie poster"
            loading="lazy"
            onerror="this.style.display='none'"
          >
          <span class="poster-tag">2B PICK</span>
        </div>

        <div class="movie-info">
          <h3>${escapeHTML(movie.title)}</h3>

          <div class="movie-meta">
            ${escapeHTML(movie.genre)} · ${escapeHTML(movie.year)}
          </div>

          <div class="progress-label">
            <span>Verified tickets</span>
            <strong>${confirmed}/5</strong>
          </div>

          <div class="progress-track">
            <div class="progress-fill" style="width:${progress}%"></div>
          </div>

          <p class="show-time">
            ⭐ ${confirmed >= 5
              ? "Ready for owner confirmation"
              : "5 paid tickets needed"}
            <br>Show Timing: Coming Soon
          </p>

          <button
            class="button primary-button card-book"
            type="button"
            data-movie-id="${escapeHTML(movie.id)}"
          >
            Book for ₹${TICKET_PRICE} →
          </button>
        </div>
      </article>
    `;
  }).join("");

  movieSelect.innerHTML =
    '<option value="">Choose a movie</option>' +
    movies.map(movie => `
      <option value="${escapeHTML(movie.id)}">
        ${escapeHTML(movie.title)}
      </option>
    `).join("");

  document.querySelectorAll("[data-movie-id]").forEach(button => {
    button.addEventListener("click", () => {
      movieSelect.value = button.dataset.movieId;
      updateTotal();

      document.getElementById("booking").scrollIntoView({
        behavior: "smooth"
      });

      document.getElementById("customerName").focus({
        preventScroll: true
      });
    });
  });

  setupScrollAnimations();
}

// ======================================
// CALCULATE TICKET TOTAL
// ======================================

function updateTotal() {
  let quantity = Number(ticketCount.value);

  if (!Number.isFinite(quantity)) quantity = 1;

  quantity = Math.max(1, Math.min(30, Math.floor(quantity)));
  ticketCount.value = quantity;

  const total = quantity * TICKET_PRICE;
  totalPrice.textContent = `₹${total}`;

  // Create a UPI payment request.
  const selectedMovie = movies.find(
    movie => movie.id === movieSelect.value
  );

  const movieName = selectedMovie
    ? selectedMovie.title
    : "2B Zone Movie Tickets";

  const params = new URLSearchParams({
    pa: UPI_ID,
    pn: "2B Zone",
    am: String(total),
    cu: "INR",
    tn: `${movieName} - ${quantity} ticket(s)`
  });

  payButton.href = `upi://pay?${params.toString()}`;
}

// ======================================
// COPY UPI ID
// ======================================

document.getElementById("copyUpi").addEventListener("click", async () => {
  const copyButton = document.getElementById("copyUpi");

  try {
    await navigator.clipboard.writeText(UPI_ID);
    copyButton.textContent = "Copied!";
  } catch {
    showMessage(
      `Your UPI ID is ${UPI_ID}. Please copy it manually.`,
      false
    );
  }

  setTimeout(() => {
    copyButton.textContent = "Copy";
  }, 1800);
});

// ======================================
// BOOKING FORM
// ======================================

function showMessage(message, success) {
  formMessage.textContent = message;
  formMessage.className =
    `form-message ${success ? "success" : "error"}`;
}

bookingForm.addEventListener("submit", event => {
  event.preventDefault();

  if (!bookingForm.reportValidity()) return;

  const selectedMovie = movies.find(
    movie => movie.id === movieSelect.value
  );

  if (!selectedMovie) {
    showMessage("Please select a movie first.", false);
    return;
  }

  const name = document.getElementById("customerName").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const quantity = Number(ticketCount.value);
  const paymentRef = document.getElementById("paymentRef").value.trim();

  if (quantity < 1 || quantity > 30) {
    showMessage("Please select between 1 and 30 tickets.", false);
    return;
  }

  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showMessage("Please enter a valid 10-digit mobile number.", false);
    return;
  }

  if (!paymentRef) {
    showMessage("Please enter your UPI payment reference.", false);
    return;
  }

  // Front-end demo only: no booking is saved on a server.
  // Do not claim payment is verified or increase confirmed tickets.
  const bookingRequest = {
    movieId: selectedMovie.id,
    movie: selectedMovie.title,
    customerName: name,
    mobile: mobile,
    tickets: quantity,
    total: quantity * TICKET_PRICE,
    paymentReference: paymentRef,
    status: "Pending owner payment verification"
  };

  console.log("Demo booking request:", bookingRequest);

  showMessage(
    "Demo only: your request was checked in this browser, but it has NOT been saved or sent to 2B Zone. Connect a backend before accepting real bookings.",
    false
  );
});

// ======================================
// MOBILE NAVIGATION
// ======================================

const menuToggle = document.getElementById("menuToggle");
const navMenu = document.getElementById("navMenu");

menuToggle.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

navMenu.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

// ======================================
// SMOOTH SCROLL REVEAL ANIMATIONS
// ======================================

function setupScrollAnimations() {
  const elements = document.querySelectorAll(
    ".reveal:not(.is-visible)"
  );

  if (
    !("IntersectionObserver" in window) ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    elements.forEach(element => {
      element.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12
  });

  elements.forEach(element => observer.observe(element));
}

// ======================================
// INITIALIZE WEBSITE
// ======================================

document.body.classList.add("js-motion");

document.getElementById("year").textContent =
  new Date().getFullYear();

document.getElementById("upiIdText").textContent = UPI_ID;

ticketCount.addEventListener("input", updateTotal);
movieSelect.addEventListener("change", updateTotal);

displayMovies();
updateTotal();
