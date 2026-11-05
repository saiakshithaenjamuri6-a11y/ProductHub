const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const router = express.Router();

/**
 * Helper to compute dashboard statistics from MongoDB
 */
async function computeDashboardStats() {
  const [totalProducts, categoryAgg, valueAgg] = await Promise.all([
    Product.countDocuments(),
    Product.distinct('category'),
    Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: '$price' }
        }
      }
    ])
  ]);

  const totalCategories = categoryAgg.length;
  const totalInventoryValue = valueAgg.length > 0 ? valueAgg[0].totalValue : 0;

  return {
    totalProducts,
    totalCategories,
    totalInventoryValue: Math.round(totalInventoryValue * 100) / 100
  };
}

/**
 * @route   GET /api/products/stats
 * @desc    Get dashboard summary statistics
 * @access  Public
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await computeDashboardStats();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products
 * @desc    Retrieve all products with optional search, category filter, and sorting
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { search, category, sort } = req.query;

    const query = {};

    // Search by product name (case-insensitive regex)
    if (search && search.trim() !== '') {
      const sanitized = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: sanitized, $options: 'i' };
    }

    // Filter by category
    if (category && category.trim() !== '' && category.toLowerCase() !== 'all') {
      query.category = category.trim();
    }

    // Determine sort order
    let sortOptions = { createdAt: -1 }; // default newest first
    if (sort === 'price-asc') {
      sortOptions = { price: 1 };
    } else if (sort === 'price-desc') {
      sortOptions = { price: -1 };
    } else if (sort === 'name-asc') {
      sortOptions = { name: 1 };
    } else if (sort === 'oldest') {
      sortOptions = { createdAt: 1 };
    }

    const [products, stats] = await Promise.all([
      Product.find(query).sort(sortOptions),
      computeDashboardStats()
    ]);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products,
      stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Retrieve a single product by ID
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found`
      });
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/products
 * @desc    Create a new product
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, price, category, description } = req.body;

    const errors = [];
    if (!name || !name.trim()) errors.push('Product name is required');
    if (price === undefined || price === null || price === '') {
      errors.push('Price is required');
    } else {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.push('Price must be a valid positive number greater than zero');
      }
    }
    if (!category || !category.trim()) errors.push('Category is required');
    if (!description || !description.trim()) errors.push('Description is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const newProduct = await Product.create({
      name: name.trim(),
      price: Number(price),
      category: category.trim(),
      description: description.trim()
    });

    const stats = await computeDashboardStats();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: newProduct,
      stats
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    next(error);
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Update an existing product
 * @access  Public
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const { name, price, category, description } = req.body;
    const errors = [];

    if (name !== undefined && !name.trim()) errors.push('Product name cannot be empty');
    if (price !== undefined) {
      const numPrice = Number(price);
      if (isNaN(numPrice) || numPrice <= 0) {
        errors.push('Price must be a valid positive number greater than zero');
      }
    }
    if (category !== undefined && !category.trim()) errors.push('Category cannot be empty');
    if (description !== undefined && !description.trim()) errors.push('Description cannot be empty');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (price !== undefined) updateData.price = Number(price);
    if (category !== undefined) updateData.category = category.trim();
    if (description !== undefined) updateData.description = description.trim();

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true
    });

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found`
      });
    }

    const stats = await computeDashboardStats();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct,
      stats
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }
    next(error);
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Delete a product
 * @access  Public
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format'
      });
    }

    const deletedProduct = await Product.findByIdAndDelete(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: `Product with ID ${id} not found`
      });
    }

    const stats = await computeDashboardStats();

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: deletedProduct,
      stats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
