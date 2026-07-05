const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الجهة مطلوب'],
      trim: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['Client', 'Supplier', 'Contractor', 'Employee', 'Other'],
      default: 'Other',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    // We will dynamically calculate their balance based on transactions linked to them,
    // so we don't strictly need a balance field here unless we want to cache it.
  },
  {
    timestamps: true,
  }
);

const Contact = mongoose.model('Contact', contactSchema);
module.exports = Contact;
