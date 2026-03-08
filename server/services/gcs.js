const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  keyFilename: "./my-project-resort-489604-d377a0b55373.json"
});

const bucketName = "image-room"; // ชื่อ bucket

const bucket = storage.bucket(bucketName);

module.exports = bucket;