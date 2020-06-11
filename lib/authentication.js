const jwt = require('jsonwebtoken');

const key = 'hunter2';

exports.generateJWT = function (id, role) {
  const payload = {
    sub: id,
    role: role
  };

  return jwt.sign(payload, key, { expiresIn: '24h' });
}

exports.authenticate = function (req, res, next) {
  let authenticationHeader = req.get('Authorization') || '';
  authenticationHeader = authenticationHeader.split(' ');

  const token = authenticationHeader[0] === 'Bearer' ?
    authenticationHeader[1] : null;

  try {
    const payload = jwt.verify(token, key);
    req.user = payload.sub;
    req.role = payload.role;
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({
      error: "Invalid authentication token."
    });
  }
};
