
const grid = document.getElementById("movieGrid");
const dialog = document.getElementById("bookingDialog");
const form = document.getElementById("bookingForm");
const toast = document.getElementById("toast");

let currentBooking = null;

document.getElementById("year").textContent =
  new Date().getFullYear();

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[char]));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// Scroll reveal animation
function observeReveals() {
  const elements = document.querySelectorAll(".reveal:not(.visible)");

  if (!("IntersectionObserver" in window)) {
    elements.forEach(el => el.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  elements.forEach(el => observer.observe(el));
}

// Load movies from the backend
async function loadMovies() {
  try {
    const response = await fetch("/api/movies");
    if (!response.ok) throw new Error("Unable to load movies.");

    const movies = await response.json();

    if (!movies.length) {
      grid.innerHTML = "<p>No movies available right now.</p>";
      return;
    }

    grid.innerHTML = movies.map(movie => {
      const count = Number(movie.confirmedTickets || 0);
      const progress = Math.min(100, count / 5 * 100);
      const ready = count >= 5;

      return `
        <article class="movie-card reveal">
          <div class="movie-image">
            <img src="${escapeHTML(movie.poster)}"
                 alt="${escapeHTML(movie.title)} poster"
                 loading="lazy">
            <span class="movie-tag">
              ${ready ? "5 TICKETS REACHED" : "COMING SOON"}
            </span>
            <span class="movie-price">₹99 / ticket</span>
          </div>

          <div class="movie-info">
            <h3>${escapeHTML(movie.title)}</h3>
            <p class="movie-genre">${escapeHTML(movie.genre || "Movie")}</p>

            <p class="movie-description">
              ${escapeHTML(movie.description || "")}
            </p>

            <div class="progress-head">
              <span>⭐ 5 Tickets Complete Hone Par Next Show Confirm Hoga!</span>
              <span>${count}/5</span>
            </div>

            <div class="progress-track">
              <div class="progress-fill" style="width:${progress}%"></div>
            </div>

            <p class="movie-status">
              ${ready
                ? "<strong>Minimum reached!</strong> Show timing will be announced."
                : `<strong>${5 - count} more</strong> confirmed ticket(s) needed.`}
              <br>Show Timing: Soon
            </p>

            <button class="book-button"
              data-id="${escapeHTML(movie.id)}"
              data-title="${escapeHTML(movie.title)}">
              Book Tickets ↗
            </button>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll(".book-button").forEach(button => {
      button.addEventListener("click", () => {
        openBooking(button.dataset.id, button.dataset.title);
      });
    });

    observeReveals();
  } catch (error) {
    grid.innerHTML =
      "<p>Could not load movies. Check the server and refresh.</p>";
  }
}

function openBooking(movieId, title) {
  currentBooking = null;

  document.getElementById("movieId").value = movieId;
  document.getElementById("dialogMovieTitle").textContent = title;

  document.getElementById("bookingFormView").hidden = false;
  document.getElementById("paymentView").hidden = true;
  document.getElementById("bookingDone").hidden = true;

  form.reset();
  updateTotal();
  dialog.showModal();
}

function updateTotal() {
  const tickets = Number(
    document.getElementById("ticketCount").value
  );

  document.getElementById("totalAmount").textContent =
    "₹" + tickets * 99;
}

document.getElementById("ticketCount")
  .addEventListener("change", updateTotal);

document.getElementById("closeDialog")
  .addEventListener("click", () => dialog.close());

document.getElementById("doneClose")
  .addEventListener("click", () => {
    dialog.close();
    loadMovies();
  });

// Create a booking on the server
form.addEventListener("submit", async event => {
  event.preventDefault();

  const submitButton = form.querySelector('[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Creating booking...";

  try {
    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        movieId: document.getElementById("movieId").value,
        name: document.getElementById("customerName").value,
        mobile: document.getElementById("customerMobile").value,
        tickets: Number(document.getElementById("ticketCount").value)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Booking failed.");
    }

    currentBooking = data.booking;

    document.getElementById("bookingFormView").hidden = true;
    document.getElementById("paymentView").hidden = false;

    document.getElementById("payeeName").textContent =
      data.payment.payeeName;

    document.getElementById("upiIdText").textContent =
      data.payment.upiId;

    document.getElementById("payTotal").textContent =
      "₹" + data.payment.amount;

    document.getElementById("bookingIdText").textContent =
      data.booking.id;

    document.getElementById("paymentInstructions").textContent =
      `Pay ₹${data.payment.amount} for booking ${data.booking.id}.`;

    document.getElementById("payNowLink").href =
      data.payment.upiLink;

  } catch (error) {
    showToast(error.message);
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Continue to Payment ↗";
  }
});

// Copy booking ID
document.getElementById("copyBookingId")
  .addEventListener("click", async () => {
    const id = document.getElementById("bookingIdText").textContent;

    try {
      await navigator.clipboard.writeText(id);
      showToast("Booking ID copied.");
    } catch {
      showToast("Please copy the booking ID manually.");
    }
  });

// This only displays the pending message.
// It does NOT verify whether the payment was received.
document.getElementById("finishPayment")
  .addEventListener("click", () => {
    if (!currentBooking) return;

    document.getElementById("paymentView").hidden = true;
    document.getElementById("bookingDone").hidden = false;

    document.getElementById("doneMessage").textContent =
      `Booking ${currentBooking.id} is pending payment verification. ` +
      "Your tickets will be confirmed after 2B Zone verifies the payment.";
  });

observeReveals();
loadMovies();
