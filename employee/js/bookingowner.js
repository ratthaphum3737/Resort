const express = require('express');
const router = express.Router();
const pool = require('../db');

// OWNER ดู booking
router.get("/databooking", async (req, res) => {
  try {
    const result = await pool.query(`
 SELECT 
    b.bid,
    b.bcheckin_date,
    b.bstatus,
    c.fname || ' ' || c.lname AS customer_name
  FROM booking b
  JOIN customer c ON b.cid = c.cid
  ORDER BY b.bid DESC;
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
// Approve
router.put("/booking/approve/:bid", async (req, res) => {
  const { bid } = req.params;

  await pool.query(
    "UPDATE booking SET bstatus = 'Approved' WHERE bid = $1",
    [bid]
  );

  res.json({ message: "Approved" });
});

// Reject
router.put("/booking/reject/:bid", async (req, res) => {
  const { bid } = req.params;

  await pool.query(
    "UPDATE booking SET bstatus = 'Rejected' WHERE bid = $1",
    [bid]
  );

  res.json({ message: "Rejected" });
});
document.getElementById("logoutBtn").addEventListener("click", logout);
function logout() {
    if (confirm("ต้องการออกจากระบบหรือไม่?")) {
        localStorage.removeItem("userId");
        localStorage.removeItem("Fname");
        localStorage.removeItem("erole");
        localStorage.removeItem("role");
        window.location.href = "/home.html";
    }
}

module.exports = router;