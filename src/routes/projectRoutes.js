const express = require('express');
const { listProjects, createProject, deleteProject } = require('../controllers/projectController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', listProjects);
router.post('/', authorize('Admin', 'Accountant'), createProject);
router.delete('/:id', authorize('Admin', 'Accountant'), deleteProject);

module.exports = router;
