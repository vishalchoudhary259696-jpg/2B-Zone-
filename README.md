
# 2B Zone Movie Ticket Booking

## Features

- Responsive movie booking website
- Sample Indian movie listings
- ₹99 per ticket
- Show capacity between 5 and 30 tickets
- Five verified paid tickets required before confirming a show
- UPI payment reference submission
- Admin dashboard for movie and show management
- Manual payment verification
- PostgreSQL database
- Password hashing, input validation, rate limiting and secure headers
- SEO title, description, canonical URL, sitemap and robots file

## Important

GitHub Pages only hosts static frontend files. It cannot run the Node.js API or PostgreSQL database.

Deploy `frontend/` to GitHub Pages. Deploy `backend/` to a Node.js hosting provider and connect it to a PostgreSQL database.

Never put your actual `.env` file, database password, session secret or private keys in the frontend or GitHub repository.

This is a starter project, not a guarantee of zero errors or a substitute for a professional security audit.

## Backend setup

1. Install Node.js 20 or later.
2. Create a PostgreSQL database.
3. Copy `backend/.env.example` to `backend/.env`.
4. Enter your actual database connection URL, session secret, frontend origin, admin credentials and UPI ID.
5. Open a terminal inside `backend/`.
6. Run `npm install`.
7. Run `npm run db:init`.
8. Run `npm run admin:create`.
9. Run `npm start`.
10. Test the backend health endpoint at `/api/health`.

The backend needs to be running and connected to its database for booking features to work.

## Frontend setup

1. Open `frontend/config.js`.
2. Replace the example API URL with your deployed backend URL, ending in `/api`.
3. Replace the placeholder domain in `index.html`, `robots.txt` and `sitemap.xml`.
4. Upload the contents of `frontend/` to a GitHub repository.
5. Open the repository's Settings.
6. Select Pages and enable deployment from your chosen branch.
7. Open the published website and test the movie listing.

## Admin dashboard

Open `admin.html` on the published website.

Sign in using the administrator credentials created with `npm run admin:create`.

The dashboard allows the administrator to:

- Add movie listings
- Create additional shows
- Review booking requests
- Verify payment references
- Confirm show timing after five verified paid tickets

## Booking and payment process

1. Customer selects a movie and tickets.
2. The backend creates a temporary booking.
3. Customer pays through their own UPI app.
4. Customer submits the transaction reference.
5. Administrator checks the actual incoming payment.
6. Administrator approves or rejects the payment.
7. A show can be confirmed after at least five paid tickets have been verified.

Submitting a transaction reference does not prove that payment was received. Never approve a payment without checking the actual receipt.

Pending bookings expire after 30 minutes.

## API endpoints

- `GET /api/health`
- `GET /api/movies`
- `GET /api/config`
- `POST /api/bookings`
- `POST /api/bookings/:ref/payment-reference`
- `GET /api/bookings/:ref`
- `POST /api/admin/login`
- `GET /api/admin/me`
- `POST /api/admin/logout`
- `GET /api/admin/bookings`
- `POST /api/admin/bookings/:ref/verify`
- `POST /api/admin/movies`
- `POST /api/admin/shows`
- `GET /api/admin/dashboard`
- `POST /api/admin/shows/:id/confirm`

## Before accepting real customers

- Use HTTPS for both frontend and backend.
- Use a long, random session secret.
- Configure database TLS according to your provider's instructions.
- Set CORS to allow only your actual frontend origin.
- Test admin session cookies in your target browsers.
- Set up database backups and monitoring.
- Run `npm audit` and update dependencies.
- Confirm that you have the right to use all movie titles, posters and promotional artwork.
- Publish an appropriate privacy notice for customer names and mobile numbers.
- Test booking capacity and payment verification before going live.
