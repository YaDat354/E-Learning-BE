const asyncHandler = require('../utils/async-handler');
const discussionService = require('../services/discussion.service');

const getDiscussions = asyncHandler(async (req, res) => {
  const data = await discussionService.getDiscussions(req.params.courseId);
  res.json({ success: true, data });
});

const createDiscussion = asyncHandler(async (req, res) => {
  const data = await discussionService.createDiscussion(req.params.courseId, req.body, req.user);
  res.status(201).json({ success: true, data });
});

module.exports = {
  getDiscussions,
  createDiscussion,
};