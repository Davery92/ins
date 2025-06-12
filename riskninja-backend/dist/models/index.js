"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = exports.ComparisonReportModel = exports.ChatSessionModel = exports.CustomerModel = exports.PolicyDocumentModel = exports.ChatMessageModel = exports.UserModel = exports.CompanyModel = exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
// Use DATABASE_URL for PostgreSQL connection
const databaseUrl = process.env.DATABASE_URL || 'postgres://riskninja_user:riskninja_password@localhost:5432/riskninja_db';
exports.sequelize = new sequelize_1.Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});
// Company Model
class CompanyModel extends sequelize_1.Model {
}
exports.CompanyModel = CompanyModel;
CompanyModel.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    domain: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    licenseCount: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'Company',
    tableName: 'companies',
    timestamps: true,
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
    status: {
        type: sequelize_1.DataTypes.ENUM('pending', 'active', 'disabled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    role: {
        type: sequelize_1.DataTypes.ENUM('user', 'admin', 'system_admin'),
        allowNull: false,
        defaultValue: 'user',
    },
    companyId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true, // system_admin users may not belong to a company
        references: {
            model: CompanyModel,
            key: 'id',
        },
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
    sessionId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'chat_sessions',
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
        unique: 'user_document_name',
    },
    customerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'customers',
            key: 'id',
        },
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        unique: 'user_document_name',
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
    fileKey: {
        type: sequelize_1.DataTypes.STRING(500),
        allowNull: true,
    },
    fileUrl: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'PolicyDocument',
    tableName: 'policy_documents',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['userId', 'name'], name: 'user_document_name' }
    ]
});
// Customer Model
class CustomerModel extends sequelize_1.Model {
}
exports.CustomerModel = CustomerModel;
CustomerModel.init({
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
    type: {
        type: sequelize_1.DataTypes.ENUM('customer', 'prospect'),
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    company: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    status: {
        type: sequelize_1.DataTypes.ENUM('active', 'inactive', 'lead'),
        allowNull: false,
        defaultValue: 'active',
    },
    lastContact: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'Customer',
    tableName: 'customers',
    timestamps: true,
});
// Chat Session Model (to group related messages)
class ChatSessionModel extends sequelize_1.Model {
}
exports.ChatSessionModel = ChatSessionModel;
ChatSessionModel.init({
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
    customerId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: CustomerModel,
            key: 'id',
        },
    },
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'ChatSession',
    tableName: 'chat_sessions',
    timestamps: true,
});
// Comparison Report Model
class ComparisonReportModel extends sequelize_1.Model {
}
exports.ComparisonReportModel = ComparisonReportModel;
ComparisonReportModel.init({
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
    title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    content: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: false,
    },
    documentNames: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.STRING),
        allowNull: false,
    },
    documentIds: {
        type: sequelize_1.DataTypes.ARRAY(sequelize_1.DataTypes.UUID),
        allowNull: false,
    },
    primaryPolicyType: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    additionalFacts: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: exports.sequelize,
    modelName: 'ComparisonReport',
    tableName: 'comparison_reports',
    timestamps: true,
});
// Establish associations
CompanyModel.hasMany(UserModel, {
    foreignKey: 'companyId',
    as: 'users'
});
UserModel.belongsTo(CompanyModel, {
    foreignKey: 'companyId',
    as: 'company'
});
// Customer associations
UserModel.hasMany(CustomerModel, {
    foreignKey: 'userId',
    as: 'customers'
});
CustomerModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});
// Document associations
UserModel.hasMany(PolicyDocumentModel, {
    foreignKey: 'userId',
    as: 'documents'
});
PolicyDocumentModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});
CustomerModel.hasMany(PolicyDocumentModel, {
    foreignKey: 'customerId',
    as: 'documents'
});
PolicyDocumentModel.belongsTo(CustomerModel, {
    foreignKey: 'customerId',
    as: 'customer'
});
// Chat session associations  
UserModel.hasMany(ChatSessionModel, {
    foreignKey: 'userId',
    as: 'chatSessions'
});
ChatSessionModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});
CustomerModel.hasMany(ChatSessionModel, {
    foreignKey: 'customerId',
    as: 'chatSessions'
});
ChatSessionModel.belongsTo(CustomerModel, {
    foreignKey: 'customerId',
    as: 'customer'
});
// Chat message associations
ChatSessionModel.hasMany(ChatMessageModel, {
    foreignKey: 'sessionId',
    as: 'messages'
});
ChatMessageModel.belongsTo(ChatSessionModel, {
    foreignKey: 'sessionId',
    as: 'session'
});
UserModel.hasMany(ChatMessageModel, {
    foreignKey: 'userId',
    as: 'messages'
});
ChatMessageModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});
// Comparison report associations
UserModel.hasMany(ComparisonReportModel, {
    foreignKey: 'userId',
    as: 'comparisonReports'
});
ComparisonReportModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user'
});
// Initialize database
const initDatabase = async () => {
    try {
        await exports.sequelize.authenticate();
        console.log('✅ Database connection established successfully.');
        // For PostgreSQL: Use alter: true to update existing tables safely
        await exports.sequelize.sync({ alter: true });
        console.log('✅ Database tables created successfully.');
    }
    catch (error) {
        console.error('❌ Unable to connect to database:', error);
        process.exit(1);
    }
};
exports.initDatabase = initDatabase;
//# sourceMappingURL=index.js.map