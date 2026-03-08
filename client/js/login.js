async function login() {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const role = document.getElementById('role').value;

  const res = await fetch('http://localhost:3000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });

  if (!res.ok) {
    alert('Login ไม่สำเร็จ');
    return;
  }

  const data = await res.json();

  localStorage.setItem('userId', data.id);
  localStorage.setItem('Fname', data.fname);
  localStorage.setItem("email", data.email);
  
  if (role === 'employee') {
    localStorage.setItem('erole', role);
  } else if (role === 'customer') {
    localStorage.setItem('role', role);
  }
  else if (role === 'owner') {
    localStorage.setItem('orole', role);
  }

  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get("returnUrl");

  if (role === 'employee') {
    window.location.href = '/staff-dashboard.html';
  }else if (role === 'owner') {
    window.location.href = '/report-owner.html';
  } else {
    if (returnUrl) {
      window.location.href = returnUrl;
    } else {
      window.location.href = '/Home.html';
    }
  }
}