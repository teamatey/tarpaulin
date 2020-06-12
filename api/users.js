const router = require('express').Router();

const {
  validateAgainstSchema,
  extractValidFields
} = require('../lib/validation');

const {
  UserSchema,
  insertUser,
  getUserById,
  getUserByEmail,
  validateUser
} = require('../models/users');

const {
  generateJWT,
  authenticate
} = require('../lib/authentication');

// Create a new student user.
router.post('/', async (req, res, next) => {
  try {
    if (validateAgainstSchema(req.body, UserSchema)
    && (req.body.role == 'admin'
    || req.body.role == 'instructor'
    || req.body.role == 'student')) {
      if (await getUserByEmail(req.body.email, false) == null) {
        if (req.body.role == 'admin' || req.body.role == 'instructor') {
          next();
        } else {
          try {
            const id = await insertUser(req.body);
            res.status(201).json({
              id: id
            });
          } catch (err) {
            next(err);
          }
        }
      } else {
        res.status(400).json({
          error: "Email address is already in use."
        });
      }
    } else {
      res.status(400).json({
        error: "User creation requires valid name, email, password, and role."
      });
    }
  } catch (err) {
    next(err);
  }
});

// Create a new admin or instructor user.
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (req.role == 'admin') {
      const id = await insertUser(req.body);
      res.status(201).json({
        id: id
      });
    } else {
      res.status(403).json({
        error: "Not authorized to create user with role " + req.body.role + "."
      });
    }
  } catch (err) {
    next(err);
  }
});

// Log in a user.
router.post('/login', async (req, res, next) => {
  try {
    if (req.body && req.body.email && req.body.password) {
      try{
        if (await validateUser(req.body.email, req.body.password)) {
          const user = await getUserByEmail(req.body.email);
          const token = generateJWT(user._id, user.role);
          res.status(200).json({
            token: token
          });
        } else {
          res.status(401).json({
            error: "Invalid email and/or password."
          });
        }
      } catch (err) {
        next(err);
      }
    } else {
      res.status(400).json({
        error: "Email and password required to log in."
      });
    }
  } catch (err) {
    next(err);
  }
});

// Get a user by id. Only authenticated users may view their own data.
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user == req.params.id) {
      const user = await getUserById(req.params.id, false);
      res.status(200).json(user);
    } else {
      res.status(403).json({
        error: "Not authorized to view this resource."
      });
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
