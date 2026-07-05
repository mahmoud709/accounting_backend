const Alert = require('../models/Alert');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// Get all alerts (optionally filter by resolved status)
exports.getAlerts = catchAsync(async (req, res) => {
  const { resolved } = req.query;
  const filter = {};
  if (resolved !== undefined) filter.resolved = resolved === 'true';
  const alerts = await Alert.find(filter)
    .populate('relatedCheck', 'checkNumber dueDate amount')
    .populate('account', 'name code')
    .sort({ createdAt: -1 });
  res.status(200).json({ status: 'success', data: { alerts } });
});

// Mark an alert as resolved
exports.resolveAlert = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const alert = await Alert.findById(id);
  if (!alert) return next(new AppError('Alert not found', 404));
  if (alert.resolved) return next(new AppError('Alert already resolved', 400));
  alert.resolved = true;
  alert.resolvedAt = new Date();
  await alert.save();
  res.status(200).json({ status: 'success', data: { alert } });
});
