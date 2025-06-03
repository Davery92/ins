import { Model, DataTypes } from 'sequelize';
import { sequelize } from '../config/database';

export interface ChatMessageAttributes {
  id: string;
  userId: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  context?: {
    policyType?: string;
    documentCount?: number;
    documentNames?: string[];
  };
  chatSessionId: string;
}

export const ChatMessageModel = sequelize.define<Model<ChatMessageAttributes>>('ChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  sender: {
    type: DataTypes.ENUM('user', 'ai'),
    allowNull: false,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  context: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  chatSessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
  },
}); 