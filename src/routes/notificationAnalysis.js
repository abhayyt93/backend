import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import AnalysisResult from '../models/AnalysisResult.js';
import User from '../models/User.js';
import { runFullAnalysisForUser } from '../services/notificationRuleEngine.js';

const router = express.Router();

/**
 * Detect if the authenticated user is an Admin (not in User collection).
 * Returns true if req.user is from the Admin collection.
 * The auth middleware already checks both User and Admin collections.
 */
const isAdminCaller = (req) => {
  // Check if req.user exists and came from Admin collection
  if (!req.user) return false;
  // Check the collection name from the document
  return req.user.constructor?.modelName === 'Admin' || req.user.$__?.collection?.collectionName === 'Admin';
};

const getTargetUserId = (req) => {
  return req.body?.userId || req.query?.userId || req.user?._id;
};

// @desc    Trigger on-demand AI health analysis
// @route   POST /api/notification-analysis/trigger
// @access  Private
// NOTE: If called by Admin without userId, runs analysis for ALL users (batch)
router.post('/trigger', protect, async (req, res, next) => {
  try {
    const explicitUserId = req.body?.userId || req.query?.userId;
    const adminCaller = isAdminCaller(req);

    console.log(`[Analysis Trigger] User: ${req.user?._id}, Admin: ${adminCaller}, Explicit userId: ${explicitUserId}`);

    // --- Case 1: Specific userId provided → run for that user ---
    if (explicitUserId) {
      const result = await runFullAnalysisForUser(explicitUserId);
      if (!result.success) {
        console.log(`[Analysis Trigger] Failed for specific user:`, result);
        return res.status(400).json(result);
      }
      return res.status(200).json({
        success: true,
        message: 'AI Health Analysis generated successfully',
        analysis: result.analysis,
      });
    }

    // --- Case 2: Admin without userId → batch run for ALL users ---
    if (adminCaller) {
      const users = await User.find({ isBlocked: { $ne: true } })
        .select('_id name email')
        .limit(500);

      if (users.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No users found to analyze',
          total: 0,
          results: [],
        });
      }

      const results = [];
      let successCount = 0;
      let failCount = 0;

      for (const u of users) {
        try {
          const result = await runFullAnalysisForUser(u._id);
          if (result.success) {
            successCount++;
            results.push({
              userId: u._id,
              name: u.name,
              healthScore: result.analysis?.scores?.healthScore || null,
              status: 'success',
            });
          } else {
            failCount++;
            results.push({
              userId: u._id,
              name: u.name,
              status: 'failed',
              error: result.message || result.error,
            });
          }
        } catch (err) {
          failCount++;
          results.push({
            userId: u._id,
            name: u.name,
            status: 'error',
            error: err.message,
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: `AI Health Analysis completed for ${successCount}/${users.length} users`,
        total: users.length,
        successCount,
        failCount,
        results,
      });
    }

    // --- Case 3: Normal user (no userId) → run for themselves ---
    const targetUserId = req.user?._id;
    console.log(`[Analysis Trigger] Running for normal user: ${targetUserId}`);
    const result = await runFullAnalysisForUser(targetUserId);
    if (!result.success) {
      console.log(`[Analysis Trigger] Failed for normal user:`, result);
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      message: 'AI Health Analysis generated successfully',
      analysis: result.analysis,
    });
  } catch (error) {
    console.error(`[Analysis Trigger] Error:`, error);
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
