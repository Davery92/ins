"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatStats = exports.clearChatHistory = exports.saveChatMessage = exports.getChatHistory = void 0;
const models_1 = require("../models");
const getChatHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const offset = (page - 1) * limit;
        const messages = await models_1.ChatMessageModel.findAndCountAll({
            where: { userId: req.user.id },
            order: [['timestamp', 'DESC']],
            limit,
            offset,
        });
        res.json({
            messages: messages.rows.reverse(), // Reverse to show oldest first
            pagination: {
                page,
                limit,
                total: messages.count,
                pages: Math.ceil(messages.count / limit),
            },
        });
    }
    catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getChatHistory = getChatHistory;
const saveChatMessage = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const { content, sender, context } = req.body;
        if (!content || !sender) {
            res.status(400).json({ error: 'Content and sender are required' });
            return;
        }
        if (!['user', 'ai'].includes(sender)) {
            res.status(400).json({ error: 'Sender must be "user" or "ai"' });
            return;
        }
        const message = await models_1.ChatMessageModel.create({
            userId: req.user.id,
            content,
            sender,
            context: context || null,
            timestamp: new Date(),
        });
        res.status(201).json({
            message: 'Chat message saved',
            data: message,
        });
    }
    catch (error) {
        console.error('Save chat message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.saveChatMessage = saveChatMessage;
const clearChatHistory = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        await models_1.ChatMessageModel.destroy({
            where: { userId: req.user.id },
        });
        res.json({
            message: 'Chat history cleared successfully',
        });
    }
    catch (error) {
        console.error('Clear chat history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.clearChatHistory = clearChatHistory;
const getChatStats = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'User not authenticated' });
            return;
        }
        const totalMessages = await models_1.ChatMessageModel.count({
            where: { userId: req.user.id },
        });
        const userMessages = await models_1.ChatMessageModel.count({
            where: {
                userId: req.user.id,
                sender: 'user'
            },
        });
        const aiMessages = await models_1.ChatMessageModel.count({
            where: {
                userId: req.user.id,
                sender: 'ai'
            },
        });
        // Get most recent message
        const recentMessage = await models_1.ChatMessageModel.findOne({
            where: { userId: req.user.id },
            order: [['timestamp', 'DESC']],
        });
        res.json({
            totalMessages,
            userMessages,
            aiMessages,
            lastActivity: recentMessage?.timestamp || null,
        });
    }
    catch (error) {
        console.error('Get chat stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
exports.getChatStats = getChatStats;
//# sourceMappingURL=chatController.js.map