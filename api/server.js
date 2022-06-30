const express = require('express');
const cors = require('cors');

const auth_router = require('./auth/auth_router');
const game_router = require('./game/game_router');

server = express();
server.use(express.json());
server.use(cors());

server.use('/api/auth', auth_router);
server.use('/api/game', game_router);

server.get('/', (req, res) => {
  res.status(200).send('<h1>Hello! This is the SPX Chess API. Use an instance of the client to play!</h1>');
});

module.exports = server;
