const express = require('express');

const { connectToDatabase } = require('./lib/mongo');

const app = express();
const port = process.env.PORT || 8000;

// Route to the api folder for all requests.
app.use(express.json());
app.use('/', require('./api'));

// Catch-all for server errors (when err is included in the callback).
app.use('*', (err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: "Server error. Please try your request again."
  });
});

// Catch-all for any path or resource not found in the api folder.
app.use('*', (req, res, next) => {
  res.status(404).json({
    error: "Requested resource " + req.originalUrl + " does not exist."
  });
});

// Connect to the mongo database and begin listening.
connectToDatabase(async () => {
  app.listen(port, () => {
    console.log("== Server is running on port " + port + ".");
  });
});
