const express = require('express');
const router = express.Router();
const pool = require('../db');

// ─────────────────────────────────────────────────────────────
// mount ใน server.js:
//   app.use('/api/admin/reports',  require('./routes/report-owner'))
//   app.use('/api/admin/rooms',    require('./routes/report-owner'))
//   app.use('/api/admin/bookings', require('./routes/report-owner'))  ← เฉพาะ /recent
// ─────────────────────────────────────────────────────────────

// 1. ยอดการจองรายวัน
//    GET /api/admin/reports/bookings?start=&end=
router.get("/bookings", async (req, res) => {
  try {
    const { start, end } = req.query;
    const result = await pool.query(`
      SELECT TO_CHAR(BDate, 'YYYY-MM-DD') AS book_date,
             COUNT(*) AS total_bookings
      FROM Booking
      WHERE BDate >= $1 AND BDate <= $2
      GROUP BY TO_CHAR(BDate, 'YYYY-MM-DD')
      ORDER BY 1 ASC
    `, [start, end]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. รายรับรายวัน
//    GET /api/admin/reports/revenue?start=&end=
router.get("/revenue", async (req, res) => {
  try {
    const { start, end } = req.query;
    const result = await pool.query(`
      SELECT TO_CHAR(b.BDate, 'YYYY-MM-DD') AS book_date,
             SUM(r.RPrice) AS daily_revenue
      FROM Booking b
      JOIN Booking_Room br ON b.Bid = br.Bid
      JOIN Room r ON br.Rid = r.Rid
      WHERE b.BDate >= $1 AND b.BDate <= $2
      GROUP BY TO_CHAR(b.BDate, 'YYYY-MM-DD')
      ORDER BY 1 ASC
    `, [start, end]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. ห้องว่างรายวัน
//    GET /api/admin/reports/available-rooms?start=&end=
router.get("/available-rooms", async (req, res) => {
  try {
    const { start, end } = req.query;
    const result = await pool.query(`
      WITH date_series AS (
        SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d_date
      )
      SELECT
        TO_CHAR(ds.d_date, 'YYYY-MM-DD') AS book_date,
        (SELECT COUNT(*) FROM Room) -
        COALESCE((
          SELECT COUNT(DISTINCT br.Rid)
          FROM Booking b
          JOIN Booking_Room br ON b.Bid = br.Bid
          WHERE ds.d_date >= b.Bcheckin_date
            AND ds.d_date <  b.Bcheckout_date
        ), 0) AS available_rooms
      FROM date_series ds
      ORDER BY ds.d_date ASC
    `, [start, end]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 4. รายชื่อห้องทั้งหมด + สถานะ
//    GET /api/admin/rooms  (router mount บน "/" เพราะ prefix คือ /api/admin/rooms แล้ว)
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT Rid, RNum, RType, RPrice, RStatus, RDesc
      FROM Room
      ORDER BY RNum ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 5. การจองล่าสุด
//    GET /api/admin/bookings/recent?limit=8
router.get("/recent", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const result = await pool.query(`
      SELECT b.Bid, b.Cid, b.BDate, b.BStatus,
             b.Bcheckin_date, b.Bcheckout_date,
             b.Bnum_people,
             c.Fname || ' ' || c.Lname AS customer_name
      FROM Booking b
      LEFT JOIN Customer c ON b.Cid = c.Cid
      ORDER BY b.BDate DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;