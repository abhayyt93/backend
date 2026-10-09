import Setting from '../models/Setting.js';

// Helper to get or create settings
const getSettingsDoc = async () => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = await Setting.create({ subscriptionAmount: 149 });
  }
  return settings;
};

// @desc    Get subscription amount (Public/User)
// @route   GET /api/settings/subscription-amount
// @access  Public
export const getSubscriptionAmount = async (req, res, next) => {
  try {
    const settings = await getSettingsDoc();
    res.json({ subscriptionAmount: settings.subscriptionAmount });
  } catch (error) {
    next(error);
  }
};

// @desc    Update subscription amount (Admin)
// @route   PUT /api/settings/subscription-amount
// @access  Private/Admin
export const updateSubscriptionAmount = async (req, res, next) => {
  try {
    const { amount } = req.body;
    
    if (!amount || isNaN(amount)) {
      res.status(400);
      throw new Error('Valid amount is required');
    }

    const settings = await getSettingsDoc();
    settings.subscriptionAmount = Number(amount);
    await settings.save();

    res.json({ 
      message: 'Subscription amount updated successfully',
      subscriptionAmount: settings.subscriptionAmount 
    });
  } catch (error) {
    next(error);
  }
};
