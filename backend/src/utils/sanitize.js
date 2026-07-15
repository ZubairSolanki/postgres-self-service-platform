function sanitizeIdentifier(name) {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9_]{2,30}$/.test(name)) {
    throw new Error('Invalid identifier: use lowercase letters, numbers, underscores, 3-31 chars, must start with a letter');
  }
  return name;
}

module.exports = { sanitizeIdentifier };