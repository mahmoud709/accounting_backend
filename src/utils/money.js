/**
 * Precision-safe financial math using big.js.
 * All monetary values are handled as strings to prevent
 * JavaScript floating-point rounding errors (0.1 + 0.2 !== 0.3).
 */
const Big = require('big.js');

Big.DP = 4;
Big.RM = Big.roundHalfUp;

const ZERO = new Big(0);

/**
 * Converts any input into a Big.js instance.
 * @param {string|number|null|undefined} value
 * @returns {Big}
 */
const toBig = (value) => {
  if (value === null || value === undefined || value === '') {
    return ZERO;
  }
  return new Big(String(value));
};

/**
 * Formats a monetary value to a 4-decimal-place string.
 * @param {string|number} amount
 * @returns {string} e.g. "150000.0000"
 */
const format = (amount) => toBig(amount).toFixed(4);

/**
 * Adds two monetary values and returns a formatted string.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {string}
 */
const add = (a, b) => format(toBig(a).plus(toBig(b)));

/**
 * Subtracts b from a and returns a formatted string.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {string}
 */
const subtract = (a, b) => format(toBig(a).minus(toBig(b)));

/**
 * Multiplies two monetary values and returns a formatted string.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {string}
 */
const multiply = (a, b) => format(toBig(a).times(toBig(b)));

/**
 * Returns true if a is strictly less than b.
 * @param {string|number} a
 * @param {string|number} b
 * @returns {boolean}
 */
const isLessThan = (a, b) => toBig(a).lt(toBig(b));

/**
 * Returns true if the value is strictly greater than zero.
 * @param {string|number} value
 * @returns {boolean}
 */
const isPositive = (value) => toBig(value).gt(ZERO);

module.exports = {
  add,
  subtract,
  multiply,
  isLessThan,
  format,
  isPositive,
};
