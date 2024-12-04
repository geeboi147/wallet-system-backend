require('dotenv').config();
const express = require('express');
const Wallet = require('../models/Wallet');
const Transaction = require('../models/Transaction');
const verifyToken = require('../middleware/authMiddleware');
const axios = require('axios');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const FLW_SECRET_KEY = process.env.FLWSECK_TEST;
const FLW_WEBHOOK_SECRET = process.env.FLW_WEBHOOK_SECRET;
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

// Rate limiting for webhook
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per minute
  message: 'Too many requests, please try again later',
});

// Route: Get user's wallet details
router.get('/me', verifyToken, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
    res.status(200).json({ balance: wallet.balance });
  } catch (err) {
    console.error('Error fetching wallet details:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route: Initiate deposit
router.post(
  '/deposit',
  verifyToken,
  [
    body('amount').isNumeric().withMessage('Amount must be a number').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('currency').optional().isAlpha().withMessage('Currency should be a valid string'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, currency } = req.body;

    try {
      const tx_ref = `tx_${Date.now()}`;
      const response = await axios.post(
        `${FLW_BASE_URL}/payments`,
        {
          tx_ref,
          amount,
          currency: currency || 'NGN',
          redirect_url: process.env.REDIRECT_URL,
          customer: {
            email: req.email,
          },
        },
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        }
      );

      console.log('Payment initiated:', response.data);
      res.status(200).json({
        message: 'Payment initiated. Complete the payment in the provided URL.',
        data: response.data,
        tx_ref,
      });
    } catch (err) {
      console.error('Error initiating payment:', err);
      res.status(500).json({ message: 'Error initiating payment', error: err.message });
    }
  }
);

// Route: Handle deposit webhook
router.post('/webhook', webhookLimiter, async (req, res) => {
  console.log('Webhook request body:', req.body);
  console.log('Webhook headers:', req.headers);

  const signature = req.headers['verif-hash'];
  if (!signature || signature !== FLW_WEBHOOK_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { status, tx_ref, amount, customer } = req.body;

  if (status === 'successful') {
    try {
      const wallet = await Wallet.findOne({ userId: customer.userId });
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }

      // Check if the transaction already exists to prevent duplicates
      const existingTransaction = await Transaction.findOne({ tx_ref });
      if (existingTransaction) {
        return res.status(200).json({ message: 'Transaction already processed' });
      }

      wallet.balance += amount;
      await wallet.save();

      const transaction = new Transaction({
        userId: customer.userId,
        type: 'deposit',
        amount,
        tx_ref,
        status: 'successful',
      });
      await transaction.save();

      res.status(200).json({ message: 'Wallet funded successfully' });
    } catch (err) {
      console.error('Error processing webhook:', err);
      res.status(500).json({ message: 'Error updating wallet', error: err.message });
    }
  } else {
    res.status(400).json({ message: 'Payment not successful' });
  }
});

// Route: Verify payment
router.post('/verify', verifyToken, async (req, res) => {
  const { tx_ref } = req.body;

  if (!tx_ref) {
    return res.status(400).json({ message: 'Transaction reference (tx_ref) is required.' });
  }

  try {
    const response = await axios.get(`${FLW_BASE_URL}/transactions/verify_by_reference`, {
      params: { tx_ref },
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
    });

    console.log('Verify response:', response.data);

    const { status, data } = response.data;
    if (status !== 'success' || data.status !== 'successful') {
      return res.status(400).json({ message: 'Payment verification failed or payment was not successful.' });
    }

    const existingTransaction = await Transaction.findOne({ tx_ref });
    if (existingTransaction) {
      return res.status(200).json({ message: 'Payment already processed.' });
    }

    const wallet = await Wallet.findOne({ userId: req.userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    wallet.balance += data.amount;
    await wallet.save();

    const transaction = new Transaction({
      userId: req.userId,
      type: 'deposit',
      amount: data.amount,
      tx_ref,
      status: 'successful',
    });
    await transaction.save();

    res.status(200).json({ message: 'Payment verified and wallet funded successfully.' });
  } catch (err) {
    console.error('Error verifying payment:', err);
    res.status(500).json({ message: 'Error verifying payment', error: err.message });
  }
});

// Route: Withdraw money from wallet
router.post(
  '/withdraw',
  verifyToken,
  [
    body('amount').isNumeric().withMessage('Amount must be a number').isFloat({ gt: 0 }).withMessage('Amount must be greater than zero'),
    body('account_bank').isString().withMessage('Account bank is required'),
    body('account_number').isString().withMessage('Account number is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, account_bank, account_number } = req.body;

    try {
      const wallet = await Wallet.findOne({ userId: req.userId });
      if (!wallet || wallet.balance < amount) {
        return res.status(400).json({ message: 'Insufficient balance or wallet not found.' });
      }

      const response = await axios.post(
        `${FLW_BASE_URL}/transfers`,
        {
          account_bank,
          account_number,
          amount,
          currency: 'NGN',
          reference: `wd_${Date.now()}`,
        },
        {
          headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` },
        }
      );

      wallet.balance -= amount;
      await wallet.save();

      const transaction = new Transaction({
        userId: req.userId,
        type: 'withdrawal',
        amount,
        tx_ref: `wd_${Date.now()}`,
        status: 'successful',
      });
      await transaction.save();

      res.status(200).json({ message: 'Withdrawal successful', data: response.data });
    } catch (err) {
      console.error('Error processing withdrawal:', err);
      res.status(500).json({ message: 'Error processing withdrawal', error: err.message });
    }
  }
);

module.exports = router;
