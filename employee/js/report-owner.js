// ─────────────────────────────────────────
// report-owner.js  (Frontend / client/js/)
// ─────────────────────────────────────────
let bookingChart;
let revenueChart;
let availableRoomChart;

// ── init ──
document.addEventListener("DOMContentLoaded", () => {

    // แสดงวันที่วันนี้
    document.getElementById('todayBadge').textContent =
        new Date().toLocaleDateString('th-TH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

    // แสดงชื่อ owner จาก localStorage
    const fname = localStorage.getItem('Fname') || 'Owner';
    document.getElementById('ownerName').textContent = fname;
    document.getElementById('ownerInitial').textContent = fname.charAt(0).toUpperCase();

    // ตั้งค่าวันที่เริ่มต้น (7 วันย้อนหลัง)
    const today    = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const startInput = document.getElementById('startDate1');
    const endInput   = document.getElementById('endDate1');

    if (!startInput || !endInput) {
        console.error('date input not found');
        return;
    }

    startInput.value = lastWeek.toISOString().split('T')[0];
    endInput.value   = today.toISOString().split('T')[0];

    ['input', 'change'].forEach(evt => {
        startInput.addEventListener(evt, reloadAllReports);
        endInput.addEventListener(evt,   reloadAllReports);
    });

    // โหลดทุกอย่าง
    reloadAllReports();
    loadRoomStatus();
    loadRecentBookings();
});

// ── เรียกโหลดกราฟใหม่เมื่อเปลี่ยนวันที่ ──
function reloadAllReports() {
    loadBookingAndRevenue();
    loadAvailableRooms();
}

// ── 1. กราฟยอดจอง + รายรับ + KPI ──
async function loadBookingAndRevenue() {
    const start = document.getElementById('startDate1').value;
    const end   = document.getElementById('endDate1').value;
    if (!start || !end) return;

    try {
        const [resB, resR] = await Promise.all([
            fetch(`/api/admin/reports/bookings?start=${start}&end=${end}`),
            fetch(`/api/admin/reports/revenue?start=${start}&end=${end}`)
        ]);

        const dataB = await resB.json();
        const dataR = await resR.json();

        // ── KPI ──
        const totalBookings = dataB.reduce((s, i) => s + parseInt(i.total_bookings || 0), 0);
        const totalRevenue  = dataR.reduce((s, i) => s + parseFloat(i.daily_revenue  || 0), 0);
        const days          = dataR.length || 1;

        document.getElementById('kpiTotalBookings').textContent = totalBookings.toLocaleString('th-TH');
        document.getElementById('kpiTotalRevenue').textContent  = formatBaht(totalRevenue, 0) + ' ฿';
        document.getElementById('kpiAvgDaily').textContent      = formatBaht(totalRevenue / days, 0) + ' ฿';

        // ยอดรายรับสุทธิ (revenue pill)
        document.getElementById('totalRevenueText').textContent =
            totalRevenue.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }) + ' บาท';

        // ── กราฟ ──
        renderBookingChart(
            dataB.map(i => i.book_date),
            dataB.map(i => parseInt(i.total_bookings))
        );
        renderRevenueChart(
            dataR.map(i => i.book_date),
            dataR.map(i => parseFloat(i.daily_revenue || 0))
        );

    } catch (err) {
        console.error("loadBookingAndRevenue error:", err);
    }
}

// ── 2. กราฟห้องว่าง + KPI ──
async function loadAvailableRooms() {
    const start = document.getElementById('startDate1').value;
    const end   = document.getElementById('endDate1').value;
    if (!start || !end) return;

    try {
        const res  = await fetch(`/api/admin/reports/available-rooms?start=${start}&end=${end}`);
        const data = await res.json();

        // KPI ห้องว่างเฉลี่ย
        const avg = data.length
            ? data.reduce((s, i) => s + parseInt(i.available_rooms || 0), 0) / data.length
            : 0;
        document.getElementById('kpiAvgRooms').textContent = avg.toFixed(1);

        renderAvailableRoomChart(
            data.map(i => i.book_date),
            data.map(i => parseInt(i.available_rooms))
        );

    } catch (err) {
        console.error("loadAvailableRooms error:", err);
    }
}

