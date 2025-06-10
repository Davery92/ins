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
}, {
  sequelize,
  modelName: 'PolicyDocument',
  tableName: 'policy_documents',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['userId', 'name'], name: 'user_document_name' }
  ]
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

// Document associations remain the same
UserModel.hasMany(PolicyDocumentModel, {
  foreignKey: 'userId',
  as: 'documents'
});

PolicyDocumentModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

UserModel.hasMany(ChatMessageModel, {
  foreignKey: 'userId',
  as: 'messages'
});

ChatMessageModel.belongsTo(UserModel, {
  foreignKey: 'userId',
  as: 'user'
});

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