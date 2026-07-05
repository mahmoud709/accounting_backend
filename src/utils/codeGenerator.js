/**
 * Atomic sequential code generator backed by a MongoDB Counter collection.
 * Generates human-readable identifiers such as CON-0001, TXN-0042, etc.
 */
const Counter = require('../models/Counter');

const PREFIX_MAP = {
  Contractor: 'CON',
  Supplier: 'SUP',
  Engineer: 'ENG',
  Vault: 'VLT',
  Bank: 'BNK',
  Transaction: 'TXN',
  Custody: 'CST',
  Employee: 'EMP',
  Expense: 'EXP',
  Revenue: 'REV',
};

/**
 * Generates the next sequential code for a given entity type.
 * Uses findOneAndUpdate with $inc to guarantee uniqueness under concurrency.
 *
 * @param {string} entityType - One of: Contractor, Supplier, Engineer, Vault, Bank, Transaction
 * @param {import('mongoose').ClientSession} [session] - Optional Mongoose session for ACID ops
 * @returns {Promise<string>} e.g. "CON-0001"
 */
const generateCode = async (entityType, session = null) => {
  const prefix = PREFIX_MAP[entityType];
  if (!prefix) {
    throw new Error(`Unsupported entity type for code generation: ${entityType}`);
  }

  const options = session ? { session } : {};
  const counter = await Counter.findOneAndUpdate(
    { entityType },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true, ...options }
  );

  const padded = String(counter.seq).padStart(4, '0');
  return `${prefix}-${padded}`;
};

module.exports = { generateCode, PREFIX_MAP };
