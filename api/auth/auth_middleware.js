const secret = require('./secrets');
const jwt = require('jsonwebtoken');
const Players = require('./players_model');

function validate_new_player(req, res, next) {
  if (Object.entries(req.body).length !== 1) {
    res.status(400).json({ message: 'Incoming players must have only a name' });
    return;
  } else if (!req.body.hasOwnProperty('name')) {
    res.status(400).json({ message: 'Incoming players must have a name' });
    return;
  } else if (req.body.name.length < 1) {
    res.status(400).json({ message: 'Game names must have content' });
    return;
  }

  req.body.won = 0;

  next();
}

function validate_token(req, res, next) {

  const token = req.headers.authorization;

  if (!token) {
    res.status(403).json({ message: 'token required' });
    return;
  } else if (token.split('.').length !== 3
            || !jwt.verify(token,secret) ) {
    res.status(401).json({ message: 'token invalid!' });
    return;
  } else {
    req.headers.authorization = jwt.verify(token,secret);
    next();
  }

};

const check_player_status = async (req, res, next) => {
  const response = await Players.get_by_id(req.headers.authorization.id);
  if (!response) {
    res.status(403).json({ message: 'Wait a minute...who ARE you?!?' });
    return;
  }
  const its_my_turn = response.active;
  if (!its_my_turn) {
    res.status(403).json({ message: 'Not your turn!' });
    return;
  }
  if (req.headers.authorization.id == 1) {
  } else if (req.headers.authorization.id == 2) {
  } else {
    res.status(403).json({ message: "Sorry, game server is occupied" });
    return;
  }

  next();
};

module.exports = { validate_new_player, validate_token, check_player_status };
