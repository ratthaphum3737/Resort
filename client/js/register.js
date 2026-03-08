function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// เบอร์โทรไทย: 10 หลัก เริ่มด้วย 0
function isValidThaiPhone(phone) {
  return /^0\d{9}$/.test(phone);
}

// เลขบัตรประชาชนไทย 13 หลัก + checksum
function isValidThaiID(id) {
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(id[i]) * (13 - i);
  }

  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(id[12]);
}
// รองรับ ก-ฮ, สระ, วรรณยุกต์ และ A-Z (ตัดช่องว่างหัวท้ายออกก่อนเช็ค)
function isValidName(name) {
  const regex = /^[a-zA-Z\u0E01-\u0E39\u0E40-\u0E4C]{2,}$/;
  return regex.test(name.trim());
}
// เงื่อนไข: ยาว 8+, มีตัวอักษรภาษาอังกฤษ และมีตัวเลข
function isValidPassword(password) {
  const regex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
}

async function register() {
  
  const data = {
    fname: document.getElementById('fname').value,
    lname: document.getElementById('lname').value,
    id_number: document.getElementById('idnumber').value,
    tel: document.getElementById('tel').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
    ctype:'member'
  };

  const msg = document.getElementById('msg');
  msg.textContent = '';

  if (!data.email || !data.password || !data.fname || !data.tel || !data.id_number || !data.lname) {
    msg.textContent = 'กรุณากรอกข้อมูลให้ครบ';
    msg.style.color = 'red';
    return;
  }
  if (!isValidName(data.fname)) {
    msg.textContent = 'ชื่อไม่ถูกต้อง (ต้องเป็นตัวอักษรและมี 2 ตัวขึ้นไป)';
    msg.style.color = 'red';
    return;
  }
  if (!isValidName(data.lname)) {
    msg.textContent = 'นามสกุลไม่ถูกต้อง (ต้องเป็นตัวอักษรและมี 2 ตัวขึ้นไป)';
    msg.style.color = 'red';
    return;
  }
  if (!isValidEmail(data.email)) {
    msg.textContent = 'รูปแบบอีเมลไม่ถูกต้อง';
    msg.style.color = 'red';
    return;
  }
  if (!isValidThaiPhone(data.tel)) {
    msg.textContent = 'เบอร์โทรไม่ถูกต้อง (ต้องเป็น 10 หลัก เริ่มด้วย 0)';
    msg.style.color = 'red';
    return;
  }
  if (!isValidThaiID(data.id_number)) {
    msg.textContent = 'เลขบัตรประชาชนไม่ถูกต้อง';
    msg.style.color = 'red';
    return;
  }

  if (!isValidPassword(data.password)) {
    msg.textContent = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข';
    msg.style.color = 'red';
    return;
  }

  const res = await fetch('http://localhost:3000/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  const result = await res.json();

  if (!res.ok) {
    msg.textContent = result.message || 'สมัครสมาชิกไม่สำเร็จ';
    msg.style.color = 'red';
    return;
  }

  msg.textContent = 'สมัครสมาชิกสำเร็จ! กำลังไปหน้า Login...';
  msg.style.color = 'green';

  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1500);
}
