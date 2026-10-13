
"use strict";

const config = window.APP_CONFIG || {};
const API_BASE = String(config.API_BASE_URL || "").trim().replace(/\/+$/, "");
const TMDB_TOKEN = config.TMDB_API_KEY || "";
const TMDB_API = "https://api.themoviedb.org/3";
const TMDB_IMAGE = "https://image.tmdb.org/t/p/w500";

const fallbackImage =
  "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=500&q=80";

const sampleMovies = [
  {
    id: "sample-1",
    title: "Movie Night",
    releaseDate: "",
    rating: 0,
    poster: fallbackImage
  },
  {
    id: "sample-2",
    title: "Cinema Stories",
    releaseDate: "",
    rating: 0,
    poster: fallbackImage
  }
];

const trendingEl = document.getElementById("trendingMovies");
const latestEl = document.getElementById("latestMovies");
const movieSelect = document.getElementById("movieSelect");
const timeSelect = document.getElementById("showtimeSelect");
const bookButton = document.getElementById("bookButton");
const bookingMessage = document.getElementById("bookingMessage");

let trendingMovies = [];
let latestMovies = [];

const times = {
  "09:00": "9:00 AM",
  "12:00": "12:00 PM",
  "15:00": "3:00 PM",
  "18:00": "6:00 PM"
};

