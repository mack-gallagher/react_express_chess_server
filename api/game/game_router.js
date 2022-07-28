const express = require('express');
const router = express.Router();
const { validate_token, 
        check_player_status } = require('../auth/auth_middleware');
const { piece_to_id_and_letter,
        to_algebraic_notation,
        get_valid_moves_and_captures, 
        is_king_in_check, 
        have_i_won } = require('./rules');

const Game = require('./game_model');
const Players = require('../auth/players_model');
const History = require('./history_model');

router.get('/', validate_token, async (req, res) => {
  const color = req.headers.authorization.id;
  const board = await Game.hammered_board();
  const curr_player = await Players.get_by_id(color);
  if (!curr_player) {
    res.status(403).json({ message: "Player not recognized" });
    return;
  }
  const active = curr_player.active;
  const queening = curr_player.queening;  
  const castle_possible_kingside = curr_player.castle_possible_kingside;
  const castle_possible_queenside = curr_player.castle_possible_queenside;
  const en_passant_y = curr_player.en_passant_y;
  const en_passant_x = curr_player.en_passant_x;
  const captures = await Game.captures();
  const players = await Players.get_all();
  const num_players = players.length;
  const history = await History.get_all();
  let won = -1;
  if (players.some(x => x.won === 1)) {
    won = players.filter(x => x.won === 1)[0].id;
  }
  res.status(200).json({  board,
                          color,  
                          active,
                          captures,
                          num_players,
                          history,
                          won,
                          queening,
                          castle_possible_kingside,
                          castle_possible_queenside,
                          en_passant_y,
                          en_passant_x, });
   
});

router.post('/dump', validate_token, async (req, res) => {
  await Game.reset_board(); // necessary to REPLACE pieces
  await Players.drop_all();
  res.status(200).json({ message: 'Game dropped!' });
});

router.post('/reset', validate_token, async (req, res) => {
  await Game.reset_board();
  const board_state = await Game.hammered_board();
  res.status(200).json({ board: board_state });
  
})

router.post('/activate', validate_token, check_player_status, async (req, res) => {
  const active_player = req.headers.authorization.id;
  const y = req.body.pos[0];
  const x = req.body.pos[1];

  const board = await Game.hammered_board();

  const valid_moves_and_captures_obj = await get_valid_moves_and_captures(active_player,y,x,board);

  const valid_moves_and_captures = valid_moves_and_captures_obj.valid_moves.concat(valid_moves_and_captures_obj.valid_captures);

  if (valid_moves_and_captures.length < 1) {
    res.status(400).json({ message: 'You cannot move that piece anywhere!' });
    return;
  }
  res.status(200).json({ validity: 1 });
});

