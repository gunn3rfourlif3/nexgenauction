const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use cPanel's assigned port

app.get('/', (req, res) => {
    res.send('Hello from server.js on cPanel!');
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});