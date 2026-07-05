const Check = require('../models/Check');
const Account = require('../models/Account');
const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { postTransaction } = require('../services/transactionService');
const Alert = require('../models/Alert');
const { calculatePredictiveBalance } = require('../utils/cashFlowValidator');

exports.getChecks = catchAsync(async (req, res) => {
  const { type, status } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (status) filter.status = status;

  const checks = await Check.find(filter)
    .populate('contact', 'name type')
    .populate('linkedAccount', 'name')
    .populate('createdBy', 'name')
    .sort({ dueDate: 1, createdAt: -1 });

  res.status(200).json({ status: 'success', data: { checks } });
});

exports.createCheck = catchAsync(async (req, res) => {
  const { checkNumber, bankName, amount, type, dueDate, contactId, contactNameFallback, linkedAccount, description, force } = req.body;

  // Perform cash flow predictive validation ONLY for Payable checks
  let warningMessage = null;
  let deficit = 0;
  
  if (type === 'Payable') {
    const predictiveBalance = await calculatePredictiveBalance(linkedAccount, dueDate);
    const checkAmount = Number(amount);
    
    if (predictiveBalance < checkAmount) {
      deficit = checkAmount - predictiveBalance;
      warningMessage = `تنبيه: رصيد الحساب غير كافٍ في تاريخ الاستحقاق! سيحدث عجز نقدي بقيمة ${deficit}. هل أنت متأكد من رغبتك في إصدار الشيك رغم ذلك؟`;
      
      if (!force) {
        return res.status(409).json({
          status: 'fail',
          isDeficitWarning: true,
          message: warningMessage,
          deficit
        });
      }
    }
  }

  // If we reach here, either there is no deficit, or force === true
  const newCheck = await Check.create({
    checkNumber,
    bankName,
    amount,
    type,
    dueDate,
    contact: contactId || null,
    contactNameFallback: contactNameFallback || '',
    linkedAccount,
    description,
    createdBy: req.user._id,
  });

  const populated = await Check.findById(newCheck._id)
    .populate('contact', 'name type')
    .populate('linkedAccount', 'name')
    .populate('createdBy', 'name');

  // If there was a deficit and user forced it, save the alert
  if (deficit > 0) {
    await Alert.create({
      title: 'تحذير عجز نقدي متوقع',
      message: `رصيد الحساب غير كافٍ لتغطية الشيك رقم ${checkNumber} المستحق في ${new Date(dueDate).toLocaleDateString('ar-EG')}. العجز المتوقع: ${deficit}`,
      type: 'CashFlowDeficit',
      relatedCheck: newCheck._id,
      account: linkedAccount,
    });
  }

  res.status(201).json({ status: 'success', data: { check: populated, warning: deficit > 0 ? 'تم حفظ الشيك مع تسجيل تنبيه العجز.' : null } });
});

exports.clearCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findById(req.params.id);
  if (!check) return next(new AppError('الشيك غير موجود', 404));
  if (check.status !== 'Pending') return next(new AppError('لا يمكن تحصيل إلا الشيكات المعلقة', 400));

  // Create real transaction
  const transactionData = {
    amount: check.amount,
    paymentMethod: 'Check',
    paymentDetails: {
      checkNumber: check.checkNumber,
      bankName: check.bankName,
      dueDate: check.dueDate,
    },
    description: check.description || `تحصيل شيك رقم ${check.checkNumber}`,
    contactId: check.contact,
  };

  if (check.type === 'Receivable') {
    // We are receiving money (Deposit)
    transactionData.transactionType = 'Deposit';
    transactionData.destinationAccount = check.linkedAccount;
  } else {
    // We are paying money (Withdrawal)
    transactionData.transactionType = 'Withdrawal';
    transactionData.sourceAccount = check.linkedAccount;
    transactionData.allowOverdraft = true; // allow overdraft for checks to avoid blocking if balance is low
  }

  // Use the existing transaction service to securely post the transaction
  const transaction = await postTransaction(transactionData, req.user._id);

  // Update check status
  check.status = 'Cleared';
  check.linkedTransaction = transaction._id;
  await check.save();

  const populated = await Check.findById(check._id)
    .populate('contact', 'name type')
    .populate('linkedAccount', 'name');

  res.status(200).json({ status: 'success', data: { check: populated, transaction } });
});

exports.bounceCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findById(req.params.id);
  if (!check) return next(new AppError('الشيك غير موجود', 404));
  if (check.status !== 'Pending') return next(new AppError('لا يمكن رفض إلا الشيكات المعلقة', 400));

  check.status = 'Bounced';
  await check.save();

  res.status(200).json({ status: 'success', data: { check } });
});

exports.deleteCheck = catchAsync(async (req, res, next) => {
  const check = await Check.findById(req.params.id);
  if (!check) return next(new AppError('الشيك غير موجود', 404));
  if (check.status !== 'Pending') return next(new AppError('لا يمكن حذف الشيك لأنه تم تحصيله أو رفضه', 400));

  await check.deleteOne();
  res.status(204).json({ status: 'success', data: null });
});
