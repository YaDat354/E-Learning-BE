const express = require('express');

const assignmentController = require('../../controllers/assignment.controller');
const { authenticate, optionalAuthenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const {
  validateCreateAssignment,
  validateUpdateAssignment,
  validateSubmitAssignment,
  validateGradeSubmission,
} = require('../../validations/validators');

const router = express.Router({ mergeParams: true });

// Public (but teacher context is checked by ownership rules when logged in)
router.get('/', optionalAuthenticate, assignmentController.getAssignments);
router.get('/:assignmentId', optionalAuthenticate, assignmentController.getAssignmentById);

// Teacher/Admin management
router.post('/', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateCreateAssignment, assignmentController.createAssignment);
router.patch('/:assignmentId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), validateUpdateAssignment, assignmentController.updateAssignment);
router.delete('/:assignmentId', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), assignmentController.deleteAssignment);

// Student submission
router.post('/:assignmentId/submissions', authenticate, authorizeRoles(roles.STUDENT), validateSubmitAssignment, assignmentController.submitAssignment);

// Teacher/Admin review
router.get('/:assignmentId/submissions', authenticate, authorizeRoles(roles.TEACHER, roles.ADMIN), assignmentController.getSubmissions);
router.patch(
  '/:assignmentId/submissions/:submissionId/grade',
  authenticate,
  authorizeRoles(roles.TEACHER, roles.ADMIN),
  validateGradeSubmission,
  assignmentController.gradeSubmission
);

module.exports = router;
