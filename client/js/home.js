let priceSlider;
let minPrice = 0;
let maxPrice = 0;

function getSearchDates() {
  return {
    checkin: document.getElementById('checkin').value,
    checkout: document.getElementById('checkout').value
  };
}

function getGuestCount() {
  return document.getElementById('guestCount').value || 1;
}

async function loadFilters() {
  const data = await fetchFilterMeta();

  minPrice = Number(data.min_price);
  maxPrice = Number(data.max_price);

  setupPriceRange(minPrice, maxPrice);
  renderTypeCheckbox(data.rtypes);
}

function getSelectedPriceRange() {
  const values = priceSlider.get();
  return {
    minPrice: Math.round(values[0]),
    maxPrice: Math.round(values[1])
  };
}

function setupPriceRange(min, max) {
  const slider = document.getElementById("priceSlider");
  const priceValue = document.getElementById("priceValue");
  console.log("min:", minPrice, typeof minPrice);
  console.log("max:", maxPrice, typeof maxPrice);

  priceSlider = noUiSlider.create(slider, {
    start: [min, max],
    connect: true,
    range: {
      min: min,
      max: max
    },
    step: 100
  });

  priceSlider.on("update", function (values) {
    const minVal = Math.round(values[0]);
    const maxVal = Math.round(values[1]);

    priceValue.innerText =
      `฿${minVal.toLocaleString()} - ฿${maxVal.toLocaleString()}`;
  });

  priceSlider.on("change", function () {
    searchRooms();
  });
}

function renderTypeCheckbox(types) {
  const box = document.getElementById('rtypeFilters');
  box.innerHTML = '';

  types.forEach(type => {
    box.innerHTML += `
      <label>
        <input type="checkbox" value="${type}" onchange="searchRooms()">
        ${type}
      </label>
    `;
  });
}

function getSelectedTypes() {
  return [...document.querySelectorAll('#rtypeFilters input:checked')]
    .map(cb => cb.value);
}

function getSelectedPrice() {
  return document.getElementById('priceRange').value;
}

async function fetchFilterMeta() {
  const res = await fetch('/api/rooms/filters/meta');
  return res.json();
}

async function fetchRooms(filters) {
  const params = new URLSearchParams();

  filters.types.forEach(t => params.append('rtype', t));
  params.append('minPrice', filters.minPrice);
  params.append('maxPrice', filters.maxPrice);

  if (filters.checkin) params.append('checkin', filters.checkin);
  if (filters.checkout) params.append('checkout', filters.checkout);
  params.append('guests', filters.guests);

  const res = await fetch(`/api/rooms?${params.toString()}`);
  return res.json();
}

async function searchRooms() {
  const { minPrice, maxPrice } = getSelectedPriceRange();
  const types = getSelectedTypes();
  const { checkin, checkout } = getSearchDates();
  const guests = getGuestCount();

  const rooms = await fetchRooms({
    types,
    minPrice,
    maxPrice,
    checkin,
    checkout,
    guests
  });

  renderRooms(rooms);
}


function renderRooms(rooms) {
  const container = document.getElementById('roomList');
  container.innerHTML = '';

  if (!rooms || rooms.length === 0) {
    container.innerHTML = `
    <div class="no-room">
      <h2>ไม่มีห้องว่าง</h2>
      <p>ลองปรับวันที่เข้าพัก ประเภทห้อง หรือช่วงราคาใหม่อีกครั้ง</p>
    </div>
    `;
    return;
  }
  rooms.forEach(room => {
    container.appendChild(renderRoomCard(room));
  });
}


function renderRoomCard(room) {
  const div = document.createElement('div');
  div.className = 'room-card';

  const img = room.cover_image || "/assets/IMG/room2.png";

  div.innerHTML = `
    <img src="${img}" alt="room">

    <div class="room-info">
      <h3>${room.rtype}</h3>
      <p>ห้อง ${room.rnum}</p>
      <p>${room.rdesc || ''}</p>
    </div>

    <div class="room-price">
      <h3>฿${Number(room.rprice).toLocaleString()}</h3>
      <button onclick="bookRoom('${room.rid}')">จองเลย</button>
    </div>
    `;

  return div;
}

function bookRoom(rid) {
  window.location.href = `/booking.html?rid=${rid}`;
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

function goLogin() {
  const currentUrl = window.location.href;
  window.location.href = `/login.html?returnUrl=${encodeURIComponent(currentUrl)}`;
}

window.onload = () => {
  renderAuth();
  initPage();
};

async function initPage() {
  await loadFilters();
  searchRooms();
}