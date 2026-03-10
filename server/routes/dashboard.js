console.log("dashboard route file loaded");
const express = require("express");
const router = express.Router();
const db = require("../db");   


router.get("/summary", async (req, res) => {
    try {
        const totalRooms = await db.query(`SELECT COUNT(*) FROM room`);
        const availableRooms = await db.query(
            `SELECT COUNT(*) FROM room WHERE rstatus='available'`
        );
        const todayBookings = await db.query(
            `SELECT COUNT(*) FROM booking WHERE bdate = CURRENT_DATE`
        );

        res.json({
            totalRooms: parseInt(totalRooms.rows[0].count),
            availableRooms: parseInt(availableRooms.rows[0].count),
            todayBookings: parseInt(todayBookings.rows[0].count),
            todayRevenue: 0,
            monthlyRevenue: 0
        });

    } catch (err) {
        console.error("DASHBOARD ERROR:", err);
        res.status(500).json({ message: "Dashboard error" });
    }
});

module.exports = router;