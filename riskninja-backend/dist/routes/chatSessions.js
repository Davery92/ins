"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const checkLicense_1 = require("../middleware/checkLicense");
const models_1 = require("../models");
const router = (0, express_1.Router)();
// GET /api/chat-sessions - get all chat sessions for the user
router.get('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const sessions = await models_1.ChatSessionModel.findAll({
            where: { userId },
            include: [
                {
                    model: models_1.CustomerModel,
                    as: 'customer',
                    attributes: ['id', 'name', 'company', 'type']
                }
            ],
            order: [['updatedAt', 'DESC']]
        });
        res.json(sessions);
    }
    catch (error) {
        console.error('Error fetching chat sessions:', error);
        res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
});
// POST /api/chat-sessions - create a new chat session
router.post('/', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { title, customerId } = req.body;
        const session = await models_1.ChatSessionModel.create({
            userId,
            customerId: customerId || null,
            title: title || 'New Chat',
        });
        res.status(201).json(session);
    }
    catch (error) {
        console.error('Error creating chat session:', error);
        res.status(500).json({ error: 'Failed to create chat session' });
    }
});
// GET /api/chat-sessions/:id - get a specific chat session with messages
router.get('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const session = await models_1.ChatSessionModel.findOne({
            where: { id, userId },
            include: [
                {
                    model: models_1.CustomerModel,
                    as: 'customer',
                    attributes: ['id', 'name', 'company', 'type']
                },
                {
                    model: models_1.ChatMessageModel,
                    as: 'messages',
                    order: [['timestamp', 'ASC']]
                }
            ]
        });
        if (!session) {
            res.status(404).json({ error: 'Chat session not found' });
            return;
        }
        res.json(session);
    }
    catch (error) {
        console.error('Error fetching chat session:', error);
        res.status(500).json({ error: 'Failed to fetch chat session' });
    }
});
// POST /api/chat-sessions/:id/messages - add a message to a chat session
router.post('/:id/messages', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { content, sender, context } = req.body;
        // Verify session belongs to user
        const session = await models_1.ChatSessionModel.findOne({ where: { id, userId } });
        if (!session) {
            res.status(404).json({ error: 'Chat session not found' });
            return;
        }
        const message = await models_1.ChatMessageModel.create({
            userId,
            sessionId: id,
            content,
            sender,
            context: context || null,
        });
        // Update session timestamp
        await session.update({ updatedAt: new Date() });
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Error adding message:', error);
        res.status(500).json({ error: 'Failed to add message' });
    }
});
// PUT /api/chat-sessions/:id - update chat session
router.put('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const { title, customerId } = req.body;
        const session = await models_1.ChatSessionModel.findOne({ where: { id, userId } });
        if (!session) {
            res.status(404).json({ error: 'Chat session not found' });
            return;
        }
        await session.update({
            title: title || session.title,
            customerId: customerId !== undefined ? customerId : session.customerId,
        });
        res.json(session);
    }
    catch (error) {
        console.error('Error updating chat session:', error);
        res.status(500).json({ error: 'Failed to update chat session' });
    }
});
// DELETE /api/chat-sessions/:id - delete a chat session and all its messages
router.delete('/:id', auth_1.authenticateToken, checkLicense_1.checkLicense, async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        const session = await models_1.ChatSessionModel.findOne({ where: { id, userId } });
        if (!session) {
            res.status(404).json({ error: 'Chat session not found' });
            return;
        }
        // Delete all messages first (due to foreign key constraints)
        await models_1.ChatMessageModel.destroy({ where: { sessionId: id } });
        // Then delete the session
        await session.destroy();
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting chat session:', error);
        res.status(500).json({ error: 'Failed to delete chat session' });
    }
});
exports.default = router;
//# sourceMappingURL=chatSessions.js.map