let employeeList = [];
let customerList = [];
let isEditing = false;
let currentEditId = null;
let currentMode = 'employee';

document.addEventListener("DOMContentLoaded", () => {
    // Today badge
    const todayBadge = document.getElementById('todayBadge');
    if (todayBadge) {
        todayBadge.textContent = new Date().toLocaleDateString('th-TH', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // Owner name/initial from localStorage
    const fname = localStorage.getItem('Fname') || 'Owner';
    const ownerName    = document.getElementById('ownerName');
    const ownerInitial = document.getElementById('ownerInitial');
    if (ownerName)    ownerName.textContent    = fname;
    if (ownerInitial) ownerInitial.textContent = fname.charAt(0).toUpperCase();

    loadEmployees();
});

function switchTab(tab) {
    currentMode = tab;
    cancelEdit();
    closeCustomerEdit();

    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    if (tab === 'employee') {
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
        document.getElementById('employee-tab').classList.add('active');
        document.getElementById('employee-form-container').style.display = 'block';
        loadEmployees();
    } else {
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
        document.getElementById('customer-tab').classList.add('active');
        document.getElementById('employee-form-container').style.display = 'none';
        loadCustomers();
    }
}

async function loadEmployees() {
    try {
        const res = await fetch('/api/admin/employees');
        const data = await res.json();
        employeeList = data;
        renderEmployeeTable(employeeList);
    } catch (err) { console.error(err); }
}

function renderEmployeeTable(data) {
    const tbody = document.getElementById('employeeTableBody');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7a99;">ไม่พบข้อมูล</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(emp => `
        <tr>
            <td><strong>${emp.empid}</strong></td>
            <td>${emp.fname} ${emp.lname}</td>
            <td style="text-align:center;">${emp.user_role}</td>
            <td style="text-align:center;">${emp.tel || '-'}</td>
            <td style="text-align:center;">
                <button class="btn warning" style="margin-right:5px;" onclick="prepareEditEmployee('${emp.empid}')">แก้ไข</button>
                <button class="btn reject" onclick="deleteEmployee('${emp.empid}')">ลบ</button>
            </td>
        </tr>`).join('');
}

function prepareEditEmployee(empid) {
    const emp = employeeList.find(e => e.empid === empid);
    if (!emp) return;

    document.getElementById('empid').value = emp.empid;
    document.getElementById('empid').disabled = true;
    document.getElementById('oid').value = emp.oid || '';
    document.getElementById('fname').value = emp.fname;
    document.getElementById('lname').value = emp.lname;
    document.getElementById('email').value = emp.email || '';
    document.getElementById('tel').value = emp.tel || '';
    document.getElementById('role').value = emp.user_role;

    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = false;

    document.getElementById('formTitle').innerText = 'แก้ไขพนักงาน: ' + empid;
    document.getElementById('submitBtn').innerText = 'อัปเดตข้อมูลพนักงาน';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';

    isEditing = true;
    currentEditId = empid;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelEdit() {
    document.getElementById('addEmployeeForm').reset();
    document.getElementById('empid').disabled = false;
    document.getElementById('passwordGroup').style.display = 'block';
    document.getElementById('password').required = true;

    document.getElementById('formTitle').innerText = 'เพิ่มพนักงานใหม่';
    document.getElementById('submitBtn').innerText = 'บันทึกข้อมูลพนักงาน';
    document.getElementById('cancelEditBtn').style.display = 'none';

    isEditing = false;
    currentEditId = null;
}

document.getElementById('addEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        empid:    document.getElementById('empid').value,
        oid:      document.getElementById('oid').value,
        fname:    document.getElementById('fname').value,
        lname:    document.getElementById('lname').value,
        email:    document.getElementById('email').value,
        tel:      document.getElementById('tel').value,
        role:     document.getElementById('role').value,
        password: document.getElementById('password').value
    };

    const method = isEditing ? 'PUT' : 'POST';
    const url    = isEditing ? `/api/admin/employees/${currentEditId}` : '/api/admin/employees';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert(isEditing ? 'อัปเดตข้อมูลพนักงานสำเร็จ!' : 'เพิ่มพนักงานสำเร็จ!');
            cancelEdit();
            loadEmployees();
        } else {
            alert('ไม่สามารถบันทึกได้: รหัสพนักงานอาจซ้ำ หรือ ข้อมูลผิดพลาด');
        }
    } catch (err) {
        console.error(err);
        alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    }
});

async function deleteEmployee(id) {
    if (confirm('ยืนยันการลบพนักงาน?')) {
        await fetch(`/api/admin/employees/${id}`, { method: 'DELETE' });
        loadEmployees();
    }
}

async function loadCustomers() {
    try {
        const res = await fetch('/api/admin/customers');
        const data = await res.json();
        customerList = data;
        renderCustomerTable(customerList);
    } catch (err) { console.error(err); }
}

function renderCustomerTable(data) {
    const tbody = document.getElementById('customerTableBody');
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#6b7a99;">ไม่พบข้อมูล</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(cus => `
        <tr>
            <td><strong>${cus.cid}</strong></td>
            <td>${cus.fname} ${cus.lname}</td>
            <td>${cus.email || '-'}</td>
            <td style="text-align:center;">${cus.tel || '-'}</td>
            <td style="text-align:center;">
                <button class="btn warning" style="margin-right:5px;" onclick="prepareEditCustomer('${cus.cid}')">แก้ไข</button>
                <button class="btn reject" onclick="deleteCustomer('${cus.cid}')">ลบ</button>
            </td>
        </tr>`).join('');
}

function prepareEditCustomer(cid) {
    const cus = customerList.find(c => c.cid.toString() === cid.toString());
    if (!cus) return;

    document.getElementById('edit_cid').value = cus.cid;
    document.getElementById('edit_cus_fname').value = cus.fname;
    document.getElementById('edit_cus_lname').value = cus.lname;
    document.getElementById('edit_cus_email').value = cus.email || '';
    document.getElementById('edit_cus_tel').value = cus.tel || '';

    document.getElementById('customer-edit-container').style.display = 'block';
    currentEditId = cid;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeCustomerEdit() {
    document.getElementById('customer-edit-container').style.display = 'none';
    document.getElementById('editCustomerForm').reset();
}

document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        fname: document.getElementById('edit_cus_fname').value,
        lname: document.getElementById('edit_cus_lname').value,
        email: document.getElementById('edit_cus_email').value,
        tel:   document.getElementById('edit_cus_tel').value
    };

    try {
        const res = await fetch(`/api/admin/customers/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            alert('อัปเดตข้อมูลลูกค้าสำเร็จ!');
            closeCustomerEdit();
            loadCustomers();
        } else {
            alert('เกิดข้อผิดพลาดในการอัปเดตลูกค้า');
        }
    } catch (err) { console.error(err); }
});

