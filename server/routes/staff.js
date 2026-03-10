const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1. API เข้าสู่ระบบของพนักงาน
router.post('/login', async (req, res) => {
  try {
    const { empid, password } = req.body; 

    // อิงตามตาราง Employee: EMPid, UPassword, User_Role
    const result = await pool.query(
      'SELECT EMPid, Fname, Lname, User_Role FROM Employee WHERE EMPid=$1 AND UPassword=$2',
      [empid, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.json({
      id: result.rows[0].empid,
      name: result.rows[0].fname + ' ' + result.rows[0].lname,
      role: result.rows[0].user_role
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// 2. API ดึงรายการงานทั้งหมด
router.get('/tasks', async (req, res) => {
  try {
    const { empid } = req.query;

    if (!empid) {
      return res.status(400).json({ error: 'ไม่พบข้อมูลรหัสพนักงาน' });
    }

    const result = await pool.query(`
      SELECT 
        t.Tid AS tid, 
        t.Tdate AS tdue_date,
        t.taskname AS taskname,
        t.TStatus AS tstatus,
        r.Rid AS rid
      FROM Task t
      JOIN Employee_Task et ON t.Tid = et.Tid
      LEFT JOIN Room_Task rt ON t.Tid = rt.Tid
      LEFT JOIN Room r ON rt.Rid = r.Rid
      WHERE et.EMPid = $1
      ORDER BY t.Tdate ASC
    `, [empid]);
    
    const tasks = result.rows.map(row => ({
      tid: row.tid,
      tdetail: row.taskname + (row.rid ? 'ไปที่ห้อง ' + row.rid : '-'),
      tdue_date: row.tdue_date,
      tstatus: row.tstatus || 'รอดำเนินการ'
    }));

    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// API อัปเดตสถานะงานให้เป็น "เสร็จสิ้น"
router.put('/tasks/:tid', async (req, res) => {
  const { tid } = req.params;
  try {
    await pool.query(
      "UPDATE Task SET TStatus = 'Completed' WHERE Tid = $1",
      [tid]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;