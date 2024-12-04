const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  // Check for the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn('Authorization header missing or improperly formatted'); // Log warning
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  // Extract the token from the Authorization header
  const token = authHeader.split(' ')[1]; // Get the part after "Bearer"

  try {
    // Verify the token with the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach relevant user data to the request object
    req.userId = decoded.userId; // Attach user ID from the token payload
    req.email = decoded.email; // Attach email from the token payload (if present)

    console.log(`Token verified successfully for userId: ${req.userId}`); // Debug log

    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    console.error('Token verification failed:', err.message); // Log error

    // Handle specific JWT errors
    if (err.name === 'TokenExpiredError') {
      console.warn('Token expired'); // Log warning
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    } else if (err.name === 'JsonWebTokenError') {
      console.warn('Invalid token'); // Log warning
      return res.status(401).json({ message: 'Invalid token. Access denied.' });
    }

    // Generic error handler for unexpected cases
    res.status(500).json({ message: 'Failed to authenticate token.' });
  }
};

module.exports = verifyToken;
