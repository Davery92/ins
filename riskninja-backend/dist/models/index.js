"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.PolicyDocumentModel = exports.ChatMessageModel = exports.UserModel = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
const path_1 = __importDefault(require("path"));
const dbPath = process.env.DB_PATH || path_1.default.join(__dirname, '../../data/riskninja.db');
exports.sequelize = new sequelize_1.Sequelize({
    dialect: 'sqlite',
    storage: dbPath,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
// User Model
class UserModel extends sequelize_1.Model {
}
exports.UserModel = UserModel;
UserModel.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    password: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
});
// Chat Message Model
class ChatMessageModel extends sequelize_1.Model {
}
exports.ChatMessageModel = ChatMessageModel;
ChatMessageModel.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: UserModel,
            key: 'id',
        },
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
}, {
    sequelize: exports.sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    timestamps: false,
});
// Policy Document Model
class PolicyDocumentModel extends sequelize_1.Model {
}
exports.PolicyDocumentModel = PolicyDocumentModel;
PolicyDocumentModel.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: UserModel,
            key: 'id',
        },
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    originalName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    size: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    uploadedAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('uploaded', 'processing', 'completed', 'error'),
        allowNull: false,
        defaultValue: 'uploaded',
    },
    extractedText: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    summary: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    keyTerms: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    insights: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    recommendations: {
        type: sequelize_1.DataTypes.JSON,
        allowNull: true,
    },
    riskScore: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    policyType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'PolicyDocument',
    tableName: 'policy_documents',
    timestamps: false,
});
// Define associations
UserModel.hasMany(ChatMessageModel, { foreignKey: 'userId', as: 'chatMessages' });
ChatMessageModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
UserModel.hasMany(PolicyDocumentModel, { foreignKey: 'userId', as: 'policyDocuments' });
PolicyDocumentModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user' });
// Initialize database
const initDatabase = async () => {
    try {
        await exports.sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        await exports.sequelize.sync({ force: false });
        console.log('✅ Database tables created successfully.');
    }
    catch (error) {
        console.error('❌ Unable to connect to database:', error);
        process.exit(1);
    }
};
exports.initDatabase = initDatabase;
//# sourceMappingURL=index.js.map