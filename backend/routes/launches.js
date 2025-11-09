import express from 'express';
import { getUpcomingLaunches, getLaunchById } from '../services/launchService.js';
import { cleanupOldLaunches, archiveOldLaunches } from '../services/cleanupService.js';

const router = express.Router();

// Get all upcoming launches
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const launches = await getUpcomingLaunches(limit);
    res.json(launches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single launch by ID
router.get('/:id', async (req, res) => {
  try {
    const launch = await getLaunchById(req.params.id);
    if (!launch) {
      return res.status(404).json({ message: 'Launch not found' });
    }
    res.json(launch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual cleanup endpoint (admin use)
router.post('/cleanup', async (req, res) => {
  try {
    const hours = parseInt(req.body.hours) || 24;
    const result = await cleanupOldLaunches(hours);
    res.json({
      message: 'Cleanup completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manual archive endpoint (admin use)
router.post('/archive', async (req, res) => {
  try {
    const hours = parseInt(req.body.hours) || 24;
    const result = await archiveOldLaunches(hours);
    res.json({
      message: 'Archive completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;