const Custody = require('../models/Custody');

const parsePagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 15, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
};

const listCustodies = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = {};

    if (req.query.status) filter.status = req.query.status;

    const [custodies, total] = await Promise.all([
      Custody.find(filter)
        .populate('engineerId', 'code name type currentBalance')
        .sort({ updatedAt: -1, allocatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Custody.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: custodies,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
    });
  } catch (error) {
    next(error);
  }
};

const settleCustody = async (req, res, next) => {
  try {
    const custody = await Custody.findById(req.params.id);

    if (!custody) {
      return res.status(404).json({ success: false, message: 'لم يتم العثور على العهدة' });
    }

    if (custody.status === 'Settled') {
      return res.status(409).json({ success: false, message: 'تمت تسوية هذه العهدة مسبقًا' });
    }

    custody.status = 'Settled';
    custody.settledAt = req.body?.settledAt ? new Date(req.body.settledAt) : new Date();
    await custody.save();

    const populated = await Custody.findById(custody._id).populate('engineerId', 'code name type currentBalance');

    res.json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

module.exports = { listCustodies, settleCustody };
