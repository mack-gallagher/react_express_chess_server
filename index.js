const server = require('./api/server');

const PORT = process.env.port || 9000;

server.listen(PORT, () => {
  console.log(`server now listening on port ${PORT}!`);
});
