// 1. ดักจับการเข้าถึง: ตรวจสอบว่าเป็นพนักงานหรือไม่
const userRole = localStorage.getItem('userRole');

let currentTab = 'pending'; // ตัวแปรจำว่าตอนนี้อยู่แท็บไหน

// 2. ฟังก์ชันโหลดข้อมูลงาน (Tasks)
async function loadTasks(statusFilter) {
  const table = document.getElementById('taskTable');
  table.innerHTML = `<tr><td colspan="5" style="text-align: center;">กำลังโหลดข้อมูลงาน...</td></tr>`;

  // ดึงรหัสพนักงานที่ระบบจำไว้ตอนล็อกอิน
  const empid = localStorage.getItem('userId');

  try {
    const res = await fetch(`/api/staff/tasks?empid=${empid}`);
    const allTasks = await res.json();
    

   // กรองข้อมูลตามแท็บที่กดเลือก
    let tasks = [];
    if (statusFilter === 'completed') {
        tasks = allTasks.filter(t => t.tstatus === 'เสร็จสิ้น' || t.tstatus === 'Completed');
    } else {
        tasks = allTasks.filter(t => t.tstatus !== 'เสร็จสิ้น' && t.tstatus !== 'Completed');
    }

    table.innerHTML = ''; 

    if (tasks.length === 0) {
      table.innerHTML = `<tr><td colspan="5" style="text-align: center;">ไม่มีงานในหน้านี้ 🎉</td></tr>`;
      return;
    }

    tasks.forEach(task => {
      const dateObj = new Date(task.tdue_date);
      const formattedDate = dateObj.toLocaleDateString('th-TH');
      
      // แก้ไขสีสถานะ
      let statusColor = (task.tstatus === 'เสร็จสิ้น' || task.tstatus === 'Completed') ? 'green' : 'orange';

      // แก้ไขการซ่อน/แสดงปุ่ม
      let actionBtn = (task.tstatus !== 'เสร็จสิ้น' && task.tstatus !== 'Completed')
        ? `<button class="action-btn" onclick="completeTask('${task.tid}')">✔️ เสร็จสิ้น</button>`
        : `<span style="color: green; font-weight: bold;">✔ เรียบร้อย</span>`;

      table.innerHTML += `
        <tr>
          <td>${task.tid}</td>
          <td>${task.tdetail}</td>
          <td>${formattedDate}</td>
          <td style="color: ${statusColor}; font-weight: bold;">${task.tstatus}</td>
          <td>${actionBtn}</td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td colspan="5" style="color:red; text-align: center;">เชื่อมต่อฐานข้อมูลไม่ได้</td></tr>`;
  }
}

async function loadCheckouts() {
  const table = document.getElementById('checkoutTable');
  table.innerHTML = `<tr><td colspan="6" style="text-align:center;">กำลังโหลดข้อมูล...</td></tr>`;
 
  try {
    const res = await fetch('/api/staff/checkouts');
    const bookings = await res.json();
 
    table.innerHTML = '';
 
    if (bookings.length === 0) {
      table.innerHTML = `<tr><td colspan="6" style="text-align:center;">ไม่มีรายการ Check-out วันนี้ ✅</td></tr>`;
      return;
    }
 
    bookings.forEach(b => {
      const checkin  = new Date(b.bcheckin_date).toLocaleDateString('th-TH');
      const checkout = new Date(b.bcheckout_date).toLocaleDateString('th-TH');
 
      table.innerHTML += `
        <tr>
          <td>${b.bid}</td>
          <td>${b.rid}</td>
          <td>${b.num_people} ท่าน</td>
          <td>${checkin}</td>
          <td>${checkout}</td>
          <td>
            <button class="action-btn checkout-btn" onclick="doCheckout('${b.bid}', '${b.rid}')">
              Check Out
            </button>
          </td>
        </tr>`;
    });
  } catch (err) {
    console.error(err);
    table.innerHTML = `<tr><td colspan="6" style="color:red;text-align:center;">เชื่อมต่อฐานข้อมูลไม่ได้</td></tr>`;
  }
}

async function doCheckout(bid, rid) {
  const confirmed = confirm(`ยืนยัน Check-out การจอง ${bid} (ห้อง ${rid}) ?\n\nระบบจะ:\n• เปลี่ยนสถานะการจองเป็น Completed\n• ลบงานในอนาคตที่ยังไม่เสร็จ\n• สร้างงานทำความสะอาดให้พนักงานอัตโนมัติ`);
  if (!confirmed) return;
 
  try {
    const res = await fetch(`/api/staff/checkout/${bid}`, { method: 'POST' });
    const data = await res.json();
 
    if (res.ok) {
      alert(`Check-out เรียบร้อย!\nสร้างงานทำความสะอาด: ${data.cleaningTaskId}`);
      loadCheckouts();
    } else {
      alert('เกิดข้อผิดพลาด: ' + (data.error || 'ไม่ทราบสาเหตุ'));
    }
  } catch (err) {
    console.error(err);
    alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
  }
}


function switchTab(tab) {
  currentTab = tab;
 
  // ล้าง active ทุกเมนู
  ['menu-pending', 'menu-completed', 'menu-checkout'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('active');
  });
 
  const taskSection     = document.getElementById('taskSection');
  const checkoutSection = document.getElementById('checkoutSection');
  const headerTitle     = document.querySelector('header h1');
  const headerSub       = document.getElementById('pageSubtitle');
 
  if (tab === 'checkout') {
    document.getElementById('menu-checkout').classList.add('active');
    taskSection.style.display     = 'none';
    checkoutSection.style.display = '';
    if (headerTitle) headerTitle.innerText = '🏁 Check Out วันนี้';
    if (headerSub)   headerSub.innerText   = 'รายการผู้เข้าพักที่ครบกำหนด Check-out';
    loadCheckouts();
  } else {
    taskSection.style.display     = '';
    checkoutSection.style.display = 'none';
 
    if (tab === 'pending') {
      document.getElementById('menu-pending').classList.add('active');
      if (headerTitle) headerTitle.innerText = 'ตารางงานพนักงาน (Tasks)';
      if (headerSub)   headerSub.innerText   = 'รายการงานที่ต้องดำเนินการประจำวัน';
    } else {
      document.getElementById('menu-completed').classList.add('active');
      if (headerTitle) headerTitle.innerText = 'งานที่ทำเสร็จแล้ว (Completed)';
      if (headerSub)   headerSub.innerText   = 'รายการงานที่ดำเนินการเสร็จสิ้นแล้ว';
    }
    loadTasks(tab);
  }
}


async function completeTask(taskId) {
  const confirmAction = confirm(`ยืนยันว่าทำงาน ${taskId} เสร็จสิ้นแล้วใช่หรือไม่?`);
  if (confirmAction) {
    try {
      const res = await fetch(`/api/staff/tasks/${taskId}`, {
        method: 'PUT' 
      });
      
      if (res.ok) {
        alert(`อัปเดตสถานะงาน ${taskId} เรียบร้อย!`);
        loadTasks(currentTab); 
      } else {
        alert('เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  }
}

function logout() {
  localStorage.removeItem('userRole');
  localStorage.removeItem('userId'); 
  localStorage.removeItem('Fname');
  window.location.href = '/home.html';
}


switchTab('pending');