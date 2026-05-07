const express = require('express');

const assignmentController = require('../../controllers/assignment.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');

const router = express.Router({ mergeParams: true });

// Public
router.get('/', assignmentController.getAssignments);
router.get('/:assignmentId', assignmentController.getAssignmentById);

// Teacher/Admin management
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), assignmentController.createAssignment);
router.patch('/:assignmentId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), assignmentController.updateAssignment);
router.delete('/:assignmentId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), assignmentController.deleteAssignment);

// Student submission
router.post('/:assignmentId/submissions', authenticate, authorizeRoles(roles.STUDENT), assignmentController.submitAssignment);

// Teacher/Admin review
router.get('/:assignmentId/submissions', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), assignmentController.getSubmissions);
router.patch(
  '/:assignmentId/submissions/:submissionId/grade',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  assignmentController.gradeSubmission
);

module.exports = router;
