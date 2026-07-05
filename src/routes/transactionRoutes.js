const express = require('express');
const {
  createTransaction,
  createInterestGain,
  createContraEntry,
  getTransactionByCode,
  listTransactions,
  listTreasuryMovements,
  exportTransactions,
} = require('../controllers/transactionController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createTransactionSchema,
  createInterestGainSchema,
  createContraEntrySchema,
} = require('../validations/transactionValidation');

const router = express.Router();

router.use(authenticate);

router.post(
  '/',
  authorize('Admin', 'Accountant'),
  validate(createTransactionSchema),
  createTransaction
);

router.post(
  '/interest-gain',
  authorize('Admin', 'Accountant'),
  validate(createInterestGainSchema),
  createInterestGain
);

router.post(
  '/contra',
  authorize('Admin', 'Accountant'),
  validate(createContraEntrySchema),
  createContraEntry
);

router.get('/treasury', listTreasuryMovements);
router.get('/export', exportTransactions);
router.get('/lookup/:code', getTransactionByCode);
router.get('/', listTransactions);

module.exports = router;
