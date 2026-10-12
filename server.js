
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const UPI_ID = process.env.UPI_ID || "your-upi-id@bank";
const PAYEE_NAME = process.env.PAYEE_NAME || "2B Zone";
const DB_FILE = path.join(__dirname, "data.json");

const initialData = {
  movies: [
    {
      id: "movie-1",
      title: "Movie Title One",
      genre: "Action • Drama",
      description: "Replace this with the actual movie description.",
      poster: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=85",
      active: true
    },
    {
      id: "movie-2",
      title: "Movie Title Two",
      genre: "Thriller • Mystery",
      description: "Add details about this movie.",
      poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=700&q=85",
      active: true
    },
    {
      id: "movie-3",
      title: "Movie Title Three",
      genre: "Comedy • Family",
      description: "Show timing will be announced later.",
      poster: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=700&q=85",
      active: true
    }
  ],
  bookings: []
};

if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

let db = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));

function saveDatabase() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function isAdmin(req) {
  return ADMIN_PASSWORD.length >= 12 &&
    req.headers["x-admin-password"] === ADMIN_PASSWORD;
}

function confirmedTickets(movieId) {
  return db.bookings
    .filter(b => b.movieId === movieId && b.status === "approved")
    .reduce((sum, b) => sum + b.tickets, 0);
}

function reservedTickets(movieId) {
  return db.bookings
    .filter(b =>
      b.movieId === movieId &&
      ["pending", "approved"].includes(b.status)
    )
    .reduce((sum, b) => sum + b.tickets, 0);
}

function publicBooking(b) {
  return {
    id: b.id,
    movieId: b.movieId,
    movieTitle: b.movieTitle,
    tickets: b.tickets,
    amount: b.amount,
    status: b.status,
    createdAt: b.createdAt
  };
}

app.get("/api/config", (req, res) => {
  res.json({
    pricePerTicket: 99,
    minTickets: 5,
    maxTickets: 30,
    upiId: UPI_ID,
    payeeName: PAYEE_NAME
  });
});

app.get("/api/movies", (req, res) => {
  res.json(
    db.movies.filter(m => m.active).map(movie => ({
      ...movie,
      confirmedTickets: confirmedTickets(movie.id),
      showStatus: confirmedTickets(movie.id) >= 5
        ? "Minimum reached; show timing pending"
        : "Coming Soon"
    }))
  );
});

// Create booking request
app.post("/api/bookings", (req, res) => {
  const { movieId, name, mobile, tickets } = req.body || {};
  const movie = db.movies.find(
    m => m.id === movieId && m.active
  );

  const count = Number(tickets);
  const cleanName = String(name || "").trim();
  const cleanMobile = String(mobile || "").replace(/\s/g, "");

  if (!movie) {
    return res.status(404).json({ error: "Movie not found." });
  }

  if (cleanName.length < 2 || cleanName.length > 70) {
    return res.status(400).json({ error: "Enter a valid name." });
  }

  if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
    return res.status(400).json({
      error: "Enter a valid 10-digit Indian mobile number."
    });
  }

  if (!Number.isInteger(count) || count < 1 || count > 30) {
    return res.status(400).json({
      error: "Choose between 1 and 30 tickets."
    });
  }

  const alreadyReserved = reservedTickets(movieId);

  if (alreadyReserved + count > 30) {
    return res.status(409).json({
      error: `Only ${30 - alreadyReserved} tickets remain.`
    });
  }

  const booking = {
    id: "2BZ-" + Date.now().toString(36).toUpperCase(),
    movieId,
    movieTitle: movie.title,
    name: cleanName,
    mobile: cleanMobile,
    tickets: count,
    amount: count * 99,
    status: "pending",
    createdAt: new Date().toISOString(),
    reference: ""
  };

  db.bookings.push(booking);
  saveDatabase();

  const upiLink =
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
    `&pn=${encodeURIComponent(PAYEE_NAME)}` +
    `&am=${booking.amount}&cu=INR` +
    `&tn=${encodeURIComponent("2B Zone " + booking.id)}`;

  res.status(201).json({
    booking: publicBooking(booking),
    payment: {
      upiId: UPI_ID,
      payeeName: PAYEE_NAME,
      amount: booking.amount,
      upiLink
    }
  });
});

// Safe public booking status; never expose mobile or name here.
app.get("/api/bookings/:id", (req, res) => {
  const booking = db.bookings.find(b => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  res.json(publicBooking(booking));
});

// Admin login check
app.post("/api/admin/login", (req, res) => {
  if (!isAdmin({
    headers: { "x-admin-password": req.body?.password }
  })) {
    return res.status(401).json({
      error: "Invalid password. Check server configuration."
    });
  }

  res.json({ ok: true });
});

// Admin booking list
app.get("/api/admin/bookings", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Admin login required." });
  }

  res.json(db.bookings.slice().reverse().map(b => ({
    ...publicBooking(b),
    name: b.name,
    mobile: b.mobile,
    reference: b.reference || ""
  })));
});

// Approve only after checking the actual payment in your UPI app.
app.post("/api/admin/bookings/:id/approve", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Admin login required." });
  }

  const booking = db.bookings.find(b => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  if (booking.status === "rejected") {
    return res.status(400).json({ error: "Booking was rejected." });
  }

  const otherApproved = db.bookings
    .filter(b =>
      b.movieId === booking.movieId &&
      b.id !== booking.id &&
      b.status === "approved"
    )
    .reduce((sum, b) => sum + b.tickets, 0);

  if (otherApproved + booking.tickets > 30) {
    return res.status(409).json({
      error: "Approval would exceed the 30-ticket limit."
    });
  }

  booking.status = "approved";
  booking.reference = String(req.body?.reference || "").slice(0, 80);

  saveDatabase();

  res.json({
    ok: true,
    confirmedTickets: confirmedTickets(booking.movieId)
  });
});

// Reject a booking request
app.post("/api/admin/bookings/:id/reject", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Admin login required." });
  }

  const booking = db.bookings.find(b => b.id === req.params.id);

  if (!booking) {
    return res.status(404).json({ error: "Booking not found." });
  }

  booking.status = "rejected";
  saveDatabase();

  res.json({ ok: true });
});

// Add a movie
app.post("/api/admin/movies", (req, res) => {
  if (!isAdmin(req)) {
    return res.status(401).json({ error: "Admin login required." });
  }

  const { title, genre, description, poster } = req.body || {};

  if (!String(title || "").trim()) {
    return res.status(400).json({ error: "Movie title is required." });
  }

  db.movies.push({
    id: "movie-" + Date.now(),
    title: String(title).trim().slice(0, 100),
    genre: String(genre || "").slice(0, 100),
    description: String(description || "").slice(0, 600),
    poster: String(poster || "").trim(),
    active: true
  });

  saveDatabase();
  res.status(201).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`2B Zone running on port ${PORT}`);
});
