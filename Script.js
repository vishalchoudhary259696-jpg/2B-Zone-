// --- SYSTEM CONFIGURATIONS ---
const BASE_PRICE = 99;
const TOTAL_SEATS = 30;
const UPI_ID = "2bzone@upi"; 
let currentMovie = "";

// Initialize logic when HTML is ready
document.addEventListener("DOMContentLoaded", () => {
    // Set default date to today
    const dateInput = document.getElementById('booking-date');
    if (dateInput) dateInput.valueAsDate = new Date();
    
    // Load local storage database
    updateDashboard();
});

// --- ADMIN DASHBOARD LOGIC (LocalStorage) ---
function getBookings() {
    const data = localStorage.getItem('cinema_bookings');
    return data ? JSON.parse(data) : [];
}

function saveBooking(booking) {
    const bookings = getBookings();
    bookings.push(booking);
    localStorage.setItem('cinema_bookings', JSON.stringify(bookings));
    updateDashboard();
}

function clearDatabase() {
    if (confirm("Are you sure you want to clear all bookings?")) {
        localStorage.removeItem('cinema_bookings');
        updateDashboard();
    }
}

function updateDashboard() {
    const bookings = getBookings();
    let seatsBooked = 0;
    const tbody = document.getElementById('admin-table-body');
    
    if (tbody) {
        tbody.innerHTML = '';
        bookings.forEach(b => {
            seatsBooked += parseInt(b.qty);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${b.name}</td>
                <td>${b.phone}</td>
                <td>${b.movie}</td>
                <td>${b.qty}</td>
                <td>₹${b.total}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Calculate seats safely
    const seatsLeft = Math.max(0, TOTAL_SEATS - seatsBooked);
    
    const publicSeats = document.getElementById('seats-left-display');
    const ticket1Seats = document.getElementById('ticket-1-seats');
    const adminSeats = document.getElementById('admin-seats-left');
    
    if(publicSeats) publicSeats.innerText = seatsLeft;
    if(ticket1Seats) ticket1Seats.innerText = seatsLeft;
    if(adminSeats) adminSeats.innerText = seatsLeft;
}

// --- BOOKING & PRICING LOGIC ---
function openBooking(movieName) {
    currentMovie = movieName;
    document.getElementById('modal-movie-title').innerText = `Book: ${movieName}`;
    document.getElementById('ticket-qty').value = 1;
    updatePrice();
    document.getElementById('booking-modal').style.display = 'flex';
}

function closeBooking() {
    document.getElementById('booking-modal').style.display = 'none';
}

// Strictly locks price calculations so users cannot fake amounts
function updatePrice() {
    let qty = document.getElementById('ticket-qty').value;
    
    if (qty < 1 || isNaN(qty)) {
        qty = 1;
        document.getElementById('ticket-qty').value = 1;
    }
    
    const total = qty * BASE_PRICE;
    document.getElementById('display-total').innerText = `₹${total}`;
}

function copyUPI() {
    navigator.clipboard.writeText(UPI_ID).then(() => {
        alert("UPI ID copied to clipboard!");
    }).catch(err => {
        console.error("Could not copy text: ", err);
    });
}

// --- CHECKOUT & PAYMENT INTEGRATION ---
function initiatePayment() {
    const qty = document.getElementById('ticket-qty').value;
    const totalAmount = qty * BASE_PRICE;
    const name = document.getElementById('user-name').value;

    if (!name || name.trim() === "") {
        alert("Please enter your name first.");
        return;
    }

    const transactionRef = "TXN" + new Date().getTime();
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=2B%20Zone&tr=${transactionRef}&am=${totalAmount}.00&cu=INR&tn=Ticket%20for%20${currentMovie}`;
    
    window.location.href = upiLink;
    alert("Opening your UPI app... Please complete the payment and note down the Reference Number (UTR).");
}

function submitBooking() {
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const qty = document.getElementById('ticket-qty').value;
    const ref = document.getElementById('payment-ref').value.trim();
    const date = document.getElementById('booking-date').value;
    const totalAmount = qty * BASE_PRICE;

    if (!name || !phone) {
        alert("Name and Phone number are strictly required to save the booking.");
        return;
    }

    const bookingData = { name, phone, movie: currentMovie, qty, total: totalAmount, ref, date };
    saveBooking(bookingData);

    const waText = `*New Booking Request*%0A%0AMovie: ${currentMovie}%0ADate: ${date}%0AName: ${name}%0APhone: ${phone}%0ATickets: ${qty}%0ATotal Amount: ₹${totalAmount}%0APayment Ref (UTR): ${ref}%0A%0APlease confirm my booking.`;
    const waUrl = `https://wa.me/919876543210?text=${waText}`;
    
    closeBooking();
    alert("Booking saved successfully! Redirecting to WhatsApp to send confirmation...");
    window.open(waUrl, '_blank');
}

// --- ADMIN TOGGLE ---
function toggleAdmin() {
    const panel = document.getElementById('admin-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        // Scroll to panel
        panel.scrollIntoView({ behavior: 'smooth' });
    } else {
        panel.style.display = 'none';
    }
}
