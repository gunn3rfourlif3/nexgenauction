const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PREVIEW_PORT || 3000;

// Serve frontend build assets first if present
const buildDir = path.join(__dirname, 'frontend', 'build');
if (fs.existsSync(buildDir)) {
  app.use(express.static(buildDir));
}

// Then serve static preview assets
app.use(express.static(path.join(__dirname, 'preview')));

// Fallback to index.html for client-side routes
// Wildcard route - use regex to match anything
app.get(/.*/, (req, res) => {
  const previewIndex = path.join(__dirname, 'preview', 'index.html');
  const buildIndex = path.join(__dirname, 'frontend', 'build', 'index.html');
  if (fs.existsSync(buildIndex)) {
    return res.sendFile(buildIndex);
  }
  return res.sendFile(previewIndex);
});

app.listen(PORT, () => {
  console.log(`Preview server running on http://localhost:${PORT}`);
});