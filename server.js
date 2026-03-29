require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

//Import routes
const studentRoutes = require('./routes/students');
const menuItemRoutes = require('./routes/menuItems');
const orderRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');

const app = express();

//Prot and MongoDB URI
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

//Middleware
app.use(cors());
app.use(express.json());

//Root routes
app.get('/', (req, res) => {
    res.json({message: 'campus-food-api is running'});
})

//Use routes
app.use('/students', studentRoutes);
app.use('/menu-items', menuItemRoutes);
app.use('/orders', orderRoutes);
app.use('/analytics', analyticsRoutes);

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('MongoDB connection error:', err);
    });