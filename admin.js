
(() => {
  const API = (window.APP_CONFIG?.API_BASE_URL || "").replace(/\/+$/, "");
  const $ = id => document.getElementById(id);
  let loggedIn = false;

  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  async function api(path, options = {}) {
    if (!API || API.includes("REPLACE-WITH"))
      throw Error("Set API_BASE_URL in config.js first.");

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

  const message = text => $("dashboard-message").textContent = text;

  $("login-form").addEventListener("submit", async event => {
    event.preventDefault();
    $("login-message").textContent = "Signing in…";

    try {
      await api("/admin/login", {
        method: "POST",
        body: JSON.stringify({
          email: $("email").value.trim(),
          password: $("password").value
        })
      });

      loggedIn = true;
      $("login-panel").classList.add("hidden");
      $("dashboard").classList.remove("hidden");
      await refresh();
    } catch (error) {
      $("login-message").textContent = error.message;
      $("login-message").classList.add("error");
    }
  });

  $("logout").addEventListener("click", async () => {
    try {
      await api("/admin/logout", { method: "POST", body: "{}" });
    } catch {}

    loggedIn = false;
    $("dashboard").classList.add("hidden");
    $("login-panel").classList.remove("hidden");
    $("password").value = "";
  });

  $("refresh").addEventListener("click", () => refresh().catch(e => message(e.message)));

  $("movie-form").addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await api("/admin/movies", {
        method: "POST",
        body: JSON.stringify(data)
      });
      event.currentTarget.reset();
      message("Movie added.");
      await refresh();
    } catch (error) {
      message(error.message);
    }
  });

  $("show-form").addEventListener("submit", async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.capacity = Number(data.capacity);

    try {
      await api("/admin/shows", {
        method: "POST",
        body: JSON.stringify(data)
      });
      message("Show created.");
      await refresh();
    } catch (error) {
      message(error.message);
    }
  });

  async function refresh() {
    if (!loggedIn) return;

    const [dashboard, bookingData] = await Promise.all([
      api("/admin/dashboard"),
      api("/admin/bookings")
    ]);

    $("movie-select").innerHTML = dashboard.movies.map(movie =>
      `<option value="${esc(movie.id)}">${esc(movie.title)}</option>`
    ).join("");

    $("show-list").innerHTML = dashboard.shows.length
      ? dashboard.shows.map(show => `
        <div class="booking-row">
          <strong>${esc(show.movie_title)}</strong>
          <p>${show.status === "confirmed" ? esc(show.show_time) : "Coming Soon"}</p>
          <p>${show.verified_tickets}/5 verified paid · ${show.reserved_tickets}/${show.capacity} reserved</p>
          <span class="tag">${esc(show.status)}</span>
          ${show.status === "ready_to_confirm" || show.status === "confirmed"
            ? `<form class="confirm-form" data-id="${esc(show.id)}">
                <label>Show timing</label>
                <input name="showTime" placeholder="e.g. 7:30 PM, Saturday" required maxlength="100">
                <button class="btn primary wide">Confirm show & set time</button>
              </form>`
            : ""}
        </div>`
      ).join("")
      : "No shows yet.";

    $("booking-list").innerHTML = bookingData.bookings.length
      ? bookingData.bookings.map(booking => `
        <div class="booking-row">
          <strong>${esc(booking.customer_name)} · ${booking.ticket_count} ticket(s)</strong>
          <p>${esc(booking.movie_title)} · ₹${(booking.amount_paise / 100).toFixed(0)} · ${esc(booking.mobile)}</p>
          <p>Code: ${esc(booking.booking_ref)} · UPI ref: ${esc(booking.upi_reference || "Not submitted")}</p>
          <span class="tag">${esc(booking.payment_status)}</span>
          <span class="tag">${esc(booking.booking_status)}</span>
          ${booking.payment_status === "submitted" && booking.booking_status === "active"
            ? `<div class="row-actions" style="margin-top:8px">
                <button class="btn primary verify" data-ref="${esc(booking.booking_ref)}" data-decision="approve">Approve verified payment</button>
                <button class="btn secondary verify" data-ref="${esc(booking.booking_ref)}" data-decision="reject">Reject payment</button>
              </div>`
            : ""}
        </div>`
      ).join("")
      : "No bookings yet.";

    document.querySelectorAll(".verify").forEach(button => {
      button.addEventListener("click", async () => {
        if (button.dataset.decision === "approve" &&
            !confirm("Have you verified this payment in your UPI app or bank statement? Only continue if the money was actually received.")) {
          return;
        }

        try {
          const result = await api(
            `/admin/bookings/${encodeURIComponent(button.dataset.ref)}/verify`,
            {
              method: "POST",
              body: JSON.stringify({ decision: button.dataset.decision })
            }
          );
          message(result.message);
          await refresh();
        } catch (error) {
          message(error.message);
        }
      });
    });

    document.querySelectorAll(".confirm-form").forEach(form => {
      form.addEventListener("submit", async event => {
        event.preventDefault();

        try {
          const showTime = new FormData(form).get("showTime");
          await api(`/admin/shows/${form.dataset.id}/confirm`, {
            method: "POST",
            body: JSON.stringify({ showTime })
          });
          message("Show confirmed.");
          await refresh();
        } catch (error) {
          message(error.message);
        }
      });
    });
  }
})();
