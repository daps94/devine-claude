const chalk = {
  green: (str) => str,
  yellow: (str) => str,
  red: (str) => str,
  blue: (str) => str,
  gray: (str) => str,
  bold: (str) => str,
  cyan: (str) => str,
};

// Support both default export and named properties
module.exports = chalk;
module.exports.default = chalk;