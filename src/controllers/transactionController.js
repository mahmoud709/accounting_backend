const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const {
  postTransaction,
  postInterestGain,
  postContraEntry,
} = require('../services/transactionService');

/**
 * POST /api/transactions
 * Posts a standard Debit or Credit transfer between two accounts.
 */
const createTransaction = async (req, res, next) => {
  try {
    const transaction = await postTransaction(req.body, req.user._id);

    const populated = await Transaction.findById(transaction._id)
      .populate('sourceAccount', 'code name type currentBalance')
      .populate('destinationAccount', 'code name type currentBalance')
      .populate('contact', 'name type')
      .populate('postedBy', 'code name role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions/interest-gain
 * Credits a Bank account with accrued interest (ÙÙˆØ§Ø¦Ø¯) without a source debit.
 */
const createInterestGain = async (req, res, next) => {
  try {
    const transaction = await postInterestGain(req.body, req.user._id);

    const populated = await Transaction.findById(transaction._id)
      .populate('destinationAccount', 'code name type currentBalance')
      .populate('postedBy', 'code name role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/transactions/contra
 * Reverses a previously posted transaction via a balancing contra-entry.
 */
const createContraEntry = async (req, res, next) => {
  try {
    const transaction = await postContraEntry(req.body, req.user._id);

    const populated = await Transaction.findById(transaction._id)
      .populate('sourceAccount', 'code name type currentBalance')
      .populate('destinationAccount', 'code name type currentBalance')
      .populate('relatedTransaction', 'transactionId amount status')
      .populate('postedBy', 'code name role');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transactions/lookup/:code
 * Retrieves a transaction by its system-generated code (e.g. TXN-0042).
 */
const getTransactionByCode = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.code.toUpperCase(),
    })
      .populate('sourceAccount', 'code name type')
      .populate('destinationAccount', 'code name type')
      .populate('contact', 'name type')
      .populate('postedBy', 'code name role');

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على القيد' });
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/transactions
 * Paginated transaction list, optionally filtered by account ID.
 */
const listTransactions = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 15, 100);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.accountId) {
      filter.$or = [
        { sourceAccount: req.query.accountId },
        { destinationAccount: req.query.accountId },
      ];
    }
    
    if (req.query.contactId) {
      filter.contact = req.query.contactId;
    }

    if (req.query.fromDate || req.query.toDate) {
      filter.date = {};
      if (req.query.fromDate) filter.date.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) {
        const toDate = new Date(req.query.toDate);
        toDate.setHours(23, 59, 59, 999);
        filter.date.$lte = toDate;
      }
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('sourceAccount', 'code name type')
        .populate('destinationAccount', 'code name type')
        .populate('contact', 'name type')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

const listTreasuryMovements = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
    const skip = (page - 1) * limit;

    const treasuryAccountFilter = {
      isActive: true,
      type: { $in: ['Vault', 'Bank'] },
    };

    if (req.query.accountId) treasuryAccountFilter._id = req.query.accountId;

    const treasuryAccounts = await Account.find(treasuryAccountFilter).select('_id');
    const treasuryAccountIds = treasuryAccounts.map((account) => account._id);

    const filter = {
      status: 'Posted',
      $or: [
        { sourceAccount: { $in: treasuryAccountIds } },
        { destinationAccount: { $in: treasuryAccountIds } },
      ],
    };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .populate('sourceAccount', 'code name type currentBalance')
        .populate('destinationAccount', 'code name type currentBalance')
        .populate('contact', 'name type')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
};

  // Export transactions as CSV
  const exportTransactions = async (req, res, next) => {
    try {
      const { accountId, fromDate, toDate } = req.query;
      const filter = {};
      if (accountId) {
        filter.$or = [
          { sourceAccount: accountId },
          { destinationAccount: accountId },
        ];
      }
      if (fromDate || toDate) {
        filter.date = {};
        if (fromDate) filter.date.$gte = new Date(fromDate);
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          filter.date.$lte = end;
        }
      }

      const transactions = await Transaction.find(filter)
        .populate('sourceAccount', 'code name type')
        .populate('destinationAccount', 'code name type')
        .populate('contact', 'name type')
        .lean();

      const { Parser } = require('json2csv');
      const fields = [
        'transactionId',
        'date',
        'description',
        'amount',
        'sourceAccount.code',
        'sourceAccount.name',
        'destinationAccount.code',
        'destinationAccount.name',
        'contact.name',
        'contact.type',
      ];
      const parser = new Parser({ fields });
      const csv = parser.parse(transactions);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${accountId || 'all'}.csv"`);
      res.send('\uFEFF' + csv); // Add BOM for Excel UTF-8 Arabic support
    } catch (err) {
      next(err);
    }
  };

  module.exports = {
    createTransaction,
    createInterestGain,
    createContraEntry,
    getTransactionByCode,
    listTransactions,
    listTreasuryMovements,
    exportTransactions,
  };


