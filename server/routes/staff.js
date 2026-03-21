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
// 2. API ดึงรายการงานทั้งหมด (แสดงแค่ 7 วันจากปัจจุบัน)
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
        AND t.Tdate BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY t.Tdate ASC
    `, [empid]);
    
    const tasks = result.rows.map(row => ({
      tid: row.tid,
      tdetail: row.taskname,
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

router.get('/checkouts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.bid,
        b.bstatus,
        b.bnum_people   AS num_people,
        b.bcheckin_date,
        b.bcheckout_date,
        STRING_AGG(br.rid, ', ') AS rid
      FROM booking b
      JOIN booking_room br ON b.bid = br.bid
      WHERE b.bstatus = 'Confirmed'
        AND CURRENT_DATE BETWEEN b.bcheckin_date AND b.bcheckout_date
      GROUP BY b.bid, b.bstatus, b.bnum_people, b.bcheckin_date, b.bcheckout_date
      ORDER BY b.bcheckout_date ASC
    `);
 
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/checkout/:bid', async (req, res) => {
  const { bid } = req.params;
  const conn = await pool.connect();
 
  try {
    await conn.query('BEGIN');
 
    // ── a) ตรวจสอบ booking ──
    const bookingRes = await conn.query(
      `SELECT b.bid, b.bstatus, br.rid
       FROM booking b
       JOIN booking_room br ON b.bid = br.bid
       WHERE b.bid = $1`,
      [bid]
    );
 
    if (bookingRes.rows.length === 0) {
      await conn.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบข้อมูลการจอง' });
    }
 
    const { bstatus, rid } = bookingRes.rows[0];
 
    if (bstatus !== 'Confirmed') {
      await conn.query('ROLLBACK');
      return res.status(400).json({ error: `ไม่สามารถ Check-out ได้ (สถานะปัจจุบัน: ${bstatus})` });
    }
 
    // ── b) เปลี่ยนสถานะเป็น Completed ──
    await conn.query(
      `UPDATE booking SET bstatus = 'Completed' WHERE bid = $1`,
      [bid]
    );
 
    // ── c) ลบ Task ในอนาคตที่ยังไม่เสร็จของ booking นี้ ──
    //      (tdate > CURRENT_DATE และ tstatus ≠ 'Completed')
    //      ลำดับ: ลบ relation tables ก่อน แล้วค่อยลบ task
    const futureTasksRes = await conn.query(
      `SELECT t.tid
       FROM task t
       JOIN booking_task bt ON t.tid = bt.tid
       WHERE bt.bid = $1
         AND t.tdate > CURRENT_DATE
         AND t.tstatus <> 'Completed'`,
      [bid]
    );
 
    const futureTids = futureTasksRes.rows.map(r => r.tid);
 
    if (futureTids.length > 0) {
      // ลบ relations ก่อน
      await conn.query(
        `DELETE FROM employee_task WHERE tid = ANY($1::char[])`,
        [futureTids]
      );
      await conn.query(
        `DELETE FROM room_task WHERE tid = ANY($1::char[])`,
        [futureTids]
      );
      await conn.query(
        `DELETE FROM booking_task WHERE tid = ANY($1::char[])`,
        [futureTids]
      );
      // ลบ task
      await conn.query(
        `DELETE FROM task WHERE tid = ANY($1::char[])`,
        [futureTids]
      );
    }
 
    // ── d) สร้าง Task ทำความสะอาดวันนี้ ──
    //      หาพนักงาน Resort Worker ที่มีงานวันนี้น้อยสุด
    const empRes = await conn.query(
      `SELECT e.empid
       FROM employee e
       LEFT JOIN employee_task et ON e.empid = et.empid
       LEFT JOIN task t ON et.tid = t.tid AND t.tdate = CURRENT_DATE
       WHERE e.user_role = 'Resort Worker'
       GROUP BY e.empid
       ORDER BY COUNT(t.tid) ASC
       LIMIT 1`
    );
 
    if (empRes.rows.length === 0) {
      // ไม่มีพนักงาน → ยังคง commit ส่วนที่เสร็จแล้ว แต่แจ้งเตือน
      await conn.query('COMMIT');
      return res.json({
        success: true,
        cleaningTaskId: null,
        warning: 'ไม่พบพนักงานที่จะแจกงานทำความสะอาด'
      });
    }
 
    const assignedEmpid = empRes.rows[0].empid;
 
    // สร้าง Tid ใหม่
    const tidRes = await conn.query(
      `SELECT 'T' || LPAD(
         (COALESCE(MAX(CAST(SUBSTRING(tid,2) AS INT)),0)+1)::text
       ,4,'0') AS tid FROM task`
    );
    const cleaningTid = tidRes.rows[0].tid;
 
    // INSERT task ทำความสะอาด
    await conn.query(
      `INSERT INTO task (tid, tdate, taskname, tasktype, tstatus)
       VALUES ($1, CURRENT_DATE, $2, 'service', 'Pending')`,
      [cleaningTid, `ทำความสะอาดห้อง ${rid} (หลัง Check-out)`]
    );
 
    // ผูก task กับ booking
    await conn.query(
      `INSERT INTO booking_task (tid, bid) VALUES ($1, $2)`,
      [cleaningTid, bid]
    );
 
    // ผูก task กับห้อง
    await conn.query(
      `INSERT INTO room_task (tid, rid) VALUES ($1, $2)`,
      [cleaningTid, rid]
    );
 
    // ผูก task กับพนักงาน
    await conn.query(
      `INSERT INTO employee_task (empid, tid) VALUES ($1, $2)`,
      [assignedEmpid, cleaningTid]
    );
 
    await conn.query('COMMIT');
 
    res.json({
      success: true,
      cleaningTaskId: cleaningTid,
      assignedTo: assignedEmpid
    });
 
  } catch (err) {
    await conn.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'checkout failed' });
  } finally {
    conn.release();
  }
});

module.exports = router;