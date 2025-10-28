import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  tls: true,
  tlsAllowInvalidCertificates: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

const client = new MongoClient(uri, options);

let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    await client.connect();
    const db = client.db('expense-tracker');
    cachedDb = db;
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectToDatabase();
    const collection = db.collection('expenses');

    switch (req.method) {
      case 'GET':
        // Récupérer toutes les dépenses
        const expenses = await collection.find({}).toArray();
        return res.status(200).json({ success: true, data: expenses });

      case 'POST':
        // Ajouter ou remplacer toutes les dépenses
        const { expenses: newExpenses } = req.body;
        
        if (!newExpenses || !Array.isArray(newExpenses)) {
          return res.status(400).json({ success: false, error: 'Invalid data format' });
        }

        // Supprimer toutes les dépenses existantes
        await collection.deleteMany({});
        
        // Insérer les nouvelles dépenses
        if (newExpenses.length > 0) {
          await collection.insertMany(newExpenses);
        }

        return res.status(200).json({ success: true, message: 'Expenses saved successfully' });

      case 'PUT':
        // Mettre à jour une dépense spécifique
        const { id, expense } = req.body;
        
        if (!id || !expense) {
          return res.status(400).json({ success: false, error: 'Missing id or expense data' });
        }

        await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: expense }
        );

        return res.status(200).json({ success: true, message: 'Expense updated successfully' });

      case 'DELETE':
        // Supprimer une dépense spécifique
        const { id: deleteId } = req.body;
        
        if (!deleteId) {
          return res.status(400).json({ success: false, error: 'Missing id' });
        }

        await collection.deleteOne({ _id: new ObjectId(deleteId) });

        return res.status(200).json({ success: true, message: 'Expense deleted successfully' });

      default:
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}