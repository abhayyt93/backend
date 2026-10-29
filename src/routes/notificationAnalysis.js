import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import AnalysisResult from '../models/AnalysisResult.js';
import { runFullAnalysisForUser } from '../services/notificationRuleEngine.js';

const router = express.Router();

const getTargetUserId = (req) => {
  return req.body?.userId || req.query?.userId || req.user?._id;
};

// @desc    Trigger on-demand AI health analysis
// @route   POST /api/notification-analysis/trigger
// @access  Private
router.post('/trigger', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const result = await runFullAnalysisForUser(targetUserId);
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: 'AI Health Analysis generated successfully',
      analysis: result.analysis,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get latest health analysis result
// @route   GET /api/notification-analysis/latest
// @access  Private
router.get('/latest', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    let latest = await AnalysisResult.findOne({ user: targetUserId })
      .sort({ createdAt: -1 });

    // If no analysis exists yet, generate on the fly
    if (!latest) {
      const generated = await runFullAnalysisForUser(targetUserId);
      latest = generated.analysis;
    }

    res.status(200).json({
      success: true,
      analysis: latest,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get health analysis history with pagination & type filter
// @route   GET /api/notification-analysis/history
// @access  Private
router.get('/history', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const query = { user: targetUserId };
    if (req.query.type) {
      query.analysisType = req.query.type;
    }

    const total = await AnalysisResult.countDocuments(query);
    const history = await AnalysisResult.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      history,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get score trends (last 7 analyses)
// @route   GET /api/notification-analysis/scores
// @access  Private
router.get('/scores', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const items = await AnalysisResult.find({ user: targetUserId })
      .sort({ date: -1 })
      .limit(7)
      .select('date scores createdAt');

    res.status(200).json({
      success: true,
      scoresHistory: items.reverse(),
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get single analysis details by ID
// @route   GET /api/notification-analysis/:id
// @access  Private
router.get('/:id', protect, async (req, res, next) => {
  try {
    const targetUserId = getTargetUserId(req);
    const analysis = await AnalysisResult.findOne({
      _id: req.params.id,
      user: targetUserId,
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: 'Analysis record not found',
      });
    }

    res.status(200).json({
      success: true,
      analysis,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
