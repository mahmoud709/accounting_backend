const express = require('express');
const { login, register, validateLogin, validateRegister } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/login', validateLogin, login);
router.post('/register', authenticate, authorize('Admin'), validateRegister, register);

module.exports = router;
