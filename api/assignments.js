const router = require('express').Router();

const {
  validateAgainstSchema
} = require('../lib/validation');

const {
  authenticate
} = require('../lib/authentication');

const {
  getCourseById
} = require('../models/courses');

const {
  AssignmentSchema,
  SubmissionSchema,
  insertAssignmentByCourseId,
  getAssignmentById,
  updateAssignmentById,
  deleteAssignmentById,
  insertSubmissionByCourseId,
  getSubmissionById,
  getSubmissionByFilename,
  getSubmissionDownloadById,
  getSubmissionDownloadByFilename,
  getSubmissionsByAssignmentIdAndQuery
} = require('../models/assignments');

const crypto = require('crypto');
const path = require('path');

const multer = require('multer');
const upload = multer( {
  storage: multer.diskStorage({
    destination: `${__dirname}/../submissions`,
    filename: (req, file, callback) => {
      const filename = crypto.pseudoRandomBytes(16).toString('hex');
      const extension = path.extname(file.originalname);
      callback(null, `${filename}${extension}`);
    }
  })
});


// Create an assignment.
// Available to admins and authorized instructors.
router.post('/', authenticate, async (req, res, next) => {
  try {
    const course = getCourseById(req.body.courseId);
    if (course) {
      if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        if (validateAgainstSchema(req.body, AssignmentSchema)) {
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
          res.status(400).json({
            error: "Assignment creation requires courseId, title, points, and due date."
          });
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
  } catch (err) {
    next(err);
  }
});

// Get an assignment by id, excluding list of submissions.
router.get('/:id', async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    if (assignment) {
      delete assignment.submissions;
      res.status(200).json(assignment);
    } else {
      next();
    }
  } catch (err) {
    next(err);
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
  try {
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
  } catch (err) {
    next(err);
  }
});

// Delete an assignment and all submissions tied to it.
// Available to admins and authorized instructors.
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err);
  }
});

// Get assignment submissions.....
// TODO:

// Create submission for an assignment.
// Available to authorized students (enrolled in course).
router.post('/:id/submissions', upload.single('file'), authenticate, async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    const course = assignment ?
    await getCourseById(assignment.courseId) : null;
    if (assignment && course) {
      if (req.role == 'student' && course.students.includes(req.user)) {
        if (req.file && validateAgainstSchema(req.body, SubmissionSchema)
        && (req.params.id == req.body.assignmentId)) {
          const submission = {
            assignmentId: req.params.id,
            studentId: req.body.studentId,
            timestamp: req.body.timestamp,
            filename: req.file.filename,
            contentType: req.file.mimetype,
            path: req.file.path
          };
          const id = await insertSubmissionByCourseId(
            assignment.courseId, submission);
            if (id) {
              res.status(200).json({
                id: id,
                filename: req.file.filename,
                link: `/assignments/${req.params.id}/submissions/${req.file.filename}`
              });
            } else {
              const err = "Could not insert submission by course id."
              next(err);
            }

          } else {
            res.status(400).json({
              error: "Submission requires a file, matching assignmentId, studentId, and timestamp."
            });
          }
        } else {
          res.status(403).json({
            error: "Not authorized to submit for this assignment."
          });
        }
      } else {
        next();
      }
  } catch (err) {
    next(err);
  }
});

// // Wait, that's cheating!
// router.get('/:aid/submissions2/:sid', async (req, res, next) => {
//   res.status(200).json(
//     await getSubmissionById(req.params.sid)
//   );
// });


// Get submission download by filename.
router.get('/:aid/submissions/:sfn', authenticate, async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.aid);
    const submission = await getSubmissionByFilename(req.params.sfn);
    const course = assignment ?
    await getCourseById(assignment.courseId) : null;

    console.log("assignment=", assignment);
    console.log("sfn=", req.params.sfn);
    console.log("submission=", submission);
    console.log("course=", course);

    if (assignment && submission && course) {
      if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)
      || (req.role == 'student' && req.user == submission.metadata.studentId)) {
        getSubmissionDownloadByFilename(submission.filename)
        .on('file', (file) => {
          res.status(200).type(file.metadata.contentType);
        })
        .on('error', (err) => {
          if (err.code === 'ENOENT') {
            next();
          } else {
            next(err);
          }
        })
        .pipe(res);
      } else {
        res.status(403).json({
          error: "Not authorized to view this submission."
        });
      }
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

// Get all submissions for an assignment. Includes download links.
// Available to admins and authorized instructors.
// TODO: paginate, studentid search parameter
//  ALSO check if the other get routes ask for parameters???
router.get('/:id/submissions', authenticate, async (req, res, next) => {
  try {
    const assignment = await getAssignmentById(req.params.id);
    const course = assignment ?
    await getCourseById(assignment.courseId) : null;

    if (assignment && course) {
      if (req.role == 'admin'
      || (req.role == 'instructor' && req.user == course.instructorId)) {
        let results = await getSubmissionsByAssignmentIdAndQuery(req.params.id, req.query);

        for (s of results.submissions) {
          s.metadata.link =
          `/assignments/${s.metadata.assignmentId}/submissions/${s.filename}`;
        }
        results.submissions = results.submissions.map(s => s.metadata);

        res.status(200).json(results);
      } else {
        res.status(403).json({
          error: "Not authorized to view submissions for this assignment."
        })
      }
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});


module.exports = router;
