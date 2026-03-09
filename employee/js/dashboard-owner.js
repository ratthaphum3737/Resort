console.log("Dashboard JS Loaded");
async function loadDashboard() {
    const res = await fetch("/api/dashboard/summary");
    const data = await res.json();

    document.querySelectorAll(".card-value")[0].innerText = data.todayRevenue;
    document.querySelectorAll(".card-value")[1].innerText = data.monthlyRevenue;
    document.querySelectorAll(".card-value")[2].innerText = data.totalRooms;
    document.querySelectorAll(".card-value")[3].innerText = data.availableRooms;
    document.querySelectorAll(".card-value")[4].innerText = data.todayBookings;
}

function goManageRoom() {
    window.location.href = "manageRoom-owner.html";
}
function goManageBooking() {
    window.location.href = "managebooking-owner.html";
}
function goManageMember() {
    window.location.href = "manageMember-owner.html";
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

loadDashboard();