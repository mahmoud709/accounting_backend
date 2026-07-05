const Project = require('../models/Project');

const listProjects = async (req, res, next) => {
  try {
    const projects = await Project.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'اسم المشروع مطلوب' });
    }
    const project = await Project.create({ name: name.trim() });
    res.status(201).json({ success: true, data: project });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'هذا المشروع موجود بالفعل' });
    }
    next(error);
  }
};

const deleteProject = async (req, res, next) => {
  try {
    await Project.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'تم حذف المشروع' });
  } catch (error) {
    next(error);
  }
};

module.exports = { listProjects, createProject, deleteProject };
