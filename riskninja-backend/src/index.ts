import express from 'express';
import cors from 'cors'; // Re-enable cors
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { initDatabase } from './models';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import documentsRoutes from './routes/documents';
import researchRoutes from './routes/research';
import adminRoutes from './routes/admin';
import sysadminRoutes from './routes/sysadmin';
import systemAdminRoutes from './routes/systemAdmin';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust the first proxy to properly handle X-Forwarded-* headers (needed for rate-limit)
app.set('trust proxy', 1);

// VERY FIRST: Log all incoming requests before any other middleware
app.use((req, res, next) => {
  console.log(`[RAW ENTRY] ${req.method} ${req.url} Origin: ${req.headers.origin} Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// CORS origins allowed to make requests
const allowedOrigins = [
  'http://localhost:3000',
  'http://10.185.1.128:3000',
  // Allow same-host origin for direct backend UI calls
  'http://10.185.1.128:5000',
  'http://riskninja.avery.cloud',
  'https://riskninja.avery.cloud',
  // Add API subdomain for preflight requests
  'https://api.avery.cloud',
  'http://api.avery.cloud'
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    console.log(`[CORS] Checking origin: ${origin || 'undefined'}, Allowed origins: ${allowedOrigins.join(', ')}`);
    // Temporarily allow all origins for debugging
    if (true) { // Allow all for now
      console.log(`[CORS] ✅ Origin ${origin || 'undefined'} allowed (debug mode)`);
      callback(null, true);
    } else if (!origin || (origin && allowedOrigins.indexOf(origin) !== -1)) {
      console.log(`[CORS] ✅ Origin ${origin || 'undefined'} allowed`);
      callback(null, true);
    } else {
      console.error(`❌ CORS Error: Origin ${origin} not allowed by custom check.`);
      console.error(`❌ Available origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS due to custom origin check'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  optionsSuccessStatus: 204, // Standard for preflight
};

// Apply main CORS policy to all routes
app.use(cors(corsOptions));

// Explicitly handle preflight requests for ALL routes using the same corsOptions
// This is good practice, though app.use(cors(corsOptions)) should handle most cases.
app.options('*', cors(corsOptions));


// Security middleware (after CORS)
app.use(helmet({
  crossOriginEmbedderPolicy: false, 
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, 
  crossOriginResourcePolicy: { policy: "cross-origin" }, 
  contentSecurityPolicy: false, // Temporarily disable CSP to troubleshoot
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => req.method === 'OPTIONS',
});
// app.use(limiter); // Temporarily disabled for troubleshooting

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.use('/auth', authRoutes);
app.use('/chat', chatRoutes);
app.use('/documents', documentsRoutes);
app.use('/research', researchRoutes);
app.use('/admin', adminRoutes);
app.use('/sysadmin', sysadminRoutes);
app.use('/system-admin', systemAdminRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', err.message, err.stack);
  if (err.message && err.message.includes('Not allowed by CORS')) {
    res.status(403).json({ error: 'CORS: Request from this origin is not allowed.' });
  } else {
    res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    });
  }
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const startServer = async () => {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      console.log(`🚀 RiskNinja Backend running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();