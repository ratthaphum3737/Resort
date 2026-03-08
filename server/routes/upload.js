const express = require("express");
const multer = require("multer");
const router = express.Router();

const bucket = require("../services/gcs");
const pool = require("../db");

const upload = multer({ storage: multer.memoryStorage() });

router.post("/room-image", upload.array("images",3), async (req, res) => {
  try {

    const rid = req.body.rid;
    const files = req.files;

    if (!rid) {
      return res.status(400).json({ error: "Room ID required" });
    }

    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const urls = [];

    for (const file of files) {

      const filename = `rooms/${rid}/${Date.now()}-${file.originalname}`;

      const blob = bucket.file(filename);

      const blobStream = blob.createWriteStream({
        resumable: false
      });

      await new Promise((resolve, reject) => {

        blobStream.on("finish", async () => {

          const publicUrl =
            `https://storage.googleapis.com/${bucket.name}/${filename}`;

          await pool.query(
            "INSERT INTO RoomImage (rid,image_url) VALUES ($1,$2)",
            [rid, publicUrl]
          );

          urls.push(publicUrl);

          resolve();
        });

        blobStream.on("error", reject);

        blobStream.end(file.buffer);

      });

    }

    res.json({
      message: "Upload success",
      images: urls
    });

  } catch (err) {
    console.log(err);
    res.status(500).send("Upload error");
  }
});

module.exports = router;