router.post('/move', validate_token, check_player_status, async (req, res) => {
  const start = req.body.start;
  const start_y = req.body.start[0];
  const start_x = req.body.start[1];
  const destination = req.body.destination;
  const dest_y = req.body.destination[0];
  const dest_x = req.body.destination[1];
  const active_player = req.headers.authorization.id;
  const opposing_player = active_player===1?2:1;
  const board = await Game.hammered_board();
  const piece = board[start_y][start_x].piece;
  let pawn_file = '';
  if (piece === '♙'
      || piece === '♟') {
    pawn_file = to_algebraic_notation(start)[0]; // access first part of string
  }

  const valid_moves_and_captures_obj = await get_valid_moves_and_captures(active_player,start_y,start_x,board);

  const valid_moves_and_captures = valid_moves_and_captures_obj.valid_moves.concat(valid_moves_and_captures_obj.valid_captures);
 
  if (!valid_moves_and_captures.some(x => { return (x[0]===dest_y&&x[1]===dest_x); })) {
    res.status(400).json({ message: 'invalid move!' });
    return;
  }
  const lookahead = JSON.parse(JSON.stringify(board));
  lookahead[start_y][start_x].piece = null;
  lookahead[dest_y][dest_x].piece = board[start_y][start_x].piece;
  const i_am_moving_into_check = await is_king_in_check(active_player,lookahead);
  if (i_am_moving_into_check) {
    res.status(400).json({ message: 'invalid move! [king in check]' });
    return;
  }
  const i_am_checking_them = await is_king_in_check(opposing_player,lookahead);
  if (i_am_checking_them) {
    if (have_i_won(active_player,lookahead) === 1) {
      await Players.win(active_player);
      return;
    }
  }
 
  let capturing = 0; 
  let en_passant = 0;
  const player_for_en_passant_check = await Players.get_by_id(opposing_player);
  const en_passant_capture = [player_for_en_passant_check.en_passant_vuln_y,player_for_en_passant_check.en_passant_vuln_x];
  if (en_passant_capture[0]===dest_y
      && en_passant_capture[1]===dest_x) {
    capturing = 1;
    en_passant = 1;
    if (active_player===1) {
      await Game.append_to_captures(board[dest_y+1][dest_x].piece);
      await Game.remove_piece([dest_y+1,dest_x]);
    } else {
      await Game.append_to_captures(board[dest_y-1][dest_x].piece);
      await Game.remove_piece([dest_y-1,dest_x]);
    }
  } else {
    if (board[dest_y][dest_x].piece) {
      capturing = 1;
      await Game.append_to_captures(board[dest_y][dest_x].piece);    
    }
  }

  if ((active_player === 1 
       && board[start_y][start_x].piece === '♙' 
      && dest_y === 0)
      || (active_player === 2 
          && board[start_y][start_x].piece === '♟' 
          && dest_y === 7)) {
    await Game.move_piece(active_player,req.body.start,req.body.destination);
    await Players.start_queening(active_player);
    const letter = piece_to_id_and_letter(piece)[1];
    const algebraic_destination = to_algebraic_notation(destination);
    let move_record = '';
    if (capturing) {
      move_record = letter + 'x' + algebraic_destination;  // we can't be queening and en passant at the same time!
    } else {
      move_record = letter + algebraic_destination;
    }
    await History.hash(active_player,move_record);
    const new_board = await Game.hammered_board();
    res.status(200).json({ board: new_board, queening: 1 });
    return;
  }
  try {
    if (piece === (active_player===1?'♖':'♜')
        && start_y === (active_player===1?7:0)
        && start_x === 7) {
      await Players.kill_castle(active_player,"kingside");
    } else if (piece === (active_player===1?'♖':'♜')
        && start_y === (active_player===1?7:0)
        && start_x === 0) {
      await Players.kill_castle(active_player,"queenside");
    } else if (piece === (active_player===1?'♔':'♚')) { 
      await Players.kill_castle(active_player,"kingside");
      await Players.kill_castle(active_player,"queenside");
    }
    await Game.move_piece(active_player,req.body.start,req.body.destination);
    const letter = piece_to_id_and_letter(piece)[1];
    const algebraic_destination = to_algebraic_notation(destination);
    let move_record = '';
    if (capturing) {
      if (en_passant) {
        move_record = pawn_file + letter + 'x' + algebraic_destination;
      } else {
        move_record = letter + 'x' + algebraic_destination;
      }
    } else {
      move_record = letter + algebraic_destination;
    }
    await History.hash(active_player,move_record);
    await Players.hand_off(active_player);
  } catch (error) {
    console.error(error);
  }
  if (piece==='♙'
      && start_y-dest_y === 2) {
    await Players.set_en_passant_vuln(active_player,start_y-1,start_x);
  } else if (piece === '♟'
      && dest_y-start_y === 2) {
    await Players.set_en_passant_vuln(active_player,dest_y-1,start_x);
  } else {
    await Players.set_en_passant_vuln(active_player,null,null);
  }
  const new_board = await Game.hammered_board();
  res.status(200).json({ board: new_board });
});


router.post(`/queen`, validate_token, check_player_status, async (req, res) => {
  const active_player = req.headers.authorization.id;
  const opposing_player = active_player===1?2:1;
  const new_piece = req.body.new_piece;
  const new_board = await Game.queen(req.body.pos,new_piece);

  const new_new_board = await Game.hammered_board();

  if (is_king_in_check(opposing_player,new_new_board)) {
    if (have_i_won(active_player,new_new_board) === 1) {
      const winner = await Players.win(active_player);
      res.status(200).json({ message: `${winner} wins!` });
      return;
    }
  }
  await Players.end_queening(active_player);
  await History.queen(new_piece);
  await Players.hand_off(active_player);
  res.status(200).json({ board: new_board });
});

router.post('/castle', validate_token, check_player_status, async (req, res) => {
  
  const active_player = req.headers.authorization.id;
  const king_or_queen_side = req.body.king_or_queen_side;
  const curr_board = await Game.hammered_board();

  let castle_possible = 0;
  if (king_or_queen_side === "kingside") {
    castle_possible = (active_player===1)?
                         (curr_board[7][4].piece==='♔'
                           &&curr_board[7][7].piece==='♖'
                           &&!curr_board[7][6].piece
                           &&!curr_board[7][5].piece)
                         :(curr_board[0][4].piece==='♚'
                           &&curr_board[0][7].piece==='♜'
                           &&!curr_board[0][6].piece
                           &&!curr_board[0][5].piece);
  } else {
    castle_possible = (active_player===1)?
                         (curr_board[7][4].piece==='♔'
                           &&curr_board[7][0].piece==='♖'
                           &&!curr_board[7][1].piece
                           &&!curr_board[7][2].piece
                           &&!curr_board[7][3].piece)
                         :(curr_board[0][4].piece==='♚'
                           &&curr_board[0][0].piece==='♜'
                           &&!curr_board[0][1].piece
                           &&!curr_board[0][2].piece
                           &&!curr_board[0][3].piece);
  }
  if (!castle_possible) {
    res.status(400).json({ message: 'Invalid castle request' });
    return;
  }
  await Game.castle(active_player,king_or_queen_side);
  await Players.kill_castle(active_player,"kingside");
  await Players.kill_castle(active_player,"queenside");
  let move_record = king_or_queen_side==="kingside"?"0-0":"0-0-0";
  await History.hash(active_player,move_record);
  await Players.hand_off(active_player);
  const new_board = await Game.hammered_board();
  res.status(200).json({ board: new_board });
});

module.exports = router;
