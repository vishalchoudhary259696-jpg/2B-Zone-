// --- WELCOME ANIMATION LOGIC ---
document.addEventListener("DOMContentLoaded", () => {
    // Hide welcome screen after animation
    setTimeout(() => {
        const welcomeScreen = document.getElementById('welcome-screen');
        welcomeScreen.classList.add('slide-up');
        
        // Remove from DOM after transition
        setTimeout(() => {
            welcomeScreen.style.display = 'none';
        }, 1000);
    }, 2500); // 2.5 seconds delay

    // Setup Intersection Observer for Scroll Animation
    const observerOptions = {
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target); // Animate only once
            }
        });
    }, observerOptions);

    // Observe all elements with .animate-on-scroll
    document.querySelectorAll('.animate-on-scroll').forEach(element => {
        observer.observe(element);
    });

    // Initialize Date Picker and Database
    document.getElementById('booking-date').valueAsDate = new Date();
    updateDashboard();
});

// --- SYSTEM VARIABLES ---
const BASE_PRICE = 99;
const TOTAL_SEATS = 30;
const UPI_ID = "2bzone@upi"; 
let currentMovie = "";


// --- DATABASE SIMULATION (LocalStorage) ---
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
    localStorage.removeItem('cinema_bookings');
    updateDashboard();
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

    const seatsLeft = TOTAL_SEATS - seatsBooked;
    
    const publicSeats = document.getElementById('seats-left-display');
    const ticket1Seats = document.getElementById('ticket-1-seats');
    const adminSeats = document.getElementById('admin-seats-left');
    
    if(publicSeats) publicSeats.innerText = seatsLeft;
    if(ticket1Seats) ticket1Seats.innerText = seatsLeft;
    if(adminSeats) adminSeats.innerText = seatsLeft;
}

// --- UI & BOOKING LOGIC ---
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
    });
}

function initiatePayment() {
    const qty = document.getElementById('ticket-qty').value;
    const totalAmount = qty * BASE_PRICE;
    const name = document.getElementById('user-name').value;

    if (!name) {
        alert("Please enter your name first.");
        return;
    }

    const transactionRef = "TXN" + new Date().getTime();
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=2B%20Zone&tr=${transactionRef}&am=${totalAmount}.00&cu=INR&tn=Ticket%20for%20${currentMovie}`;
    
    window.location.href = upiLink;
    alert("Opening your UPI app... Please complete the payment and note down the Reference number.");
}

function submitBooking() {
    const name = document.getElementById('user-name').value.trim();
    const phone = document.getElementById('user-phone').value.trim();
    const qty = document.getElementById('ticket-qty').value;
    const ref = document.getElementById('payment-ref').value.trim();
    const date = document.getElementById('booking-date').value;
    const totalAmount = qty * BASE_PRICE;

    if (!name || !phone) {
        alert("Name and Phone number are required!");
        return;
    }

    const bookingData = { name, phone, movie: currentMovie, qty, total: totalAmount, ref, date };
    saveBooking(bookingData);

    const waText = `*New Booking Request*%0A%0AMovie: ${currentMovie}%0ADate: ${date}%0AName: ${name}%0APhone: ${phone}%0ATickets: ${qty}%0ATotal Amount: ₹${totalAmount}%0APayment Ref (UTR): ${ref}%0A%0APlease confirm my booking.`;
    const waUrl = `https://wa.me/919876543210?text=${waText}`;
    
    closeBooking();
    alert("Booking saved! Redirecting to WhatsApp...");
    window.open(waUrl, '_blank');
}

function toggleAdmin() {
    const panel = document.getElementById('admin-panel');
    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
    } else {
        panel.style.display = 'none';
    }
}
