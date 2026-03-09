let bookingChart;
let revenueChart;
let availableRoomChart;

// ── สร้าง array วันทุกวันในช่วง start → end (YYYY-MM-DD) ──
function buildDateRange(start, end) {
    const dates = [];
    const cur = new Date(start);
    const last = new Date(end);
    while (cur <= last) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

// ── map ข้อมูลจาก API ให้ตรงกับทุกวันในช่วง (วันที่ไม่มีข้อมูล = 0) ──
function fillDateSeries(dateRange, apiData, dateKey, valueKey) {
    const map = {};
    apiData.forEach(row => { map[row[dateKey]] = row[valueKey]; });
    return dateRange.map(d => parseFloat(map[d] || 0));
}

// ── init ──
document.addEventListener("DOMContentLoaded", () => {
    const today = new Date();
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
        endInput.addEventListener(evt, reloadAllReports);
    });

    reloadAllReports();
});

function reloadAllReports() {
    loadBookingAndRevenue();
    loadAvailableRooms();
}

// ── โหลดกราฟยอดจอง + รายรับ ──
async function loadBookingAndRevenue() {
    const start = document.getElementById('startDate1').value;
    const end   = document.getElementById('endDate1').value;

    if (!start || !end) return;

    try {
        const [resBooking, resRevenue] = await Promise.all([
            fetch(`/api/admin/reports/bookings?start=${start}&end=${end}`),
            fetch(`/api/admin/reports/revenue?start=${start}&end=${end}`)
        ]);

        const dataBooking = await resBooking.json();
        const dataRevenue = await resRevenue.json();

        // สร้าง date range ครบทุกวัน
        const dateRange = buildDateRange(start, end);

        // fill ข้อมูล — วันที่ไม่มีการจองหรือรายรับ จะได้ค่า 0
        const bookingValues = fillDateSeries(dateRange, dataBooking, 'book_date', 'total_bookings');
        const revenueValues = fillDateSeries(dateRange, dataRevenue, 'book_date', 'daily_revenue');

        renderBookingChart(dateRange, bookingValues);
        renderRevenueChart(dateRange, revenueValues);

        // รวมยอดรายรับ
        const total = revenueValues.reduce((sum, v) => sum + v, 0);
        document.getElementById('totalRevenueText').innerText =
            total.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

    } catch (err) {
        console.error("Error loading booking/revenue report:", err);
    }
}

// ── โหลดกราฟห้องว่าง ──
async function loadAvailableRooms() {
    const start = document.getElementById('startDate1').value;
    const end   = document.getElementById('endDate1').value;

    if (!start || !end) return;

    try {
        const resAvail = await fetch(
            `/api/admin/reports/available-rooms?start=${start}&end=${end}`
        );
        const dataAvail = await resAvail.json();

        // available-rooms backend ส่งครบทุกวันอยู่แล้ว (generate_series)
        renderAvailableRoomChart(
            dataAvail.map(i => i.book_date),
            dataAvail.map(i => parseInt(i.available_rooms))
        );

    } catch (err) {
        console.error("Error loading available rooms report:", err);
    }
}

// ── Render: จำนวนการจอง (line — 1 จุดต่อวัน) ──
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
                backgroundColor: 'rgba(230, 126, 34, 0.15)',
                borderWidth: 2,
                fill: true,
                tension: 0,             // เส้นตรง → แต่ละวันชัดเจน
                pointRadius: 5,         // แสดงจุดทุกวัน
                pointHoverRadius: 7,
                pointBackgroundColor: '#e67e22',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} รายการ`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f0f0f0' }
                }
            }
        }
    });
}

// ── Render: รายรับรวม (bar — 1 แท่งต่อวัน) ──
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
                backgroundColor: 'rgba(46, 204, 113, 0.75)',
                borderColor: '#27ae60',
                borderWidth: 1,
                borderRadius: 4,        // มุมโค้งแท่ง
                borderSkipped: false,
                barPercentage: 0.6,     // ความกว้างแท่ง
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y.toLocaleString('th-TH')} บาท`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: '#f0f0f0' }
                }
            }
        }
    });
}

// ── Render: ห้องว่างรายวัน (bar) ──
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
                backgroundColor: 'rgba(52, 152, 219, 0.75)',
                borderColor: '#2980b9',
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.6,
                categoryPercentage: 0.8
            }]
        },
        options: {
            responsive: true,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} ห้อง`
                    }
                }
            },
            scales: {
                x: {
                    ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 14 },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 },
                    grid: { color: '#f0f0f0' }
                }
            }
        }
    });
}

// ── Navigation ──
function goManageRoom() {
    window.location.href = '/manageRoom-owner.html';
}
function goManagebooking() {
    window.location.href = '/managebooking-owner.html';
}

// ── Logout ──
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