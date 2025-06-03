import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { authenticateToken } from '../middleware/auth';

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

export default router; 