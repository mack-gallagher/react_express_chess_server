const Game = require('./game_model');
const { valid_moves_per_piece } = require('./valid_moves_per_piece');

const black_pieces = ['♚','♛','♝','♜','♞','♟'];
const white_pieces = ['♔','♕','♗','♖','♘','♙'];

const serve_game_hammered_board = async () => {
  const unhammered_board = await Game.board();

  const board = [];
  for (let i = 0; i < 64; i += 8) {
    board.push([]);
    for (let j = i; j-i < 8; j++) {
      board[i/8].push({});
      board[i/8][j-i].piece = unhammered_board[j].piece;
      board[i/8][j-i].moves = [];
      board[i/8][j-i].captures = [];
    }
  }

  return board;
}

const get_valid_moves_and_captures = (active_player,y,x,board) => {
  const piece = board[y][x].piece;
  if (!piece) { console.log('no piece here!'); return { valid_moves: [], valid_captures: [] }; }

  const vuln_pieces = (active_player==1?black_pieces:white_pieces);
  const valid_moves = [];
  const valid_captures = [];

  console.log('vuln_pieces:');
  console.log(vuln_pieces);

  if (vuln_pieces.indexOf(piece) !== -1) { return { valid_moves: [], valid_captures: [] } };

  if (valid_moves_per_piece[piece].hasOwnProperty('captures')) {              // if I am a pawn

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
            && vuln_pieces.indexOf(board[y+forward_y][x+forward_x].piece) !== -1) {
          valid_captures.push([y+forward_y,x+forward_x]);                            // I shouldn't need to break because I can only capture one square ahead
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

function is_king_in_check(vuln_player,board) {
  const offensive_player = (vuln_player===2?1:2);
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
        if (get_valid_moves_and_captures(offensive_player,i,j,board).valid_captures.some(x => board[x[0]][x[1]].piece === vuln_king)) {
          return 1;
        }
      }
    }
  }

  return 0;

  
}


/* THIS ONE [have_i_won] HAS NOT BEEN PROPERLY VALIDATED */
/* TODO: MAKE THIS WORK */

function have_i_won(active_player,next_board) {

  const opposing_player = (active_player==='white'?'black':'white');
  const opposing_pieces = (opposing_player==='black'?black_pieces:white_pieces);

  let ephemeral_board = [];

  for (let i = 0; i < next_board.length; i++) {
    for (let j = 0; j < next_board[i].length; j++) {

      if (opposing_pieces.indexOf(next_board[i][j].piece) !== -1) {

        let { valid_moves, valid_captures } = get_valid_moves_and_captures(opposing_player,i,j,next_board);
        let moves_and_captures_arr_for_tmp_piece = valid_moves.concat(valid_captures);

        for (let x = 0; x < moves_and_captures_arr_for_tmp_piece.length; x++) {
          ephemeral_board = JSON.parse(JSON.stringify(next_board));

          console.log('ephemeral_board:');
          console.log(ephemeral_board);

          let move_y = moves_and_captures_arr_for_tmp_piece[x][0];
          let move_x = moves_and_captures_arr_for_tmp_piece[x][1];


          let ephemeral_piece = next_board[i][j].piece
          ephemeral_board[i][j].piece = '';
          ephemeral_board[move_y][move_x].piece = ephemeral_piece;

          if (is_king_in_check(opposing_player,ephemeral_board) === 0) {
            return 0; 
          }
          
        }
      }
    }
  }

  return 1;  
}

/* END WARNING */

module.exports = { serve_game_hammered_board, get_valid_moves_and_captures, is_king_in_check, have_i_won };