// ── 3. ตารางสถานะห้องพัก ──
//       GET /api/admin/rooms → router.get("/") ใน report-owner (backend)
async function loadRoomStatus() {
    try {
        const res  = await fetch('/api/admin/rooms');
        const data = await res.json();

        document.getElementById('roomCountBadge').textContent = `${data.length} ห้อง`;

        if (!data.length) {
            document.getElementById('roomTableArea').innerHTML =
                '<p style="padding:16px;color:#6b7a99;font-size:13px;">ไม่พบข้อมูลห้อง</p>';
            return;
        }

        const rows = data.map(r => {
            const status = r.rstatus || r.RStatus || '-';
            const cls    = status === 'Available'   ? 'badge-available'
                         : status === 'Booked'      ? 'badge-booked'
                         : 'badge-maintenance';
            return `<tr>
                <td><strong>${r.rnum || r.RNum || '-'}</strong></td>
                <td>${r.rtype || r.RType || '-'}</td>
                <td>${parseInt(r.rprice || r.RPrice || 0).toLocaleString('th-TH')} ฿</td>
                <td><span class="badge ${cls}">${status}</span></td>
            </tr>`;
        }).join('');

        document.getElementById('roomTableArea').innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>ห้อง</th>
                        <th>ประเภท</th>
                        <th>ราคา/คืน</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

    } catch (err) {
        console.error("loadRoomStatus error:", err);
        document.getElementById('roomTableArea').innerHTML =
            '<p style="padding:16px;color:#e74c3c;font-size:13px;">⚠️ โหลดข้อมูลห้องไม่ได้</p>';
    }
}

// ── 4. ตารางการจองล่าสุด ──
//       GET /api/admin/bookings/recent → router.get("/recent") ใน report-owner (backend)
async function loadRecentBookings() {
    try {
        const res  = await fetch('/api/admin/bookings/recent?limit=8');
        const data = await res.json();

        if (!data.length) {
            document.getElementById('recentBookingArea').innerHTML =
                '<p style="padding:16px;color:#6b7a99;font-size:13px;">ไม่พบข้อมูลการจอง</p>';
            return;
        }

        const rows = data.map(b => {
            const status = b.bstatus || b.BStatus || '-';
            const cls    = status === 'Confirmed' ? 'tag-confirmed'
                         : status === 'Pending'   ? 'tag-pending'
                         : 'tag-cancelled';
            const d = b.bdate || b.BDate
                ? new Date(b.bdate || b.BDate).toLocaleDateString('th-TH', {
                    day: '2-digit', month: 'short', year: '2-digit'
                  })
                : '-';
            const name = b.customer_name || b.cid || b.Cid || '-';
            return `<tr>
                <td><strong>${b.bid || b.Bid}</strong></td>
                <td>${name}</td>
                <td>${d}</td>
                <td><span class="${cls}">${status}</span></td>
            </tr>`;
        }).join('');

        document.getElementById('recentBookingArea').innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Booking ID</th>
                        <th>ลูกค้า</th>
                        <th>วันที่จอง</th>
                        <th>สถานะ</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;

    } catch (err) {
        console.error("loadRecentBookings error:", err);
        document.getElementById('recentBookingArea').innerHTML =
            '<p style="padding:16px;color:#e74c3c;font-size:13px;">⚠️ โหลดข้อมูลการจองไม่ได้</p>';
    }
}

// ── Render Charts ──
function renderBookingChart(labels, data) {
    const wrap = document.getElementById('bookingChartWrap');
    const canvas = document.getElementById('bookingChart');
    if (wrap)   wrap.style.display   = 'none';
    if (canvas) canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (bookingChart) bookingChart.destroy();

    bookingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'จำนวนการจอง (รายการ)',
                data,
                borderColor: '#e67e22',
                backgroundColor: 'rgba(230,126,34,0.15)',
                borderWidth: 2.5,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#e67e22',
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderRevenueChart(labels, data) {
    const wrap = document.getElementById('revenueChartWrap');
    const canvas = document.getElementById('revenueChart');
    if (wrap)   wrap.style.display   = 'none';
    if (canvas) canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'รายรับรวม (บาท)',
                data,
                backgroundColor: 'rgba(26,188,156,0.75)',
                borderColor: '#15967c',
                borderWidth: 1.5,
                borderRadius: 5,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderAvailableRoomChart(labels, data) {
    const wrap = document.getElementById('availableChartWrap');
    const canvas = document.getElementById('availableRoomChart');
    if (wrap)   wrap.style.display   = 'none';
    if (canvas) canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (availableRoomChart) availableRoomChart.destroy();

    availableRoomChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'จำนวนห้องว่าง (ห้อง)',
                data,
                backgroundColor: 'rgba(52,152,219,0.7)',
                borderColor: '#2980b9',
                borderWidth: 1.5,
                borderRadius: 4,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// ── Helpers ──
function formatBaht(n, digits = 2) {
    return parseFloat(n || 0).toLocaleString('th-TH', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    });
}

// ── Navigation ──
function goManageRoom()    { window.location.href = '/manageRoom-owner.html'; }
function goManagebooking() { window.location.href = '/managebooking-owner.html'; }

// ── Logout ──
document.getElementById("logoutBtn").addEventListener("click", () => {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
        ['userId', 'Fname', 'erole', 'role'].forEach(k => localStorage.removeItem(k));
        window.location.href = "/login.html";
    }
});