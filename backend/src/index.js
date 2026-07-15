const express = require('express');
const cors = require('cors');
require('dotenv').config();
const authRoutes = require('./routes/auth');
const authMiddleware = require('./middleware/authMiddleware');
const databaseRoutes = require('./routes/databases');
const backupRoutes = require('./routes/backups');

const app = express();
app.use(express.json());
app.use(cors());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/databases', authMiddleware, databaseRoutes);
app.use('/api/backups', authMiddleware, backupRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));