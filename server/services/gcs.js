const { Storage } = require('@google-cloud/storage');

const privateKey = (process.env.GCS_PRIVATE_KEY || '')
  .replace(/\\n/g, '\n');

const storage = new Storage({
  projectId: process.env.GCS_PROJECT_ID,
  credentials: {
    client_email: process.env.GCS_CLIENT_EMAIL,
    private_key: privateKey
  }
});

const bucketName = process.env.GCS_BUCKET_NAME || "image-room";

const bucket = storage.bucket(bucketName);

module.exports = bucket;