"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DOCUMENTS_BUCKET = exports.s3Client = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
// Conditional S3 configuration based on environment
const createS3Client = () => {
    if (process.env.NODE_ENV === 'development') {
        // Development: Use MinIO (local S3-compatible storage)
        return new client_s3_1.S3Client({
            endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
            region: 'us-east-1', // MinIO doesn't care about region
            credentials: {
                accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
                secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
            },
            forcePathStyle: true, // Required for MinIO
        });
    }
    else {
        // Production: Use AWS S3 with default credentials (IAM role, env vars, etc.)
        return new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
            // AWS SDK will automatically pick up credentials from:
            // - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
            // - IAM role (if running on EC2)
            // - AWS credentials file
            // - ECS task role (if running on ECS)
        });
    }
};
// Export a single S3Client instance
exports.s3Client = createS3Client();
// Export bucket name for document storage
exports.DOCUMENTS_BUCKET = process.env.S3_BUCKET_NAME || 'riskninja-documents';
//# sourceMappingURL=s3Client.js.map