let currentTab = 'one-way';
let selectedFlight = null;

// ─── NAV AUTH STATE ───────────────────────────────────────────
const user = JSON.parse(localStorage.getItem('user') || 'null');
const navAuth = document.getElementById('navAuth');
if (user && navAuth) {
  navAuth.innerHTML = `<span class="nav-user">${user.name}</span><button class="btn-outline" onclick="localStorage.clear();location.href='login.html'">Logout</button>`;
}

// ─── TABS ─────────────────────────────────────────────────────
function setTab(tab, btn) {
  currentTab = tab;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('groupField').style.display = tab === 'group' ? 'flex' : 'none';
}

// ─── SWAP ─────────────────────────────────────────────────────
function swapLocations() {
  const from = document.getElementById('fromInput');
  const to = document.getElementById('toInput');
  [from.value, to.value] = [to.value, from.value];
}

// ─── SEARCH ───────────────────────────────────────────────────
async function searchFlights() {
  const from = document.getElementById('fromInput').value.trim();
  const to = document.getElementById('toInput').value.trim();
  const date = document.getElementById('dateInput').value;

  if (!from || !to) {
    alert('Please enter departure and destination cities.');
    return;
  }

  const section = document.getElementById('resultsSection');
  const grid = document.getElementById('flightResults');
  section.style.display = 'block';
  grid.innerHTML = '<div class="loading-spinner">Searching flights...</div>';
  section.scrollIntoView({ behavior: 'smooth' });

  let url = `/flights/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  if (date) url += `&date=${date}`;

  const flights = await api.getPublic(url);

  if (flights.error) {
    grid.innerHTML = `<p class="empty-state">${flights.error}</p>`;
    return;
  }
  if (!flights.length) {
    grid.innerHTML = `<p class="empty-state">No flights found for this route. Try different dates or cities.</p>`;
    return;
  }

  grid.innerHTML = flights.map(f => `
    <div class="flight-card">
      <div class="flight-airline">${getAirline(f.flightNumber)}</div>
      <div class="flight-route">
        <div class="flight-city">
          <span class="city-code">${f.fromLocation.substring(0,3).toUpperCase()}</span>
          <span class="city-name">${f.fromLocation}</span>
          <span class="flight-time">${formatTime(f.departureTime)}</span>
        </div>
        <div class="flight-duration">
          <span class="flight-num">${f.flightNumber}</span>
          <div class="duration-line"><div class="plane-icon">✈</div></div>
          <span class="duration-text">${getDuration(f.departureTime, f.arrivalTime)}</span>
        </div>
        <div class="flight-city">
          <span class="city-code">${f.toLocation.substring(0,3).toUpperCase()}</span>
          <span class="city-name">${f.toLocation}</span>
          <span class="flight-time">${formatTime(f.arrivalTime)}</span>
        </div>
      </div>
      <div class="flight-footer">
        <div class="flight-info">
          <span class="seats-left">${f.availableSeats} seats left</span>
          <span class="status-badge ${f.status.toLowerCase().replace(/[- ]/g,'')}">${f.status}</span>
        </div>
        <div class="flight-price">
          <span class="price">PKR ${calcPrice(f)}</span>
          <button class="btn-solid small" onclick="openBooking(${JSON.stringify(f).replace(/"/g,'&quot;')})">Book</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ─── BOOKING MODAL ────────────────────────────────────────────
function openBooking(flight) {
  if (!user) {
    if (confirm('You need to log in to book a flight. Go to login page?')) window.location.href = 'login.html';
    return;
  }
  selectedFlight = flight;
  const price = calcPrice(flight);

  document.getElementById('modalFlightInfo').innerHTML = `
    <div class="modal-route">
      <b>${flight.fromLocation}</b> ✈ <b>${flight.toLocation}</b>
    </div>
    <div class="modal-details">
      <span>${flight.flightNumber}</span>
      <span>${formatDate(flight.departureTime)}</span>
      <span>${formatTime(flight.departureTime)} → ${formatTime(flight.arrivalTime)}</span>
    </div>
  `;
  document.getElementById('modalAmount').innerHTML = `Total: <b>PKR ${price}</b> <small>(incl. 15% tax)</small>`;
  document.getElementById('bookingModal').style.display = 'flex';
  document.getElementById('bookingMsg').style.display = 'none';
}

function closeModal() {
  document.getElementById('bookingModal').style.display = 'none';
  selectedFlight = null;
}

async function confirmBooking() {
  const seatNumber = document.getElementById('seatInput').value.trim().toUpperCase();
  const paymentMethod = document.getElementById('paymentMethod').value;
  const msg = document.getElementById('bookingMsg');

  if (!seatNumber) return showMsg(msg, 'Please enter a seat number.', 'error');

  const price = calcPrice(selectedFlight);

  // Create booking
  const booking = await api.post('/bookings', {
    flightId: selectedFlight.flightId,
    seatNumber,
    totalAmount: price
  });

  if (booking.error) return showMsg(msg, booking.error, 'error');

  // Process payment
  const payment = await api.post('/payments', {
    bookingId: booking.bookingId,
    paymentMethod,
    paymentAmount: price
  });

  if (payment.error) {
    showMsg(msg, `Booked (ID: ${booking.bookingId}) but payment failed. Go to dashboard to pay.`, 'error');
  } else {
    showMsg(msg, `✅ Booking confirmed! You earned ${payment.pointsEarned} loyalty points.`, 'success');
    setTimeout(() => { closeModal(); window.location.href = 'dashboard.html'; }, 1800);
  }
}

// ─── HELPERS ──────────────────────────────────────────────────
function calcPrice(f) {
  // Simple mock pricing based on route
  const base = 8000;
  const distance = Math.abs(f.fromLocation.length - f.toLocation.length) * 500 + base;
  return (distance + Math.round(distance * 0.15));
}

function formatTime(dt) {
  return new Date(dt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDuration(dep, arr) {
  const diff = (new Date(arr) - new Date(dep)) / 60000;
  return `${Math.floor(diff/60)}h ${diff%60}m`;
}

function getAirline(flightNum) {
  if (flightNum.startsWith('PK')) return 'Pakistan International Airlines';
  if (flightNum.startsWith('PA')) return 'PIA Express';
  if (flightNum.startsWith('SA')) return 'Serene Air';
  return 'SkyWay Air';
}

// Close modal on backdrop click
document.getElementById('bookingModal')?.addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
