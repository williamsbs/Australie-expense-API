import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  await client.connect();
  const db = client.db('expense-tracker');
  cachedDb = db;
  return db;
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('categories');

    switch (req.method) {
      case 'GET':
        // Récupérer les catégories
        const categories = await collection.findOne({ type: 'categories' });
        return res.status(200).json({ 
          success: true, 
          data: categories ? categories.data : {} 
        });

      case 'POST':
        // Sauvegarder les catégories
        const { categories: newCategories } = req.body;
        
        if (!newCategories) {
          return res.status(400).json({ success: false, error: 'Invalid data format' });
        }

        await collection.updateOne(
          { type: 'categories' },
          { $set: { type: 'categories', data: newCategories } },
          { upsert: true }
        );

        return res.status(200).json({ success: true, message: 'Categories saved successfully' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}