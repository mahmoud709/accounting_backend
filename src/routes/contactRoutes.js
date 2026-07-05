const express = require('express');
const { authenticate } = require('../middleware/auth');
const contactController = require('../controllers/contactController');

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(contactController.getAllContacts)
  .post(contactController.createContact);

router.route('/:id')
  .get(contactController.getContact)
  .put(contactController.updateContact);

module.exports = router;
