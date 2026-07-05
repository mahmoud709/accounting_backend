const mongoose = require('mongoose');

/**
 * Atomic counter used by codeGenerator to produce sequential entity codes.
 * One document per entityType (e.g. { entityType: "Contractor", seq: 42 }).
 */
const counterSchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: false }
);

module.exports = mongoose.model('Counter', counterSchema);
