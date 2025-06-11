import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { authenticateToken } from '../middleware/auth';
import { checkLicense } from '../middleware/checkLicense';
import { PolicyDocumentModel } from '../models';
import { FileStorageService } from '../services/fileStorage';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents/extract - extract full text from uploaded PDF
router.post(
  '/extract',
  authenticateToken,
  checkLicense,
  upload.single('file'),
  async (
    req: Request & { file?: Express.Multer.File },
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const pdfBuffer = req.file.buffer;
      const data = await pdfParse(pdfBuffer);
      res.json({ text: data.text });
      return;
    } catch (error) {
      console.error('PDF extraction error:', error);
      res.status(500).json({ error: 'Failed to extract PDF text' });
      return;
    }
  }
);

// GET /api/documents - list user's documents
router.get(
  '/',
  authenticateToken,
  checkLicense,
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const docs = await PolicyDocumentModel.findAll({ 
      where: { userId },
      order: [['uploadedAt', 'DESC']]
    });
    res.json(docs);
  }
);

// POST /api/documents - upload and store document with S3 integration
router.post(
  '/',
  authenticateToken,
  checkLicense,
  upload.single('file'),
  async (req: Request & { file?: Express.Multer.File; body: { name?: string; customerId?: string; policyType?: string } }, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      
      const { originalname, buffer, mimetype, size } = req.file;
      const assignedName = (req.body.name as string) || originalname;
      const customerId = req.body.customerId as string;
      const policyType = req.body.policyType as string;

      // Prevent duplicate names per user
      const existing = await PolicyDocumentModel.findOne({ where: { userId, name: assignedName } });
      if (existing) {
        res.status(409).json({ error: 'Document with this name already exists' });
        return;
      }

      // Upload file to S3/MinIO
      const { key, url } = await FileStorageService.uploadFile(
        buffer,
        originalname,
        mimetype,
        userId,
        customerId
      );

      // Create database record
      const doc = await PolicyDocumentModel.create({
        userId,
        customerId: customerId || null,
        name: assignedName,
        originalName: originalname,
        size,
        type: mimetype,
        policyType: policyType || null,
        fileKey: key,
        fileUrl: url,
        status: 'processing'
      });

      // Extract text from PDF
      let extractedText = null;
      try {
        const data = await pdfParse(buffer);
        extractedText = data.text;
        await doc.update({ extractedText, status: 'completed' });
      } catch (error) {
        console.error('Text extraction failed:', error);
        await doc.update({ status: 'error' });
      }

      res.status(201).json(doc);
      return;
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
      return;
    }
  }
);

// GET /api/documents/:id/download - get download URL for a document
router.get(
  '/:id/download',
  authenticateToken,
  checkLicense,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      
      const doc = await PolicyDocumentModel.findOne({ where: { id, userId } });
      if (!doc || !doc.fileKey) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Generate fresh download URL
      const downloadUrl = await FileStorageService.getFileUrl(doc.fileKey);
      
      // Update the stored URL
      await doc.update({ fileUrl: downloadUrl });

      res.json({ downloadUrl });
      return;
    } catch (error) {
      console.error('Document download error:', error);
      res.status(500).json({ error: 'Failed to generate download URL' });
      return;
    }
  }
);

// DELETE /api/documents/:id - delete user's document from both DB and storage
router.delete(
  '/:id',
  authenticateToken,
  checkLicense,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const doc = await PolicyDocumentModel.findOne({ where: { id, userId } });
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }

      // Delete from S3/MinIO if file key exists
      if (doc.fileKey) {
        try {
          await FileStorageService.deleteFile(doc.fileKey);
        } catch (error) {
          console.error('Failed to delete file from storage:', error);
          // Continue with database deletion even if storage deletion fails
        }
      }

      await doc.destroy();
      res.status(204).send();
      return;
    } catch (error) {
      console.error('Document delete error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
      return;
    }
  }
);

export default router; 