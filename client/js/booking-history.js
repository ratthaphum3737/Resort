const userId = localStorage.getItem('userId');

if (!userId) {
  alert('กรุณาเข้าสู่ระบบ');
  window.location.href = '/login.html';
}

async function loadBookingHistory() {
  const res = await fetch(`/api/bookings/${userId}`);
  const bookings = await res.json();

  const table = document.getElementById('bookingTable');
  table.innerHTML = '';

  if (bookings.length === 0) {
    table.innerHTML = `
      <tr>
        <td colspan="6">ยังไม่มีประวัติการจอง</td>
      </tr>
    `;
    return;
  }

  bookings.forEach(b => {
    table.innerHTML += `
      <tr>
        <td>${b.bid}</td>
        <td>${b.rooms}</td>
        <td>${formatDate(b.checkin)}</td>
        <td>${formatDate(b.checkout)}</td>
        <td>${b.num_people}</td>
        <td>${b.status}</td>
      </tr>
    `;
  });
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('th-TH');
}

function goHome() {
  window.location.href = '/home.html';
}

loadBookingHistory();