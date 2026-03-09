const rid = new URLSearchParams(window.location.search).get('rid');
const userId = localStorage.getItem('userId');

let numPeople = 1;
let checkin = null;
let checkout = null;
const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
let roomPrice = 0;
let servicesData = [];
let selectedDates = [];
let rangeStart, rangeEnd;


const weekRow = document.getElementById('calendar-weekdays');
weekRow.innerHTML = '';
weekdays.forEach(d => {
  const div = document.createElement('div');
  div.textContent = d;
  weekRow.appendChild(div);
});


async function loadCalendar() {
  const start = rangeStart.value;
  const end = rangeEnd.value;

  if (!start || !end) return;

  const startDate = new Date(start);
  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
    'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
    'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  // แสดงเดือน + ปี
  document.getElementById('calendar-header').textContent =
    `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

  const today = new Date().toISOString().split('T')[0];
  if (start < today || end < today) {
    alert('ไม่สามารถเลือกวันที่ย้อนหลังได้');
    return;
  }

  const res = await fetch(
    `/api/bookings/availability?rid=${rid}&start=${start}&end=${end}`
  );
  const days = await res.json();

  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  
  // เติมช่องว่างก่อนวันแรก
  const firstDay = new Date(days[0].date).getDay();
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'empty-day';
    cal.appendChild(empty);
  }


  days.forEach(d => {
    const div = document.createElement('div');
    div.textContent = new Date(d.date).getDate();
    div.dataset.date = d.date;
    div.className = `day ${d.available ? 'available' : 'unavailable'}`;

    if (d.available) {
      div.onclick = () => selectDate(d.date, div);
    }

    cal.appendChild(div);
  });
}


function resetSelection() {
  selectedDates = [];
  checkin = null;
  checkout = null;

  document
    .querySelectorAll('.selected-day, .in-range')
    .forEach(el => {
      el.classList.remove('selected-day', 'in-range');
    });
}

function hasUnavailableBetween(date1, date2) {
  const start = new Date(date1);
  const end = new Date(date2);

  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);

  const min = start < end ? start : end;
  const max = start < end ? end : start;

  const days = document.querySelectorAll('.day');

  for (let dayEl of days) {
    if (!dayEl.dataset.date) continue;

    const d = new Date(dayEl.dataset.date);
    d.setHours(0,0,0,0);

    if (d > min && d < max && dayEl.classList.contains('unavailable')) {
      return true;
    }
  }
  return false;
}
function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + days+1);
  return d.toISOString().slice(0,10);
}

function selectDate(date, element) {
  if (selectedDates.length === 2) {
    resetSelection();
    return;
  }
  // คลิกวันซ้ำ
  if (selectedDates.includes(date)){
    resetSelection();
    updateSummary();
    return;
  } 
  if (selectedDates.length === 1) {
    const firstDate = selectedDates[0];

    if (hasUnavailableBetween(firstDate, date)) {
      alert('ไม่สามารถเลือกช่วงที่มีวันไม่ว่างคั่นได้');
      return;
    }
  }

  selectedDates.push(date);
  element.classList.add('selected-day');

  if (selectedDates.length === 1) {
    checkin = date;
    checkout = addDays(date, 1);

    updateSummary();
    return;
  }

  if (selectedDates.length === 2) {
    selectedDates.sort();

    checkin = selectedDates[0];
    checkout = addDays(selectedDates[1], 1);

    highlightRange();
    updateSummary();
  }
}

async function loadServices() {
  const res = await fetch('/api/bookings/service');
  const services = await res.json();

  const container = document.getElementById('services');
  container.innerHTML = '';

  services.forEach(s => {
  const row = document.createElement('div');
  row.className = 'service-row';

  row.innerHTML = `
    <label class="service-left">
      <input 
        type="checkbox" 
        value="${s.sid}" 
        data-price="${s.sprice}" 
        data-name="${s.sname}"
      >
      <span class="service-name">${s.sname}</span>
    </label>

    <span class="service-price">
      ${Number(s.sprice).toLocaleString()} ฿
    </span>
    `;

    container.appendChild(row);
  });


  container.querySelectorAll('input').forEach(cb => {
    cb.addEventListener('change', updateSummary);
  });
}

function autoLoadCalendar() {
  const start = rangeStart.value;
  const end = rangeEnd.value;

  // ยังเลือกไม่ครบ → ยังไม่โหลด
  if (!start || !end) return;

  loadCalendar();
}


function highlightRange() {
  if (!checkin || !checkout) return;
  //console.log('highlight range:', checkin, checkout);
  document.querySelectorAll('.day').forEach(dayEl => {
    const date = dayEl.dataset.date; 
    if (date > checkin && date < checkout) {
      dayEl.classList.add('in-range');
    } else {
      dayEl.classList.remove('in-range');
    }
  });
}


async function loadRoomInfo() {

  const res = await fetch(`/api/rooms/${rid}`);
  const room = await res.json();

  const imgRes = await fetch(`/api/rooms/${rid}/images`);
  const images = await imgRes.json();

  roomPrice = Number(room.rprice);


  const gallery = images.map(img => `
    <img src="${img.image_url}" class="room-img">
  `).join("");

  document.getElementById('roomSummary').innerHTML = `
    <div class="room-gallery">
      ${gallery}
    </div>

    <div class="room-detail">
      <h3>${room.rtype}</h3>
      <p>ห้อง ${room.rid}</p>
      <p>${room.rdesc || ''}</p>

      <div class="room-price">
        <span>ราคาต่อคืน</span>
        <h3>฿${Number(room.rprice).toLocaleString()}</h3>
      </div>
    </div>
  `;
}



function calcNights(checkin, checkout) {
  const start = new Date(checkin);
  const end = new Date(checkout);
  start.setHours(0,0,0,0);
  end.setHours(0,0,0,0);
  return (end - start) / (1000 * 60 * 60 * 24);
}

function updateSummary() {
  if (!checkin || !checkout) return;

  const nights = calcNights(checkin, checkout);
  const roomTotal = nights * roomPrice;

  const selectedServices = [...document.querySelectorAll('#services input:checked')]
    .map(cb => ({
      name: cb.parentElement.textContent.trim(),
      price: Number(cb.dataset.price)
    }));
  const serviceTotal = selectedServices.reduce((sum, s) => sum + (s.price*nights), 0);
  const grandTotal = roomTotal + serviceTotal;

  const serviceList = selectedServices.length
    ? selectedServices
        .map(
          s => `• ${s.name} (${s.price.toLocaleString()} × ${nights} คืน)`
        )
        .join('<br>')
    : 'ไม่มี';
  document.getElementById('bookingSummary').innerHTML = `
    <p><b>Check-in:</b> ${checkin}</p>
    <p><b>Check-out:</b> ${checkout}</p>
    <p><b>จำนวนคืน:</b> ${nights} คืน</p>

    <hr>

    <p><b>ราคาห้อง:</b> ฿${roomPrice.toLocaleString()} × ${nights} คืน</p>
    <p><b>รวมค่าห้อง:</b> ฿${roomTotal.toLocaleString()}</p>

    <hr>

    <p><b>บริการเสริม:</b><br>${serviceList}</p>
    <p><b>รวมค่าบริการ:</b> ฿${serviceTotal.toLocaleString()}</p>

    <hr>
    <p><b>จำนวนผู้เข้าพัก:</b> ${numPeople} คน</p>
    <hr>
    <p class="total">ราคารวมทั้งหมด: ฿${grandTotal.toLocaleString()}</p>
  `;
}


async function confirmBooking() {

  if (!checkin || !checkout) {
    alert('กรุณาเลือกวันเข้าพักและวันออก');
    return;
  }
  // ถ้าไม่ได้ login → ไปหน้ากรอกข้อมูล guest
  if (!userId) {
    window.location.href = `/guest-info.html?rid=${rid}&checkin=${checkin}&checkout=${checkout}&numPeople=${numPeople}`;
    return;
  }
   // ดึง service ที่เลือก
  const selectedServices = [...document.querySelectorAll('#services input:checked')]
    .map(cb => cb.value);

  const payload = {
    cid: userId,
    rid,
    checkin,
    checkout,
    num_people: numPeople,
    services: selectedServices
  };

  const res = await fetch(
    '/api/bookings/create_booking',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'เกิดข้อผิดพลาด');
    return;
  }

  // ส่ง OTP
  console.log("EMAIL:", localStorage.getItem("email"));
  const otpRes = await fetch(
    "/api/send-otp",
    {
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body: JSON.stringify({
        email: localStorage.getItem("email")
      })
    }
  );

  const otpData = await otpRes.json();

  if(!otpRes.ok){
    alert("ส่ง OTP ไม่สำเร็จ");
    return;
  }

  // ไปหน้า OTP
  window.location.href =
    `/otp.html?bid=${data.bid}&token=${otpData.token}&email=${localStorage.getItem("email")}`;

}



function renderAuth() {
  const authArea = document.getElementById("authArea");
  if (!authArea) return;

  const username = localStorage.getItem("Fname");

  if (username) {
    authArea.innerHTML = `
      <div class="user-menu">
        <span class="user-name">${username}</span>
        <div class="dropdown">
          <div onclick="goProfile()">โปรไฟล์</div>
          <div onclick="goMyBooking()">การจองของฉัน</div>
          <div onclick="logout()">ออกจากระบบ</div>
        </div>
      </div>
    `;
  } else {
    authArea.innerHTML = `
      <button class="login-btn" onclick="goLogin()">Login</button>
    `;
  }
}

function goLogin() {
  const currentUrl = window.location.href;
  window.location.href = `/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
}

