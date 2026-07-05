const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const validate = require('../middleware/validate');

const loginSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب ألا تقل عن 6 أحرف'),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'اسم المستخدم يجب ألا يقل عن حرفين').max(100, 'اسم المستخدم لا يجب أن يتجاوز 100 حرف'),
  email: z.string().trim().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب ألا تقل عن 8 أحرف'),
  role: z.enum(['Admin', 'Accountant', 'Engineer', 'Viewer']).optional().default('Accountant'),
});

const signToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('إعداد JWT_SECRET غير موجود');
  return jwt.sign({ id: userId }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'بيانات الدخول غير صحيحة' });
    }

    const token = signToken(user._id);

    await AuditLog.create({
      entityType: 'User',
      entityId: user._id,
      action: 'LOGIN',
      performedBy: user._id,
      snapshot: { code: user.code, email: user.email, role: user.role },
    });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user._id, code: user.code, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/register
 * Restricted to Admin users for creating new system accounts.
 */
const register = async (req, res, next) => {
  try {
    const user = await User.create(req.body);

    res.status(201).json({
      success: true,
      data: { id: user._id, code: user.code, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  register,
  validateLogin: validate(loginSchema),
  validateRegister: validate(registerSchema),
};
