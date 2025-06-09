"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const auth_1 = require("../middleware/auth");
const models_1 = require("../models");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// POST /api/documents/extract - extract full text from uploaded PDF
router.post('/extract', auth_1.authenticateToken, upload.single('file'), async (req, res, next) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const pdfBuffer = req.file.buffer;
        const data = await (0, pdf_parse_1.default)(pdfBuffer);
        res.json({ text: data.text });
        return;
    }
    catch (error) {
        console.error('PDF extraction error:', error);
        res.status(500).json({ error: 'Failed to extract PDF text' });
        return;
    }
});
// New: GET /api/documents - list user's documents
router.get('/', auth_1.authenticateToken, async (req, res) => {
    const userId = req.user.id;
    const docs = await models_1.PolicyDocumentModel.findAll({ where: { userId } });
    res.json(docs);
});
// New: POST /api/documents - upload and store document
router.post('/', auth_1.authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        const { originalname, buffer, mimetype, size } = req.file;
        const assignedName = req.body.name || originalname;
        // prevent duplicate names
        const existing = await models_1.PolicyDocumentModel.findOne({ where: { userId, name: assignedName } });
        if (existing) {
            res.status(409).json({ error: 'Document with this name already exists' });
            return;
        }
        // create record
        const doc = await models_1.PolicyDocumentModel.create({
            userId,
            name: assignedName,
            originalName: originalname,
            size,
            type: mimetype,
            status: 'processing'
        });
        // extract text
        const data = await (0, pdf_parse_1.default)(buffer);
        await doc.update({ extractedText: data.text, status: 'completed' });
        res.status(201).json(doc);
        return;
    }
    catch (error) {
        console.error('Document upload error:', error);
        res.status(500).json({ error: 'Failed to upload document' });
        return;
    }
});
// New: DELETE /api/documents/:id - delete user's document
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const doc = await models_1.PolicyDocumentModel.findOne({ where: { id, userId } });
        if (!doc) {
            res.status(404).json({ error: 'Document not found' });
            return;
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
exports.default = router;
//# sourceMappingURL=documents.js.map