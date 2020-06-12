const router = require('express').Router();

const {
  CourseSchema,
  insertCourse,
  getCourseById,
  getCoursesByPage,
  updateCourseById,
  deleteCourseById,
  updateCourseStudentsById
} = require('../models/courses');

const {
  getUsersByIds
} = require('../models/users');

const {
  validateAgainstSchema
} = require('../lib/validation');

const {
  authenticate
} = require('../lib/authentication');

// Get a paginated list of all courses.
router.get('/', async (req, res, next) => {
  let coursesPage = await getCoursesByPage(
    parseInt(req.query.page) || 1
  );
  for (course of coursesPage.courses) {
    delete course.students;
    delete course.assignments;
  }
  res.status(200).json(coursesPage);
});

// Create a new course. Requires an authenticated admin.
router.post('/', authenticate, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// Get a course by id.
router.get('/:id', async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      delete course.students;
      delete course.assignments;
      res.status(200).json(course);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Update a course by id. Available to admins
// and instructors whose id matches the course's instructorID.
// TODO: update instructor
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// Delete a course by id. Available only to admins.
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// Get a list of students in a course.
// Available to admins and authorized instructors.
router.get('/:id/students', authenticate, async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        // TODO: test this with student field
        res.status(200).json({
          students: course.students
        });
      } else {
        res.status(403).json({
          error: "Not authorized to view this course's student list."
        });
      }
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Update the list of students in a course with req.body.add, req.body.remove.
// Available to admins and authorized instructors.
router.post('/:id/students', authenticate, async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        const result = await updateCourseStudentsById(req.params.id, req.body);
        res.status(200).json({
          link: `/courses/${req.params.id}/students`
        });
      } else {
        res.status(403).json({
          error: "Not authorized to edit this course's student list."
        });
      }
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Return a csv file containing all students in the course.
// Available to admins and authorized instructors.
// CSV file contains names, ids, and email addresses.
router.get('/:id/roster', authenticate, async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        let students = await getUsersByIds(course.students);
        console.log(students);
        let csv = [];
        for (student of students) {
          csv.push([student._id, student.name, student.email]);
        }
        res.setHeader('Content-Type', 'text/csv');
        res.send(csv);
      } else {
        res.status(403).json({
          error: "Not authorized to obtain this course's roster."
        });
      }
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Return assignments for the course.
router.get('/:id/assignments', async (req, res, next) => {
  try {
    const course = await getCourseById(req.params.id);
    if (course) {
      res.status(200).json({
        assignments: course.assignments
      });
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
