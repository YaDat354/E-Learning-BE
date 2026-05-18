const express = require('express');

const discussionController = require('../../controllers/discussion.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { validateCreateDiscussion } = require('../../validations/validators');

const router = express.Router({ mergeParams: true });

router.get('/', discussionController.getDiscussions);
router.post('/', authenticate, validateCreateDiscussion, discussionController.createDiscussion);

module.exports = router;