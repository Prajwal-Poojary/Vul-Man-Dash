const app = require('./index');
const connectDB = require('./config/db');

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Start server
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    // console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 