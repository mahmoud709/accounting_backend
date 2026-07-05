const mongoose = require('mongoose');

const PAYMENT_METHODS = ['Cash', 'Bank_Transfer', 'Check'];
const TRANSACTION_TYPES = ['Debit', 'Credit', 'Interest_Gain', 'Deposit', 'Withdrawal', 'Transfer'];
const TRANSACTION_STATUSES = ['Posted', 'Reversed'];

/**
 * Immutable financial ledger entry.
 * Once posted, records cannot be modified â€” only reversed via contra-entries.
 */
const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    sourceAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true,
    },
    destinationAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true,
    },
    amount: {
      type: String,
      required: [true, 'مبلغ القيد مطلوب'],
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: [true, 'طريقة الدفع مطلوبة'],
      index: true,
    },
    paymentDetails: {
      checkNumber: { type: String, trim: true, default: '' },
      bankName: { type: String, trim: true, default: '' },
      transferReference: { type: String, trim: true, default: '' },
      dueDate: { type: Date, default: null },
    },
    transactionType: {
      type: String,
      enum: TRANSACTION_TYPES,
      required: [true, 'نوع القيد مطلوب'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'البيان مطلوب'],
      trim: true,
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
      index: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'مستخدم الترحيل مطلوب'],
      index: true,
    },
    status: {
      type: String,
      enum: TRANSACTION_STATUSES,
      default: 'Posted',
      index: true,
    },
    isContraEntry: {
      type: Boolean,
      default: false,
    },
    relatedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    balanceBeforeSource: { type: String, default: null },
    balanceAfterSource: { type: String, default: null },
    balanceBeforeDest: { type: String, default: null },
    balanceAfterDest: { type: String, default: null },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

transactionSchema.index({ date: -1, transactionId: 1 });
transactionSchema.index({ sourceAccount: 1, date: -1 });
transactionSchema.index({ destinationAccount: 1, date: -1 });

// Prevent duplicate check deposits across the entire ledger
transactionSchema.index(
  { 'paymentDetails.checkNumber': 1, paymentMethod: 1 },
  {
    unique: true,
    partialFilterExpression: {
      paymentMethod: 'Check',
      'paymentDetails.checkNumber': { $type: 'string', $ne: '' },
      status: 'Posted',
    },
  }
);

transactionSchema.pre('save', function preventMutation() {
  if (!this.isNew) {
    throw new Error('القيود المرحلة غير قابلة للتعديل. أنشئ قيدًا عكسيًا للتصحيح.');
  }
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.TRANSACTION_TYPES = TRANSACTION_TYPES;
module.exports.TRANSACTION_STATUSES = TRANSACTION_STATUSES;
