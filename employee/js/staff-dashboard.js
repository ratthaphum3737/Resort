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

// 3. ฟังก์ชันสลับหน้าแท็บ (เมนูด้านซ้าย)
function switchTab(tab) {
    currentTab = tab;
    
    // ลบแถบสีเข้ม (active) ออกจากทุกเมนูก่อน
    const menuPending = document.getElementById('menu-pending');
    const menuCompleted = document.getElementById('menu-completed');
    
    if(menuPending) menuPending.classList.remove('active');
    if(menuCompleted) menuCompleted.classList.remove('active');
    
    // ใส่แถบสีเข้ม (active) ให้เมนูที่ถูกกด และเปลี่ยนหัวข้อหน้าเว็บ
    const headerTitle = document.querySelector('header h1');
    
    if (tab === 'pending') {
        if(menuPending) menuPending.classList.add('active');
        if(headerTitle) headerTitle.innerText = 'ตารางงานพนักงาน (Tasks)';
    } else {
        if(menuCompleted) menuCompleted.classList.add('active');
        if(headerTitle) headerTitle.innerText = 'งานที่ทำเสร็จแล้ว (Completed)';
    }
    
    loadTasks(tab); 
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