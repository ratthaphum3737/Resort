document.addEventListener("DOMContentLoaded", loadBookings);

async function loadBookings() {
  try {
    const res = await fetch(`/api/bookingowner/databooking`);   
    const data = await res.json();
    
    const tableBody = document.querySelector("tbody");
    tableBody.innerHTML = "";

    data.forEach(booking => {
      const formattedDate = new Date(booking.bcheckin_date).toLocaleDateString("th-TH");

      // สร้างตัวเลือก Dropdown สำหรับสถานะ
      const statuses = ['Pending', 'Confirmed', 'Cancelled'];
      let statusOptions = statuses.map(s => {
          const selected = booking.bstatus === s ? 'selected' : '';
          return `<option value="${s}" ${selected}>${s}</option>`;
      }).join('');

      tableBody.innerHTML += `
        <tr>
          <td>${booking.bid}</td>
          <td>${booking.customer_name}</td>
          <td>${formattedDate}</td>
          <td>
            <select onchange="updateStatus('${booking.bid}', this.value)" 
                    style="padding: 5px; border-radius: 4px; border: 1px solid #ccc;">
                ${statusOptions}
            </select>
          </td>
          <td>-</td>
        </tr>
      `;
    });

  } catch (err) {
    console.error("Error loading bookings:", err);
  }
}

// ฟังก์ชันสำหรับส่งค่าไปอัปเดตใน Database
async function updateStatus(bid, newStatus) {
    try {
        const res = await fetch(`/api/bookingowner/update-status/${bid}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (res.ok) {
            alert(`อัปเดตสถานะของบิล ${bid} เป็น ${newStatus} เรียบร้อยแล้ว`);
            // โหลดตารางใหม่เพื่อให้ข้อมูลอัปเดต
            loadBookings();
        } else {
            alert("เกิดข้อผิดพลาดในการอัปเดตสถานะ");
        }
    } catch (err) {
        console.error("Error updating status:", err);
    }
}

function goManageRoom() {
  window.location.href = `/manageRoom-owner.html`;
}

document.getElementById("logoutBtn").addEventListener("click", logout);
function logout() {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
        localStorage.removeItem("userId");
        localStorage.removeItem("Fname");
        localStorage.removeItem("erole");
        localStorage.removeItem("role");
        window.location.href = "/login.html";
    }
}