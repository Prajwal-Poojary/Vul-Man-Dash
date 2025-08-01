const { MongoClient } = require('mongodb');

// MongoDB connection string from your .env
const uri = "mongodb+srv://eyeq:nLK3332XGYE%26%5E%23FGxytde@eyeq.zkxgchg.mongodb.net/reportdb?retryWrites=true&w=majority&appName=eyeq";

async function clearIndexes() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('reportdb');
    const collection = db.collection('reports');
    
    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes.map(i => i.name));
    
    // Drop all indexes except _id_
    for (const index of indexes) {
      if (index.name !== '_id_') {
        try {
          await collection.dropIndex(index.name);
          console.log(`Dropped index: ${index.name}`);
        } catch (error) {
          console.log(`Could not drop ${index.name}:`, error.message);
        }
      }
    }
    
    console.log('Index cleanup completed');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

clearIndexes();