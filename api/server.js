const express = require('express');
const cors = require('cors');

const auth_router = require('./auth/auth_router');
const game_router = require('./game/game_router');

server = express();
server.use(express.json());
server.use(cors());

server.use('/api/auth', auth_router);
server.use('/api/game', game_router);

module.exports = server;