async function deleteCustomer(id) {
    if (confirm('ยืนยันการลบลูกค้า?')) {
        const res = await fetch(`/api/admin/customers/${id}`, { method: 'DELETE' });
        if (res.ok) loadCustomers();
        else alert('ไม่สามารถลบได้ (อาจมีประวัติการจองอยู่)');
    }
}

function searchEmployee() {
    const kw = document.getElementById('searchEmp').value.toLowerCase();
    const filtered = employeeList.filter(e =>
        (e.empid || '').toLowerCase().includes(kw) ||
        `${e.fname} ${e.lname}`.toLowerCase().includes(kw) ||
        (e.user_role || '').toLowerCase().includes(kw) ||
        (e.tel || '').includes(kw)
    );
    renderEmployeeTable(filtered);
}

function searchCustomer() {
    const kw = document.getElementById('searchCus').value.toLowerCase();
    const filtered = customerList.filter(c =>
        (c.cid || '').toString().toLowerCase().includes(kw) ||
        `${c.fname} ${c.lname}`.toLowerCase().includes(kw) ||
        (c.email || '').toLowerCase().includes(kw) ||
        (c.tel || '').includes(kw)
    );
    renderCustomerTable(filtered);
}

function clearSearch(type) {
    if (type === 'employee') {
        document.getElementById('searchEmp').value = '';
        renderEmployeeTable(employeeList);
    } else {
        document.getElementById('searchCus').value = '';
        renderCustomerTable(customerList);
    }
}

function goBooking()    { window.location.href = '/managebooking-owner.html'; }
function goManageRoom() { window.location.href = '/manageRoom-owner.html'; }

document.getElementById("logoutBtn").addEventListener("click", () => {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
        ['userId', 'Fname', 'erole', 'role'].forEach(k => localStorage.removeItem(k));
        window.location.href = "/home.html";
    }
});