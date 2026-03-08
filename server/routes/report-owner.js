const express = require('express');
const router = express.Router();
const pool = require('../db');

// 1. ดึงข้อมูลสรุปยอดการจอง
router.get("/bookings", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = `
      SELECT TO_CHAR(BDate, 'YYYY-MM-DD') as book_date, COUNT(*) as total_bookings
      FROM Booking
      WHERE BDate >= $1 AND BDate <= $2
      GROUP BY TO_CHAR(BDate, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(BDate, 'YYYY-MM-DD') ASC
    `;
    const result = await pool.query(query, [start, end]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 2. ดึงข้อมูลรายรับรวม
router.get("/revenue", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = `
      SELECT TO_CHAR(b.BDate, 'YYYY-MM-DD') as book_date, SUM(r.RPrice) as daily_revenue
      FROM Booking b
      JOIN Booking_Room br ON b.Bid = br.Bid
      JOIN Room r ON br.Rid = r.Rid
      WHERE b.BDate >= $1 AND b.BDate <= $2
      GROUP BY TO_CHAR(b.BDate, 'YYYY-MM-DD')
      ORDER BY TO_CHAR(b.BDate, 'YYYY-MM-DD') ASC
    `;
    const result = await pool.query(query, [start, end]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// 3. ดึงข้อมูลจำนวนห้องว่าง
router.get("/available-rooms", async (req, res) => {
  try {
    const { start, end } = req.query;
    const query = `
      WITH date_series AS (
          SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS d_date
      )
      SELECT 
          TO_CHAR(ds.d_date, 'YYYY-MM-DD') as book_date,
          (SELECT COUNT(*) FROM Room) - 
          COALESCE((
              SELECT COUNT(DISTINCT br.Rid)
              FROM Booking b
              JOIN Booking_Room br ON b.Bid = br.Bid
              WHERE ds.d_date >= b.Bcheckin_date AND ds.d_date < b.Bcheckout_date
          ), 0) as available_rooms
      FROM date_series ds
      ORDER BY ds.d_date ASC;
    `;
    const result = await pool.query(query, [start, end]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router;