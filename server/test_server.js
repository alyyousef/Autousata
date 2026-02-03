const express = require('express');
const app = express();

// A simple door that is ALWAYS open
app.get('/test', (req, res) => {
    res.send("✅ I AM ALIVE!");
});

// Listen on Port 5005 (A new, fresh port)
app.listen(5005, '0.0.0.0', () => {
    console.log('🚀 Test Server running on port 5005');
});