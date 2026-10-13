// --- SYSTEM VARIABLES ---
const UPI_ID = "2bzone@upi"; 

// --- DATE INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById('movie-date');
    if (dateInput) dateInput.valueAsDate = new Date();
});

// --- UNIVERSAL FUNCTIONS ---
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function initiatePayment(type) {
    let totalAmount = 0;
    let note = "";
    
    if (type === 'movie') {
        const qty = parseInt(document.getElementById('movie-qty').value) || 1;
        totalAmount = qty * 99;
        note = `Ticket for ${selectedMovie}`;
        if (!document.getElementById('movie-name').value.trim()) return alert("Please enter your name.");
    } else if (type === 'game') {
        totalAmount = parseInt(document.getElementById('game-total').innerText.replace('₹', ''));
        const setup = document.getElementById('game-setup').value;
        note = `Gaming ${setup}`;
        if (!document.getElementById('game-name').value.trim()) return alert("Please enter your name.");
    }

    const transactionRef = "TXN" + new Date().getTime();
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=2B%20Zone&tr=${transactionRef}&am=${totalAmount}.00&cu=INR&tn=${encodeURIComponent(note)}`;
    
    window.location.href = upiLink;
    alert(`Opening your UPI app to pay ₹${totalAmount}...\nPlease complete the payment and note down the Reference Number (UTR).`);
}

// --- MOVIE BOOKING LOGIC ---
const MOVIE_BASE_PRICE = 99;
let selectedMovie = "";

function openMovieBooking(movieName) {
    selectedMovie = movieName;
    document.getElementById('modal-movie-title').innerText = `Book: ${movieName}`;
    document.getElementById('movie-qty').value = 1;
    updateMoviePrice();
    document.getElementById('movie-modal').style.display = 'flex';
}

function updateMoviePrice() {
    let qty = parseInt(document.getElementById('movie-qty').value);
    if (isNaN(qty) || qty < 1) {
        qty = 1;
        document.getElementById('movie-qty').value = 1;
    }
    const total = qty * MOVIE_BASE_PRICE;
    document.getElementById('movie-total').innerText = `₹${total}`;
}

function submitMovieBooking() {
    const name = document.getElementById('movie-name').value.trim();
    const phone = document.getElementById('movie-phone').value.trim();
    const qty = document.getElementById('movie-qty').value;
    const ref = document.getElementById('movie-ref').value.trim();
    const date = document.getElementById('movie-date').value;
    const totalAmount = qty * MOVIE_BASE_PRICE;

    if (!name || !phone) return alert("Name and Phone number are required!");

    const waText = `*Movie Booking*%0A%0AMovie: ${selectedMovie}%0ADate: ${date}%0AName: ${name}%0APhone: ${phone}%0ATickets: ${qty}%0ATotal Amount: ₹${totalAmount}%0APayment Ref (UTR): ${ref}%0A%0APlease confirm my booking.`;
    window.open(`https://wa.me/919876543210?text=${waText}`, '_blank');
    closeModal('movie-modal');
}

// --- GAME BOOKING LOGIC ---
const GAME_PRICES = {
    "PS5": { "30": 140, "60": 200 },
    "PS4": { "30": 100, "60": 150 },
    "XBOX": { "30": 70, "60": 100 },
    "PC": { "30": 100, "60": 150 },
    "Steering": { "30": 70, "60": 100 }
};

function openGameBooking() {
    updateGamePrice(); 
    document.getElementById('game-modal').style.display = 'flex';
}

function updateGamePrice() {
    const setup = document.getElementById('game-setup').value;
    const duration = document.getElementById('game-duration').value;
    let extraPlayers = parseInt(document.getElementById('game-players').value);
    
    if (isNaN(extraPlayers) || extraPlayers < 0) {
        extraPlayers = 0;
        document.getElementById('game-players').value = 0;
    }

    const basePrice = GAME_PRICES[setup][duration];
    const total = basePrice + (extraPlayers * 50);

    document.getElementById('game-total').innerText = `₹${total}`;
}

function submitGameBooking() {
    const setup = document.getElementById('game-setup').value;
    const duration = document.getElementById('game-duration').value;
    const extraPlayers = document.getElementById('game-players').value;
    const name = document.getElementById('game-name').value.trim();
    const phone = document.getElementById('game-phone').value.trim();
    const ref = document.getElementById('game-ref').value.trim();
    const totalAmount = document.getElementById('game-total').innerText.replace('₹', '');

    if (!name || !phone) return alert("Name and Phone number are required!");

    const timeLabel = duration === "30" ? "30 Minutes" : "1 Hour";
    const waText = `*Game Booking*%0A%0ASetup: ${setup}%0ADuration: ${timeLabel}%0AExtra Players: ${extraPlayers}%0AName: ${name}%0APhone: ${phone}%0ATotal Amount: ₹${totalAmount}%0APayment Ref (UTR): ${ref}%0A%0APlease confirm my booking.`;
    
    window.open(`https://wa.me/919876543210?text=${waText}`, '_blank');
    closeModal('game-modal');
}
