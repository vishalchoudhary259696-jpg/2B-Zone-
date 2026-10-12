
const { rateLimit } = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many booking requests. Try again later." }
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: "draft-7",
  legacyHeaders: false
});

function requireAdmin(req, res, next) {
  if (!req.session?.admin?.id) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

module.exports = {
  loginLimiter,
  bookingLimiter,
  apiLimiter,
  requireAdmin
};
