
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin'
    CHECK(role IN ('admin','manager')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(120) NOT NULL,
  description VARCHAR(1200) NOT NULL,
  poster_url TEXT,
  language VARCHAR(60),
  certificate VARCHAR(20),
  is_listed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'coming_soon'
    CHECK(status IN ('coming_soon','ready_to_confirm','confirmed','cancelled')),
  show_time VARCHAR(100),
  capacity INTEGER NOT NULL DEFAULT 30 CHECK(capacity BETWEEN 5 AND 30),
  is_listed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_ref VARCHAR(20) NOT NULL UNIQUE,
  show_id UUID NOT NULL REFERENCES shows(id) ON DELETE RESTRICT,
  customer_name VARCHAR(80) NOT NULL,
  mobile VARCHAR(10) NOT NULL,
  ticket_count INTEGER NOT NULL CHECK(ticket_count BETWEEN 1 AND 30),
  amount_paise INTEGER NOT NULL CHECK(amount_paise = ticket_count * 9900),
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK(payment_status IN ('pending','submitted','verified','rejected')),
  booking_status TEXT NOT NULL DEFAULT 'active'
    CHECK(booking_status IN ('active','cancelled','expired')),
  upi_reference VARCHAR(80),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES admins(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS bookings_show_status_idx
  ON bookings(show_id, booking_status, payment_status);

CREATE INDEX IF NOT EXISTS bookings_created_at_idx
  ON bookings(created_at DESC);

INSERT INTO movies(title,description,poster_url,language,certificate)
SELECT v.title,v.description,v.poster_url,v.language,v.certificate
FROM (VALUES
  (
    'Jawan',
    'Action thriller featuring a high-stakes mission. Demo listing; verify current availability and rights before publishing.',
    'https://image.tmdb.org/t/p/w500/yF1eOkaYvwiORauRCPWznV9xVvi.jpg',
    'Hindi',
    'UA'
  ),
  (
    'Kalki 2898 AD',
    'Epic science-fiction adventure set in a future world. Demo listing; verify current availability and rights before publishing.',
    'https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg',
    'Hindi / Telugu',
    'UA'
  ),
  (
    'Pushpa 2: The Rule',
    'Action drama about power, ambition and rivalry. Demo listing; verify current availability and rights before publishing.',
    'https://image.tmdb.org/t/p/w500/placeholder-pushpa2.jpg',
    'Hindi / Telugu',
    'A'
  ),
  (
    'Stree 2',
    'Horror comedy with supernatural twists. Demo listing; verify current availability and rights before publishing.',
    'https://image.tmdb.org/t/p/w500/placeholder-stree2.jpg',
    'Hindi',
    'UA'
  ),
  (
    'Animal',
    'Action drama about family, loyalty and revenge. Demo listing; verify current availability and rights before publishing.',
    'https://image.tmdb.org/t/p/w500/placeholder-animal.jpg',
    'Hindi',
    'A'
  ),
  (
    'Brahmāstra',
    'Fantasy adventure with a world of ancient powers. Demo listing; verify current availability and rights before publishing.',
    'https://image.tmdb.org/t/p/w500/placeholder-brahmastra.jpg',
    'Hindi',
    'UA'
  )
) AS v(title,description,poster_url,language,certificate)
WHERE NOT EXISTS (
  SELECT 1 FROM movies m WHERE m.title=v.title
);

INSERT INTO shows(movie_id)
SELECT m.id
FROM movies m
WHERE NOT EXISTS (
  SELECT 1 FROM shows s WHERE s.movie_id=m.id
);
