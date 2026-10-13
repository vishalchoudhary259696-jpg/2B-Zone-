
"use strict";

const config = window.APP_CONFIG || {};

const API_BASE = String(config.API_BASE_URL || "")
  .trim()
  .replace(/\/+$/, "");

const TMDB_TOKEN = config.TMDB_API_KEY || "";
const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80";

const slots = {
  "09:00": "9:00 AM",
  "12:00": "12:00 PM",
  "15:00": "3:00 PM",
  "18:00": "6:00 PM"
};

let trendingMovies = [];
let latestMovies = [];

const trendingEl = document.getElementById("trendingMovies");
const latestEl = document.getElementById("latestMovies");
const movieSelect = document.getElementById("movieSelect");
const timeSelect = document.getElementById("showtimeSelect");
const bookButton = document.getElementById("bookButton");
const bookingMessage = document.getElementById("bookingMessage");

/* Helpers */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function normaliseMovie(movie) {
  let poster = movie.poster_path || movie.poster_url || movie.poster || "";

  if (poster && poster.startsWith("/")) {
    poster = TMDB_IMAGE + poster;
  }

  return {
    id: movie.id ?? movie.movie_id ?? movie.tmdb_id ?? movie.title,
    title: movie.title || movie.name || "Untitled movie",
    poster: poster || FALLBACK_IMAGE,
    releaseDate: movie.release_date || movie.releaseDate || "",
    rating: Number(movie.vote_average ?? movie.rating ?? 0)
  };
}

function formatDate(value) {
  if (!value) return "Release date unavailable";

  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {
    return "Release date unavailable";
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

async function getJSON(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...headers
    }
  });

  if (!response.ok) {
    throw new Error("Request failed: " + response.status);
  }

  return response.json();
}

/* Movie data */

async function getTMDB(path) {
  if (!TMDB_TOKEN) {
    throw new Error("TMDB token not configured");
  }

  return getJSON(TMDB_API + path, {
    Authorization: "Bearer " + TMDB_TOKEN
  });
}

async function getBackendMovies() {
  if (!API_BASE) {
    throw new Error("Backend URL not configured");
  }

  const data = await getJSON(API_BASE + "/movies");
  const list = Array.isArray(data)
    ? data
    : data.movies || data.results || [];

  return list.map(normaliseMovie);
}

async function loadMovies() {
  let liveDataLoaded = false;

  // First try live movie data.
  if (TMDB_TOKEN) {
    const results = await Promise.allSettled([
      getTMDB("/trending/movie/week?language=en-US"),
      getTMDB("/movie/now_playing?language=en-US&region=IN&page=1")
    ]);

    if (results[0].status === "fulfilled") {
      trendingMovies = (results[0].value.results || [])
        .map(normaliseMovie);

      liveDataLoaded = trendingMovies.length > 0;
    }

    if (results[1].status === "fulfilled") {
      latestMovies = (results[1].value.results || [])
        .map(normaliseMovie);

      liveDataLoaded = liveDataLoaded || latestMovies.length > 0;
    }
  }

  // If TMDB is unavailable, try your existing backend.
  if (!liveDataLoaded && API_BASE) {
    try {
      const movies = await getBackendMovies();

      trendingMovies = movies;
      latestMovies = [...movies].sort((a, b) =>
        String(b.releaseDate).localeCompare(String(a.releaseDate))
      );

      liveDataLoaded = movies.length > 0;
    } catch (error) {
      console.error("Could not load backend movies:", error);
    }
  }

  renderMovies(trendingEl, trendingMovies, "TRENDING");
  renderMovies(latestEl, latestMovies, "NOW PLAYING");
  fillMovieSelect();

  if (!trendingMovies.length && !latestMovies.length) {
    showMessage(
      "Movie data could not be loaded. Check your API configuration and backend connection."
    );
  }

  setupScrollAnimations();
}

/* Movie cards */

