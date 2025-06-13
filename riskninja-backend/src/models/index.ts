import { Sequelize, DataTypes, Model } from 'sequelize';

// Use DATABASE_URL for PostgreSQL connection
const databaseUrl = process.env.DATABASE_URL || 'postgres://riskninja_user:riskninja_password@localhost:5432/riskninja_db';

export const sequelize = new Sequelize(databaseUrl, {
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
export class CompanyModel extends Model {
  public id!: string;
  public name!: string;
  public domain!: string; // The unique domain for the company
  public licenseCount!: number; // Number of purchased licenses
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association properties
  public readonly users?: UserModel[];
}

CompanyModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  domain: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  licenseCount: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
}, {
  sequelize,
  modelName: 'Company',
  tableName: 'companies',
  timestamps: true,
});

// User Model
export class UserModel extends Model {
  public id!: string;
  public email!: string;
  public firstName!: string;
  public lastName!: string;
  public password!: string;
  public status!: 'pending' | 'active' | 'disabled';
  public role!: 'user' | 'admin' | 'system_admin';
  public companyId!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Association properties
  public readonly company?: CompanyModel;
}

UserModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'disabled'),
    allowNull: false,
    defaultValue: 'pending',
  },
  role: {
    type: DataTypes.ENUM('user', 'admin', 'system_admin'),
    allowNull: false,
    defaultValue: 'user',
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true, // system_admin users may not belong to a company
    references: {
      model: CompanyModel,
      key: 'id',
    },
  },
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users',
  timestamps: true,
});

// Chat Message Model
export class ChatMessageModel extends Model {
  public id!: string;
  public userId!: string;
  public sessionId!: string; // Link to chat session
  public content!: string;
  public sender!: 'user' | 'ai';
  public timestamp!: Date;
  public context!: object | null;
}

ChatMessageModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id',
    },
  },
  sessionId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'chat_sessions',
      key: 'id',
    },
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
}, {
  sequelize,
  modelName: 'ChatMessage',
  tableName: 'chat_messages',
  timestamps: false,
});

// Policy Document Model
export class PolicyDocumentModel extends Model {
  public id!: string;
  public userId!: string;
  public customerId!: string | null; // Link to customer
  public name!: string;
  public originalName!: string;
  public size!: number;
  public type!: string;
  public uploadedAt!: Date;
  public status!: 'uploaded' | 'processing' | 'completed' | 'error';
  public extractedText!: string | null;
  public summary!: string | null;
  public keyTerms!: string[] | null;
  public insights!: string[] | null;
  public recommendations!: string[] | null;
  public riskScore!: number | null;
  public policyType!: string | null;
  public fileKey!: string | null; // S3/MinIO storage key
  public fileUrl!: string | null; // Presigned URL for access
}

PolicyDocumentModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id',
    },
    unique: 'user_document_name',
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'customers',
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'user_document_name',
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  size: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  uploadedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  status: {
    type: DataTypes.ENUM('uploaded', 'processing', 'completed', 'error'),
    allowNull: false,
    defaultValue: 'uploaded',
  },
  extractedText: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  keyTerms: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  insights: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  recommendations: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  riskScore: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  policyType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileKey: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },
  fileUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'PolicyDocument',
  tableName: 'policy_documents',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['userId', 'name'], name: 'user_document_name' }
  ]
});

// Document Word Span Model
export class DocumentWordSpanModel extends Model {
  public id!: string;
  public documentId!: string;
  public pageNumber!: number;
  public text!: string;
  public bbox!: object;
  public startOffset!: number;
  public endOffset!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DocumentWordSpanModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: PolicyDocumentModel, key: 'id' },
    onDelete: 'CASCADE',
  },
  pageNumber: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  bbox: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  startOffset: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  endOffset: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'DocumentWordSpan',
  tableName: 'document_word_spans',
  timestamps: true,
});

// Customer Model
export class CustomerModel extends Model {
  public id!: string;
  public userId!: string; // Who owns this customer
  public name!: string;
  public type!: 'customer' | 'prospect';
  public email!: string | null;
  public phone!: string | null;
  public company!: string | null;
  public status!: 'active' | 'inactive' | 'lead';
  public createdAt!: Date;
  public lastContact!: Date | null;
  public readonly updatedAt!: Date;
}

CustomerModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('customer', 'prospect'),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  company: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'lead'),
    allowNull: false,
    defaultValue: 'active',
  },
  lastContact: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Customer',
  tableName: 'customers',
  timestamps: true,
});

// Chat Session Model (to group related messages)
export class ChatSessionModel extends Model {
  public id!: string;
  public userId!: string;
  public customerId!: string | null; // Link to customer
  public title!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ChatSessionModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id',
    },
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: CustomerModel,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'ChatSession',
  tableName: 'chat_sessions',
  timestamps: true,
});

// Comparison Report Model
export class ComparisonReportModel extends Model {
  public id!: string;
  public userId!: string;
  public title!: string;
  public content!: string;
  public documentNames!: string[];
  public documentIds!: string[];
  public primaryPolicyType!: string;
  public additionalFacts!: string | null;
  public createdAt!: Date;
  public readonly updatedAt!: Date;
}

ComparisonReportModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  documentNames: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
  documentIds: {
    type: DataTypes.ARRAY(DataTypes.UUID),
    allowNull: false,
  },
  primaryPolicyType: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  additionalFacts: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'ComparisonReport',
  tableName: 'comparison_reports',
  timestamps: true,
});

// Underwriting Report Model
export class UnderwritingReportModel extends Model {
  public id!: string;
  public userId!: string;
  public customerId!: string;
  public title!: string;
  public content!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

UnderwritingReportModel.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: UserModel,
      key: 'id',
    },
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: CustomerModel,
      key: 'id',
    },
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
}, {
  sequelize,
  modelName: 'UnderwritingReport',
  tableName: 'underwriting_reports',
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

// Underwriting report associations
UserModel.hasMany(UnderwritingReportModel, {
  foreignKey: 'userId',
  as: 'underwritingReports'
});
UnderwritingReportModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});
CustomerModel.hasMany(UnderwritingReportModel, {
  foreignKey: 'customerId',
  as: 'underwritingReports'
});
UnderwritingReportModel.belongsTo(CustomerModel, {
  foreignKey: 'customerId',
  as: 'customer'
});

// After existing associations for PolicyDocumentModel:
PolicyDocumentModel.hasMany(DocumentWordSpanModel, { foreignKey: 'documentId', as: 'wordSpans' });
DocumentWordSpanModel.belongsTo(PolicyDocumentModel, { foreignKey: 'documentId', as: 'document' });

// Initialize database
export const initDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // For PostgreSQL: Use alter: true to update existing tables safely
    await sequelize.sync({ alter: true });
    console.log('✅ Database tables created successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to database:', error);
    process.exit(1);
  }
}; 