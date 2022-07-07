const db = require('../../data/db_config');

const get_all = _ => {
  return db('history');
}

const hash = (active_id,move_record) => {
  return db('history')
          .insert({ player: active_id,
                    move_record });
}

const clear = _ => {
  return db('history')
          .truncate();
}

const queen = async (piece) => {
  const history = await db('history');
  const last_id = history[history.length-1].id;
  const last_dest = history[history.length-1].move_record;

  return db('history')
          .where({ id: last_id })
          .update({ move_record: last_dest+piece });
}

module.exports = ({ get_all,
                    hash,
                    clear, 
                    queen });
