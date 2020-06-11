const { ObjectId, GridFSBucket } = require('mongodb');

const fs = require('fs');

const { getDatabaseReference } = require('../lib/mongo');

const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = {
  courseId: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true }
};
exports.AssignmentSchema = AssignmentSchema;

// Does not contain file, as validateAgainstSchema cannot validate it.
const SubmissionSchema = {
  assignmentId: { required: true },
  studentId: { required: true },
  timestamp: { required: true }
};
exports.SubmissionSchema = SubmissionSchema;

// TODO: Consider an 'assignment' collection; better than courses?
exports.insertAssignmentByCourseId = async (id, assignment) => {
  const db = getDatabaseReference();
  let collection = db.collection('assignments');

  const validAssignment = extractValidFields(assignment, AssignmentSchema);

  if (ObjectId.isValid(id)) {
    const result = await collection.insertOne(validAssignment);

    collection = db.collection('courses');
    await collection
      .updateOne(
        { _id: new ObjectId(id) },
        { $push: { assignments: result.insertedId } }
      );

    return result.insertedId;
  } else {
    return null;
  }
};

exports.getAssignmentById = async (id) => {
  const db = getDatabaseReference();
  const collection = db.collection('assignments');

  if (ObjectId.isValid(id)) {
    const results = await collection
      .find( { _id: new ObjectId(id) } )
      .toArray();
    return results[0];
  } else {
    return null;
  }
};

exports.updateAssignmentById = async (id, assignment) => {
  const db = getDatabaseReference();
  const collection = db.collection('assignments');

  const validAssignment = extractValidFields(assignment, AssignmentSchema);

  if (ObjectId.isValid(id)) {
    let result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: validAssignment }
    );
    return result.matchedCount;
  } else {
    return null;
  }
};

exports.deleteAssignmentById = async (id) => {
  const db = getDatabaseReference();
  let collection = db.collection('assignments');

  // First, delete submissions.
  if (ObjectId.isValid(id)) {
    let assignment = await collection
      .find( { _id: new ObjectId(id) } )
      .toArray();

    assignment = assignment.submissions.map(s => new ObjectId(s));

    collection = db.collection('submissions');

    // TODO: If errors, map new ObjectId(id) to assignment.submissions
    //   Obviously, make assignment 'let' first.
    // I did this; confirm it work slater.
    if (assignment && assignment.submissions) {
      await collection
        .deleteMany(
          { _id: { $in: assignment.submissions } }
        );
    }

    collection = db.collection('assignments');
    const result = await collection
      .deleteOne(
        { _id: new ObjectId(id) }
      );

    return result.deletedCount;
  } else {
    return null;
  }
};

exports.insertSubmissionByCourseId = async (id, submission) => {
  return new Promise( (resolve, reject) => {
    const db = getDatabaseReference();
    const bucket = new GridFSBucket(db,
      { bucketName: 'submissions' }
    );

    const metadata = {
      contentType: submission.contentType,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      timestamp: submission.timestamp
    };

    const uploadStream = bucket.openUploadStream(
      submission.filename,
      { metadata: metadata }
    );

    fs.createReadStream(submission.path).pipe(uploadStream)
      .on('error', (err) => {
        reject(err);
      })
      .on('finish', (result) => {
        // TODO: Append id to assignment
        resolve(result._id);
      });
  });
};

exports.getSubmissionById = async (id) => {
  const db = getDatabaseReference();
  const bucket = new GridFSBucket(db,
    { bucketName: 'submissions' }
  );

  if (ObjectId.isValid(id)) {
    const results = await bucket
      .find( { _id: new ObjectId(id) } )
      .toArray();
    return results[0];
  } else {
    return null;
  }
};

exports.getSubmissionByFilename = async (filename) => {
  const db = getDatabaseReference();
  const bucket = new GridFSBucket(db,
    { bucketName: 'submissions' }
  );

  const results = await bucket
    .find( { filename: filename } )
    .toArray();
  return results[0];
};

exports.getSubmissionDownloadById = (id) => {
  const db = getDatabaseReference();
  const bucket = new GridFSBucket(db,
    { bucketName: 'submissions' }
  );

  return bucket.openDownloadStream(new ObjectId(id));
};

exports.getSubmissionDownloadByFilename = (filename) => {
  const db = getDatabaseReference();
  const bucket = new GridFSBucket(db,
    { bucketName: 'submissions' }
  );

  return bucket.openDownloadStreamByName(filename);
};
