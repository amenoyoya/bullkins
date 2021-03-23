// process.env form .env
require('dotenv').config({path: `${__dirname}/../.env`});

// fastify server
const fastify = require('fastify')({
  logger: true,
  bodyLimit: 50 * 1024 * 1024, // payload limit => 50MB
});

/**
 * Job Queueing (Bullkins) API: /api/bullkins/*
 */
fastify.register(require('./api_bullkins'), {prefix: '/api/bullkins'});

// listen: http://localhost:8000/
const port = 8000;
fastify.listen(port, '0.0.0.0', () => {
  console.log(`Backend server\nListening on: http://localhost:${port}/`);
});