# tarpaulin
API for a lightweight course management tool.

## Description

Tarpaulin is an API built to demonstrate Cloud Application Development skills. It features a Mongo database to maintain users, courses, assignments, and submissions. In addition to some trivial endpoints, this API allows one to download a course roster, create assignment submissions, fetch user data, and more. The application utilizes paginated responses, authorization (roles include admin, instructor, and student), and rate limiting.

## How to Run

1) Install Docker.

2) Run a MongoDB container. Example: `docker run -d --name mongo-server -p "27017:27017" -e "MONGO_INITDB_ROOT_USERNAME=root" -e "MONGO_INITDB_ROOT_PASSWORD=hunter2"	mongo:latest`

3) In the environment in which the API will run, set MongoDB environment variables. The required variables are shown with examples in `/lib/mongo.js`.

4) Run a Redis container. Example: `docker run -d --name redis-server -p 6379:6379 redis:latest`

5) In the environment in which the API will run, set Redis environment variables. The required variables are shown with examples in `/server.js`.

6) Finally, set the port in which the API will be made reachable. By default, this is set to 8000 in `/server.js`.

7) Run the API with `npm start`.
