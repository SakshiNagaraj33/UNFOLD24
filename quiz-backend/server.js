const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Import the User model
const path = require('path');

// Initialize Express app
const app = express();
const port = 5000;

// Middleware
app.use(cors());  // Allow CORS for all origins (for development)
app.use(bodyParser.json());  // Parse JSON requests

// MongoDB Connection
mongoose.connect('mongodb+srv://bhavanac003:RkQNGSoe25LDlVMK@cluster0.qzpbs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    console.log('Connected to MongoDB Atlas');
}).catch((err) => {
    console.error('Error connecting to MongoDB Atlas:', err);
});

// JWT Secret Key (Use a better approach in production)
const secretKey = 'w87LqcTUMeA7U8v@#yEEZX2KfH@G9mWxxx';

// Helper function to generate JWT token
function generateAuthToken(walletAddress) {
    const token = jwt.sign({ walletAddress }, secretKey, { expiresIn: '1h' });
    return `Bearer ${token}`;
}

// Profile submission route
app.post('/api/profile', async (req, res) => {
    const { walletAddress, firstName, lastName, email } = req.body;

    // Validate input data
    if (!walletAddress || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if the user already exists by wallet address
        let user = await User.findOne({ walletAddress });

        if (user) {
            // If user exists, update the profile
            user.firstName = firstName;
            user.lastName = lastName;
            user.email = email;
            await user.save();
            return res.status(200).json({ message: 'Profile updated successfully' });
        } else {
            // If user doesn't exist, create a new profile
            user = new User({
                walletAddress,
                firstName,
                lastName,
                email,
            });
            await user.save();
            return res.status(201).json({ message: 'Profile created successfully' });
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        return res.status(500).json({ message: 'Error saving profile' });
    }
});

// Route to fetch profile by walletAddress
app.get('/api/profile/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;

    try {
        const user = await User.findOne({ walletAddress });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        return res.status(200).json({
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            walletAddress: user.walletAddress,
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({ message: 'Error fetching profile' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
