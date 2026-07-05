const express = require('express');
const { listCustodies, settleCustody } = require('../controllers/custodyController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', listCustodies);
router.post('/:id/settle', authorize('Admin', 'Accountant'), settleCustody);

module.exports = router;
