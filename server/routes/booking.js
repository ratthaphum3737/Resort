const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/service', async (req, res) => {
  console.log('service route hit');
  try {
    const result = await pool.query(
      'SELECT sid, sname, sprice FROM service ORDER BY sid'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'load service failed' });
  }
});


// ดึงวันว่าง / ไม่ว่าง
router.get('/availability', async (req, res) => {
  console.log('availability route hit');
  const { rid, start, end } = req.query;

  try {
    //สร้างช่วงวันทั้งหมด
    const daysResult = await pool.query(
      `
      SELECT generate_series(
        $1::DATE,
        $2::DATE,
        INTERVAL '1 day'
      )::DATE AS date
      `,
      [start, end]
    );

    //ดึง booking ที่ทำให้ "ไม่ว่าง"
    const bookedResult = await pool.query(
      `
      SELECT b.bcheckin_date, b.bcheckout_date
      FROM booking b
      JOIN booking_room br ON b.bid = br.bid
      WHERE br.rid = $1
        AND b.bstatus IN ('Pending', 'Confirmed')
        AND b.bcheckout_date > $2
        AND b.bcheckin_date < $3
      `,
      [rid, start, end]
    );

    
    
    //map วัน + เช็ค availability
    const days = daysResult.rows.map(d => {
      const dateStr = new Date(d.date).toLocaleDateString('sv-SE');
      const unavailable = bookedResult.rows.some(b => {
        const checkin = new Date(b.bcheckin_date).toLocaleDateString('sv-SE');
        const checkout = new Date(b.bcheckout_date).toLocaleDateString('sv-SE');
        
        return dateStr >= checkin && dateStr < checkout;
      });

      return {
        date: dateStr,
        available: !unavailable
      };
    });

    res.json(days);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'availability failed' });
  }
});


// ประวัติการจองของลูกค้า
router.get('/:cid', async (req, res) => {
  const { cid } = req.params;

  const result = await pool.query(
    `
    SELECT
      b.bid,
      b.bstatus AS status,
      b.bnum_people AS num_people,
      b.bcheckin_date AS checkin,
      b.bcheckout_date AS checkout,
      STRING_AGG(r.rnum, ', ') AS rooms
    FROM booking b
    JOIN booking_room br ON b.bid = br.bid
    JOIN room r ON br.rid = r.rid
    WHERE b.cid = $1 AND b.bstatus IN ('Pending','Confirmed')
    GROUP BY b.bid
    ORDER BY b.bcheckin_date DESC
    `,
    [cid]
  );


  res.json(result.rows);
});


// POST /api/booking
router.post('/create_booking', async (req, res) => {
  console.log('CREATE BOOKING HIT');
  const { cid,num_people, rid, checkin, checkout,services} = req.body;

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    //สร้าง bid
    const bidRes = await conn.query(`
      SELECT 'B' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(bid, 2) AS INT)), 0) + 1)::text
      , 4, '0') AS bid
      FROM booking
    `);
    const bid = bidRes.rows[0].bid;

    //insert booking (Pending)
    await conn.query(
      `
      INSERT INTO booking
      (bid, cid, bnum_people, bstatus, bcheckin_date, bcheckout_date, bdate)
      VALUES ($1, $2, $3, 'Pending', $4, $5,CURRENT_TIMESTAMP)
      `,
      [bid, cid, num_people, checkin, checkout]
    );

    //ผูกห้อง
    await conn.query(
      `
      INSERT INTO booking_room (bid, rid)
      VALUES ($1, $2)
      `,
      [bid, rid]
    );
    
    await conn.query('COMMIT');

    res.json({
      success: true,
      bid,
      status: 'Pending'
    });

  } catch (err) {
    await conn.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'booking failed' });
  } finally {
    conn.release();
  }
});

