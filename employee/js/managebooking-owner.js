document.addEventListener("DOMContentLoaded", () => {
  // Set today badge
  const todayBadge = document.getElementById('todayBadge');
  if (todayBadge) {
    todayBadge.textContent = new Date().toLocaleDateString('th-TH', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  // Set owner name/initial from localStorage
  const fname = localStorage.getItem('Fname') || 'Owner';
  const ownerName    = document.getElementById('ownerName');
  const ownerInitial = document.getElementById('ownerInitial');
  if (ownerName)    ownerName.textContent    = fname;
  if (ownerInitial) ownerInitial.textContent = fname.charAt(0).toUpperCase();

  loadBookings();
});

async function loadBookings() {
  const area  = document.getElementById('bookingTableArea');
  const badge = document.getElementById('bookingCountBadge');

  try {
    const res  = await fetch(`/api/bookingowner/databooking`);
    const data = await res.json();

    if (badge) badge.textContent = `${data.length} รายการ`;

    if (!data.length) {
      area.innerHTML = '<p style="padding:16px;color:#6b7a99;font-size:13px;">ไม่พบข้อมูลการจอง</p>';
      return;
    }

    const statuses = ['Pending', 'Confirmed', 'Cancelled'];

    const rows = data.map(booking => {
      const formattedDate = new Date(booking.bcheckin_date).toLocaleDateString('th-TH', {
        day: '2-digit', month: 'short', year: '2-digit'
      });

      const statusOptions = statuses.map(s => {
        const selected = booking.bstatus === s ? 'selected' : '';
        return `<option value="${s}" ${selected}>${s}</option>`;
      }).join('');

      return `<tr>
        <td><strong>${booking.bid}</strong></td>
        <td>${booking.customer_name}</td>
        <td>${formattedDate}</td>
        <td>
          <select class="status-select"
                  onchange="updateStatus('${booking.bid}', this.value)">
            ${statusOptions}
          </select>
        </td>
        <td>-</td>
      </tr>`;
    }).join('');

    area.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Booking ID</th>
            <th>ชื่อลูกค้า</th>
            <th>วันเช็คอิน</th>
            <th>สถานะ</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;

  } catch (err) {
    console.error("Error loading bookings:", err);
    if (area) area.innerHTML = '<p style="padding:16px;color:#e74c3c;font-size:13px;">⚠️ โหลดข้อมูลการจองไม่ได้</p>';
  }
}

async function updateStatus(bid, newStatus) {
  try {
    const res = await fetch(`/api/bookingowner/update-status/${bid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (res.ok) {
      alert(`อัปเดตสถานะของบิล ${bid} เป็น ${newStatus} เรียบร้อยแล้ว`);
      loadBookings();
    } else {
      alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
    }
  } catch (err) {
    console.error("Error updating status:", err);
  }
}

function goManageRoom()    { window.location.href = '/manageRoom-owner.html'; }
function goManageBooking() { window.location.href = '/managebooking-owner.html'; }

document.getElementById("logoutBtn").addEventListener("click", () => {
  if (confirm("ต้องการออกจากระบบหรือไม่?")) {
    ['userId', 'Fname', 'erole', 'role'].forEach(k => localStorage.removeItem(k));
    window.location.href = "/login.html";
  }
});