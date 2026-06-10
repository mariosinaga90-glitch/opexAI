import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';

import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map(o => o.trim()),
  credentials: true,
}));
app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static(path.resolve('data/uploads')));

// Serve frontend static files in production
const frontendDistPath = path.resolve('../frontend/dist');
app.use(express.static(frontendDistPath));

// Debug endpoint to check uploads
app.get('/api/debug/uploads', (req, res) => {
  try {
    const uploadPath = path.resolve('data/uploads');
    if (!fs.existsSync(uploadPath)) {
      return res.json({ error: 'Directory does not exist', path: uploadPath });
    }
    const files = fs.readdirSync(uploadPath);
    const fileStats = files.map(file => {
      const stats = fs.statSync(path.join(uploadPath, file));
      return { file, size: stats.size, time: stats.mtime };
    });
    res.json({ path: uploadPath, count: files.length, files: fileStats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Routes
app.use('/api', apiRoutes);

// Catch-all route to serve the React app (for client-side routing)
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Backend server running on http://${HOST}:${PORT}`);
});
