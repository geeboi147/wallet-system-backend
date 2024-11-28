const crypto = require('crypto');  // Import the crypto module

// Generate a random 64-byte secret key
const secret = crypto.randomBytes(64).toString('hex');

// Output the secret key
console.log(secret);
