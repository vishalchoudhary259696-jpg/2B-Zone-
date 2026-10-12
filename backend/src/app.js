
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const argon2 = require("argon2");
const crypto = require("node:crypto");
const { z } = require("zod");
const pool = require("./db");
const config = require("./config");
const {
  loginLimiter,
  bookingLimiter,
  apiLimiter,
  requireAdmin
} = require("./middleware");

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", config.NODE_ENV === "production" ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "https:", "data:"],
      connectSrc: ["'self'", ...config.FRONTEND_URL.split(",").map(s => s.trim())],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"]
    }
  }
}));

const origins = config.FRONTEND_URL.split(",").map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  maxAge: 600
}));

app.use(express.json({ limit: "10kb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.use(session({
  store: new PgSession({
    pool,
    tableName: "session",
    createTableIfMissing: true
  }),
  name: "2bz.sid",
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 2 * 60 * 60 * 1000
  }
}));

app.use("/api", apiLimiter);

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

app.get("/api/config", (req, res) => {
  res.json({
    ticketPrice: 99,
    upiId: config.UPI_ID,
    currency: "INR"
  });
});

app.get("/api/movies", async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id, m.title, m.description, m.poster_url, m.language, m.certificate,
        s.id AS show_id, s.status AS show_status, s.show_time, s.capacity,
        COALESCE(x.verified, 0)::int AS verified_tickets,
        COALESCE(x.reserved, 0)::int AS reserved_tickets
      FROM movies m
      LEFT JOIN shows s ON s.movie_id = m.id AND s.is_listed = true
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE
            WHEN b.payment_status = 'verified' AND b.booking_status = 'active'
            THEN b.ticket_count ELSE 0 END) verified,
          SUM(CASE
            WHEN b.payment_status IN ('pending','submitted')
              AND b.booking_status = 'active'
              AND b.expires_at > NOW()
            THEN b.ticket_count ELSE 0 END) reserved
        FROM bookings b
        WHERE b.show_id = s.id
      ) x ON true
      WHERE m.is_listed = true
      ORDER BY m.created_at DESC
    `);

    res.json({ movies: result.rows });
  } catch (error) {
    next(error);
  }
});

const bookSchema = z.object({
  showId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  mobile: z.string().trim().regex(/^[6-9]\d{9}$/),
  tickets: z.coerce.number().int().min(1).max(30)
}).strict();

app.post("/api/bookings", bookingLimiter, async (req, res, next) => {
  const parsed = bookSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Enter a valid name, 10-digit Indian mobile number, show and ticket count."
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const showResult = await client.query(
      "SELECT id, status, capacity FROM shows WHERE id=$1 AND is_listed=true FOR UPDATE",
      [parsed.data.showId]
    );

    if (!showResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Show not found." });
    }

    if (showResult.rows[0].status === "cancelled") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "This show is not accepting bookings." });
    }

    await client.query(`
      UPDATE bookings
      SET booking_status='expired'
      WHERE show_id=$1
        AND booking_status='active'
        AND payment_status IN ('pending','submitted')
        AND expires_at <= NOW()
    `, [parsed.data.showId]);

    const ticketResult = await client.query(`
      SELECT COALESCE(SUM(ticket_count),0)::int AS used
      FROM bookings
      WHERE show_id=$1
        AND booking_status='active'
        AND (
          payment_status='verified'
          OR (
            payment_status IN ('pending','submitted')
            AND expires_at > NOW()
          )
        )
    `, [parsed.data.showId]);

    const capacity = showResult.rows[0].capacity;
    const used = ticketResult.rows[0].used;

    if (used + parsed.data.tickets > capacity) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: `Only ${Math.max(0, capacity - used)} ticket(s) remain.`
      });
    }

    const bookingRef = "2BZ-" + crypto.randomBytes(5).toString("hex").toUpperCase();

    const bookingResult = await client.query(`
      INSERT INTO bookings(
        booking_ref, show_id, customer_name, mobile,
        ticket_count, amount_paise, payment_status,
        booking_status, expires_at
      )
      VALUES($1,$2,$3,$4,$5,$6,'pending','active',NOW()+INTERVAL '30 minutes')
      RETURNING booking_ref,ticket_count,amount_paise,payment_status,booking_status,expires_at
    `, [
      bookingRef,
      parsed.data.showId,
      parsed.data.name,
      parsed.data.mobile,
      parsed.data.tickets,
      parsed.data.tickets * 9900
    ]);

    await client.query("COMMIT");

    res.status(201).json({
      booking: bookingResult.rows[0],
      upiId: config.UPI_ID,
      message: "Pay in your UPI app, then submit the UPI transaction reference. This booking is not paid until an admin verifies the payment."
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

const referenceSchema = z.object({
  upiReference: z.string().trim().min(6).max(80).regex(/^[A-Za-z0-9._/-]+$/)
}).strict();

app.post("/api/bookings/:ref/payment-reference", bookingLimiter, async (req, res, next) => {
  const parsed = referenceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Enter a valid UPI transaction reference." });
  }

  try {
    const result = await pool.query(`
      UPDATE bookings
      SET upi_reference=$1, payment_status='submitted'
      WHERE booking_ref=$2
        AND booking_status='active'
        AND payment_status='pending'
        AND expires_at > NOW()
      RETURNING booking_ref,payment_status
    `, [parsed.data.upiReference, String(req.params.ref).toUpperCase()]);

    if (!result.rowCount) {
      return res.status(404).json({
        error: "Active pending booking not found or expired."
      });
    }

    res.json({
      booking: result.rows[0],
      message: "Reference submitted. Payment is pending admin verification."
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/bookings/:ref", async (req, res, next) => {
  const ref = String(req.params.ref || "").toUpperCase();

  if (!/^2BZ-[A-F0-9]{10}$/.test(ref)) {
    return res.status(400).json({ error: "Invalid booking reference." });
  }

  try {
    const result = await pool.query(`
      SELECT
        b.booking_ref,b.ticket_count,b.amount_paise,b.payment_status,
        b.booking_status,b.created_at,b.expires_at,
        s.status AS show_status,s.show_time,m.title AS movie_title
      FROM bookings b
      JOIN shows s ON s.id=b.show_id
      JOIN movies m ON m.id=s.movie_id
      WHERE b.booking_ref=$1
    `, [ref]);

    if (!result.rowCount) {
      return res.status(404).json({ error: "Booking not found." });
    }

    res.json({ booking: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", loginLimiter, async (req, res, next) => {
  const parsed = z.object({
    email: z.string().email().max(254),
    password: z.string().min(1).max(200)
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  try {
    const result = await pool.query(
      "SELECT id,email,password_hash,role,is_active FROM admins WHERE LOWER(email)=LOWER($1)",
      [parsed.data.email]
    );

    const admin = result.rows[0];
    const valid = admin && admin.is_active &&
      await argon2.verify(admin.password_hash, parsed.data.password).catch(() => false);

    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate(error => error ? reject(error) : resolve());
    });

    req.session.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role
    };

    res.json({ admin: { email: admin.email, role: admin.role } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/me", requireAdmin, (req, res) => {
  res.json({ admin: req.session.admin });
});

app.post("/api/admin/logout", requireAdmin, (req, res, next) => {
  req.session.destroy(error => {
    if (error) return next(error);

    res.clearCookie("2bz.sid", {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax"
    });

    res.json({ message: "Logged out" });
  });
});

app.get("/api/admin/bookings", requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        b.booking_ref,b.customer_name,b.mobile,b.ticket_count,b.amount_paise,
        b.payment_status,b.booking_status,b.upi_reference,b.created_at,
        m.title AS movie_title,s.id AS show_id,s.status AS show_status
      FROM bookings b
      JOIN shows s ON s.id=b.show_id
      JOIN movies m ON m.id=s.movie_id
      ORDER BY b.created_at DESC
      LIMIT 300
    `);

    res.json({ bookings: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/bookings/:ref/verify", requireAdmin, async (req, res, next) => {
  const parsed = z.object({
    decision: z.enum(["approve", "reject"])
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Decision must be approve or reject." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "SELECT * FROM bookings WHERE booking_ref=$1 FOR UPDATE",
      [String(req.params.ref).toUpperCase()]
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Booking not found." });
    }

    const booking = result.rows[0];

    if (booking.booking_status !== "active" || booking.payment_status === "verified") {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Booking is no longer pending review." });
    }

    if (parsed.data.decision === "approve") {
      if (!booking.upi_reference) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Customer has not submitted a UPI reference." });
      }

      await client.query(`
        UPDATE bookings
        SET payment_status='verified',verified_at=NOW(),verified_by=$1
        WHERE id=$2
      `, [req.session.admin.id, booking.id]);
    } else {
      await client.query(`
        UPDATE bookings
        SET payment_status='rejected',booking_status='cancelled'
        WHERE id=$1
      `, [booking.id]);
    }

    const total = await client.query(`
      SELECT COALESCE(SUM(ticket_count),0)::int AS n
      FROM bookings
      WHERE show_id=$1
        AND payment_status='verified'
        AND booking_status='active'
    `, [booking.show_id]);

    await client.query(`
      UPDATE shows
      SET status='ready_to_confirm'
      WHERE id=$1 AND status='coming_soon' AND $2>=5
    `, [booking.show_id, total.rows[0].n]);

    await client.query("COMMIT");

    res.json({
      message: parsed.data.decision === "approve"
        ? "Payment marked verified. Set show timing after five paid tickets."
        : "Payment rejected and booking cancelled.",
      verifiedTickets: total.rows[0].n
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/admin/movies", requireAdmin, async (req, res, next) => {
  const parsed = z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(1200),
    posterUrl: z.string().url().max(1000).optional().or(z.literal("")),
    language: z.string().trim().max(60).optional(),
    certificate: z.string().trim().max(20).optional()
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Check movie fields and poster URL." });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const movie = await client.query(`
      INSERT INTO movies(title,description,poster_url,language,certificate)
      VALUES($1,$2,$3,$4,$5) RETURNING id
    `, [
      parsed.data.title,
      parsed.data.description,
      parsed.data.posterUrl || null,
      parsed.data.language || null,
      parsed.data.certificate || null
    ]);

    await client.query(
      "INSERT INTO shows(movie_id,capacity) VALUES($1,30)",
      [movie.rows[0].id]
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Movie added." });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    next(error);
  } finally {
    client.release();
  }
});

app.post("/api/admin/shows", requireAdmin, async (req, res, next) => {
  const parsed = z.object({
    movieId: z.string().uuid(),
    capacity: z.coerce.number().int().min(5).max(30)
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Choose a movie and capacity between 5 and 30." });
  }

  try {
    const result = await pool.query(`
      INSERT INTO shows(movie_id,capacity)
      SELECT id,$2 FROM movies WHERE id=$1 AND is_listed=true
      RETURNING id,status,capacity
    `, [parsed.data.movieId, parsed.data.capacity]);

    if (!result.rowCount) {
      return res.status(404).json({ error: "Movie not found." });
    }

    res.status(201).json({ show: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/dashboard", requireAdmin, async (req, res, next) => {
  try {
    const movies = await pool.query(
      "SELECT id,title FROM movies WHERE is_listed=true ORDER BY title"
    );

    const shows = await pool.query(`
      SELECT
        s.id,s.status,s.show_time,s.capacity,m.title AS movie_title,
        COALESCE(x.verified,0)::int AS verified_tickets,
        COALESCE(x.reserved,0)::int AS reserved_tickets
      FROM shows s
      JOIN movies m ON m.id=s.movie_id
      LEFT JOIN LATERAL (
        SELECT
          SUM(CASE WHEN payment_status='verified' AND booking_status='active'
            THEN ticket_count ELSE 0 END) verified,
          SUM(CASE WHEN payment_status IN ('pending','submitted')
            AND booking_status='active' AND expires_at>NOW()
            THEN ticket_count ELSE 0 END) reserved
        FROM bookings
        WHERE show_id=s.id
      ) x ON true
      ORDER BY s.created_at DESC
    `);

    res.json({ movies: movies.rows, shows: shows.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/shows/:id/confirm", requireAdmin, async (req, res, next) => {
  const parsed = z.object({
    showTime: z.string().trim().min(3).max(100)
  }).strict().safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ error: "Enter show timing." });
  }

  try {
    const result = await pool.query(`
      UPDATE shows
      SET status='confirmed',show_time=$1
      WHERE id=$2
        AND status IN ('ready_to_confirm','confirmed')
        AND (
          SELECT COALESCE(SUM(ticket_count),0)
          FROM bookings
          WHERE show_id=shows.id
            AND payment_status='verified'
            AND booking_status='active'
        ) >= 5
      RETURNING id,status,show_time
    `, [parsed.data.showTime, req.params.id]);

    if (!result.rowCount) {
      return res.status(409).json({
        error: "At least five verified paid tickets are required before confirming a show."
      });
    }

    res.json({ show: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => res.status(404).json({ error: "Endpoint not found." }));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);

  console.error("API error:", {
    path: req.path,
    method: req.method,
    message: error.message
  });

  res.status(500).json({ error: "Unexpected server error. Please try again." });
});

module.exports = app;
                            
