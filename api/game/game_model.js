const db = require('../../data/db_config');
const { initial_board } = require('../../data/seeds/01_initial_board');

const hammered_board = async () => {
  const unhammered_board = await db('board');

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

const reset_board = async() => {
  await db('captures')
          .truncate();

  await db('board')
          .truncate();
 
  return db('board')
          .insert(initial_board); 
}

const move_piece = async (active_id,start,destination) => {
  const piece_obj = await db('board')
                          .where({ y:start[0],x:start[1] })
                          .first();
const piece = piece_obj.piece;

  await db('board')
    .where({ y:start[0],x:start[1] })
    .update({ piece: '' })

  await db('board')
    .where({ y:destination[0],x:destination[1] })
    .update({ piece: piece });

}

const remove_piece = pos => {
  return db('board')
    .where({ y: pos[0], x: pos[1] })
    .update({ piece: '' });
}

const queen = (pos,new_piece) => {
  return db('board')
          .where({ y: pos[0], x: pos[1] })
          .update({ piece: new_piece });
}

const captures = _ => {
  return db('captures');
}

const append_to_captures = piece => {
  return db('captures')
          .insert({ piece: piece });
}

const castle = async(active_id,king_or_queen_side) => {
  if (active_id === 1 
      && king_or_queen_side === "kingside") {
    await db('board')
            .where({ y: 7, x: 4 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 7, x: 7 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 7, x: 6 })
            .update({ piece: '♔' })
    return db('board')
            .where({ y: 7, x: 5 })
            .update({ piece: '♖' });
  } else if (active_id === 1 
              && king_or_queen_side === "queenside") {
    await db('board')
            .where({ y: 7, x: 4 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 7, x: 0 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 7, x: 2 })
            .update({ piece: '♔' })
    return db('board')
            .where({ y: 7, x: 3 })
            .update({ piece: '♖' });
  } else if (active_id === 2
              && king_or_queen_side === "kingside") {
    await db('board')
            .where({ y: 0, x: 4 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 0, x: 7 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 0, x: 6 })
            .update({ piece: '♚' });
    return db('board')
            .where({ y: 0, x: 5 })
            .update({ piece: '♜' });
  } else if (active_id === 2
              && king_or_queen_side === "queenside") {
    await db('board')
            .where({ y: 0, x: 4 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 0, x: 0 })
            .update({ piece: '' });
    await db('board')
            .where({ y: 0, x: 2 })
            .update({ piece: '♚' });
    return db('board')
            .where({ y: 0, x: 3 })
            .update({ piece: '♜' });
  } else {
    return -1;
  }
}

module.exports = {  hammered_board,
                    reset_board,
                    move_piece,
                    remove_piece,
                    queen,
                    captures,
                    append_to_captures,
                    castle };
