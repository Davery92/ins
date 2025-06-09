"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatMessageModel = void 0;
const sequelize_1 = require("sequelize");
const database_1 = require("../config/database");
exports.ChatMessageModel = database_1.sequelize.define('ChatMessage', {
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    sender: {
        type: sequelize_1.DataTypes.ENUM('user', 'ai'),
        allowNull: false,
    },
    timestamp: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    context: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    chatSessionId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
    },
});
//# sourceMappingURL=ChatMessage.js.map