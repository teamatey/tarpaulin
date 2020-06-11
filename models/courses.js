const pageSize = 5;

const { ObjectId } = require('mongodb');

const { getDatabaseReference } = require('../lib/mongo');

const { extractValidFields } = require('../lib/validation');

const {
  getUserById,
  updateUserCoursesByIds
} = require('./users');

const CourseSchema = {
  description: { required: false },
  subject: { required: true },
  number: { required: true },
  title: { required: true },
  term: { required: true },
  instructorId: { required: false }
};
exports.CourseSchema = CourseSchema;

exports.insertCourse = async function (course) {
  let validCourse = extractValidFields(course, CourseSchema);
  validCourse.students = [];
  const db = getDatabaseReference();
  const collection = db.collection('courses');
  const result = await collection.insertOne(validCourse);
  return result.insertedId;
};

exports.getCourseById = async function (id) {
  const db = getDatabaseReference();
  const collection = db.collection('courses');
  if (ObjectId.isValid(id)) {
    const results = await collection
      .find({_id: new ObjectId(id)})
      .toArray();
    return results[0];
  } else {
    return null;
  }
};

exports.updateCourseById = async function (id, course) {
  const db = getDatabaseReference();
  const collection = db.collection('courses');
  if (ObjectId.isValid(id)) {
    const validCourseParts = extractValidFields(course, CourseSchema);
    const results = await collection
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: validCourseParts }
      );
      return results.matchedCount > 0;
  } else {
    return null;
  }
};

exports.getCoursesByPage = async function (page) {
  const db = getDatabaseReference();
  const collection = db.collection('courses');

  const count = await collection.countDocuments();
  const lastPage = Math.ceil(count / pageSize);
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  const results = await collection.find({}).
    sort({ _id: 1 })
    .skip(offset)
    .limit(pageSize)
    .toArray();

  const links = {};
  if (page < lastPage) {
    links.nextPage = `/courses/?page=${page + 1}`;
    links.lastPage = `/courses/?page=${lastPage}`;
  }
  if (page > 1 ) {
    links.prevPage = `/courses/?page=${page - 1}`;
    links.firstPage = `/courses/?page=1`;
  }

  return {
    courses: results,
    page: page,
    totalPages: lastPage,
    pageSize: pageSize,
    totalCourses: count,
    links: links
  };
};

// TODO: Delete all assignments tied to the course.
exports.deleteCourseById = async function (id) {
  const db = getDatabaseReference();
  const collection = db.collection('courses');

  if (ObjectId.isValid(id)) {
    const results = await collection
      .deleteOne({ _id: new ObjectId(id) });
    return results.deletedCount > 0;
  } else {
    return null;
  }
};

exports.updateCourseStudentsById = async function (id, list) {
  const db = getDatabaseReference();
  const collection = db.collection('courses');

  if (ObjectId.isValid(id)) {
    await collection
      .updateOne(
        { _id: new ObjectId(id) },
        { $push: { students: { $each: list.add } } }
      );
    await collection
      .updateOne(
        { _id: new ObjectId(id) },
        { $pull: { students: { $in: list.remove } } }
      );

    await updateUserCoursesByIds(id, list);

    return true;
  } else {
    return null;
  }
};
