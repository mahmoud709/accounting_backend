const Account = require('../models/Account');
const AuditLog = require('../models/AuditLog');
const { format } = require('../utils/money');
const { AppError } = require('../services/transactionService');

/**
 * POST /api/accounts
 * Creates a new ledger entity with an auto-generated code.
 */
const createAccount = async (req, res, next) => {
  try {
    const account = await Account.create({
      ...req.body,
      currentBalance: format(req.body.currentBalance || '0'),
    });

    await AuditLog.create({
      entityType: 'Account',
      entityId: account._id,
      action: 'CREATE',
      performedBy: req.user._id,
      snapshot: account.toObject(),
    });

    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/accounts/lookup/:code
 * Fast code-based lookup for frontend autocomplete (e.g. typing "CON-00" â†’ full name).
 */
const lookupByCode = async (req, res, next) => {
  try {
    const account = await Account.findOne({
      code: req.params.code,
      isActive: true,
    }).select('code name type companyName contactDetails currentBalance allowOverdraft');

    if (!account) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على الحساب' });
    }

    res.json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/accounts
 * Paginated list with optional type filter and text search.
 */
const listAccounts = async (req, res, next) => {
  try {
    const { type, search, page, limit } = req.query;
    const filter = { isActive: true };

    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { companyName: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [accounts, total] = await Promise.all([
      Account.find(filter).sort({ code: 1 }).skip(skip).limit(limit),
      Account.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: accounts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { createAccount, lookupByCode, listAccounts };
