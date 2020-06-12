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

const CourseSearchParameterSchema = {
  page: { required: false },
  subject: { required: false },
  number: { required: false },
  term: { required: false }
};

exports.insertCourse = async function (course) {
  let validCourse = extractValidFields(course, CourseSchema);
  validCourse.students = [];
  const db = getDatabaseReference();
  const collection = db.collection('courses');
  const result = await collection.insertOne(validCourse);

  const list = {
    add: [validCourse.instructorId]
  };
  await updateUserCoursesByIds(result.insertedId, list);

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
    let results = await collection.find({ _id: new ObjectId(id) }).toArray();
    let instructor = results[0].instructorId;

    results = await collection
      .updateOne(
        { _id: new ObjectId(id) },
        { $set: validCourseParts }
      );

      const list = {
        add: [validCourseParts.instructorId ? validCourseParts.instructorId : null],
        remove: [instructor]
      };
      updateUserCoursesByIds(id, list);

      return results.matchedCount > 0;
  } else {
    return null;
  }
};

exports.getCoursesByQuery = async function (query) {
  const db = getDatabaseReference();
  const collection = db.collection('courses');

  const validQuery = extractValidFields(query, CourseSearchParameterSchema);

  const count = await collection.countDocuments();
  const lastPage = Math.ceil(count / pageSize);
  let page = parseInt(validQuery.page) || 1;
  page = page > lastPage ? lastPage : page;
  page = page < 1 ? 1 : page;
  const offset = (page - 1) * pageSize;

  let search = {};
  if (validQuery.subject) search['subject'] = validQuery.subject;
  if (validQuery.number) search['number'] = validQuery.number;
  if (validQuery.term) search['term'] = validQuery.term;

  const results = await collection
    .find(search)
    .sort({ _id: 1 })
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
    let results = await collection.find( { _id: new ObjectId(id) } ).toArray();
    const instructor = results[0].instructorId;
    const list = {
      add: [],
      remove: [instructor]
    };
    await updateUserCoursesByIds(id, list);

    results = await collection
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
