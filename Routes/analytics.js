const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const router = express.Router();

/**
 * 8.1 Total Amount Spent by a Student
 * GET /analytics/total-spent/:studentId
 */
router.get('/total-spent/:studentId', async (req, res) => {
    try {
        const { studentId } = req.params;

        // Validate whether studentId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
            return res.status(400).json({ error: 'Invalid student ID format' });
        }

        const studentObjectId = new mongoose.Types.ObjectId(studentId);

        // Use MongoDB aggregation on Order collection
        const result = await Order.aggregate([
            { $match: { student: studentObjectId } }, // Match orders by studentId
            { $group: { _id: "$student", totalSpent: { $sum: "$totalPrice" } } } // Group by student, Calculate sum
        ]);

        // If no orders found, return totalSpent as 0
        const totalSpent = result.length > 0 ? result[0].totalSpent : 0;

        // Return studentId and totalSpent as JSON response
        res.json({ studentId, totalSpent });
    } catch (err) {
        console.error('Error calculating total spent:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 8.2 Top Selling Menu Items
 * GET /analytics/top-menu-items?limit=5
 */
router.get('/top-menu-items', async (req, res) => {
    try {
        // Read limit value from query parameters, set default to 5
        const limit = parseInt(req.query.limit) || 5;

        // Perform aggregation on Order collection
        const result = await Order.aggregate([
            { $unwind: "$items" }, // Unwind items array
            { $group: { _id: "$items.menuItem", totalQuantity: { $sum: "$items.quantity" } } }, // Group by menuItem, Sum quantities
            { $sort: { totalQuantity: -1 } }, // Sort by total quantity descending
            { $limit: limit } // Limit results
        ]);

        // Populate menuItem details using MenuItem model
        const populatedResults = await MenuItem.populate(result, { path: '_id', select: 'name category price' });

        // Format response to include menuItem and totalQuantity
        const formattedResults = populatedResults.map(item => ({
            menuItem: item._id,
            totalQuantity: item.totalQuantity
        }));

        // Return formatted result as JSON
        res.json(formattedResults);
    } catch (err) {
        console.error('Error fetching top items:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * 8.3 Daily Order Counts
 * GET /analytics/daily-orders
 */
router.get('/daily-orders', async (req, res) => {
    try {
        const result = await Order.aggregate([
            // Use aggregation to group orders by date (YYYY-MM-DD)
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    orderCount: { $sum: 1 } // Count number of orders per day
                }
            },
            { $sort: { _id: 1 } } // Sort results by date ascending
        ]);

        // Format response to include date and orderCount
        const formattedResults = result.map(item => ({
            date: item._id,
            orderCount: item.orderCount
        }));

        // Return formatted result as JSON
        res.json(formattedResults);
    } catch (err) {
        console.error('Error fetching daily orders:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;