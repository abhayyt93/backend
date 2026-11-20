import Lead from '../models/Lead.js';

// Helper: Normalize and validate Indian 10-digit mobile number
const normalizeAndValidateMobile = (rawPhone) => {
  if (!rawPhone || (typeof rawPhone !== 'string' && typeof rawPhone !== 'number')) {
    return { isValid: false, message: 'Phone number is required' };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = String(rawPhone).replace(/[^\d]/g, '').trim();

  // If number starts with country code 91 and has 12 digits, strip 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }

  // Check Indian format: 10 digits starting with 6, 7, 8, or 9
  const indiaMobileRegex = /^[6-9]\d{9}$/;
  if (!indiaMobileRegex.test(cleaned)) {
    return {
      isValid: false,
      message: 'Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)'
    };
  }

  return { isValid: true, mobile: cleaned };
};

// @desc    Public Lead Capture (Visitor submits ONLY Name & Phone Number)
// @route   POST /api/leads
// @access  Public
export const createLead = async (req, res, next) => {
  try {
    const { name } = req.body;
    const rawPhone = req.body.phoneNumber || req.body.phone || req.body.mobile;

    // 1. Validate Name
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters'
      });
    }

    // 2. Validate Phone Number
    const phoneCheck = normalizeAndValidateMobile(rawPhone);
    if (!phoneCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: phoneCheck.message
      });
    }
    const mobile = phoneCheck.mobile;

    // 3. Duplicate Check: If duplicate phone exists, return success response without throwing error
    const existingLead = await Lead.findOne({ phoneNumber: mobile });
    if (existingLead) {
      return res.status(200).json({
        success: true,
        message: 'Thank you! Your details have already been saved.',
        isDuplicate: true,
        lead: {
          id: existingLead._id,
          name: existingLead.name,
          phoneNumber: existingLead.phoneNumber,
          mobile: existingLead.phoneNumber,
          createdAt: existingLead.createdAt
        }
      });
    }

    // 4. Capture IP for spam rate limiting / audit
    const clientIp = 
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
      req.ip || 
      req.socket?.remoteAddress || 
      '';

    // 5. Save New Lead (Only Name & Phone Number)
    const newLead = await Lead.create({
      name: trimmedName,
      phoneNumber: mobile,
      ipAddress: clientIp
    });

    return res.status(201).json({
      success: true,
      message: 'Lead captured successfully! Our team will contact you soon.',
      isDuplicate: false,
      lead: {
        id: newLead._id,
        name: newLead.name,
        phoneNumber: newLead.phoneNumber,
        mobile: newLead.phoneNumber,
        createdAt: newLead.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Leads for Admin (with pagination & search)
// @route   GET /api/admin/leads
// @access  Private/Admin
export const getAdminLeads = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const query = {};

    // Search by name or phone number
    if (req.query.search && typeof req.query.search === 'string') {
      const searchStr = req.query.search.trim();
      if (searchStr) {
        const safeSearch = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { phoneNumber: { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }

    // Optional status filter
    if (req.query.status && typeof req.query.status === 'string') {
      query.status = req.query.status.trim();
    }

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) {
        query.createdAt.$gte = new Date(req.query.startDate);
      }
      if (req.query.endDate) {
        query.createdAt.$lte = new Date(req.query.endDate);
      }
    }

    const total = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
      count: leads.length,
      leads: leads.map(l => ({
        id: l._id,
        _id: l._id,
        name: l.name,
        phoneNumber: l.phoneNumber,
        mobile: l.phoneNumber,
        status: l.status,
        notes: l.notes,
        createdAt: l.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export Leads as CSV for Admin
// @route   GET /api/admin/leads/export
// @access  Private/Admin
export const exportAdminLeads = async (req, res, next) => {
  try {
    const query = {};

    // Search filter
    if (req.query.search && typeof req.query.search === 'string') {
      const searchStr = req.query.search.trim();
      if (searchStr) {
        const safeSearch = searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        query.$or = [
          { name: { $regex: safeSearch, $options: 'i' } },
          { phoneNumber: { $regex: safeSearch, $options: 'i' } }
        ];
      }
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.startDate || req.query.endDate) {
      query.createdAt = {};
      if (req.query.startDate) query.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) query.createdAt.$lte = new Date(req.query.endDate);
    }

    const leads = await Lead.find(query).sort({ createdAt: -1 });

    const escapeCsv = (field) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = ['ID', 'Name', 'Phone Number', 'Status', 'Notes', 'Created At'];
    const rows = leads.map(lead => [
      escapeCsv(lead._id),
      escapeCsv(lead.name),
      escapeCsv(lead.phoneNumber),
      escapeCsv(lead.status || 'New'),
      escapeCsv(lead.notes || ''),
      escapeCsv(lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : '')
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const fileName = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

// @desc    Get Single Lead by ID
// @route   GET /api/admin/leads/:id
// @access  Private/Admin
export const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    res.status(200).json({ success: true, lead });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Lead (Status or Notes)
// @route   PUT /api/admin/leads/:id or PATCH /api/admin/leads/:id
// @access  Private/Admin
export const updateAdminLead = async (req, res, next) => {
  try {
    const { status, notes, name, phoneNumber, mobile, phone } = req.body;
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (status) lead.status = status;
    if (notes !== undefined) lead.notes = notes;
    if (name) lead.name = name.trim();
    
    const newPhone = phoneNumber || mobile || phone;
    if (newPhone) {
      const check = normalizeAndValidateMobile(newPhone);
      if (check.isValid) lead.phoneNumber = check.mobile;
    }

    const updated = await lead.save();

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      lead: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Lead
// @route   DELETE /api/admin/leads/:id
// @access  Private/Admin
export const deleteAdminLead = async (req, res, next) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
