import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ENV } from './config.js';
import { closeDatabase, initDatabase } from './db/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { configRouter } from './routes/config.js';
import { spinRouter } from './routes/spin.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'", ...ENV.CORS_ORIGIN],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (ENV.CORS_ORIGIN.includes(origin) || ENV.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Trust proxy for accurate IP determination behind reverse proxy / load balancer
app.set('trust proxy', 1);

// Mount API routes
app.use('/api', configRouter);
app.use('/api', spinRouter);
app.use('/api', adminRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend static build if available
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (_req, res, next) => {
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      next();
    }
  });
});

// Central typed error handler
app.use(errorHandler);

// Start listening immediately if not running in serverless environment
if (!process.env['VERCEL'] && process.env['NODE_ENV'] !== 'test') {
  const server = app.listen(ENV.PORT, () => {
    console.log(`🚀 Spin the Wheel server running at http://localhost:${ENV.PORT}`);
    console.log(`📊 Admin dashboard available at http://localhost:${ENV.PORT}#admin`);
    console.log(`⚙️  Environment: ${ENV.NODE_ENV}, Spin Limit: ${ENV.SPIN_LIMIT}`);
  });

  initDatabase()
    .then(() => {
      console.log(`🍃 Connected to MongoDB Atlas (${ENV.DATABASE_NAME})`);
    })
    .catch((err) => {
      console.warn('⚠️ MongoDB Atlas initialization note:', err instanceof Error ? err.message : err);
    });

  const shutdown = async () => {
    console.log('Shutting down server gracefully...');
    await closeDatabase();
    server.close(() => {
      console.log('Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export { app };
