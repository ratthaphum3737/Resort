require("dotenv").config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require("node-cron");
const pool = require('./db');

const app = express();

app.use(cors());
app.use(express.json());

// serve client
app.use(express.static(path.join(__dirname, '../client')));
app.use(express.static(path.join(__dirname, '../employee')));
app.use('/api/rooms', require('./routes/room.js'));
app.use('/api', require('./routes/auth'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/staff', require('./routes/staff'));

app.use('/api/bookingowner', require('./routes/bookingowner')); 
app.use('/api/admin/bookings', require('./routes/bookingowner'));
app.use('/api/admin/employees', require('./routes/employee-owner'));
app.use('/api/admin/customers', require('./routes/customer-owner'));
app.use('/api/admin/reports', require('./routes/report-owner'));

app.use('/api/upload', require('./routes/upload'));

// ตรวจ booking หมดเวลา
cron.schedule("* * * * *", async () => {

  try {

    await pool.query(`
      UPDATE booking
      SET bstatus = 'Cancelled'
      WHERE bstatus = 'Pending'
      AND bdate < NOW() - INTERVAL '15 minutes'
    `);

    console.log("checked expired bookings");

  } catch (err) {
    console.error("cancel booking error", err);
  }

});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('Server running on port :' + PORT);
});