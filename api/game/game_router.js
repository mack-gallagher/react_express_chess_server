const express = require('express');
const router = express.Router();
const { validate_token, check_player_status } = require('../auth/auth_middleware');
const { serve_game_hammered_board, get_valid_moves_and_captures, is_king_in_check, have_i_won } = require('./rules');

const Game = require('./game_model');

router.get('/', validate_token, async (req, res) => {
  const color = req.headers.authorization.id;
  const unhammered_board_state = await Game.board();
  const board_state = [];
  for (let i = 0; i < 64; i += 8) {
    board_state.push([]);
    for (let j = i; j-i < 8; j++) {
      board_state[i/8].push(unhammered_board_state[j]);
    } 
  }
  const curr_player = await Game.get_player_by_id(color);
  const active = curr_player.active;
  const captures = await Game.captures();

  const players = await Game.players();
  const num_players = players.length;
  let won = -1;
  if (players.some(x => x.won === 1)) {
    won = players.filter(x => x.won === 1)[0].id;
  }

  res.status(200).json({ board: board_state, color: color, active: active, captures: captures, num_players: num_players, won: won });
});

router.post('/', validate_token, check_player_status, async (req, res) => {
  const player = req.headers.authorization;
 
  res.status(200).json({ message: ':)' });
});

router.post('/reset', validate_token, async (req, res) => {
  await Game.reset_board();
  const unhammered_board_state = await Game.board();
  const board_state = [];
  for (let i = 0; i < 64; i += 8) {
    board_state.push([]);
    for (let j = i; j-i < 8; j++) {
      board_state[i/8].push(unhammered_board_state[j]);
    } 
  }

  res.status(200).json({ board: board_state });
  
})

router.post('/activate', validate_token, check_player_status, async (req, res) => {

  const board = await serve_game_hammered_board();
  const valid_moves_and_captures = get_valid_moves_and_captures(req.headers.authorization.id,req.body.pos[0],req.body.pos[1],board).valid_moves
                                    .concat(get_valid_moves_and_captures(req.headers.authorization.id,req.body.pos[0],req.body.pos[1],board).valid_captures);
  if (valid_moves_and_captures.length < 1) {
    res.status(400).json({ message: 'You cannot move that piece anywhere!' });
    return;
  }
  res.status(200).json({ validity: 1 });

});

router.post('/move', validate_token, check_player_status, async (req, res) => {
  const start_y = req.body.start[0];
  const start_x = req.body.start[1];
  const dest_y = req.body.destination[0];
  const dest_x = req.body.destination[1];
  const active_player = req.headers.authorization.id;
  const opposing_player = active_player===1?2:1;
  
  /* VALIDATING MOVE */

  const board = await serve_game_hammered_board();
  const valid_moves_and_captures = get_valid_moves_and_captures(active_player,start_y,start_x,board).valid_moves
                                    .concat(get_valid_moves_and_captures(active_player,start_y,start_x,board).valid_captures);
  console.log(valid_moves_and_captures);
  
  if (!valid_moves_and_captures.some(x => { return (x[0]===dest_y&&x[1]===dest_x); })) {
    res.status(400).json({ message: 'invalid move!' });
    return;
  }
  
  const lookahead = JSON.parse(JSON.stringify(board));
  lookahead[start_y][start_x].piece = null;
  lookahead[dest_y][dest_x].piece = board[start_y][start_x].piece;

  /* REMINDER: FUNCTIONS AVAILABLE ARE: serve_game_hammered_board, get_valid_moves_and_captures, is_king_in_check, have_i_won */

  if (is_king_in_check(active_player,lookahead)) {
    res.status(400).json({ message: 'invalid move!' });
    return;
  }

  if (is_king_in_check(opposing_player,lookahead)) {
    if (have_i_won(active_player,lookahead)) {
      res.status(400).json({ message: 'checkmate!' });
      return;
    }
  }



  /* END VALIDATING MOVE */

  if (board[dest_y][dest_x].piece) {
    await Game.append_to_captures(board[dest_y][dest_x].piece);    
  }


  try {
    await Game.move_piece(req.headers.authorization.id,req.body.start,req.body.destination);
  } catch (error) {
    console.error(error);
  }
  const new_board = await Game.board();
  res.status(200).json({ board: new_board });
});

module.exports = router;
