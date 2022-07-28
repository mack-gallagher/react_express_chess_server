const secret = require('./secrets');
const jwt = require('jsonwebtoken');
const Players = require('./players_model');

function validate_token(req, res, next) {

  const token = req.headers.authorization;
  console.log(token);

  if (!token) {
    res.status(403).json({ message: 'token required' });
    return;
  } else if (token.split('.').length !== 3
            || !jwt.verify(token,secret) ) {
    console.log('INVALID TOKEN: ',token);
    res.status(401).json({ message: 'token invalid!' });
    return;
  } else {
    console.log('VALID TOKEN: ',token);
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

module.exports = { validate_token, check_player_status };
