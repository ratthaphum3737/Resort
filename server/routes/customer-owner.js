const express = require('express');
const router = express.Router();
const pool = require('../db');

// ดึงข้อมูลลูกค้า
router.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customer ORDER BY cid DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// แก้ไขลูกค้า
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fname, lname, email, tel } = req.body;
    await pool.query(
      "UPDATE customer SET fname=$1, lname=$2, email=$3, tel=$4 WHERE cid=$5",
      [fname, lname, email, tel, id]
    );
    res.json({ message: "Customer updated successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

// ลบลูกค้า
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM customer WHERE cid = $1", [id]);
    res.json({ message: "Customer deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router; 