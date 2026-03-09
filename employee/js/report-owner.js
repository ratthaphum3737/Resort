// ─────────────────────────────────────────
// report-owner.js  (Frontend / client/js/)
// ─────────────────────────────────────────
let bookingChart;
let revenueChart;
let availableRoomChart;

// ── สร้าง array ทุกวันในช่วง start → end ──
function buildDateRange(start, end) {
    const dates = [];
    const cur   = new Date(start);
    const last  = new Date(end);
    while (cur <= last) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

// ── map ข้อมูล API → ทุกวันในช่วง (วันที่ไม่มีข้อมูล = 0) ──
function fillDateSeries(dateRange, apiData, dateKey, valueKey) {
    const map = {};
    apiData.forEach(row => { map[row[dateKey]] = row[valueKey]; });
    return dateRange.map(d => parseFloat(map[d] || 0));
}

// ── init ──
document.addEventListener("DOMContentLoaded", () => {

    const todayBadge = document.getElementById('todayBadge');
    if (todayBadge) {
        todayBadge.textContent = new Date().toLocaleDateString('th-TH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const fname = localStorage.getItem('Fname') || 'Owner';
    const ownerName    = document.getElementById('ownerName');
    const ownerInitial = document.getElementById('ownerInitial');
    if (ownerName)    ownerName.textContent    = fname;
    if (ownerInitial) ownerInitial.textContent = fname.charAt(0).toUpperCase();

    // ตั้งค่าวันที่เริ่มต้น (7 วันข้างหน้า — เพราะดูตาม check-in)
    const today   = new Date();
    const nextWk  = new Date();
    nextWk.setDate(today.getDate() + 7);

    const startInput = document.getElementById('startDate1');
    const endInput   = document.getElementById('endDate1');
    if (!startInput || !endInput) { console.error('date input not found'); return; }

    startInput.value = today.toISOString().split('T')[0];
    endInput.value   = nextWk.toISOString().split('T')[0];

    ['input', 'change'].forEach(evt => {
        startInput.addEventListener(evt, reloadAllReports);
        endInput.addEventListener(evt,   reloadAllReports);
    });

    reloadAllReports();
    loadRoomStatus();
    loadRecentBookings();
});

function reloadAllReports() {
    loadBookingAndRevenue();
    loadAvailableRooms();
}

// ── 1. กราฟยอดจอง + รายรับ + KPI (ตามวันเข้าพัก) ──
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

        // fill ทุกวันในช่วง — วันที่ไม่มีใครเช็คอิน = 0
        const dateRange     = buildDateRange(start, end);
        const bookingValues = fillDateSeries(dateRange, dataB, 'book_date', 'total_bookings');
        const revenueValues = fillDateSeries(dateRange, dataR, 'book_date', 'daily_revenue');

        // KPI
        const totalBookings = bookingValues.reduce((s, v) => s + v, 0);
        const totalRevenue  = revenueValues.reduce((s, v) => s + v, 0);
        const days          = dateRange.length || 1;

        const elB = document.getElementById('kpiTotalBookings');
        const elR = document.getElementById('kpiTotalRevenue');
        const elD = document.getElementById('kpiAvgDaily');
        const elP = document.getElementById('totalRevenueText');
        if (elB) elB.textContent = totalBookings.toLocaleString('th-TH');
        if (elR) elR.textContent = formatBaht(totalRevenue, 0) + ' ฿';
        if (elD) elD.textContent = formatBaht(totalRevenue / days, 0) + ' ฿';
        if (elP) elP.textContent = totalRevenue.toLocaleString('th-TH', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        }) + ' บาท';

        renderBookingChart(dateRange, bookingValues);
        renderRevenueChart(dateRange, revenueValues);

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

        const avg   = data.length
            ? data.reduce((s, i) => s + parseInt(i.available_rooms || 0), 0) / data.length
            : 0;
        const elA = document.getElementById('kpiAvgRooms');
        if (elA) elA.textContent = avg.toFixed(1);

        renderAvailableRoomChart(
            data.map(i => i.book_date),
            data.map(i => parseInt(i.available_rooms))
        );
    } catch (err) {
        console.error("loadAvailableRooms error:", err);
    }
}

// ── 3. ตารางสถานะห้องพัก ──
async function loadRoomStatus() {
    const area  = document.getElementById('roomTableArea');
    const badge = document.getElementById('roomCountBadge');
    if (!area) return;
    try {
        const res  = await fetch('/api/admin/rooms');
        const data = await res.json();
        if (badge) badge.textContent = `${data.length} ห้อง`;
        if (!data.length) { area.innerHTML = '<p style="padding:16px;color:#6b7a99;font-size:13px;">ไม่พบข้อมูลห้อง</p>'; return; }

        const rows = data.map(r => {
            const status = r.rstatus || r.RStatus || '-';
            const cls    = status === 'Available' ? 'badge-available'
                         : status === 'Booked'    ? 'badge-booked'
                         : 'badge-maintenance';
            return `<tr>
                <td><strong>${r.rnum || r.RNum || '-'}</strong></td>
                <td>${r.rtype || r.RType || '-'}</td>
                <td>${parseInt(r.rprice || r.RPrice || 0).toLocaleString('th-TH')} ฿</td>
                <td><span class="badge ${cls}">${status}</span></td>
            </tr>`;
        }).join('');
        area.innerHTML = `<table>
            <thead><tr><th>ห้อง</th><th>ประเภท</th><th>ราคา/คืน</th><th>สถานะ</th></tr></thead>
            <tbody>${rows}</tbody></table>`;
    } catch (err) {
        console.error("loadRoomStatus error:", err);
        if (area) area.innerHTML = '<p style="padding:16px;color:#e74c3c;font-size:13px;">⚠️ โหลดข้อมูลห้องไม่ได้</p>';
    }
}

