"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const auth_1 = require("../middleware/auth");
const checkLicense_1 = require("../middleware/checkLicense");
const models_1 = require("../models");
const fileStorage_1 = require("../services/fileStorage");
const pdfUtils_1 = require("../utils/pdfUtils");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// POST /api/documents/extract - extract full text from uploaded PDF
router.post('/extract', auth_1.authenticateToken, checkLicense_1.checkLicense, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const pdfBuffer = req.file.buffer;
        const data = await (0, pdf_parse_1.default)(pdfBuffer);
        const spans = await (0, pdfUtils_1.extractWordSpans)(pdfBuffer);
        res.json({ text: data.text, spans });
        return;
    }
    catch (error) {
        console.error('PDF extraction error:', error);
        res.status(500).json({ error: 'Failed to extract PDF text' });
        return;
    }
});
// GET /api/documents - list user's documents
router.get('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    const userId = req.user.id;
    const docs = await models_1.PolicyDocumentModel.findAll({
        where: { userId },
        order: [['uploadedAt', 'DESC']]
    });
    res.json(docs);
});
// POST /api/documents - upload and store document with S3 integration
router.post('/', auth_1.authenticateToken, checkLicense_1.checkLicense, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const { originalname, buffer, mimetype, size } = req.file;
        const assignedName = req.body.name || originalname;
        const customerId = req.body.customerId;
        const policyType = req.body.policyType;
        // Prevent duplicate names per user
        const existing = await models_1.PolicyDocumentModel.findOne({ where: { userId, name: assignedName } });
        if (existing) {
            res.status(409).json({ error: 'Document with this name already exists' });
            return;
        }
        // Upload file to S3/MinIO
        const { key, url } = await fileStorage_1.FileStorageService.uploadFile(buffer, originalname, mimetype, userId, customerId);
        // Create database record
        const doc = await models_1.PolicyDocumentModel.create({
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
            const data = await (0, pdf_parse_1.default)(buffer);
            extractedText = data.text;
            await doc.update({ extractedText, status: 'completed' });
            // Extract word spans and persist to database
            try {
                const spans = await (0, pdfUtils_1.extractWordSpans)(buffer);
                const spanRecords = spans.map(span => ({
                    documentId: doc.id,
                    pageNumber: span.page,
                    text: span.text,
                    bbox: span.bbox,
                    startOffset: span.startOffset,
                    endOffset: span.endOffset,
                }));
                await models_1.DocumentWordSpanModel.bulkCreate(spanRecords);
            }
            catch (spanError) {
                console.error('Span extraction or persistence failed:', spanError);
            }
        }
        catch (error) {
            console.error('Text extraction failed:', error);
            await doc.update({ status: 'error' });
        }
        res.status(201).json(doc);
        return;
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
        return;
    }
});
// GET /api/documents/:id/download - get download URL for a document
router.get('/:id/download', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const doc = await models_1.PolicyDocumentModel.findOne({ where: { id, userId } });
        if (!doc || !doc.fileKey) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        // Generate fresh download URL
        const downloadUrl = await fileStorage_1.FileStorageService.getFileUrl(doc.fileKey);
        // Update the stored URL
        await doc.update({ fileUrl: downloadUrl });
        res.json({ downloadUrl });
        return;
    }
    catch (error) {
        console.error('Document download error:', error);
        res.status(500).json({ error: 'Failed to generate download URL' });
        return;
    }
});
// DELETE /api/documents/:id - delete user's document from both DB and storage
router.delete('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const doc = await models_1.PolicyDocumentModel.findOne({ where: { id, userId } });
        if (!doc) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        // Delete from S3/MinIO if file key exists
        if (doc.fileKey) {
            try {
                await fileStorage_1.FileStorageService.deleteFile(doc.fileKey);
            }
            catch (error) {
                console.error('Failed to delete file from storage:', error);
                // Continue with database deletion even if storage deletion fails
            }
        }
        await doc.destroy();
        res.status(204).send();
        return;
    }
    catch (error) {
        console.error('Document delete error:', error);
        res.status(500).json({ error: 'Failed to delete document' });
        return;
    }
});
// GET /api/documents/:id/spans - fetch word spans for a document
router.get('/:id/spans', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        // First verify the user owns this document
        const doc = await models_1.PolicyDocumentModel.findOne({ where: { id, userId } });
        if (!doc) {
            res.status(404).json({ error: 'Document not found' });
            return;
        }
        const spans = await models_1.DocumentWordSpanModel.findAll({
            where: { documentId: id },
            order: [['pageNumber', 'ASC'], ['startOffset', 'ASC']],
        });
        res.json(spans);
        return;
    }
    catch (error) {
        console.error('Error fetching spans:', error);
        res.status(500).json({ error: 'Failed to fetch spans' });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=documents.js.map