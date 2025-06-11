import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, CreateBucketCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// MinIO S3-compatible storage configuration
const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://minio:9000',
  region: 'us-east-1', // MinIO doesn't care about region, but AWS SDK requires it
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET_NAME = process.env.MINIO_BUCKET || 'riskninja-documents';

export class FileStorageService {
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    userId: string,
    customerId?: string
  ): Promise<{ key: string; url: string }> {
    // Create a unique key for the file
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `users/${userId}/${customerId ? `customers/${customerId}/` : ''}${timestamp}_${sanitizedFileName}`;

    try {
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        Metadata: {
          userId,
          customerId: customerId || '',
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await s3Client.send(command);

      // Generate a presigned URL for access (valid for 1 hour)
      const getCommand = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      
      const url = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

      return { key, url };
    } catch (error) {
      console.error('Error uploading file to MinIO:', error);
      throw new Error('Failed to upload file to storage');
    }
  }

  static async getFileUrl(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      
      return await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    } catch (error) {
      console.error('Error generating file URL:', error);
      throw new Error('Failed to generate file URL');
    }
  }

  static async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      
      await s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from MinIO:', error);
      throw new Error('Failed to delete file from storage');
    }
  }

  static async getFileBuffer(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      
      const response = await s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File not found');
      }

      // Convert the readable stream to buffer
      const chunks: Buffer[] = [];
      const stream = response.Body as NodeJS.ReadableStream;
      
      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Error retrieving file from MinIO:', error);
      throw new Error('Failed to retrieve file from storage');
    }
  }
}

// Initialize bucket if it doesn't exist
export const initializeStorage = async (): Promise<void> => {
  try {
    console.log(`🪣 Checking if MinIO bucket '${BUCKET_NAME}' exists...`);
    
    // Check if bucket exists
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`✅ MinIO bucket '${BUCKET_NAME}' already exists`);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        // Bucket doesn't exist, create it
        console.log(`🔨 Creating MinIO bucket '${BUCKET_NAME}'...`);
        await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
        console.log(`✅ MinIO bucket '${BUCKET_NAME}' created successfully`);
      } else {
        throw error;
      }
    }
    
    console.log('✅ File storage service initialized');
  } catch (error) {
    console.error('❌ Failed to initialize file storage:', error);
    throw error;
  }
}; 