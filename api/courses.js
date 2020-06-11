const router = require('express').Router();

const {
  CourseSchema,
  insertCourse,
  getCourseById,
  getCoursesByPage,
  updateCourseById,
  deleteCourseById
} = require('../models/courses');

const {
  validateAgainstSchema
} = require('../lib/validation');

const {
  authenticate
} = require('../lib/authentication');

// Get a paginated list of all courses.
router.get('/', async (req, res, next) => {
  const coursesPage = await getCoursesByPage(
    parseInt(req.query.page) || 1
  );
  res.status(200).json(coursesPage);
});

// Create a new course. Requires an authenticated admin.
// TODO: Validate all instructor ids.
router.post('/', authenticate, async (req, res, next) => {
  if (req.role == 'admin') {
    if (validateAgainstSchema(req.body, CourseSchema)) {
      const id = await insertCourse(req.body);
      res.status(200).json({
        id: id
      });
    } else {
      res.status(400).json({
        error: "Course creation requires valid subject, number, title, term, and instructor id(s)."
      });
    }
  } else {
    res.status(403).json({
      error: "Not authorized to create a new course."
    });
  }
});

// Get a course by id.
router.get('/:id', async (req, res, next) => {
  const course = await getCourseById(req.params.id);
  if (course) {
    delete course.students;
    res.status(200).json(course);
  } else {
    next();
  }
});

// Update a course by id. Available to admins
// and instructors whose id matches the course's instructorID.
router.patch('/:id', authenticate, async (req, res, next) => {
  const course = await getCourseById(req.params.id);
  if (course) {
    if (req.role == 'admin'
    || (req.role == 'instructor' && req.user == course.instructorId)) {
      const result = await updateCourseById(req.params.id, req.body);
      res.status(200).json({
        id: req.params.id,
        link: `/courses/${req.params.id}`
      });
    } else {
      res.status(403).json({
        error: "Not authorized to update this course."
      });
    }
  } else {
    next();
  }
});
module.exports = router;

// Delete a course by id. Available only to admins.
router.delete('/:id', authenticate, async (req, res, next) => {
  if (req.role == 'admin') {
    const course = getCourseById(req.params.id);
    if (course) {
      const result = await deleteCourseById(req.params.id);
      if (result) {
        res.status(204).json();
      } else {
        next(err);
      }
    } else {
      next();
    }
  } else {
    res.status(403).json({
      error: "Not authorized to delete this course."
    });
  }
});

// Get a list of students in a course.
// Available to admins and authorized instructors.
router.get('/:id/students', authenticate, async (req, res, next) => {
  const course = await getCourseById(req.params.id);
  if (course) {
    if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
      // TODO: test this with student field
      res.status(200).json(course.students);
    } else {
      res.status(403).json({
        error: "Not authorized to view this course's student list."
      });
    }
  } else {
    next();
  }
});
