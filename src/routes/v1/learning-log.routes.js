const express = require('express');

const learningLogController = require('../../controllers/learning-log.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateUpsertLearningLog } = require('../../validations/validators');

const router = express.Router();

router.get('/me', authenticate, learningLogController.getMyLearningLogs);
router.post('/', authenticate, validateUpsertLearningLog, learningLogController.upsertLearningLog);

module.exports = router;