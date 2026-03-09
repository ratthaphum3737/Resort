const params = new URLSearchParams(window.location.search);

const rid = params.get("rid");
const checkin = params.get("checkin");
const checkout = params.get("checkout");
const numPeople = params.get("numPeople");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidThaiPhone(phone) {
  return /^0\d{9}$/.test(phone);
}

function isValidThaiID(id) {
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
}

function isValidName(name) {
  return /^[a-zA-Z\u0E01-\u0E39\u0E40-\u0E4C]{2,}$/.test(name.trim());
}

async function loadGuestData() {

  const id = document.getElementById("id_number").value.trim();

  if (id.length !== 13) return;

  const res = await fetch(
    `/api/guest/${id}`
  );

  const data = await res.json();

  if (!data.exists) return;

  document.getElementById("fname").value = data.data.fname;
  document.getElementById("lname").value = data.data.lname;
  document.getElementById("email").value = data.data.email;
  document.getElementById("tel").value = data.data.tel;

}

async function submitGuestBooking() {

  const btn = document.querySelector("button");
  btn.disabled = true;   //ล็อกปุ่ม

  try {

    const guestData = {
      id_number: document.getElementById("id_number").value.trim(),
      tel: document.getElementById("tel").value.trim(),
      email: document.getElementById("email").value.trim(),
      fname: document.getElementById("fname").value.trim(),
      lname: document.getElementById("lname").value.trim()
    };

    // ===== VALIDATION =====
    if (!guestData.id_number || !guestData.tel || !guestData.email ||
        !guestData.fname || !guestData.lname) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      btn.disabled = false;
      return;
    }

    // ===== CREATE CUSTOMER =====
    const customerRes = await fetch(
      "/api/create_guest",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...guestData,
          ctype: "guest"
        })
      }
    );

    const customerData = await customerRes.json();

    if (!customerRes.ok) {
      alert(customerData.error || "สร้างลูกค้าไม่สำเร็จ");
      btn.disabled = false;
      return;
    }

    const cid = customerData.cid;

    // ===== CREATE BOOKING =====
    const bookingRes = await fetch(
      "/api/bookings/create_booking",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cid,
          rid,
          checkin,
          checkout,
          num_people: numPeople
        })
      }
    );

    const bookingData = await bookingRes.json();

    if (!bookingRes.ok) {
      alert(bookingData.error || "จองไม่สำเร็จ");
      btn.disabled = false;
      return;
    }

    // ===== SEND OTP =====
    const otpRes = await fetch(
      "/api/send-otp",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: guestData.email
        })
      }
    );

    const otpData = await otpRes.json();

    if (!otpRes.ok) {
      alert("ส่ง OTP ไม่สำเร็จ");
      btn.disabled = false;
      return;
    }

    // ===== REDIRECT OTP PAGE =====
    window.location.href =
      `/otp.html?bid=${bookingData.bid}&token=${otpData.token}&email=${guestData.email}`;

  } catch (err) {
    console.error(err);
    alert("เกิดข้อผิดพลาด");
    btn.disabled = false;
  }
}