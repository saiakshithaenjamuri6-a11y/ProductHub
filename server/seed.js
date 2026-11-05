const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./config/db');
const Product = require('./models/Product');

const sampleProducts = [
  {
    name: 'Ergonomic Mechanical Keyboard',
    price: 4999,
    category: 'Electronics',
    description: 'Hot-swappable mechanical switches with RGB backlight, wireless Bluetooth 5.2, and premium PBT double-shot keycaps.'
  },
  {
    name: 'Minimalist Canvas Backpack',
    price: 2499,
    category: 'Fashion',
    description: 'Durable water-resistant cotton canvas backpack with a 15-inch padded laptop compartment and brass hardware.'
  },
  {
    name: 'Ceramic Pour-Over Coffee Dripper',
    price: 1299,
    category: 'Home Decor',
    description: 'Artisan handcrafted ceramic coffee dripper designed for optimal water flow and maximum extraction of rich flavor notes.'
  },
  {
    name: 'Noise-Cancelling Wireless Headphones',
    price: 8999,
    category: 'Electronics',
    description: 'Active noise cancellation with 40-hour battery life, ultra-plush memory foam earcups, and crystal-clear microphone audio.'
  },
  {
    name: 'Hydrating Botanical Facial Serum',
    price: 849,
    category: 'Beauty',
    description: 'Formulated with hyaluronic acid, niacinamide, and rosehip extract to restore moisture balance and radiant skin glow.'
  },
  {
    name: 'Artisan Dark Roast Arabica Beans (500g)',
    price: 650,
    category: 'Food',
    description: 'Single-origin premium Arabica coffee beans roasted in small batches with tasting notes of cocoa, hazelnut, and caramel.'
  },
  {
    name: 'Full Grain Leather Card Wallet',
    price: 1199,
    category: 'Accessories',
    description: 'Slim front-pocket card sleeve crafted from vegetable-tanned leather with RFID protection and 6 dedicated slots.'
  },
  {
    name: 'Designing Data-Intensive Applications',
    price: 1450,
    category: 'Books',
    description: 'The definitive handbook by Martin Kleppmann on reliable, scalable, and maintainable data architectures and systems.'
  }
];

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to database...');
    await connectDB();

    console.log('[Seed] Clearing existing products...');
    await Product.deleteMany({});

    console.log('[Seed] Inserting sample products...');
    const inserted = await Product.insertMany(sampleProducts);
    console.log(`[Seed] Successfully seeded ${inserted.length} sample products!`);

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('[Seed] Error seeding data:', error);
    await disconnectDB();
    process.exit(1);
  }
};

if (require.main === module) {
  seedData();
}

module.exports = { sampleProducts, seedData };
