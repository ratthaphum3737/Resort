const params = new URLSearchParams(window.location.search);

const bid = params.get("bid");
const token = params.get("token");

let currentToken = token;

const resendBtn = document.getElementById("resendBtn");
const timerEl = document.getElementById("timer");
const msgEl = document.getElementById("msg");

let timeLeft = 120;
let timerInterval = null;

function pad(n) {
  return n.toString().padStart(2, "0");
}

function updateTimerDisplay() {
  const m = Math.floor(timeLeft / 60);
  const s = timeLeft % 60;
  timerEl.textContent = `${pad(m)}:${pad(s)}`;
}

function startTimer(seconds = 120) {

  clearInterval(timerInterval);
  timeLeft = seconds;

  resendBtn.disabled = true;
  updateTimerDisplay();

  timerInterval = setInterval(() => {

    timeLeft--;

    if (timeLeft <= 0) {

      clearInterval(timerInterval);
      timerEl.textContent = "00:00";
      resendBtn.disabled = false;

      msgEl.textContent = "สามารถขอ OTP ใหม่ได้แล้ว";

      return;
    }

    updateTimerDisplay();

  }, 1000);
}

async function resendOtp(){

  try{

    const res = await fetch(
      "http://localhost:3000/api/send-otp",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          email: params.get("email")
        })
      }
    );

    const data = await res.json();

    if(!res.ok){
      msgEl.textContent="ส่ง OTP ไม่สำเร็จ";
      return;
    }

    alert("ส่ง OTP ใหม่แล้ว");

    // อัปเดต token ใหม่
    currentToken = data.token;

    // reset timer
    startTimer(120);

  }catch(err){
    console.error(err);
  }

}

async function verifyOtp(){

  const otp = document.getElementById("otp").value.trim();

  if(otp.length !== 6){
    msgEl.textContent="กรุณากรอก OTP 6 หลัก";
    return;
  }

  try{

    const res = await fetch(
      "http://localhost:3000/api/verify-otp",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          otp,
          token: currentToken
        })
      }
    );

    const data = await res.json();

    if(!res.ok){
      msgEl.textContent=data.message || "OTP ไม่ถูกต้อง";
      return;
    }

    const confirmRes = await fetch(
      "http://localhost:3000/api/bookings/confirm-booking",
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({
          bid
        })
      }
    );

    if(!confirmRes.ok){
      msgEl.textContent="ยืนยันการจองไม่สำเร็จ";
      return;
    }

    alert("ยืนยันการจองสำเร็จ");

    window.location.href="/Home.html";

  }catch(err){
    console.error(err);
    msgEl.textContent="เกิดข้อผิดพลาด";
  }

}

document.addEventListener("DOMContentLoaded", () => {
  startTimer(120);
});