let bookingChart;
let revenueChart;
let availableRoomChart;

function reloadAllReports() {
    console.log(
        'reload',
        document.getElementById('startDate1').value,
        document.getElementById('endDate1').value
    );

    loadBookingAndRevenue();
    loadAvailableRooms();
}

document.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const startInput = document.getElementById('startDate1');
    const endInput = document.getElementById('endDate1');

    if (!startInput || !endInput) {
        console.error('date input not found');
        return;
    }

    startInput.value = lastWeek.toISOString().split('T')[0];
    endInput.value = today.toISOString().split('T')[0];

    ['input', 'change'].forEach(evt => {
        startInput.addEventListener(evt, reloadAllReports);
        endInput.addEventListener(evt, reloadAllReports);
    });

    reloadAllReports();
});



async function loadBookingAndRevenue() {
    const start = document.getElementById('startDate1').value;
    const end = document.getElementById('endDate1').value;

    console.log('booking/revenue range:', start, end);
    const resBooking = await fetch(`/api/admin/reports/bookings?start=${start}&end=${end}`);
    const dataBooking = await resBooking.json();
    console.log('booking data:', dataBooking);
    const resRevenue = await fetch(`/api/admin/reports/revenue?start=${start}&end=${end}`);
    const dataRevenue = await resRevenue.json();
    console.log('revenue data:', dataRevenue);

    if (!start || !end) return;

    try {
        // 🔸 กราฟยอดจอง
        const resBooking = await fetch(`/api/admin/reports/bookings?start=${start}&end=${end}`);
        const dataBooking = await resBooking.json();

        renderBookingChart(
            dataBooking.map(i => i.book_date),
            dataBooking.map(i => parseInt(i.total_bookings))
        );

        // 🔸 กราฟรายรับ
        const resRevenue = await fetch(`/api/admin/reports/revenue?start=${start}&end=${end}`);
        const dataRevenue = await resRevenue.json();

        renderRevenueChart(
            dataRevenue.map(i => i.book_date),
            dataRevenue.map(i => parseFloat(i.daily_revenue || 0))
        );

        // 🔸 รวมยอดรายรับ
        const total = dataRevenue.reduce(
            (sum, item) => sum + parseFloat(item.daily_revenue || 0),
            0
        );

        document.getElementById('totalRevenueText').innerText =
            total.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

    } catch (err) {
        console.error("Error loading booking/revenue report:", err);
    }
}

async function loadAvailableRooms() {
    const start = document.getElementById('startDate1').value;
    const end = document.getElementById('endDate1').value;

    if (!start || !end) return;

    try {
        const resAvail = await fetch(
            `/api/admin/reports/available-rooms?start=${start}&end=${end}`
        );
        const dataAvail = await resAvail.json();

        renderAvailableRoomChart(
            dataAvail.map(i => i.book_date),
            dataAvail.map(i => parseInt(i.available_rooms))
        );

    } catch (err) {
        console.error("Error loading available rooms report:", err);
    }
}

function renderBookingChart(labels, data) {
    const ctx = document.getElementById('bookingChart').getContext('2d');
    if (bookingChart) bookingChart.destroy();

    bookingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'จำนวนการจอง (รายการ)',
                data,
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230, 126, 34, 0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function renderRevenueChart(labels, data) {
    const ctx = document.getElementById('revenueChart').getContext('2d');
    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'รายรับรวม (บาท)',
                data,
                backgroundColor: '#2ecc71',
                borderColor: '#27ae60',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function renderAvailableRoomChart(labels, data) {
    const ctx = document.getElementById('availableRoomChart').getContext('2d');
    if (availableRoomChart) availableRoomChart.destroy();

    availableRoomChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'จำนวนห้องว่าง (ห้อง)',
                data,
                backgroundColor: '#3498db',
                borderColor: '#2980b9',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });
}

function goManageRoom() {
    window.location.href = '/manageRoom-owner.html';
}
function goManagebooking() {
    window.location.href = '/managebooking-owner.html';
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
