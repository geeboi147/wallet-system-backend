// app.js

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/wallet', require('./routes/wallet')); // Wallet routes

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB connected successfully'))
    .catch((err) => {
        console.error('Error connecting to MongoDB:', err.message);
        process.exit(1); // Exit if the database connection fails
    });

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Gracefully shutting down...');
    try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    } catch (err) {
        console.error('Error during shutdown:', err.message);
        process.exit(1);
    }
});

// 404 Error handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({ message: 'Route not found' });
});

// General Error Handler
app.use((err, req, res, next) => {
    console.error('An error occurred:', err.message);
    res.status(500).json({ message: 'Internal server error' });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
