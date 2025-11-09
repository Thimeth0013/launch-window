import express from 'express';
import Stream from '../models/Stream.js';

const router = express.Router();

// Get streams for a specific launch
router.get('/launch/:launchId', async (req, res) => {
  try {
    const streams = await Stream.find({ launchId: req.params.launchId })
      .sort({ matchScore: -1, scheduledStartTime: 1 });
    res.json(streams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manually add a stream
router.post('/', async (req, res) => {
  try {
    const stream = new Stream(req.body);
    const newStream = await stream.save();
    res.status(201).json(newStream);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;