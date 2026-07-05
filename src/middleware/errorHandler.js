const { AppError } = require('../services/transactionService');

const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'الحقل';
    return res.status(409).json({
      success: false,
      message: `توجد قيمة مكررة في ${field}`,
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(422).json({
      success: false,
      message: err.message,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `قيمة غير صحيحة في ${err.path}: ${err.value}`,
    });
  }

  console.error('[Unhandled Error]', err);
  return res.status(500).json({
    success: false,
    message: 'حدث خطأ داخلي في الخادم',
  });
};

module.exports = errorHandler;
