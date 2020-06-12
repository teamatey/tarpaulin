const express = require('express');
const redis = require('redis');

const { connectToDatabase } = require('./lib/mongo');

const app = express();
const port = process.env.PORT || 8000;

const redisHost = process.env.REDIS_HOST || '192.168.99.100';
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient(redisPort, redisHost);

const rateWindow = 60000;
const rateRequests = 10;

function getUserTokenBucket(ip) {
  return new Promise( (resolve, reject) => {
    redisClient.hgetall(ip, (err, tokenBucket) => {
      if (err) {
        reject(err);
      } else {
        if (tokenBucket) {
          tokenBucket.tokens = parseFloat(tokenBucket.tokens);
        } else {
          tokenBucket = {
            tokens: rateRequests,
            last: Date.now()
          };
        }
        resolve(tokenBucket);
      }
    });
  });
}

function saveUserTokenBucket(ip, tokenBucket) {
  return new Promise( (resolve, reject) => {
    redisClient.hmset(ip, tokenBucket, (err, resp) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function applyRateLimit(req, res, next) {
  try {
    const tokenBucket = await getUserTokenBucket(req.ip);
    const timestamp = Date.now();
    const ellapsed = timestamp - tokenBucket.last;
    const newTokens = ellapsed * (rateRequests / rateWindow);
    tokenBucket.tokens += newTokens;
    tokenBucket.tokens = Math.min(
      tokenBucket.tokens,
      rateRequests
    );
    tokenBucket.last = timestamp;

    if (tokenBucket.tokens >= 1) {
      tokenBucket.tokens -= 1;
      /* Save the token bucket back to Redis. */
      await saveUserTokenBucket(req.ip, tokenBucket);
      next();
    } else {
      /* Save the token bucket back to Redis. */
      await saveUserTokenBucket(req.ip, tokenBucket);
      res.status(429).send({
        error: "Too many requests (10 allowed every minute)."
      });
    }
  } catch (err) {
    console.error(err);
    next();
  }
}

// Lazy rate limiting.
app.use(applyRateLimit);

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
