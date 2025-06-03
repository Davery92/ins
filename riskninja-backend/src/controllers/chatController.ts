import { Response } from 'express';
import { ChatMessageModel } from '../models';
import { AuthRequest } from '../types';

export const getChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const messages = await ChatMessageModel.findAndCountAll({
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
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveChatMessage = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const message = await ChatMessageModel.create({
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
  } catch (error) {
    console.error('Save chat message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clearChatHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    await ChatMessageModel.destroy({
      where: { userId: req.user.id },
    });

    res.json({
      message: 'Chat history cleared successfully',
    });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getChatStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    const totalMessages = await ChatMessageModel.count({
      where: { userId: req.user.id },
    });

    const userMessages = await ChatMessageModel.count({
      where: { 
        userId: req.user.id,
        sender: 'user'
      },
    });

    const aiMessages = await ChatMessageModel.count({
      where: { 
        userId: req.user.id,
        sender: 'ai'
      },
    });

    // Get most recent message
    const recentMessage = await ChatMessageModel.findOne({
      where: { userId: req.user.id },
      order: [['timestamp', 'DESC']],
    });

    res.json({
      totalMessages,
      userMessages,
      aiMessages,
      lastActivity: recentMessage?.timestamp || null,
    });
  } catch (error) {
    console.error('Get chat stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 