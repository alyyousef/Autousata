const express = require('express');
const { generateAutowriter } = require('../services/autowriter');

const router = express.Router();

router.post('/generate', async (req, res) => {
  const { highlights, fields } = req.body || {};
  if (!highlights || typeof highlights !== 'string') {
    return res.status(400).json({ error: 'highlights is required.' });
  }

  try {
    const result = await generateAutowriter({ highlights, fields });
    return res.json(result);
  } catch (error) {
    console.error('Autowriter generation failed:', error.message);
    return res.status(500).json({ error: 'Unable to generate description.' });
  }
});

module.exports = router;