function normalise(movie) {
  return {
    id: movie.id ?? movie.movie_id ?? movie.tmdb_id ?? movie.title,
    title: movie.title || movie.name || "Untitled movie",
    poster: movie.poster_path
      ? TMDB_IMAGE + movie.poster_path
      : movie.poster_url || movie.poster || fallbackImage,
    releaseDate: movie.release_date || movie.releaseDate || "",
    rating: Number(movie.vote_average ?? movie.rating ?? 0)
  };
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

async function getTMDB(path) {
  if (!TMDB_TOKEN) throw new Error("TMDB token not configured");

  return getJSON(TMDB_API + path, {
    Authorization: "Bearer " + TMDB_TOKEN
  });
}

async function getBackendMovies() {
  if (!API_BASE) throw new Error("Backend URL missing");

  const data = await getJSON(API_BASE + "/movies");
  const list = Array.isArray(data)
    ? data
    : data.movies || data.results || [];

  return list.map(normalise);
}

function formatDate(value) {
  if (!value) return "Release date unavailable";

  const date = new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) return "Release date unavailable";

  return date.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderMovies(container, movies, label) {
  if (!container) return;

  container.replaceChildren();

  if (!movies.length) {
    const message = document.createElement("p");
    message.className = "empty-message";
    message.textContent = "No movies are available right now.";
    container.appendChild(message);
    return;
  }

  movies.slice(0, 10).forEach(movie => {
    const card = document.createElement("article");
    card.className = "movie-card scroll-reveal";

    const rating = movie.rating > 0
      ? movie.rating.toFixed(1)
      : "—";

    card.innerHTML = `
      <div class="movie-poster-wrap">
        <img class="movie-poster"
          src="${escapeHTML(movie.poster || fallbackImage)}"
          alt="Poster for ${escapeHTML(movie.title)}"
          loading="lazy">
        <span class="movie-badge">${label}</span>
      </div>
      <div class="movie-info">
        <h3 class="movie-title">${escapeHTML(movie.title)}</h3>
        <div class="movie-meta">
          <span>${escapeHTML(formatDate(movie.releaseDate))}</span>
          <span class="movie-rating">★ ${rating}</span>
        </div>
        <div class="movie-actions">
          <button class="movie-book-button" type="button">Select movie →</button>
        </div>
      </div>
    `;

    const img = card.querySelector("img");
    img.addEventListener("error", () => {
      img.onerror = null;
      img.src = fallbackImage;
    });

    card.querySelector("button").addEventListener("click", () => {
      chooseMovie(movie);
    });

    container.appendChild(card);
  });

  observeScrollElements();
}

function allMovies() {
  const unique = new Map();

  [...trendingMovies, ...latestMovies].forEach(movie => {
    unique.set(String(movie.id), movie);
  });

  return [...unique.values()];
}

function fillMovieSelect() {
  if (!movieSelect) return;

  const previous = movieSelect.value;
  movieSelect.replaceChildren();

  const first = document.createElement("option");
  first.value = "";
  first.textContent = "Choose a movie";
  movieSelect.appendChild(first);

  allMovies().forEach(movie => {
    const option = document.createElement("option");
    option.value = String(movie.id);
    option.textContent = movie.title;
    movieSelect.appendChild(option);
  });

  if ([...movieSelect.options].some(option => option.value === previous)) {
    movieSelect.value = previous;
  }
}

function chooseMovie(movie) {
  if (movieSelect) movieSelect.value = String(movie.id);

  if (bookingMessage) {
    bookingMessage.textContent =
      "Selected " + movie.title + ". Now choose a preferred time.";
  }

  document.getElementById("booking")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

function showCatalogueMessage(message) {
  [trendingEl, latestEl].forEach(container => {
    if (!container) return;

    container.replaceChildren();

    const p = document.createElement("p");
    p.className = "empty-message";
    p.textContent = message;
    container.appendChild(p);
  });
}

function renderAll() {
  renderMovies(trendingEl, trendingMovies, "TRENDING");
  renderMovies(latestEl, latestMovies, "NOW PLAYING");
  fillMovieSelect();
}

async function loadMovies() {
  let gotLiveData = false;

  // Try live trending and current releases from TMDB.
  if (TMDB_TOKEN) {
    const results = await Promise.allSettled([
      getTMDB("/trending/movie/week?language=en-US"),
      getTMDB("/movie/now_playing?language=en-US&region=IN&page=1")
    ]);

    if (results[0].status === "fulfilled") {
      trendingMovies = (results[0].value.results || []).map(normalise);
      gotLiveData = trendingMovies.length > 0;
    }

    if (results[1].status === "fulfilled") {
      latestMovies = (results[1].value.results || []).map(normalise);
      gotLiveData = gotLiveData || latestMovies.length > 0;
    }
  }

  // Otherwise, try the existing movie database endpoint.
  if (!gotLiveData && API_BASE) {
    try {
      const movies = await getBackendMovies();
      trendingMovies = movies;
      latestMovies = [...movies].sort((a, b) =>
        String(b.releaseDate).localeCompare(String(a.releaseDate))
      );
      gotLiveData = movies.length > 0;
    } catch (error) {
      console.error("Backend movie request failed:", error);
    }
  }

  if (!gotLiveData) {
    // This is only a visual fallback, not a live movie list.
    trendingMovies = sampleMovies;
    latestMovies = sampleMovies;
    renderAll();

    showCatalogueMessage(
      "Movie data is not connected yet. Check your backend or TMDB configuration."
    );
    return;
  }

  renderAll();
}

function observeScrollElements() {
  const elements = document.querySelectorAll(
    ".hero-copy, .hero-visual, .highlights, .section-heading, .booking-section, .movie-card"
  );

  if (!("IntersectionObserver" in window)) {
    elements.forEach(el => el.classList.add("is-visible"));
    return;
  }

  if (!document.documentElement.classList.contains("js-animations")) {
    document.documentElement.classList.add("js-animations");
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  elements.forEach(el => {
    if (!el.classList.contains("is-visible")) observer.observe(el);
  });
}

function handleBookClick() {
  const movie = allMovies().find(
    item => String(item.id) === movieSelect?.value
  );
  const time = timeSelect?.value;

  if (!movie) {
    if (bookingMessage) bookingMessage.textContent = "Please select a movie.";
    return;
  }

  if (!time) {
    if (bookingMessage) bookingMessage.textContent = "Please select a showtime.";
    return;
  }

  if (bookingMessage) {
    bookingMessage.textContent =
      movie.title + " selected for " + times[time] +
      ". This is not a confirmed booking. Please complete it through the booking system.";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("currentYear");
  if (year) year.textContent = new Date().getFullYear();

  bookButton?.addEventListener("click", handleBookClick);

  // Hero and other static sections remain visible if this script fails.
  loadMovies();
});
