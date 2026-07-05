const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const Custody = require('../models/Custody');
const AuditLog = require('../models/AuditLog');
const { generateCode } = require('../utils/codeGenerator');
const { add, subtract, format, isPositive, isLessThan } = require('../utils/money');

const ASSET_TYPES = new Set(['Vault', 'Bank']);

/**
 * Operational error with an HTTP status code.
 * Caught by the global error handler and returned as a JSON response.
 */
class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

const writeAuditLog = async (payload, session) => {
  await AuditLog.create([payload], { session });
};

/**
 * Loads an active account by ID within a session.
 * Throws 404 if the account does not exist or is deactivated.
 */
const loadAccount = async (accountId, session) => {
  const account = await Account.findById(accountId).session(session);
  if (!account || !account.isActive) {
    throw new AppError('الحساب غير موجود أو غير نشط', 404);
  }
  return account;
};

/**
 * Prevents Vault/Bank accounts from going below zero
 * unless the account or the request explicitly allows overdraft.
 */
const assertSufficientFunds = (account, amount, allowOverdraft) => {
  if (!ASSET_TYPES.has(account.type)) return;

  const projectedBalance = subtract(account.currentBalance, amount);
  if (isLessThan(projectedBalance, '0') && !account.allowOverdraft && !allowOverdraft) {
    throw new AppError(
      `الرصيد غير كاف في الحساب ${account.code} (${account.name}). الرصيد الحالي: ${account.currentBalance}`,
      409
    );
  }
};

/**
 * Ensures a check number has not already been deposited.
 * Relies on both application-level check and a partial unique DB index.
 */
const assertCheckUniqueness = async (paymentMethod, paymentDetails, session) => {
  if (paymentMethod !== 'Check') return;

  const checkNumber = paymentDetails?.checkNumber?.trim();
  if (!checkNumber) return;

  const existing = await Transaction.findOne({
    paymentMethod: 'Check',
    'paymentDetails.checkNumber': checkNumber,
    status: 'Posted',
  }).session(session);

  if (existing) {
    throw new AppError(`رقم الشيك ${checkNumber} تم إيداعه من قبل`, 409);
  }
};

/**
 * Syncs petty-cash custody balances when an Engineer account is involved.
 * - Vault/Bank â†’ Engineer: increases allocatedAmount (funding)
 * - Engineer â†’ any: increases spentAmount (expense)
 */
const updateCustodyForTransaction = async (source, destination, amount, session) => {
  if (destination.type === 'Engineer' && source && ASSET_TYPES.has(source.type)) {
    const custody = await Custody.findOne({
      engineerId: destination._id,
      status: 'Active',
    }).session(session);

    if (!custody) return null;

    custody.allocatedAmount = add(custody.allocatedAmount, amount);
    custody.remainingBalance = subtract(custody.allocatedAmount, custody.spentAmount);
    await custody.save({ session });
    return custody;
  }

  if (source?.type === 'Engineer') {
    const custody = await Custody.findOne({
      engineerId: source._id,
      status: 'Active',
    }).session(session);

    if (!custody) return null;

    custody.spentAmount = add(custody.spentAmount, amount);
    custody.remainingBalance = subtract(custody.allocatedAmount, custody.spentAmount);

    if (isLessThan(custody.remainingBalance, '0')) {
      custody.status = 'Overdue';
    }

    await custody.save({ session });
    return custody;
  }

  return null;
};

/**
 * Core atomic transaction poster.
 * Uses a Mongoose ACID session to debit the source, credit the destination,
 * create an immutable ledger record, and write an audit log â€” all or nothing.
 *
 * @param {object} data - Validated transaction payload
 * @param {string} userId - MongoDB ObjectId of the posting user
 * @returns {Promise<import('../models/Transaction')>}
 */
