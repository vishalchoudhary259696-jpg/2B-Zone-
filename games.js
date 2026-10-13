/* ===== SETTINGS: prices from the price list ===== */
var SETUPS = [
  { name: 'PS5',            thirtyMin: 140, oneHour: 200 },
  { name: 'PS4',            thirtyMin: 100, oneHour: 150 },
  { name: 'Xbox',           thirtyMin: 70,  oneHour: 100 },
  { name: 'Gaming PC',      thirtyMin: 100, oneHour: 150 },
  { name: 'Basic Steering', thirtyMin: 70,  oneHour: 100 }
];

/* ===== POPULAR GAMES: paste poster URLs in poster ===== */
var GAMES = [
  { title: 'BGMI',         poster: '' },
  { title: 'PUBG',         poster: '' },
  { title: 'Call of Duty', poster: '' },
  { title: 'Free Fire',    poster: '' }
];

/* ===== PRICE ROWS ===== */
var priceRows = document.getElementById('priceRows');
priceRows.innerHTML = SETUPS.map(function (s, i) {
  return '' +
    '<div class="price-row reveal" style="--d:' + (i * 80) + 'ms">' +
      '<span class="setup-name">' + s.name + '</span>' +
      '<span class="val">₹' + s.thirtyMin + '</span>' +
      '<span class="val">₹' + s.oneHour + '</span>' +
    '</div>';
}).join('');

/* ===== GAME CARDS ===== */
var gamesEl = document.getElementById('games');
gamesEl.innerHTML = GAMES.map(function (g, i) {
  var img = g.poster
    ? '<img src="' + g.poster + '" alt="' + g.title + ' poster" loading="lazy" onerror="this.remove()">'
    : '';
  return '' +
    '<article class="game reveal" style="--d:' + (i * 100) + 'ms">' +
      '<div class="game-poster"><span class="ph">' + g.title.charAt(0) + '</span>' + img + '</div>' +
      '<h3 class="game-name">' + g.title + '</h3>' +
    '</article>';
}).join('');
