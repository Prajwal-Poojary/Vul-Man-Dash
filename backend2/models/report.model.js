import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  content: String,
  password: String,
  createdTime: { type: Date, default: Date.now }
});

export default mongoose.model('Report', reportSchema);