// ── 4. ตารางการจองล่าสุด ──
async function loadRecentBookings() {
    const area = document.getElementById('recentBookingArea');
    if (!area) return;
    try {
        const res  = await fetch('/api/admin/bookings/recent?limit=8');
        const data = await res.json();
        if (!data.length) { area.innerHTML = '<p style="padding:16px;color:#6b7a99;font-size:13px;">ไม่พบข้อมูลการจอง</p>'; return; }

        const rows = data.map(b => {
            const status = b.bstatus || b.BStatus || '-';
            const cls    = status === 'Confirmed' ? 'tag-confirmed'
                         : status === 'Pending'   ? 'tag-pending'
                         : 'tag-cancelled';
            const rawDate = b.bcheckin_date || b.Bcheckin_date;
            const d = rawDate
                ? new Date(rawDate).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
                : '-';
            const name = b.customer_name || b.cid || b.Cid || '-';
            return `<tr>
                <td><strong>${b.bid || b.Bid || '-'}</strong></td>
                <td>${name}</td>
                <td>${d}</td>
                <td><span class="${cls}">${status}</span></td>
            </tr>`;
        }).join('');
        area.innerHTML = `<table>
            <thead><tr><th>Booking ID</th><th>ลูกค้า</th><th>วันเช็คอิน</th><th>สถานะ</th></tr></thead>
            <tbody>${rows}</tbody></table>`;
    } catch (err) {
        console.error("loadRecentBookings error:", err);
        if (area) area.innerHTML = '<p style="padding:16px;color:#e74c3c;font-size:13px;">⚠️ โหลดข้อมูลการจองไม่ได้</p>';
    }
}

// ── Render: จำนวนการจอง (line — 1 จุดต่อวันเช็คอิน) ──
function renderBookingChart(labels, data) {
    const wrap   = document.getElementById('bookingChartWrap');
    const canvas = document.getElementById('bookingChart');
    if (!canvas) return;
    if (wrap) wrap.style.display = 'none';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (bookingChart) bookingChart.destroy();
    bookingChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [{
            label: 'จำนวนการจอง (รายการ)',
            data,
            borderColor: '#e67e22',
            backgroundColor: 'rgba(230,126,34,0.15)',
            borderWidth: 2.5, fill: true, tension: 0,
            pointRadius: 5, pointHoverRadius: 7,
            pointBackgroundColor: '#e67e22',
            pointBorderColor: '#fff', pointBorderWidth: 2
        }]},
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.parsed.y} รายการ` } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
                x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 }, grid: { display: false } }
            }
        }
    });
}

// ── Render: รายรับรวม (bar — 1 แท่งต่อวันเช็คอิน) ──
function renderRevenueChart(labels, data) {
    const wrap   = document.getElementById('revenueChartWrap');
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    if (wrap) wrap.style.display = 'none';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (revenueChart) revenueChart.destroy();
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{
            label: 'รายรับรวม (บาท)',
            data,
            backgroundColor: 'rgba(26,188,156,0.75)',
            borderColor: '#15967c',
            borderWidth: 1.5, borderRadius: 5, borderSkipped: false,
            barPercentage: 0.6, categoryPercentage: 0.8
        }]},
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.parsed.y.toLocaleString('th-TH')} บาท` } }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f0f0f0' } },
                x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 }, grid: { display: false } }
            }
        }
    });
}

// ── Render: ห้องว่างรายวัน (bar) ──
function renderAvailableRoomChart(labels, data) {
    const wrap   = document.getElementById('availableChartWrap');
    const canvas = document.getElementById('availableRoomChart');
    if (!canvas) return;
    if (wrap) wrap.style.display = 'none';
    canvas.style.display = 'block';

    const ctx = canvas.getContext('2d');
    if (availableRoomChart) availableRoomChart.destroy();
    availableRoomChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{
            label: 'จำนวนห้องว่าง (ห้อง)',
            data,
            backgroundColor: 'rgba(52,152,219,0.75)',
            borderColor: '#2980b9',
            borderWidth: 1.5, borderRadius: 4, borderSkipped: false,
            barPercentage: 0.6, categoryPercentage: 0.8
        }]},
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: c => ` ${c.parsed.y} ห้อง` } }
            },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f0f0f0' } },
                x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 }, grid: { display: false } }
            }
        }
    });
}

// ── Helpers ──
function formatBaht(n, digits = 2) {
    return parseFloat(n || 0).toLocaleString('th-TH', {
        minimumFractionDigits: digits, maximumFractionDigits: digits
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