const postTransaction = async (data, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      date,
      sourceAccount: sourceAccountId,
      destinationAccount: destinationAccountId,
      amount,
      paymentMethod,
      paymentDetails,
      transactionType,
      description,
      contactId,
      allowOverdraft = false,
    } = data;

    if (!isPositive(amount)) {
      throw new AppError('مبلغ القيد يجب أن يكون أكبر من صفر', 422);
    }

    const normalizedAmount = format(amount);
    // ── Interest Gain & Deposit: credit destination only, no source debit ──
    if (transactionType === 'Interest_Gain' || transactionType === 'Deposit') {
      const destination = await loadAccount(destinationAccountId, session);
      const balanceBeforeDest = destination.currentBalance;
      destination.currentBalance = add(destination.currentBalance, normalizedAmount);
      await destination.save({ session });

      const transactionId = await generateCode('Transaction', session);
      const [transaction] = await Transaction.create(
        [
          {
            transactionId,
            date: date || new Date(),
            sourceAccount: null,
            destinationAccount: destination._id,
            amount: normalizedAmount,
            paymentMethod,
            paymentDetails: paymentDetails || {},
            transactionType,
            description,
            contact: contactId || null,
            postedBy: userId,
            balanceBeforeDest,
            balanceAfterDest: destination.currentBalance,
          },
        ],
        { session }
      );

      await writeAuditLog(
        {
          entityType: 'Transaction',
          entityId: transaction._id,
          action: 'POST',
          performedBy: userId,
          snapshot: transaction.toObject(),
          metadata: { type: transactionType },
        },
        session
      );

      await session.commitTransaction();
      return transaction;
    }

    // ── Withdrawal: debit source only, no destination credit ──
    if (transactionType === 'Withdrawal') {
      const source = await loadAccount(sourceAccountId, session);
      assertSufficientFunds(source, normalizedAmount, allowOverdraft);
      
      const balanceBeforeSource = source.currentBalance;
      source.currentBalance = subtract(source.currentBalance, normalizedAmount);
      await source.save({ session });

      const transactionId = await generateCode('Transaction', session);
      const [transaction] = await Transaction.create(
        [
          {
            transactionId,
            date: date || new Date(),
            sourceAccount: source._id,
            destinationAccount: null,
            amount: normalizedAmount,
            paymentMethod,
            paymentDetails: paymentDetails || {},
            transactionType,
            description,
            contact: contactId || null,
            postedBy: userId,
            balanceBeforeSource,
            balanceAfterSource: source.currentBalance,
          },
        ],
        { session }
      );

      await writeAuditLog(
        {
          entityType: 'Transaction',
          entityId: transaction._id,
          action: 'POST',
          performedBy: userId,
          snapshot: transaction.toObject(),
          metadata: { type: transactionType },
        },
        session
      );

      await session.commitTransaction();
      return transaction;
    }

    // ── Standard Debit / Credit transfer ──
    const source = await loadAccount(sourceAccountId, session);
    const destination = await loadAccount(destinationAccountId, session);

    await assertCheckUniqueness(paymentMethod, paymentDetails, session);
    assertSufficientFunds(source, normalizedAmount, allowOverdraft);

    const balanceBeforeSource = source.currentBalance;
    const balanceBeforeDest = destination.currentBalance;

    source.currentBalance = subtract(source.currentBalance, normalizedAmount);
    destination.currentBalance = add(destination.currentBalance, normalizedAmount);

    await source.save({ session });
    await destination.save({ session });

    await updateCustodyForTransaction(source, destination, normalizedAmount, session);

    const transactionId = await generateCode('Transaction', session);
    const [transaction] = await Transaction.create(
      [
        {
          transactionId,
          date: date || new Date(),
          sourceAccount: source._id,
          destinationAccount: destination._id,
          amount: normalizedAmount,
          paymentMethod,
          paymentDetails: paymentDetails || {},
          transactionType,
          description,
          contact: contactId || null,
          postedBy: userId,
          balanceBeforeSource,
          balanceAfterSource: source.currentBalance,
          balanceBeforeDest,
          balanceAfterDest: destination.currentBalance,
        },
      ],
      { session }
    );

    await writeAuditLog(
      {
        entityType: 'Transaction',
        entityId: transaction._id,
        action: 'POST',
        performedBy: userId,
        snapshot: transaction.toObject(),
      },
      session
    );

    await session.commitTransaction();
    return transaction;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Posts bank interest (ÙÙˆØ§Ø¦Ø¯ Ø¯Ø§Ø®Ù„Ø©) by crediting a Bank account
 * without debiting any source account.
 *
 * @param {object} data - Validated interest gain payload
 * @param {string} userId - MongoDB ObjectId of the posting user
 * @returns {Promise<import('../models/Transaction')>}
 */
