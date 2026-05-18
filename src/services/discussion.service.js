const discussionModel = require('../models/discussion.model');
const courseModel = require('../models/course.model');
const HttpError = require('../utils/http-error');

const requireCourse = async (courseId) => {
  const course = await courseModel.findById(courseId);
  if (!course) throw new HttpError(404, 'Course not found');
  return course;
};

const getDiscussions = async (courseId) => {
  await requireCourse(courseId);
  return discussionModel.findByCourseId(courseId);
};

const createDiscussion = async (courseId, body, user) => {
  await requireCourse(courseId);
  return discussionModel.create({
    courseId,
    userId: user.id,
    content: body.content,
    parentId: body.parentId,
  });
};

module.exports = {
  getDiscussions,
  createDiscussion,
};