function renderMovies(container, movies, badge) {
  if (!container) return;

  container.replaceChildren();

  if (!movies.length) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent =
      "No movies are available in this section yet.";

    container.appendChild(message);
    return;
  }

  movies.slice(0, 10).forEach(movie => {
    const card = document.createElement("article");
    card.className = "movie-card reveal";

    const rating = movie.rating > 0
      ? movie.rating.toFixed(1)
      : "—";

    card.innerHTML = `
      <div class="movie-poster-wrap">
        <img
          class="movie-poster"
          src="${escapeHTML(movie.poster)}"
          alt="Poster for ${escapeHTML(movie.title)}"
          loading="lazy">

        <span class="movie-badge">${badge}</span>
      </div>

      <div class="movie-info">
        <h3 class="movie-title">${escapeHTML(movie.title)}</h3>

        <div class="movie-meta">
          <span>${escapeHTML(formatDate(movie.releaseDate))}</span>
          <span class="movie-rating">★ ${rating}</span>
        </div>

        <div class="movie-actions">
          <button class="movie-book-button" type="button">
            Select movie →
          </button>
        </div>
      </div>
    `;

    const poster = card.querySelector(".movie-poster");

    poster.addEventListener("error", () => {
      poster.onerror = null;
      poster.src = FALLBACK_IMAGE;
    });

    card.querySelector("button").addEventListener("click", () => {
      selectMovie(movie);
    });

    container.appendChild(card);
  });
}

/* Movie selector */

function getAllMovies() {
  const unique = new Map();

  [...trendingMovies, ...latestMovies].forEach(movie => {
    unique.set(String(movie.id), movie);
  });

  return [...unique.values()];
}

function fillMovieSelect() {
  if (!movieSelect) return;

  const previousValue = movieSelect.value;
  movieSelect.replaceChildren();

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Choose a movie";
  movieSelect.appendChild(placeholder);

  getAllMovies().forEach(movie => {
    const option = document.createElement("option");
    option.value = String(movie.id);
    option.textContent = movie.title;
    movieSelect.appendChild(option);
  });

  if ([...movieSelect.options].some(
    option => option.value === previousValue
  )) {
    movieSelect.value = previousValue;
  }
}

function selectMovie(movie) {
  if (movieSelect) {
    movieSelect.value = String(movie.id);
  }

  showMessage(
    "Selected " + movie.title + ". Choose your preferred showtime."
  );

  document.getElementById("booking")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

/* Booking form */

function showMessage(message) {
  if (bookingMessage) {
    bookingMessage.textContent = message;
  }
}

function handleBooking() {
  const movie = getAllMovies().find(
    item => String(item.id) === movieSelect?.value
  );

  const time = timeSelect?.value;

  if (!movie) {
    showMessage("Please select a movie first.");
    movieSelect?.focus();
    return;
  }

  if (!time || !slots[time]) {
    showMessage("Please choose a preferred showtime.");
    timeSelect?.focus();
    return;
  }

  /*
   * This confirms only the user's selections.
   * It does NOT create a real reservation.
   * Connect this button to your existing backend
   * booking endpoint before accepting payments.
   */

  showMessage(
    movie.title + " selected for " + slots[time] +
    ". Please confirm availability through the booking system."
  );
}

/* Scroll animations */

function setupScrollAnimations() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach(item => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: "0px 0px -20px 0px"
  });

  items.forEach(item => {
    if (!item.classList.contains("visible")) {
      observer.observe(item);
    }
  });
}

/* Start */

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("currentYear");

  if (year) {
    year.textContent = String(new Date().getFullYear());
  }

  bookButton?.addEventListener("click", handleBooking);

  // Never hide the page while waiting for API data.
  loadMovies().catch(error => {
    console.error("Movie loading failed:", error);

    showMessage("Could not load movie data. Please try again later.");

    if (trendingEl) {
      trendingEl.innerHTML =
        '<p class="empty-message">Unable to load trending movies. Check your connection.</p>';
    }

    if (latestEl) {
      latestEl.innerHTML =
        '<p class="empty-message">Unable to load latest movies. Check your connection.</p>';
    }
  });
});
    
