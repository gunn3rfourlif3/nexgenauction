const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      // Password is not required for OAuth users
      return !this.googleId && !this.facebookId && !this.githubId;
    },
    minlength: [6, 'Password must be at least 6 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s-()]+$/, 'Please enter a valid phone number']
  },
  dateOfBirth: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value < new Date();
      },
      message: 'Date of birth must be in the past'
    }
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  profileImage: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'super'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationTokenExpire: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // OAuth provider IDs
  googleId: {
    type: String,
    sparse: true
  },
  facebookId: {
    type: String,
    sparse: true
  },
  githubId: {
    type: String,
    sparse: true
  },
  // Account management fields
  accountBalance: {
    type: Number,
    default: 0,
    min: [0, 'Account balance cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']
  },
  // Transaction history will be stored in a separate collection
  // but we'll keep a reference to the last transaction for quick access
  lastTransactionDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Skip password hashing for OAuth users or if password is not modified
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Generate verification token
userSchema.methods.generateVerificationToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.verificationToken = token;
  this.verificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const token = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = token;
  this.resetPasswordExpire = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  return token;
};

// Check if verification token is valid
userSchema.methods.isVerificationTokenValid = function() {
  return this.verificationToken && this.verificationTokenExpire > new Date();
};

// Check if password reset token is valid
userSchema.methods.isPasswordResetTokenValid = function() {
  return this.resetPasswordToken && this.resetPasswordExpire > new Date();
};

// Get full name virtual
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.verificationToken;
    delete ret.verificationTokenExpire;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);