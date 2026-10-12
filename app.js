
(() => {
  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/+$/, "");
  const $ = id => document.getElementById(id);
  let lastRef = "";

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  const money = n => new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0
  }).format(n);

  async function api(path, options = {}) {
    if (!API || API.includes("REPLACE-WITH"))
      throw Error("Set the backend API URL in frontend/config.js first.");

    const response = await fetch(API + path, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw Error(data.error || "Request failed.");
    return data;
  }

  async function loadMovies() {
    const grid = $("movie-grid");

    try {
      const { movies } = await api("/movies");

      if (!movies.length) {
        grid.innerHTML = '<div class="empty">No movies listed yet. Check back soon.</div>';
        return;
      }

      grid.innerHTML = movies.map(movie => {
        const verified = Number(movie.verified_tickets || 0);
        const reserved = Number(movie.reserved_tickets || 0);
        const capacity = Number(movie.capacity || 30);
        const time = movie.show_status === "confirmed" && movie.show_time
          ? esc(movie.show_time) : "Coming Soon";

        const poster = movie.poster_url
          ? `<img src="${esc(movie.poster_url)}" alt="${esc(movie.title)} poster" loading="lazy">`
          : "";

        const available = Boolean(movie.show_id) &&
          movie.show_status !== "cancelled" && reserved < capacity;

        return `
          <article class="movie-card">
            <div class="movie-poster">
              ${poster}
              <div class="fallback">${esc(movie.title)}</div>
            </div>
            <div class="movie-body">
              <h3>${esc(movie.title)}</h3>
              <p>${esc(movie.description)}</p>
              <div class="movie-meta">
                <span>🕒 ${time}</span>
                <span>${money(99)} / ticket</span>
              </div>
              <div class="progress">
                ⭐ ${verified}/5 paid tickets to confirm · ${Math.max(0, capacity - reserved)} left
              </div>
              ${available
                ? `<button class="btn primary book"
                    data-show="${esc(movie.show_id)}"
                    data-title="${esc(movie.title)}"
                    data-time="${time}"
                    data-remaining="${Math.max(0, capacity - reserved)}">
                    Book tickets ↗
                  </button>`
                : '<button class="btn secondary" disabled>Not available</button>'}
            </div>
          </article>`;
      }).join("");

      grid.querySelectorAll(".book").forEach(button => {
        button.addEventListener("click", () => openBooking(
          button.dataset.show,
          button.dataset.title,
          button.dataset.time,
          Number(button.dataset.remaining)
        ));
      });

      // Show a fallback title only when its poster image fails to load.
      grid.querySelectorAll(".movie-poster").forEach(posterBox => {
        const image = posterBox.querySelector("img");
        const fallback = posterBox.querySelector(".fallback");
        if (!image) return;
        fallback.style.display = "none";
        image.addEventListener("error", () => {
          image.style.display = "none";
          fallback.style.display = "grid";
        });
      });
    } catch (error) {
      grid.innerHTML = `<div class="empty">${esc(error.message)}<br>Check the backend URL and try again.</div>`;
    }
  }

  async function openBooking(showId, title, time, remaining) {
    try {
      $("booking-form").reset();
      $("show-id").value = showId;
      $("booking-title").textContent = title;
      $("booking-meta").textContent = `Show timing: ${time} · ₹99 per ticket`;

      const maxTickets = Math.min(30, remaining);
      $("ticket-count").innerHTML = Array.from(
        { length: maxTickets }, (_, index) =>
          `<option value="${index + 1}">${index + 1} ${index === 0 ? "ticket" : "tickets"}</option>`
      ).join("");

      $("total-amount").textContent = money(99);
      $("booking-message").textContent = "";
      $("booking-message").classList.remove("error");

      const config = await api("/config");
      $("upi-instructions").textContent = config.upiId
        ? `After creating your booking, pay in your UPI app to ${config.upiId}. Verify the recipient name before paying.`
        : "Payment details have not been configured. Contact the business before paying.";

      $("ticket-count").onchange = () => {
        $("total-amount").textContent = money(Number($("ticket-count").value) * 99);
      };

      $("booking-dialog").showModal();
    } catch (error) {
      $("main-message").textContent = error.message;
      $("main-message").classList.add("error");
    }
  }

  $("close-modal").addEventListener("click", () => $("booking-dialog").close());
  $("close-result").addEventListener("click", () => $("result-dialog").close());

  $("booking-form").addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("submit-booking");
    button.disabled = true;
    button.textContent = "Creating booking…";

    try {
      // Step 1: create a temporary booking.
      const booking = await api("/bookings", {
        method: "POST",
        body: JSON.stringify({
          showId: $("show-id").value,
          name: $("customer-name").value.trim(),
          mobile: $("customer-mobile").value.trim(),
          tickets: Number($("ticket-count").value)
        })
      });

      lastRef = booking.booking.booking_ref;

      // Step 2: submit the customer's UPI reference separately.
      const reference = $("payment-ref").value.trim();
      const payment = await api(
        `/bookings/${encodeURIComponent(lastRef)}/payment-reference`,
        {
          method: "POST",
          body: JSON.stringify({ upiReference: reference })
        }
      );

      $("booking-dialog").close();

      $("result-text").textContent =
        `Booking code: ${lastRef}. ` +
        `${payment.message} Amount: ${money(booking.booking.amount_paise / 100)}. ` +
        "Keep your booking code. The administrator must verify the actual payment.";

      $("result-dialog").showModal();

      $("copy-code").onclick = async () => {
        try {
          await navigator.clipboard.writeText(lastRef);
          $("copy-code").textContent = "Copied!";
        } catch {
          $("result-text").textContent += ` Booking code: ${lastRef}`;
        }
      };

      await loadMovies();
    } catch (error) {
      $("booking-message").textContent = error.message;
      $("booking-message").classList.add("error");
    } finally {
      button.disabled = false;
      button.textContent = "Create booking";
    }
  });

  $("year").textContent = new Date().getFullYear();
  loadMovies();
})();