// ================= CONFIRM BOOKING + AUTO ASSIGN TASKS =================
router.post("/confirm-booking", async (req, res) => {
  const { bid } = req.body;
  const conn = await pool.connect();

  try {
    await conn.query('BEGIN');

    // 1. เปลี่ยนสถานะ booking เป็น Confirmed
    await conn.query(
      `UPDATE booking SET bstatus = 'Confirmed' WHERE bid = $1`,
      [bid]
    );

    // 2. ดึงข้อมูล booking (checkin, checkout, rid)
    const bookingRes = await conn.query(
      `SELECT b.bcheckin_date, b.bcheckout_date, br.rid
       FROM booking b
       JOIN booking_room br ON b.bid = br.bid
       WHERE b.bid = $1`,
      [bid]
    );

    if (bookingRes.rows.length === 0) {
      await conn.query('ROLLBACK');
      return res.status(404).json({ error: 'booking not found' });
    }

    const { bcheckin_date, bcheckout_date, rid } = bookingRes.rows[0];

    // 3. สร้าง list วันที่ต้องทำงาน (checkin ถึง checkout - 1 วัน)
    const daysRes = await conn.query(
      `SELECT generate_series($1::DATE, $2::DATE - INTERVAL '1 day', INTERVAL '1 day')::DATE AS work_date`,
      [bcheckin_date, bcheckout_date]
    );
    const workDates = daysRes.rows.map(r => r.work_date);

    // 4. แจกงานแต่ละวัน
    for (const workDate of workDates) {

      // หาประเภทงานตามวัน
      // - วันแรก (checkin): เตรียมห้องพัก
      // - วันกลาง: ทำความสะอาด
      // - วันสุดท้าย (checkout - 1): ทำความสะอาด
      const workDateStr = workDate.toISOString().split('T')[0];
      const checkinStr = new Date(bcheckin_date).toISOString().split('T')[0];

      const lastDay = new Date(bcheckout_date);
      lastDay.setDate(lastDay.getDate() - 1);
      const lastDayStr = lastDay.toISOString().split('T')[0];

      let taskType;
      let taskName;

      // วันแรก → เตรียมห้องพัก
      if (workDateStr === checkinStr) {
        taskType = "service";
        taskName = `เตรียมห้องพัก ${rid}`;
      }
      // วันสุดท้าย → ทำความสะอาด (ไม่ต้อง Maintenance)
      else if (workDateStr === lastDayStr) {
        taskType = "service";
        taskName = `ทำความสะอาดห้อง ${rid}`;
      }
      // วันกลาง → ทำความสะอาด
      else {
        taskType = "service";
        taskName = `ทำความสะอาดห้อง ${rid}`;
      }
      // หาพนักงาน Housekeeper ที่มีงานน้อยสุดในวันนั้น
      const empRes = await conn.query(
      `SELECT e.empid
      FROM employee e
      LEFT JOIN employee_task et ON e.empid = et.empid
      LEFT JOIN task t ON et.tid = t.tid AND t.tdate = $1::DATE
      WHERE e.user_role = 'Housekeeper'
      GROUP BY e.empid
      ORDER BY COUNT(t.tid) ASC
      LIMIT 1`,
      [workDate]
      );

      if (empRes.rows.length === 0) continue;
      const empid = empRes.rows[0].empid;

      // สร้าง Tid ใหม่
      const tidRes = await conn.query(
        `SELECT 'T' || LPAD(
          (COALESCE(MAX(CAST(SUBSTRING(tid,2) AS INT)),0)+1)::text
        ,4,'0') AS tid FROM task`
      );
      const tid = tidRes.rows[0].tid;

      // INSERT task
      await conn.query(
        `INSERT INTO task (tid, tdate, taskname, tasktype, tstatus)
         VALUES ($1, $2, $3, $4, 'Pending')`,
        [tid, workDate, taskName, taskType]
      );

      // ผูก task กับ booking
      await conn.query(
        `INSERT INTO booking_task (tid, bid) VALUES ($1, $2)`,
        [tid, bid]
      );

      // ผูก task กับห้อง
      await conn.query(
        `INSERT INTO room_task (tid, rid) VALUES ($1, $2)`,
        [tid, rid]
      );

      // ผูก task กับพนักงาน
      await conn.query(
        `INSERT INTO employee_task (empid, tid) VALUES ($1, $2)`,
        [empid, tid]
      );
    }

    await conn.query('COMMIT');
    res.json({ success: true, status: 'Confirmed' });

  } catch (err) {
    await conn.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'confirm booking failed' });
  } finally {
    conn.release();
  }
});



router.post("/cancel-expired-bookings", async (req, res) => {

  try {

    await pool.query(
      `
      UPDATE booking
      SET bstatus = 'Cancelled'
      WHERE bstatus = 'Pending'
      AND created_at < NOW() - INTERVAL '10 minutes'
      `
    );

    res.json({
      success: true
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "cancel failed"
    });
  }

});



module.exports = router;