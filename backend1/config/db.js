const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 5,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            tlsAllowInvalidCertificates: true,
            heartbeatFrequencyMS: 10000,
            autoIndex: false,
            bufferCommands: false,
        });

        mongoose.connection.on('connected', () => {
            // MongoDB connected successfully
            // Connection Host: mongoose.connection.host
        });

        mongoose.connection.on('error', (err) => {
            // MongoDB connection error
            // if (err.name === 'MongooseServerSelectionError') {
            //     Please check your network connection and MongoDB Atlas status
            // }
        });

        mongoose.connection.on('disconnected', () => {
            // MongoDB disconnected
        });

        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                // MongoDB connection closed through app termination
                process.exit(0);
            } catch (err) {
                // Error closing MongoDB connection
                process.exit(1);
            }
        });

        return conn;
    } catch (error) {
        // MongoDB connection error
        process.exit(1);
    }
};

module.exports = connectDB; 