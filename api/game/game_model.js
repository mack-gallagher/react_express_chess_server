const db = require('../../data/db_config');
const { initial_board } = require('../../data/seeds/01_initial_board');

function board() {
  return db('board');  
}

function players() {
  return db('players');
}

function get_player_by_id(id) {
  return db('players')
          .where({ id })
          .first();
}

const drop_all = async _ => {
  await db('captures')
          .truncate();
  return db('players')
          .truncate();
}

const move_piece = async (active_id,start,destination) => {             // TAKES: 1 2-elem arr representing the input 
  const piece_obj = await db('board')
                          .where({ y:start[0],x:start[1] })
                          .first();

  console.log('piece_obj:',piece_obj);

  const piece = piece_obj.piece;

  await db('board')
    .where({ y:start[0],x:start[1] })
    .update({ piece: '' })

  await db('board')
    .where({ y:destination[0],x:destination[1] })
    .update({ piece: piece });

  await db('players')
    .where({ id: active_id })
    .update({ active: 0 });

  return db('players')
    .where({ id: (active_id===1?2:1) })
    .update({ active: 1 });

}

const reset_board = async() => {
  await db('board')
          .truncate();
 
  return db('board')
          .insert(initial_board); 
}

const captures = _ => {
  return db('captures');
}

const append_to_captures = piece => {
  return db('captures')
          .insert({ piece: piece });
}

function win(id) {
  return db('players')
    .where({ id })
    .update({ won: 1 });
}

function add(player) {
  return db('players')
    .insert(player)
    .then(id => {
      return db('players');
    })
}


module.exports = { board, players, get_player_by_id, move_piece, reset_board, captures, append_to_captures, add, win, drop_all };
