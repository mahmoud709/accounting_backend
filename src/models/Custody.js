const mongoose = require('mongoose');
const { generateCode } = require('../utils/codeGenerator');
const { subtract } = require('../utils/money');

const CUSTODY_STATUSES = ['Active', 'Settled', 'Overdue'];

/**
 * Petty cash / custody tracking per engineer.
 * remainingBalance is auto-computed on every save.
 */
const custodySchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    engineerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'مرجع حساب المهندس مطلوب'],
      index: true,
    },
    allocatedAmount: {
      type: String,
      required: [true, 'المبلغ المخصص مطلوب'],
    },
    spentAmount: {
      type: String,
      default: '0.0000',
    },
    remainingBalance: {
      type: String,
      default: '0.0000',
    },
    status: {
      type: String,
      enum: CUSTODY_STATUSES,
      default: 'Active',
      index: true,
    },
    allocatedAt: {
      type: Date,
      default: Date.now,
    },
    settledAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

custodySchema.index({ engineerId: 1, status: 1 });

custodySchema.pre('validate', async function assignCustodyCode() {
  if (this.code) return;
  this.code = await generateCode('Custody');
});

custodySchema.pre('save', function computeRemainingBalance() {
  this.remainingBalance = subtract(this.allocatedAmount, this.spentAmount);
});

const Custody = mongoose.model('Custody', custodySchema);

module.exports = Custody;
module.exports.CUSTODY_STATUSES = CUSTODY_STATUSES;
