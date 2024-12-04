const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Username is required'],
      minlength: [3, 'Username must be at least 3 characters long'],
      maxlength: [50, 'Username must not exceed 50 characters'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    profilePicture: {
      data: Buffer, // Binary data for the image
      contentType: String, // MIME type (e.g., image/jpeg, image/png)
    },
    isVerified: {
      type: Boolean,
      default: false, // Default to false for email verification or other checks
    },
  },
  { timestamps: true } // Automatically add createdAt and updatedAt timestamps
);

// Pre-save hook to hash the password before saving the user
UserSchema.pre('save', async function (next) {
  // If the password field is not modified, skip hashing
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10); // Generate salt for password hashing
    this.password = await bcrypt.hash(this.password, salt); // Hash the password
    next();
  } catch (error) {
    console.error('Error during password hashing:', error.message);
    next(error); // Pass error to the next middleware
  }
});

// Instance method to compare a candidate password with the stored hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword.trim(), this.password);
  } catch (error) {
    console.error('Error during password comparison:', error.message);
    throw new Error('Password comparison failed');
  }
};

// Create and export the User model
module.exports = mongoose.model('User', UserSchema);
