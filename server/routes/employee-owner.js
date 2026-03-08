const express = require('express');
const router = express.Router();
const pool = require('../db');

// ดึงข้อมูลพนักงานทั้งหมด (เพิ่ม oid เข้าไปใน SELECT)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT EMPid, Fname, Lname, User_Role, Email, Tel, oid 
      FROM Employee
      ORDER BY Fname ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// เพิ่มพนักงานใหม่ (เพิ่ม oid เข้าไปใน INSERT)
router.post("/", async (req, res) => {
  try {
    const { empid, fname, lname, email, tel, role, password, oid } = req.body;

    console.log("PAYLOAD:", {
      empid, empidLen: empid?.length,
      fname, fnameLen: fname?.length,
      lname, lnameLen: lname?.length,
      email, emailLen: email?.length,
      tel, telLen: tel?.length,
      role, roleLen: role?.length,
      passwordLen: password?.length,
      oid, oidLen: oid?.length
    });
    
    await pool.query(
      `INSERT INTO Employee (EMPid, Fname, Lname, Email, Tel, User_Role, UPassword, oid) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [empid, fname, lname, email, tel, role, password, oid]
    );
    res.json({ message: "Employee added successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ลบพนักงาน
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM Employee WHERE EMPid = $1", [id]);
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// แก้ไขข้อมูลพนักงาน (เพิ่ม oid เข้าไปใน UPDATE)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { fname, lname, email, tel, role, password, oid } = req.body;

    if (password) {
      await pool.query(
        `UPDATE Employee SET Fname=$1, Lname=$2, Email=$3, Tel=$4, User_Role=$5, UPassword=$6, oid=$7 WHERE EMPid=$8`,
        [fname, lname, email, tel, role, password, oid, id]
      );
    } else {
      await pool.query(
        `UPDATE Employee SET Fname=$1, Lname=$2, Email=$3, Tel=$4, User_Role=$5, oid=$6 WHERE EMPid=$7`,
        [fname, lname, email, tel, role, oid, id]
      );
    }
    res.json({ message: "Employee updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;