function logout() {
  localStorage.clear();
  window.location.reload();
}

function goProfile() {
  window.location.href = "/manage_account.html";
}

function goMyBooking() {
  window.location.href = "/booking-history.html";
}

const username = localStorage.getItem("username");

window.onload = () => {
  rangeStart = document.getElementById('rangeStart');
  rangeEnd = document.getElementById('rangeEnd');
  
  renderAuth();
  loadServices();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  // ค่าเริ่มต้น
  rangeStart.value = todayStr;
  rangeEnd.value = nextMonthStr;

  rangeStart.min = todayStr;
  rangeEnd.min = todayStr;

  // บังคับ end >= start
  rangeStart.addEventListener('change', () => {
    rangeEnd.min = rangeStart.value;
    autoLoadCalendar(); //  เลือก start เสร็จ เช็คทันที
  });

  rangeEnd.addEventListener('change', () => {
    autoLoadCalendar(); //  เลือก end เสร็จแล้วโหลด
  });

  document.getElementById('numPeople').addEventListener('change', e => {
  let value = Number(e.target.value) || 1;
  if (value > 2) value = 2;
  if (value < 1) value = 1;
  e.target.value = value;
  numPeople = value;
  updateSummary();
  });
  
  loadRoomInfo();
  loadCalendar();
};