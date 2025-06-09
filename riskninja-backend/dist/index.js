"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors")); // Re-enable cors
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
const models_1 = require("./models");
const auth_1 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const documents_1 = __importDefault(require("./routes/documents"));
const research_1 = __importDefault(require("./routes/research"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Trust the first proxy to properly handle X-Forwarded-* headers (needed for rate-limit)
app.set('trust proxy', 1);
// VERY FIRST: Log all incoming requests before any other middleware
app.use((req, res, next) => {
    console.log(`[RAW ENTRY] ${req.method} ${req.url} Origin: ${req.headers.origin} Headers: ${JSON.stringify(req.headers)}`);
    next();
});
const allowedOrigins = ['http://localhost:3000', 'http://10.185.1.128:3000'];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
            console.error(`❌ CORS Error: Origin ${origin} not allowed by custom check.`);
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
app.use((0, cors_1.default)(corsOptions));
// Explicitly handle preflight requests for ALL routes using the same corsOptions
// This is good practice, though app.use(cors(corsOptions)) should handle most cases.
app.options('*', (0, cors_1.default)(corsOptions));
// Security middleware (after CORS)
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            connectSrc: ["'self'", ...allowedOrigins, 'ws://localhost:3000', 'ws://10.185.1.128:3000', 'http://localhost:5000', 'http://10.185.1.128:5000'], // Added backend IP for connectSrc
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
        },
    },
}));
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    skip: (req) => req.method === 'OPTIONS',
});
app.use(limiter);
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
    });
});
app.use('/api/auth', auth_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/research', research_1.default);
app.use((err, req, res, next) => {
    console.error('Global error:', err.message, err.stack);
    if (err.message && err.message.includes('Not allowed by CORS')) {
        res.status(403).json({ error: 'CORS: Request from this origin is not allowed.' });
    }
    else {
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
        await (0, models_1.initDatabase)();
        app.listen(PORT, () => {
            console.log(`🚀 RiskNinja Backend running on port ${PORT}`);
            console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🔗 Health check: http://localhost:${PORT}/health`);
        });
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map