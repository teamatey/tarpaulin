const { ObjectId } = require('mongodb');

const { getDatabaseReference } = require('../lib/mongo');

const { extractValidFields } = require('../lib/validation');

const bcrypt = require('bcrypt');

// Schema describing the user entity.
// TODO: Explain why exports.UserSchema = {} does not work.
// Seriously. Try console.log(UserSchema). It will log just fine.
// Then try to use it in a function. uSeR sChEmA iS nOt DeFiNeD
const UserSchema = {
  name: { required: true },
  email: { required: true },
  password: { required: true },
  role: { required: true }
};
exports.UserSchema = UserSchema;

exports.insertUser = async function (user) {
  const validUser = extractValidFields(user, UserSchema);

  validUser.password = await bcrypt.hash(
    validUser.password,
    8
  );

  console.log("-- Insert user:", validUser);

  const db = getDatabaseReference();
  const collection = db.collection('users');
  const result = await collection.insertOne(validUser);
  return result.insertedId;
};

exports.getUserById = async function (id, includePassword) {
  console.log("-- Get user:", id);

  const db = getDatabaseReference();
  const collection = db.collection('users');

  if (ObjectId.isValid(id)) {
    const results = await collection
      .find({ _id: new ObjectId(id) })
      .toArray();
    if (!includePassword) {
      delete results[0].password;
    }

    console.log("-- Return user:", results[0]);

    return results[0];
  } else {
    return null;
  }
};

exports.getUsersByIds = async function (ids) {
  const db = getDatabaseReference();
  const collection = db.collection('users');

  const validIds = ids.map(id => new ObjectId(id));

  let results = await collection
    .find( { _id: { $in: validIds } } )
    .toArray();

  return results;
}

exports.getUserByEmail = async function (email, includePassword) {
  const db = getDatabaseReference();
  const collection = db.collection('users');

  const results = await collection
    .find({ email: email })
    .toArray();
  if (results[0]) {
    if (!includePassword) {
      delete results[0].password;
    }
    console.log("-- Return user:", results[0]);
    return results[0];
  } else {
    console.log("-- Return user: null");
    return null;
  }
}

exports.validateUser = async function (email, password) {
  const user = await exports.getUserByEmail(email, true);

  console.log("-- Validate user:", user);

  return user && await bcrypt.compare(password, user.password);
}
