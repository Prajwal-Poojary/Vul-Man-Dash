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
            console.log('MongoDB connected successfully');
            console.log('Connection Host:', mongoose.connection.host);
        });

        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
            if (err.name === 'MongooseServerSelectionError') {
                console.error('Please check your network connection and MongoDB Atlas status');
            }
        });

        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
        });

        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                console.log('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (err) {
                console.error('Error closing MongoDB connection:', err);
                process.exit(1);
            }
        });

        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB; 