exports.up = function(knex) {
  return knex.schema
    .createTable('players', tbl => {
      tbl.integer('id')
          .unique();
      tbl.varchar('name')
        .unique()
        .notNullable();
      tbl.integer('active')
        .notNullable();
      tbl.integer('queening')
        .notNullable();
      tbl.integer('castle_possible_kingside')
        .notNullable(); 
      tbl.integer('castle_possible_queenside')
        .notNullable();
      tbl.integer('en_passant_vuln_y');
      tbl.integer('en_passant_vuln_x');
      tbl.integer('won')
        .notNullable();
    })
    .createTable('board', tbl => {
      tbl.integer('y')
        .notNullable();
      tbl.integer('x')
        .notNullable();
      tbl.varchar('piece');
      tbl.primary(['y','x']);
    })
    .createTable('captures', tbl => {
      tbl.increments();
      tbl.varchar('piece')
          .notNullable();
    })
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('captures')
    .dropTableIfExists('board')
    .dropTableIfExists('players');
};

