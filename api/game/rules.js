const Game = require('./game_model');
const Players  = require('../auth/players_model');
const { valid_moves_per_piece } = require('./valid_moves_per_piece');

const black_pieces = ['♚','♛','♝','♜','♞','♟'];
const white_pieces = ['♔','♕','♗','♖','♘','♙'];

const get_valid_moves_and_captures = async (active_player,y,x,board) => {
  const opposing_player = (active_player===1?2:1);
  const piece = board[y][x].piece;
  if (!piece) { return { valid_moves: [], valid_captures: [] }; }

  const vuln_pieces = (active_player==1?black_pieces:white_pieces);
  const valid_moves = [];
  const valid_captures = [];

  if (vuln_pieces.indexOf(piece) !== -1) { return { valid_moves: [], valid_captures: [] } };

  if (valid_moves_per_piece[piece].hasOwnProperty('captures')) {              // if I am a pawn

    let en_passant_capture = [null,null];
    const them = await Players.get_by_id(opposing_player);
    if (them.en_passant_vuln_y) {
      en_passant_capture = [them.en_passant_vuln_y,them.en_passant_vuln_x];
    }

    for (let i = 0; i < valid_moves_per_piece[piece].captures.length; i++) {  // number of distinct WAYS I, a pawn, can capture
      let forward_y = 0;
      let forward_x = 0;
  
      for (let j = 0; j < valid_moves_per_piece[piece].propagate; j++) {
        forward_y += valid_moves_per_piece[piece].captures[i][0];
        forward_x += valid_moves_per_piece[piece].captures[i][1];
 
        if (y+forward_y >= 0
            && y+forward_y < 8
            && x+forward_x >= 0
            && x+forward_x < 8
            && (vuln_pieces.indexOf(board[y+forward_y][x+forward_x].piece) !== -1
                || en_passant_capture[0] === y+forward_y && en_passant_capture[1] === x+forward_x)) {
          valid_captures.push([y+forward_y,x+forward_x]);
          break;
        }
      }
      
    }

  }

  if (valid_moves_per_piece[piece].hasOwnProperty('captures') 
    && (((black_pieces.indexOf(piece) !== -1 && y === 1)
          && !board[y+1][x].piece && !board[y+2][x].piece)
        || ((white_pieces.indexOf(piece) !== -1 && y === 6)
          && !board[y-1][x].piece && !board[y-2][x].piece))) {
    (white_pieces.indexOf(piece) !== -1)?valid_moves.push([y-2,x]):valid_moves.push([y+2,x]);
  } 

  for (let i = 0; i < valid_moves_per_piece[piece].moves.length; i++) {   // ways I can move; this array is inclusive of ways I can capture if I am not a pawn

    let forward_y = 0;
    let forward_x = 0;

    for (let j = 0; j < valid_moves_per_piece[piece].propagate; j++) {

      forward_y += valid_moves_per_piece[piece].moves[i][0];
      forward_x += valid_moves_per_piece[piece].moves[i][1];

      if (y+forward_y >= 0
          && y+forward_y < 8
          && x+forward_x >= 0
          && x+forward_x < 8
          && !board[y+forward_y][x+forward_x].piece) {
        valid_moves.push([y+forward_y,x+forward_x]);
      } else if (y+forward_y >= 0
                  && y+forward_y < 8
                  && x+forward_x >= 0
                  && x+forward_x < 8
                  && !valid_moves_per_piece[piece].hasOwnProperty('captures')
                  && vuln_pieces.indexOf(board[y+forward_y][x+forward_x].piece) !== -1) {
        valid_captures.push([y+forward_y,x+forward_x]);
        break;
      } else {
        break;
      }
    
    }
      
  }

  return { valid_moves, valid_captures };
}

const is_king_in_check = async (vuln_player,board) => {
  const aggressing_player = (vuln_player===2?1:2);
  const opposing_pieces = (vuln_player===2?white_pieces:black_pieces);
  const vuln_king = (vuln_player===2?'♚':'♔');

  let vuln_king_pos = [0,0];
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (board[i][j] === vuln_king) {
        vuln_king_pos = [i,j];
      }
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      if (opposing_pieces.indexOf(board[i][j].piece) !== -1) {    // if the square I'm analyzing contains a piece that potentially threatens Vuln
        const z = await get_valid_moves_and_captures(aggressing_player,i,j,board);
        const vuln_king_search_field = z.valid_captures;
        if (vuln_king_search_field.some(x => board[x[0]][x[1]].piece === vuln_king)) {
          return 1;
        }
      }
    }
  }

  return 0;

  
}


const have_i_won = async (active_player,next_board) => {

  const vuln_player = (active_player===1?2:1);
  const vuln_pieces = (vuln_player===2?black_pieces:white_pieces);

  let ephemeral_board = [];

  for (let i = 0; i < next_board.length; i++) {
    for (let j = 0; j < next_board[i].length; j++) {

      if (vuln_pieces.indexOf(next_board[i][j].piece) !== -1) {

        const valid_moves_and_captures = await get_valid_moves_and_captures(vuln_player,i,j,next_board);
        let moves_and_captures_arr_for_tmp_piece = valid_moves_and_captures.valid_moves.concat(valid_moves_and_captures.valid_captures);

        for (let x = 0; x < moves_and_captures_arr_for_tmp_piece.length; x++) {
          ephemeral_board = JSON.parse(JSON.stringify(next_board));

          let move_y = moves_and_captures_arr_for_tmp_piece[x][0];
          let move_x = moves_and_captures_arr_for_tmp_piece[x][1];

          let ephemeral_piece = next_board[i][j].piece
          ephemeral_board[i][j].piece = '';
          ephemeral_board[move_y][move_x].piece = ephemeral_piece;

          if (is_king_in_check(vuln_player,ephemeral_board) === 0) {
            return 0; 
          }
          
        }
      }
    }
  }

  return 1;  
}

module.exports = { get_valid_moves_and_captures, is_king_in_check, have_i_won };
