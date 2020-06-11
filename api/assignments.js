const router = require('express').Router();

const {
  authenticate
} = require('../lib/authentication');

const {
  getCourseById
} = require('../models/courses');

const {
  insertAssignmentByCourseId,
  getAssignmentById,
  updateAssignmentById,
  deleteAssignmentById
} = require('../models/assignments');

// Create an assignment.
// Available to admins and authorized instructors.
router.post('/', authenticate, async (req, res, next) => {
  const course = getCourseById(req.body.courseId);
  if (course) {
    if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        const id = await insertAssignmentByCourseId(req.body.courseId, req.body);
        if (id) {
          res.status(200).json({
            id: id
          });
        } else {
          const err = "Failed to insert assignment.";
          next(err);
        }
    } else {
      res.status(403).json({
        error: "Not authorized to create an assignment for this course."
      });
    }
  } else {
    res.status(400).json({
      error: "No course found with that id."
    });
  }
});

// Get an assignment by id, excluding list of submissions.
router.get('/:id', async (req, res, next) => {
  const assignment = await getAssignmentById(req.params.id);
  if (assignment) {
    delete assignment.submissions;
    res.status(200).json(assignment);
  } else {
    next();
  }
});

// Update an assignment by id; cannot update submissions.
// Available to admins and authorized instructors.
// TODO: For all update routes, strictly enforce what can be updated.
//  In other words, reject routes in which a user wishes to update
//  something they cannot (for transparency). This shows an example.
// NOTE: Confusingly, the OpenAPI suggests that one can update
//  the courseId of an assignment. I disallow this.
router.patch('/:id', authenticate, async (req, res, next) => {
  if (req.body && !req.body.courseId &&
    (req.body.title || req.body.points || req.body.due)) {
      const assignment = await getAssignmentById(req.params.id);
      const course = assignment ?
        await getCourseById(assignment.courseId) : null;

      if (assignment && course) {
        if (req.role == 'admin'
          || (req.role == 'instructor' && req.user == course.instructorId)) {
            const result = await updateAssignmentById(req.params.id, req.body);
            if (result) {
              res.status(200).json({
                id: req.params.id
              });
            } else {
              const err = "Could not update assignment by id.";
              next(err);
            }
          } else {
            res.status(403).json({
              error: "Not authorized to update this assignment."
            });
          }
      } else {
        next();
      }
  } else {
    res.status(400).json({
      error: "Updating assignment requires title, points, and/or due date. Updating courseId is disallowed."
    });
  }
});

// Delete an assignment and all submissions tied to it.
// Available to admins and authorized instructors.
router.delete('/:id', authenticate, async (req, res, next) => {
  const assignment = await getAssignmentById(req.params.id);
  const course = assignment ?
    await getCourseById(assignment.courseId) : null;
  if (assignment && course) {
    if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        const result = await deleteAssignmentById(req.params.id);
        if (result) {
          res.status(204).json();
        } else {
          const err = "Could not delete assignment by id.";
          next(err);
        }
      } else {
        res.status(403).json({
          error: "Not authorized to delete this assignment."
        });
      }
  } else {
    next();
  }
});

module.exports = router;
