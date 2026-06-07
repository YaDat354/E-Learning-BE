const express = require('express');

const adminController = require('../../controllers/admin.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorizeRoles } = require('../../middlewares/role.middleware');
const roles = require('../../constants/roles');
const {
	validateAdminCreateUser,
	validateAdminUpdateUser,
	validateAdminUserIdParam,
} = require('../../validations/validators');

const router = express.Router();

router.use(authenticate, authorizeRoles(roles.ADMIN));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.listUsers);
router.get('/users/:userId', validateAdminUserIdParam, adminController.getUserById);
router.post('/users', validateAdminCreateUser, adminController.createUser);
router.patch('/users/:userId', validateAdminUserIdParam, validateAdminUpdateUser, adminController.updateUser);
router.delete('/users/:userId', validateAdminUserIdParam, adminController.deleteUser);
router.get('/courses', adminController.listCourses);

module.exports = router;