const postInterestGain = async (data, userId) => {
  return postTransaction(
    {
      ...data,
      transactionType: 'Interest_Gain',
      sourceAccount: null,
      paymentMethod: data.paymentMethod || 'Bank_Transfer',
    },
    userId
  );
};

/**
 * Creates a contra-entry that reverses a previously posted transaction.
 * The original record is marked Reversed via updateOne (bypassing immutability hook).
 *
 * @param {object} data - { originalTransactionId, description, date? }
 * @param {string} userId - MongoDB ObjectId of the posting user
 * @returns {Promise<import('../models/Transaction')>}
 */
const postContraEntry = async (data, userId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const original = await Transaction.findOne({
      transactionId: data.originalTransactionId.toUpperCase(),
      status: 'Posted',
    }).session(session);

    if (!original) {
      throw new AppError('لم يتم العثور على القيد الأصلي', 404);
    }

    if (original.isContraEntry) {
      throw new AppError('لا يمكن إنشاء قيد عكسي على قيد عكسي آخر', 422);
    }

    const contraDate = data.date || new Date();

    // â”€â”€ Reversing an Interest_Gain: debit the Bank account only â”€â”€
    if (original.transactionType === 'Interest_Gain') {
      const bank = await loadAccount(original.destinationAccount, session);
      const balanceBeforeDest = bank.currentBalance;
      bank.currentBalance = subtract(bank.currentBalance, original.amount);
      await bank.save({ session });

      const transactionId = await generateCode('Transaction', session);
      const [contra] = await Transaction.create(
        [
          {
            transactionId,
            date: contraDate,
            sourceAccount: null,
            destinationAccount: bank._id,
            amount: original.amount,
            paymentMethod: original.paymentMethod,
            paymentDetails: original.paymentDetails,
            transactionType: 'Debit',
            description: data.description,
            postedBy: userId,
            isContraEntry: true,
            relatedTransaction: original._id,
            balanceBeforeDest,
            balanceAfterDest: bank.currentBalance,
          },
        ],
        { session }
      );

      await Transaction.updateOne(
        { _id: original._id },
        { $set: { status: 'Reversed' } },
        { session }
      );

      await writeAuditLog(
        {
          entityType: 'Transaction',
          entityId: contra._id,
          action: 'REVERSE',
          performedBy: userId,
          snapshot: contra.toObject(),
          metadata: { originalTransactionId: original.transactionId },
        },
        session
      );

      await session.commitTransaction();
      return contra;
    }

    // â”€â”€ Reversing a standard transfer: swap source â†” destination â”€â”€
    const source = await loadAccount(original.destinationAccount, session);
    const destination = await loadAccount(original.sourceAccount, session);

    const balanceBeforeSource = source.currentBalance;
    const balanceBeforeDest = destination.currentBalance;

    source.currentBalance = subtract(source.currentBalance, original.amount);
    destination.currentBalance = add(destination.currentBalance, original.amount);

    await source.save({ session });
    await destination.save({ session });

    const transactionId = await generateCode('Transaction', session);
    const [contra] = await Transaction.create(
      [
        {
          transactionId,
          date: contraDate,
          sourceAccount: source._id,
          destinationAccount: destination._id,
          amount: original.amount,
          paymentMethod: original.paymentMethod,
          paymentDetails: original.paymentDetails,
          transactionType: 'Credit',
          description: data.description,
          postedBy: userId,
          isContraEntry: true,
          relatedTransaction: original._id,
          balanceBeforeSource,
          balanceAfterSource: source.currentBalance,
          balanceBeforeDest,
          balanceAfterDest: destination.currentBalance,
        },
      ],
      { session }
    );

    await Transaction.updateOne(
      { _id: original._id },
      { $set: { status: 'Reversed' } },
      { session }
    );

    await writeAuditLog(
      {
        entityType: 'Transaction',
        entityId: contra._id,
        action: 'REVERSE',
        performedBy: userId,
        snapshot: contra.toObject(),
        metadata: { originalTransactionId: original.transactionId },
      },
      session
    );

    await session.commitTransaction();
    return contra;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  AppError,
  postTransaction,
  postInterestGain,
  postContraEntry,
};
