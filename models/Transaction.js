// models/Transaction.js

const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  tx_ref: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['successful', 'failed', 'pending'],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
