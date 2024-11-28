const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Check for Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(' ')[1]; // Extract the token after "Bearer"

  try {
    // Verify the token with the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach the user ID to the request object for downstream use
    req.userId = decoded.userId;

    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message);

    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token. Access denied.' });
    }

    // Generic error handler for other cases
    res.status(500).json({ message: 'Failed to authenticate token.' });
  }
};

module.exports = verifyToken;