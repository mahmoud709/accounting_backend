const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generateCode } = require('../utils/codeGenerator');

const userSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'اسم المستخدم مطلوب'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'البريد الإلكتروني مطلوب'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'كلمة المرور مطلوبة'],
      minlength: [8, 'كلمة المرور يجب ألا تقل عن 8 أحرف'],
      select: false,
    },
    role: {
      type: String,
      enum: ['Admin', 'Accountant', 'Engineer', 'Viewer'],
      default: 'Accountant',
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre('validate', async function assignUserCode() {
  if (this.code) return;
  this.code = await generateCode('Employee');
});

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
