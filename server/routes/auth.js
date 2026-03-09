const express = require('express');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const pool = require('../db');
const router = express.Router();
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);


router.post('/login', async (req, res) => {
  console.log('LOGIN API HIT');
  try {
    const { email, password, role } = req.body;

    let query;

    if (role === 'customer') {
      query = `
        SELECT cid AS id, fname, email
        FROM customer
        WHERE email=$1 AND cpassword=$2
      `;
    } 
    else if (role === 'employee') {
      query = `
        SELECT empid AS id, fname, email
        FROM employee
        WHERE email=$1 AND upassword=$2
      `;
    } 
    else if (role === 'owner') {
      query = `
        SELECT oid AS id, fname, email
        FROM owner
        WHERE email=$1 AND opassword=$2
      `;
    } 
    else {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(query, [email, password]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid login' });
    }

    res.json({
      id: result.rows[0].id,
      fname: result.rows[0].fname,
      email: result.rows[0].email
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


/* ================= REGISTER ================= */
router.post('/register', async (req, res) => {
  console.log('REGISTER HIT');
  try {
    const { fname, lname, id_number, tel, email, password ,ctype} = req.body;
    const check = await pool.query(
      `
      SELECT
        email,
        id_number,
        tel
      FROM customer
      WHERE email = $1
        OR id_number = $2
        OR tel = $3
      `,
      [email, id_number, tel]
    );

    if (check.rows.length > 0) {
      const exist = check.rows[0];
      if (exist.email === email) {
        return res.status(400).json({ message: 'อีเมลนี้ถูกใช้งานแล้ว' });
      }
      if (exist.id_number === id_number) {
        return res.status(400).json({ message: 'เลขบัตรประชาชนนี้ถูกใช้งานแล้ว' });
      }
      if (exist.tel === tel) {
        return res.status(400).json({ message: 'เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว' });
      }
    }

    // สร้าง CID อัตโนมัติ
    const cidResult = await pool.query(
      `SELECT 'C' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(cid,2) AS INT)),0)+1)::text
      ,4,'0') AS cid FROM customer`
    );
    const cid = cidResult.rows[0].cid;

    await pool.query(
      `
      INSERT INTO customer
      (cid, fname, lname, id_number, tel, email, cpassword,ctype)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      `,
      [cid, fname, lname, id_number, tel, email, password,ctype]
    );

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* ================= REGISTER guest ================= */
router.post('/create_guest', async (req, res) => {
  console.log('REGISTER guest HIT');
  const { id_number, tel, email, fname, lname } = req.body;

  try {

    const check = await pool.query(
      'SELECT cid FROM customer WHERE id_number=$1',
      [id_number]
    );

    if (check.rows.length > 0) {
      return res.json({ cid: check.rows[0].cid });
    }

    // ===== สร้าง CID =====
    const cidResult = await pool.query(
      `SELECT 'C' || LPAD(
        (COALESCE(MAX(CAST(SUBSTRING(cid,2) AS INT)),0)+1)::text
      ,4,'0') AS cid FROM customer`
    );

    // ===== INSERT ให้ถูกต้อง =====
    const result = await pool.query(
      `INSERT INTO customer
       (id_number, tel, email, cpassword, cid, fname, lname, ctype)
       VALUES ($1,$2,$3,NULL,$4,$5,$6,'guest')
       RETURNING cid`,
      [id_number, tel, email, cidResult, fname, lname]
    );

    res.json({ cid: result.rows[0].cid });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
});


// ================= SEND OTP =================

router.post("/send-otp", async (req, res) => {
  const { email } = req.body;

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const token = jwt.sign(
    { email, otp },
    "secretkey",
    { expiresIn: "5m" }
  );

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: "Your OTP Code",
      html: `
        <h2>OTP Verification</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This code will expire in 15 minutes.</p>
      `
    });

    res.json({
      message: "OTP sent to email",
      token: token
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Email sending failed" });
  }
});


// ================= VERIFY OTP =================
router.post("/verify-otp", (req, res) => {

  const { otp, token } = req.body;

  try {

    const decoded = jwt.verify(token, "secretkey");

    if (decoded.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    res.json({
      message: "OTP verified",
      email: decoded.email
    });

  } catch (err) {
    res.status(400).json({ message: "OTP expired" });
  }

});

module.exports = router;

/* ===== PROFILE ===== */

// ดึงข้อมูลผู้ใช้
router.get('/profile/:cid', async (req, res) => {
  const { cid } = req.params;

  const result = await pool.query(
    `
    SELECT cid, fname, lname, email, tel
    FROM customer
    WHERE cid=$1
    `,
    [cid]
  );

  res.json(result.rows[0]);
});

// แก้ไขข้อมูล
router.put('/profile/:cid', async (req, res) => {
  const { cid } = req.params;
  const { fname, lname, tel, password } = req.body;

  let fields = [];
  let values = [];
  let index = 1;

  if (fname) {
    fields.push(`fname=$${index++}`);
    values.push(fname);
  }
  if (lname) {
    fields.push(`lname=$${index++}`);
    values.push(lname);
  }
  if (tel) {
    fields.push(`tel=$${index++}`);
    values.push(tel);
  }
  if (password) {
    fields.push(`cpassword=$${index++}`);
    values.push(password);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No data to update' });
  }

  const sql = `
    UPDATE customer
    SET ${fields.join(', ')}
    WHERE cid=$${index}
  `;
  values.push(cid);

  await pool.query(sql, values);

  res.json({ success: true });
});


router.get("/guest/:id_number", async (req, res) => {

  const { id_number } = req.params;

  try {

    const result = await pool.query(
      `
      SELECT fname, lname, email, tel
      FROM customer
      WHERE id_number = $1
      `,
      [id_number]
    );

    if (result.rows.length === 0) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      data: result.rows[0]
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server error" });
  }

});


module.exports = router;