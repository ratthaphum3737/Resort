const userId = localStorage.getItem('userId');

if (!userId) {
  alert('กรุณาเข้าสู่ระบบ');
  window.location.href = '/login.html';
}

// โหลดข้อมูลผู้ใช้
async function loadProfile() {
  const res = await fetch(`http://localhost:3000/api/profile/${userId}`);
  const data = await res.json();
  originalData = data;
  document.getElementById('fname').value = data.fname;
  document.getElementById('lname').value = data.lname;
  document.getElementById('email').value = data.email;
  document.getElementById('tel').value = data.tel;
}

loadProfile();

async function submitUpdate() {
  const cid = localStorage.getItem('userId');
  let updateData = {};

  if (!document.getElementById('fname').disabled) {
    updateData.fname = document.getElementById('fname').value;
  }

  if (!document.getElementById('lname').disabled) {
    updateData.lname = document.getElementById('lname').value;
  }

  if (!document.getElementById('tel').disabled) {
    updateData.tel = document.getElementById('tel').value;
  }

  if (!document.getElementById('password').disabled) {
    updateData.password = document.getElementById('password').value;
  }

  if (Object.keys(updateData).length === 0) {
    alert('กรุณาเลือกข้อมูลที่ต้องการแก้ไข');
    return;
  }

  const res = await fetch(`http://localhost:3000/api/profile/${cid}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });

  if (res.ok) {
    alert('อัปเดตข้อมูลเรียบร้อย');
    location.reload();
  } else {
    alert('เกิดข้อผิดพลาด');
  }
}


// logout
function logout() {
  localStorage.clear();
  window.location.href = '/Home.html';
}

function goback() {
  window.location.href = "/Login.html";
}

function toggleEdit(id, checkbox) {
  const input = document.getElementById(id);
  input.disabled = !checkbox.checked;

  if (checkbox.checked) {
    input.focus();
  } else {
    input.value = originalData[id] || '' ;
  }
}

