const mongoose = require('mongoose');
const { generateCode } = require('../utils/codeGenerator');

const ACCOUNT_TYPES = ['Contractor', 'Supplier', 'Engineer', 'Vault', 'Bank', 'Expense', 'Revenue'];

/**
 * Universal ledger entity representing contractors, suppliers,
 * engineers, vaults (cash safes), and bank accounts.
 */
const accountSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'اسم الحساب مطلوب'],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'نوع الحساب مطلوب'],
      enum: ACCOUNT_TYPES,
      index: true,
    },
    lowBalanceThreshold: {
      type: Number,
      default: 0,
      min: 0,
    },
    project: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    accountNumber: {
      type: String,
      trim: true,
      default: '',
    },
    contactDetails: {
      phone: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      address: { type: String, trim: true, default: '' },
    },
    currentBalance: {
      type: String,
      default: '0.0000',
      required: true,
    },
    allowOverdraft: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

accountSchema.index({ code: 1, isActive: 1 });
accountSchema.index({ type: 1, name: 1 });
accountSchema.index({ name: 'text', companyName: 'text', code: 'text' });

accountSchema.pre('validate', async function assignAccountCode() {
  if (this.code) return;
  this.code = await generateCode(this.type);
});

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
module.exports.ACCOUNT_TYPES = ACCOUNT_TYPES;
