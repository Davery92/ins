import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { checkLicense } from '../middleware/checkLicense';
import { ChatSessionModel, ChatMessageModel, CustomerModel } from '../models';

const router = Router();

// GET /api/chat-sessions - get all chat sessions for the user
router.get('/', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const sessions = await ChatSessionModel.findAll({ 
      where: { userId },
      include: [
        {
          model: CustomerModel,
          as: 'customer',
          attributes: ['id', 'name', 'company', 'type']
        }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    res.status(500).json({ error: 'Failed to fetch chat sessions' });
  }
});

// POST /api/chat-sessions - create a new chat session
router.post('/', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, customerId } = req.body;

    const session = await ChatSessionModel.create({
      userId,
      customerId: customerId || null,
      title: title || 'New Chat',
    });

    res.status(201).json(session);
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// GET /api/chat-sessions/:id - get a specific chat session with messages
router.get('/:id', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const session = await ChatSessionModel.findOne({
      where: { id, userId },
      include: [
        {
          model: CustomerModel,
          as: 'customer',
          attributes: ['id', 'name', 'company', 'type']
        },
        {
          model: ChatMessageModel,
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
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ error: 'Failed to fetch chat session' });
  }
});

// POST /api/chat-sessions/:id/messages - add a message to a chat session
router.post('/:id/messages', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { content, sender, context } = req.body;

    // Verify session belongs to user
    const session = await ChatSessionModel.findOne({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    const message = await ChatMessageModel.create({
      userId,
      sessionId: id,
      content,
      sender,
      context: context || null,
    });

    // Update session timestamp
    await session.update({ updatedAt: new Date() });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// PUT /api/chat-sessions/:id - update chat session
router.put('/:id', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;
    const { title, customerId } = req.body;

    const session = await ChatSessionModel.findOne({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    await session.update({
      title: title || session.title,
      customerId: customerId !== undefined ? customerId : session.customerId,
    });

    res.json(session);
  } catch (error) {
    console.error('Error updating chat session:', error);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

// DELETE /api/chat-sessions/:id - delete a chat session and all its messages
router.delete('/:id', authenticateToken, checkLicense, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    const session = await ChatSessionModel.findOne({ where: { id, userId } });
    if (!session) {
      res.status(404).json({ error: 'Chat session not found' });
      return;
    }

    // Delete all messages first (due to foreign key constraints)
    await ChatMessageModel.destroy({ where: { sessionId: id } });
    
    // Then delete the session
    await session.destroy();

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting chat session:', error);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

export default router; 