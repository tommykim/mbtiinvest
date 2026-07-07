const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// API: Get Questions
app.get('/api/questions', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'questions.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading questions.json:', err);
      return res.status(500).json({ error: 'Failed to read questions data' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      console.error('Error parsing questions.json:', parseErr);
      res.status(500).json({ error: 'Failed to parse questions data' });
    }
  });
});

// API: Get Result Profiles
app.get('/api/results', (req, res) => {
  const filePath = path.join(__dirname, 'data', 'results.json');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading results.json:', err);
      return res.status(500).json({ error: 'Failed to read results data' });
    }
    try {
      res.json(JSON.parse(data));
    } catch (parseErr) {
      console.error('Error parsing results.json:', parseErr);
      res.status(500).json({ error: 'Failed to parse results data' });
    }
  });
});

// Fallback: serve index.html for SPA behavior
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
