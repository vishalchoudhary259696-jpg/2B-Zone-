
let adminPassword = "7777";

const $ = id => document.getElementById(id);

function notify(message) {
  const toast = $("adminToast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[c]));
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": adminPassword,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }

  return data;
}

$("loginForm").addEventListener("submit", async event => {
  event.preventDefault();

  adminPassword = $("adminPassword").value;

  try {
    await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: adminPassword })
    });

    $("loginPanel").hidden = true;
    $("dashboard").hidden = false;

    await refreshBookings();
  } catch (error) {
    $("loginError").textContent = error.message;
  }
});

$("refreshBookings").addEventListener("click", refreshBookings);

async function refreshBookings() {
  try {
    const bookings = await api("/api/admin/bookings");

    if (!bookings.length) {
      $("bookingTable").innerHTML =
        '<p class="admin-muted">No bookings yet.</p>';
      return;
    }

    $("bookingTable").innerHTML = `
      <table class="admin-table">
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>Customer</th>
            <th>Movie</th>
            <th>Tickets</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${bookings.map(b => `
            <tr>
              <td>${escapeHTML(b.id)}</td>
              <td>
                ${escapeHTML(b.name)}<br>
                ${escapeHTML(b.mobile)}
              </td>
              <td>${escapeHTML(b.movieTitle)}</td>
              <td>${b.tickets}</td>
              <td>₹${b.amount}</td>
              <td>
                <span class="status ${escapeHTML(b.status)}">
                  ${escapeHTML(b.status)}
                </span>
              </td>
              <td>
                ${b.status === "pending" ? `
                  <button class="admin-action approve"
                    data-approve="${escapeHTML(b.id)}">
                    Approve
                  </button>
                  <button class="admin-action"
                    data-reject="${escapeHTML(b.id)}">
                    Reject
                  </button>
                ` : "—"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    document.querySelectorAll("[data-approve]").forEach(button => {
      button.addEventListener("click", async () => {
        const id = button.dataset.approve;

        if (!confirm(
          "Have you verified the actual payment in your UPI app?"
        )) return;

        const reference = prompt(
          "Enter the transaction reference/UTR, if available:"
        ) || "";

        try {
          await api(
            `/api/admin/bookings/${encodeURIComponent(id)}/approve`,
            {
              method: "POST",
              body: JSON.stringify({ reference })
            }
          );

          notify("Booking approved.");
          await refreshBookings();
        } catch (error) {
          notify(error.message);
        }
      });
    });

    document.querySelectorAll("[data-reject]").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("Reject this booking?")) return;

        try {
          await api(
            `/api/admin/bookings/${encodeURIComponent(button.dataset.reject)}/reject`,
            {
              method: "POST",
              body: JSON.stringify({})
            }
          );

          notify("Booking rejected.");
          await refreshBookings();
        } catch (error) {
          notify(error.message);
        }
      });
    });
  } catch (error) {
    notify(error.message);
  }
}

$("movieForm").addEventListener("submit", async event => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const movie = Object.fromEntries(formData.entries());

  try {
    await api("/api/admin/movies", {
      method: "POST",
      body: JSON.stringify(movie)
    });

    $("movieMessage").textContent =
      "Movie added successfully. Refresh the customer website.";

    event.target.reset();
    notify("Movie added.");
  } catch (error) {
    $("movieMessage").textContent = error.message;
  }
});
