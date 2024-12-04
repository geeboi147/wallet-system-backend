const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true, // Ensure one wallet per user
    },
    balance: {
        type: Number,
        default: 0, // Initial balance is zero
    },
    currency: {
        type: String,
        default: 'NGN', // Default currency set to Nigerian Naira
    },
    createdAt: {
        type: Date,
        default: Date.now, // Automatically set creation date
    },
    updatedAt: {
        type: Date,
        default: Date.now, // Automatically update on modifications
    },
}, { timestamps: true }); // Automatically manage `createdAt` and `updatedAt`

module.exports = mongoose.model('Wallet', walletSchema);
