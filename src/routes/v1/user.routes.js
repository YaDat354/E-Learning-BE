const express = require('express');

const userController = require('../../controllers/user.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const {
	validateUpdateProfile,
	validateCreateStudent,
	validateUpdateStudent,
} = require('../../validations/validators');

const router = express.Router();

router.get('/me', authenticate, userController.getCurrentUser);
router.patch('/me', authenticate, validateUpdateProfile, userController.updateCurrentUser);
router.get('/students', authenticate, authorizeRoles(roles.ADMIN), userController.listStudents);
router.post('/students', authenticate, authorizeRoles(roles.ADMIN), validateCreateStudent, userController.createStudent);
router.patch('/students/:userId', authenticate, authorizeRoles(roles.ADMIN), validateUpdateStudent, userController.updateStudent);
router.delete('/students/:userId', authenticate, authorizeRoles(roles.ADMIN), userController.deleteStudent);

module.exports = router;
