const express = require('express');
const router = express.Router();
const pool = require('../db');


router.get('/', async (req, res) => {
  try {
    const { rtype, minPrice, maxPrice } = req.query;

    let sql = `
      SELECT 
      r.rid,
      r.rnum,
      r.rtype,
      r.rprice,
      r.rdesc,
      r.rstatus,
      (
        SELECT image_url
        FROM RoomImage
        WHERE rid = r.rid
        LIMIT 1
      ) AS cover_image
      FROM room r
      WHERE rstatus='Available'
    `;
    const params = [];

    // filter ตามประเภทห้อง (checkbox)
    if (rtype) {
      const types = Array.isArray(rtype) ? rtype : [rtype];
      params.push(types);
      sql += ` AND rtype = ANY($${params.length})`;
    }

    // filter ราคา
    if (minPrice) {
      params.push(minPrice);
      sql += ` AND rprice >= $${params.length}`;
    }
    if (maxPrice) {
      params.push(maxPrice);
      sql += ` AND rprice <= $${params.length}`;
    }

    sql += ` ORDER BY rprice ASC`;

    const result = await pool.query(sql, params);
    res.json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/filters/meta', async (req, res) => {
  const result = await pool.query(`
    SELECT
      ARRAY_AGG(DISTINCT rtype) AS rtypes,
      MIN(rprice) AS min_price,
      MAX(rprice) AS max_price
    FROM room
    WHERE rstatus = 'Available'
  `);

  res.json(result.rows[0]);
});

//เพิ่ม
router.post('/', async (req, res) => {
  try {

    const { rnum, rtype, rprice,rdesc } = req.body;

    const rstatus = "Available";

    // สร้าง rid อัตโนมัติ
    const ridResult = await pool.query(`
      SELECT 'R' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(rid,2) AS INT)),0)+1)::text
      ,4,'0') AS rid
      FROM room
    `);

    const rid = ridResult.rows[0].rid;

    await pool.query(
      `INSERT INTO room (rid, rnum, rtype, rprice, rstatus,rdesc)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [rid, rnum, rtype, rprice, rstatus,rdesc]
    );

    res.json({
      message: "Room added successfully",
      rid: rid
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

//update
router.post('/', async (req, res) => {
  try {
    const { rid, rnum, rtype, rprice, rstatus } = req.body;

    await pool.query(
      `INSERT INTO room (rid, rnum, rtype, rprice, rstatus)
       VALUES ($1, $2, $3, $4, $5)`,
      [rid, rnum, rtype, rprice, rstatus]
    );

    res.json({ message: 'Room added successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT rtype
      FROM room
      WHERE rtype IS NOT NULL
      ORDER BY rtype
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'load room types failed' });
  }
});

router.get('/room_getdata', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        rid,
        rnum,
        rtype,
        rprice,
        rdesc,
        rstatus
      FROM room
      ORDER BY rid ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

router.get('/:rid/images', async (req,res)=>{
  const { rid } = req.params;

  const result = await pool.query(
    "SELECT image_url FROM RoomImage WHERE rid=$1",
    [rid]
  );

  res.json(result.rows);
});

router.get('/:rid', async (req, res) => {
  const { rid } = req.params;

  try {
    const result = await pool.query(
      `SELECT rid, rtype, rnum, rprice, rdesc
       FROM room
       WHERE rid = $1`,
      [rid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'room not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'load room failed' });
  }
});



module.exports = router;