const mongoose = require('mongoose');

const checkSchema = new mongoose.Schema(
  {
    checkNumber: {
      type: String,
      required: [true, 'رقم الشيك مطلوب'],
      trim: true,
    },
    bankName: {
      type: String,
      required: [true, 'اسم البنك المسحوب عليه الشيك مطلوب'],
      trim: true,
    },
    amount: {
      type: String,
      required: [true, 'مبلغ الشيك مطلوب'],
    },
    type: {
      type: String,
      enum: ['Receivable', 'Payable'], // Receivable = أوراق قبض (لنا), Payable = أوراق دفع (علينا)
      required: [true, 'نوع الشيك مطلوب'],
    },
    dueDate: {
      type: Date,
      required: [true, 'تاريخ الاستحقاق مطلوب'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Cleared', 'Bounced'],
      default: 'Pending',
    },
    contact: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Contact',
      default: null,
    },
    contactNameFallback: { // Just in case they enter a string without linking
      type: String,
      trim: true,
      default: '',
    },
    linkedAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'الحساب البنكي المرتبط مطلوب'],
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    linkedTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending checks with the same number from the same bank
checkSchema.index(
  { checkNumber: 1, bankName: 1, type: 1 },
  { unique: true, partialFilterExpression: { status: 'Pending' } }
);

const Check = mongoose.model('Check', checkSchema);

module.exports = Check;
