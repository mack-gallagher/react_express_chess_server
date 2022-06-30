const express = require('express');
const router = express.Router();

const secret = require('./secrets');
const jwt = require('jsonwebtoken');

const { validate_new_player, validate_token } = require('./auth_middleware');
const Game = require('../game/game_model');

function generate_token(player) {
  const payload = {
                    id: player.id,
                    name: player.name,
                  };
  const options = {
                    expiresIn: '1d',
                  };
  return jwt.sign(payload, secret, options);
}

router.get('/', (req, res) => {
  Game.players()
    .then(result => {
      res.status(200).json(result);
      return;
    })
    .catch(err => {
      console.error(err);
    })
});

router.post('/', validate_new_player, async (req, res) => {

  const result = await Game.players();
 
  if (result.length > 1) {
    res.status(422).json({ message: 'Sorry, 2 players are already playing' });
    return;
  } else if (result.length > 0) {
    req.body.id = 2;
    req.body.active = 0;
  } else {
    req.body.id = 1;
    req.body.active = 1;
  }

  await Game.add(req.body);
        
  const token = generate_token(req.body);

  res.status(201).json({ message: 'Welcome to the game! Here is your token:',
                                  token });
                                       
  
});

module.exports = router;
