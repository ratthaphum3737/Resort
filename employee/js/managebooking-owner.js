document.addEventListener("DOMContentLoaded", loadBookings);

async function loadBookings() {
  try {
    const res = await fetch(`http://localhost:3000/api/bookingowner/databooking`);   
    const data = await res.json();
    

    const tableBody = document.querySelector("tbody");
    tableBody.innerHTML = "";

data.forEach(booking => {

  const formattedDate = new Date(booking.bcheckin_date)
    .toLocaleDateString("th-TH");

  tableBody.innerHTML += `
    <tr>
      <td>${booking.bid}</td>
     <td>${booking.customer_name}</td>
      <td>${formattedDate}</td>
      <td>${booking.bstatus}</td>
    <td>-</td>
    </tr>
  `;
});

  } catch (err) {
    console.error("Error loading bookings:", err);
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
