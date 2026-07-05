const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'تسجيل الدخول مطلوب' });
    }

    const token = header.split(' ')[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({ success: false, message: 'إعداد JWT_SECRET غير موجود' });
    }

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'المستخدم غير صحيح أو غير نشط' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'رمز الدخول غير صحيح أو منتهي الصلاحية' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'ليست لديك صلاحية كافية لتنفيذ هذا الإجراء' });
  }
  next();
};

module.exports = { authenticate, authorize };
