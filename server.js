const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const ethUtil = require('ethereumjs-util');
const sigUtil = require('eth-sig-util');
const jwt = require('jsonwebtoken');
const path = require('path'); // Required for file paths

app.use(bodyParser.json());

// Replace this with your own secret key (used to sign JWT tokens)
const secretKey = 'w87LqcTUMeA7U8v@#yEEZX2KfH@G9mWxxx';

// Mock user database (you should use a real database)
const users = [];
const profiles = [];
const quizHistory = {}; // Stores quiz history for each user address
const tokenBalances = {}; // Mock balances, replace with blockchain integration

// Middleware to verify MetaMask signature
function verifySignature(req, res, next) {
    const { address, signature, message } = req.body;

    const senderAddress = sigUtil.recoverPersonalSignature({
        data: message,
        sig: signature,
    });
    if (senderAddress.toLowerCase() === address.toLowerCase()) {
        // Add the user to the DB if it's not there already
        if (!users.includes(senderAddress.toLowerCase())) {
            // Add the user to the array
            users.push(senderAddress.toLowerCase());
            quizHistory[senderAddress.toLowerCase()] = []; // Initialize quiz history
            tokenBalances[senderAddress.toLowerCase()] = 0; // Initialize token balance
        }

        // Signature is valid
        req.senderAddress = senderAddress;
        return next();
    } else {
        return res.status(401).json({ error: 'Invalid signature' });
    }
}

// Helper function to generate a JWT token
function generateAuthToken(senderAddress) {
    const token = jwt.sign({ senderAddress }, secretKey, { expiresIn: '1h' });
    return `Bearer ${token}`;
}

// Middleware to verify JWT token
function verifyJwtToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, secretKey);
        req.senderAddress = decoded.senderAddress;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Route for MetaMask login
app.post('/login', verifySignature, (req, res) => {
    const { senderAddress } = req;

    // Check if the user is already registered
    if (users.includes(senderAddress.toLowerCase())) {
        // User exists, generate a JWT token
        const token = generateAuthToken(senderAddress);

        // Check to see if the sender address is a known profile
        let profile;
        const matchingProfile = profiles.find(obj => obj.address === senderAddress);
        if (matchingProfile) profile = { firstName, lastName, email } = matchingProfile;

        return res.status(200).json({ token, profile });
    } else {
        // User is not registered, you may choose to register them
        return res.status(401).json({ error: 'User not registered' });
    }
});

// Route to handle profile creation or update
app.post('/profile', verifyJwtToken, (req, res) => {
    const { senderAddress } = req;
    const { firstName, lastName, email } = req.body;

    // Validate input
    if (!firstName || !lastName || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if profile already exists
    let existingProfile = profiles.find(profile => profile.address === senderAddress);
    if (existingProfile) {
        return res.status(201).json({ message: 'Profile already exists' });
    }

    // Save the profile
    const profile = { address: senderAddress, firstName, lastName, email };
    profiles.push(profile);
    return res.status(200).json({ message: 'Profile saved successfully' });
});

// Route to fetch dashboard data (quiz history and token balance)
app.get('/dashboard', verifyJwtToken, (req, res) => {
    const { senderAddress } = req;

    // Fetch user's quiz history and token balance
    const history = quizHistory[senderAddress.toLowerCase()] || [];
    const balance = tokenBalances[senderAddress.toLowerCase()] || 0;

    return res.status(200).json({ history, balance });
});

// Route to update quiz history
app.post('/quiz-history', verifyJwtToken, (req, res) => {
    const { senderAddress } = req;
    const { quizResult } = req.body;

    // Validate input
    if (!quizResult) {
        return res.status(400).json({ error: 'Missing quiz result data' });
    }

    // Update quiz history
    if (!quizHistory[senderAddress]) {
        quizHistory[senderAddress] = [];
    }
    quizHistory[senderAddress].push(quizResult);

    return res.status(200).json({ message: 'Quiz history updated' });
});

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve the index page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route to serve the dashboard page
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Route to serve the quiz page
app.get('/question.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'question.js'));
});

// Start the server
const PORT = process.env.PORT || 3111;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
