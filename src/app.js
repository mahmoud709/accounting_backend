const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const custodyRoutes = require('./routes/custodyRoutes');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const checkRoutes = require('./routes/checkRoutes');
const alertRoutes = require('./routes/alertRoutes');
const projectRoutes = require('./routes/projectRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'واجهة برمجة تطبيقات أوميجا للحسابات تعمل بنجاح',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/custodies', custodyRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/checks', checkRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/projects', projectRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'المسار غير موجود' });
});

app.use(errorHandler);

module.exports = app;
