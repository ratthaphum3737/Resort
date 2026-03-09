document.addEventListener("DOMContentLoaded", loadRooms);

const API_URL = "/api/rooms/room_getdata";

const imageInput = document.getElementById("roomImages");
const preview = document.getElementById("preview");

const coverInput = document.getElementById("coverImage");
const roomInput = document.getElementById("roomImages");
coverInput.addEventListener("change", () => {

    if (coverInput.files.length > 1) {
        alert("รูปหน้าห้องเลือกได้เพียง 1 รูป");
        coverInput.value = "";
    }

});

roomInput.addEventListener("change", () => {

    if (roomInput.files.length > 2) {
        alert("รูปภายในห้องเลือกได้สูงสุด 2 รูป");
        roomInput.value = "";
    }

});

function checkImages(){

    if(coverInput.files.length !== 1){
        alert("กรุณาเลือก รูปหน้าห้อง 1 รูป");
        return false;
    }

    if(roomInput.files.length !== 2){
        alert("กรุณาเลือก รูปภายในห้อง 2 รูป");
        return false;
    }

    return true;

}


imageInput.addEventListener("change", () => {

  preview.innerHTML = "";

  const files = imageInput.files;

  for (let i = 0; i < files.length; i++) {

    const img = document.createElement("img");
    img.src = URL.createObjectURL(files[i]);
    img.style.width = "80px";
    img.style.margin = "5px";
    img.style.borderRadius = "6px";

    preview.appendChild(img);
  }

});

function loadRooms() {
    fetch(API_URL)
        .then(res => res.json())
        .then(data => {
            const tableBody = document.getElementById("roomTableBody");
            tableBody.innerHTML = "";

            data.forEach(room => {
                tableBody.innerHTML += `
    <tr>
        <td>${room.rid}</td>
        <td>${room.rnum}</td>
        <td>${room.rtype}</td>
        <td>${room.rprice}</td>
        <td>
            <select id="status-${room.rid}">
                <option value="Available" ${room.rstatus === 'Available' ? 'selected' : ''}>Available</option>
                <option value="Unavailable" ${room.rstatus === 'Unavailable' ? 'selected' : ''}>Unavailable</option>
                <option value="Maintenance" ${room.rstatus === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
            </select>
        </td>
        <td>
            <button class="btn-edit" onclick="updateRoom('${room.rid}')">Save</button>
            <button class="btn-delete" onclick="deleteRoom('${room.rid}')">Delete</button>
        </td>
    </tr>
    `;});});
}

document.getElementById("addRoomForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    const rtype = document.getElementById("roomType").value;
    const rprice = document.getElementById("price").value;
    const rnum = document.getElementById("num").value;
    const rdesc = document.getElementById("rdesc").value;



    const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ rtype, rprice, rnum,rdesc})
    });
    if(!checkImages()){
        return;
    }
    if(!res.ok){
        alert("เพิ่มห้องไม่สำเร็จ");
        return;
    }

    const data = await res.json();
    const rid = data.rid;

    const files = document.getElementById("roomImages").files;

    if (files.length > 0) {

        const coverFile = document.getElementById("coverImage").files[0];

        // รูปภายในห้อง
        const roomFiles = document.getElementById("roomImages").files;

        const formData = new FormData();
        formData.append("rid", rid);

        formData.append("images", coverFile);

        for (let i = 0; i < roomFiles.length; i++) {
            formData.append("images", roomFiles[i]);
        }

        await fetch("/api/upload/room-image", {
            method: "POST",
            body: formData
        });

    }

    alert("เพิ่มห้องสำเร็จ");

    loadRooms();
    document.getElementById("addRoomForm").reset();
    preview.innerHTML = "";

});

function updateRoom(rid) {
    const newStatus = document.getElementById(`status-${rid}`).value;

    fetch(`/api/rooms/${rid}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rstatus: newStatus })
    })
    .then(res => res.json())
    .then(() => {
        alert('แก้ไขห้องพักสำเร็จแล้ว');
        loadRooms();
    });
}
function deleteRoom(rid) {
    fetch(`/api/rooms/${rid}`, {
        method: "DELETE"
    })
        .then(res => res.json())
        .then(() => {
            loadRooms();
        });
}

function goBack() {
    window.location.href = "dashboard-owner.html";
}
function goManageRoom() {
    window.location.href = "manage_room.html";
}

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
