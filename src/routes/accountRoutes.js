const express = require('express');
const {
  createAccount,
  lookupByCode,
  listAccounts,
} = require('../controllers/accountController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createAccountSchema,
  lookupAccountSchema,
  listAccountsSchema,
} = require('../validations/accountValidation');

const router = express.Router();

router.use(authenticate);

router.post('/', authorize('Admin', 'Accountant'), validate(createAccountSchema), createAccount);
router.get('/lookup/:code', validate(lookupAccountSchema, 'params'), lookupByCode);
router.get('/', validate(listAccountsSchema, 'query'), listAccounts);

module.exports = router;
