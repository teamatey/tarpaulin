const { ObjectId } = require('mongodb');

const { getDatabaseReference } = require('../lib/mongo');

const { extractValidFields } = require('../lib/validation');

const AssignmentSchema = {
  courseId: { required: true },
  title: { required: true },
  points: { required: true },
  due: { required: true }
};
exports.AssignmentSchema = AssignmentSchema;

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
