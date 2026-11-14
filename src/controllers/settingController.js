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
    const rawAmount = req.body.amount ?? req.body.subscriptionAmount ?? req.body.price;
    
    if (rawAmount === undefined || isNaN(rawAmount)) {
      res.status(400);
      throw new Error('Valid amount is required');
    }

    const settings = await getSettingsDoc();
    settings.subscriptionAmount = Number(rawAmount);
    await settings.save();

    res.json({ 
      success: true,
      message: 'Subscription amount updated successfully',
      subscriptionAmount: settings.subscriptionAmount 
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get subscription plans for Admin Panel
// @route   GET /api/admin/subscriptions
// @access  Private/Admin
export const getAdminSubscriptions = async (req, res, next) => {
  try {
    const settings = await getSettingsDoc();
    const plans = [
      {
        id: settings._id.toString(),
        _id: settings._id.toString(),
        name: 'Annual Membership Plan',
        title: 'Annual Membership Plan',
        description: 'Complete health monitoring & premium features access',
        amount: settings.subscriptionAmount,
        price: settings.subscriptionAmount,
        subscriptionAmount: settings.subscriptionAmount,
        billingCycle: 'yearly',
        duration: '365 days',
        durationDays: 365,
        isActive: true,
        features: [
          'Plate Scan (Unlimited)',
          'Blood Pressure Scan (Unlimited)',
          'Community Access',
          'Smartwatch Connect'
        ],
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt
      }
    ];

    res.json({
      success: true,
      subscriptionAmount: settings.subscriptionAmount,
      plans,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create/Update subscription plans for Admin Panel
// @route   POST or PUT /api/admin/subscriptions
// @access  Private/Admin
export const saveAdminSubscriptionPlan = async (req, res, next) => {
  try {
    const rawAmount = req.body.amount ?? req.body.subscriptionAmount ?? req.body.price;
    const settings = await getSettingsDoc();

    if (rawAmount !== undefined && !isNaN(rawAmount)) {
      settings.subscriptionAmount = Number(rawAmount);
      await settings.save();
    }

    const updatedPlan = {
      id: settings._id.toString(),
      _id: settings._id.toString(),
      name: req.body.name || req.body.title || 'Annual Membership Plan',
      title: req.body.title || req.body.name || 'Annual Membership Plan',
      description: req.body.description || 'Complete health monitoring & premium features access',
      amount: settings.subscriptionAmount,
      price: settings.subscriptionAmount,
      subscriptionAmount: settings.subscriptionAmount,
      billingCycle: req.body.billingCycle || 'yearly',
      duration: '365 days',
      durationDays: 365,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      features: Array.isArray(req.body.features) ? req.body.features : [
        'Plate Scan (Unlimited)',
        'Blood Pressure Scan (Unlimited)',
        'Community Access',
        'Smartwatch Connect'
      ],
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt
    };

    res.json({
      success: true,
      message: 'Subscription plan saved successfully',
      subscriptionAmount: settings.subscriptionAmount,
      plan: updatedPlan,
      plans: [updatedPlan],
      data: [updatedPlan]
    });
  } catch (error) {
    next(error);
  }
};
