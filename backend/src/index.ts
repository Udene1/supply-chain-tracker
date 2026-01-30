import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import batchRoutes from './routes/batch';
import iotRoutes from './routes/iot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/batch', batchRoutes);
app.use('/api/iot', iotRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

export default app;
