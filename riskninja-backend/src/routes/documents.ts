import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { authenticateToken } from '../middleware/auth';
import { PolicyDocumentModel } from '../models';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/documents/extract - extract full text from uploaded PDF
router.post(
  '/extract',
  authenticateToken,
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

// New: GET /api/documents - list user's documents
router.get(
  '/',
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const docs = await PolicyDocumentModel.findAll({ where: { userId } });
    res.json(docs);
  }
);

// New: POST /api/documents - upload and store document
router.post(
  '/',
  authenticateToken,
  upload.single('file'),
  async (req: Request & { file?: Express.Multer.File; body: { name?: string } }, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }
      const { originalname, buffer, mimetype, size } = req.file;
      const assignedName = (req.body.name as string) || originalname;
      // prevent duplicate names
      const existing = await PolicyDocumentModel.findOne({ where: { userId, name: assignedName } });
      if (existing) {
        res.status(409).json({ error: 'Document with this name already exists' });
        return;
      }
      // create record
      const doc = await PolicyDocumentModel.create({
        userId,
        name: assignedName,
        originalName: originalname,
        size,
        type: mimetype,
        status: 'processing'
      });
      // extract text
      const data = await pdfParse(buffer);
      await doc.update({ extractedText: data.text, status: 'completed' });
      res.status(201).json(doc);
      return;
    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document' });
      return;
    }
  }
);

// New: DELETE /api/documents/:id - delete user's document
router.delete(
  '/:id',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      const doc = await PolicyDocumentModel.findOne({ where: { id, userId } });
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
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