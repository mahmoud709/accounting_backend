const express = require('express');
const { authenticate } = require('../middleware/auth');
const checkController = require('../controllers/checkController');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(checkController.getChecks)
  .post(checkController.createCheck);

router.route('/:id')
  .delete(checkController.deleteCheck);

router.patch('/:id/clear', checkController.clearCheck);
router.patch('/:id/bounce', checkController.bounceCheck);

module.exports = router;
