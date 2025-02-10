const AWS = require('aws-sdk');

// Configure AWS credentials
AWS.config.update({
    region: process.env.S3_REGION,
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
});

// Create an S3 client
const s3 = new AWS.S3();

module.exports.getS3Client = () => s3;