const Contact = require('../models/Contact');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllContacts = catchAsync(async (req, res) => {
  const contacts = await Contact.find().sort('name');
  res.status(200).json({ status: 'success', data: { contacts } });
});

exports.createContact = catchAsync(async (req, res) => {
  const { name, type, phone, notes } = req.body;
  if (!name) throw new AppError('اسم الجهة مطلوب', 400);

  const newContact = await Contact.create({ name, type, phone, notes });
  res.status(201).json({ status: 'success', data: { contact: newContact } });
});

exports.getContact = catchAsync(async (req, res) => {
  const contact = await Contact.findById(req.params.id);
  if (!contact) throw new AppError('الجهة غير موجودة', 404);
  res.status(200).json({ status: 'success', data: { contact } });
});

exports.updateContact = catchAsync(async (req, res) => {
  const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!contact) throw new AppError('الجهة غير موجودة', 404);
  res.status(200).json({ status: 'success', data: { contact } });
});
