const express = require('express');
const { authenticate } = require('../middleware/auth');
const alertController = require('../controllers/alertController');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(alertController.getAlerts);

router.patch('/:id/resolve', alertController.resolveAlert);

module.exports = router;
