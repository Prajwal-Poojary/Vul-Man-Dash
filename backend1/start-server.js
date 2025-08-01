const app = require('./index');
const connectDB = require('./config/db');

const startServer = async () => {
  try {
    console.log('Starting Backend1 authentication server...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await connectDB();
    console.log('MongoDB connected successfully');
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`✅ Backend1 (Auth) server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start Backend1 server:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
};

startServer(); 