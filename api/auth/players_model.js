const db = require('../../data/db_config');

const get_all = _ => {
  return db('players');
}

const get_by_id = id => {
  return db('players')
          .where({ id })
          .first();
}

const add = async player => {
  await db('players')
          .insert(player);

  return db('players'); 
}

const drop_all = async _ => {
  await db('captures')
          .truncate();
  await db('board')
          .truncate();
  return db('players')
          .truncate();
}

const hand_off = async active_id => {
  await db('players')
    .where({ id: active_id })
    .update({ active: 0 })

  await db('players')
    .where({ id: active_id===1?2:1 })
    .update({ active: 1 })
}

const start_queening = active_id => {
  return db('players')
          .where({ id: active_id })
          .update({ queening: 1 });
}

const end_queening = active_id => {
  return db('players')
    .where({ id: active_id })
    .update({ queening: 0, active: 0 });
}

const kill_castle = (active_id,king_or_queen_side) => {
  return db('players')
    .where({ id: active_id })
    .update({ [king_or_queen_side==="kingside"?"castle_possible_kingside":"castle_possible_queenside"]: 0 });
}

const set_en_passant_vuln = (active_id,y,x) => {
  return db('players')
    .where({ id: active_id })
    .update({ en_passant_vuln_y: y, en_passant_vuln_x: x });
}

const win = id => {
  return db('players')
    .where({ id })
    .update({ won: 1 });
}

module.exports = {  get_all,
                    get_by_id,
                    add,
                    drop_all,
                    hand_off,
                    start_queening, 
                    end_queening,
                    kill_castle,
                    set_en_passant_vuln,
                    win  };
