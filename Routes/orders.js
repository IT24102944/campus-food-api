const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const router = express.Router();

// Helper: calculate totalPrice from items
async function calculateTotalPrice(items) {
    // Extract menuItem IDs from items array
    const menuItemIds = items.map(item => item.menuItem);

    // Retrieve menu items from database using $in
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });

    // Create a price map (menuItemId -> price)
    const priceMap = {};
    menuItems.forEach(item => {
        priceMap[item._id.toString()] = item.price;
    });

    let total = 0;
    // Calculate total price using quantity
    for (const item of items) {
        const price = priceMap[item.menuItem.toString()];
        // Throw an error if an invalid menuItem ID is found
        if (price === undefined) {
            throw new Error(`Invalid menuItem ID: ${item.menuItem}`);
        }
        total += price * item.quantity;
    }
    return total;
}

// POST /orders - place order
router.post('/', async (req, res) => {
    try {
        const { student, items } = req.body;

        // Validate student and items
        if (!student) return res.status(400).json({ error: "Student ID is required." });
        if (!items || items.length === 0) return res.status(400).json({ error: "At least one item is required." });

        // Calculate total price using calculateTotalPrice()
        const totalPrice = await calculateTotalPrice(items);

        // Create a new Order with student, items, totalPrice and status
        const order = new Order({ student, items, totalPrice, status: 'PLACED' });

        // Save the order to the database
        const savedOrder = await order.save();

        // Re-fetch saved order and populate student and items.menuItem
        const populatedOrder = await Order.findById(savedOrder._id)
            .populate('student')
            .populate('items.menuItem');

        // Return populated order with status code 201
        res.status(201).json(populatedOrder);
    } catch (err) {
        console.error('Error placing order:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// GET /orders - List orders (with pagination support)
router.get('/', async (req, res) => {
    try {
        // Read page and limit from query parameters & set default values
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // Calculate skip value
        const skip = (page - 1) * limit;

        // Fetch paginated orders, sort by createdAt descending, populate student and items.menuItem
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('student')
            .populate('items.menuItem');

        // Count total number of orders
        const totalOrders = await Order.countDocuments();

        // Return pagination metadata and orders list
        res.json({
            page,
            limit,
            totalOrders,
            totalPages: Math.ceil(totalOrders / limit),
            orders
        });
    } catch (err) {
        console.error('Error fetching orders:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /orders/:id – get order by ID
router.get('/:id', async (req, res) => {
    try {
        // Find order by ID and populate student and items.menuItem
        const order = await Order.findById(req.params.id)
            .populate('student')
            .populate('items.menuItem');

        // If order not found, return 404
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Return order as JSON
        res.json(order);
    } catch (err) {
        console.error('Error fetching order:', err.message);
        res.status(400).json({ error: 'Invalid order ID' });
    }
});

// PATCH /orders/:id/status – update order status
router.patch('/:id/status', async (req, res) => {
    try {
        // Extract status from request body
        const { status } = req.body;

        // Define allowed status values & validate
        const allowedStatuses = ['PLACED', 'PREPARING', 'DELIVERED', 'CANCELLED'];
        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value' });
        }

        // Update order status using findByIdAndUpdate
        const updatedOrder = await Order.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true } // Enable runValidators and return updated document
        ).populate('student').populate('items.menuItem'); // Populate student and items.menuItem

        // If order not found, return 404
        if (!updatedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Return updated order
        res.json(updatedOrder);
    } catch (err) {
        console.error('Error updating status:', err.message);
        res.status(400).json({ error: err.message });
    }
});

// DELETE /orders/:id – delete order
router.delete('/:id', async (req, res) => {
    try {
        // Delete order by ID
        const deletedOrder = await Order.findByIdAndDelete(req.params.id);

        // If order not found, return 404
        if (!deletedOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Return success message
        res.json({ message: 'Order deleted successfully' });
    } catch (err) {
        console.error('Error deleting order:', err.message);
        res.status(400).json({ error: 'Invalid order ID' });
    }
});

module.exports = router;