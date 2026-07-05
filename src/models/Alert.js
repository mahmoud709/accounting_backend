const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['CashFlowDeficit'], required: true },
    message: { type: String, required: true },
    relatedCheck: { type: mongoose.Schema.Types.ObjectId, ref: 'Check', required: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    createdAt: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Alert', alertSchema);
