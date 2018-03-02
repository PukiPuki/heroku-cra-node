const express = require('express');
const path = require('path');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;

const PORT = process.env.PORT || 5000;

const { Client } = require('pg');

const databaseURL = process.env.DATABASE_URL;
const client = new Client();

// Multi-process to utilize all CPU cores.
if (cluster.isMaster) {
  console.error(`Node cluster master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.error(`Node cluster worker ${worker.process.pid} exited: code ${code}, signal ${signal}`);
  });

} else {
  const app = express();

  // Priority serve any static files.
  app.use(express.static(path.resolve(__dirname, '../react-ui/build')));

  // Answer API requests.
  app.get('/api', function (req, res) {

      client.connect();
      client.query('SELECT * FROM core_bids', (err, result) => {
          console.log(err ? err.stack : result.rows[0].message) // Hello World!
          res.send(result.rows[0].message);
          client.end()
      })

  });

  app.get('/api/test', function (req, res) {
  });

  // All remaining requests return the React app, so it can handle routing.
  app.get('*', function(request, response) {
    response.sendFile(path.resolve(__dirname, '../react-ui/build', 'index.html'));
  });

  app.listen(PORT, function () {
    console.error(`Node cluster worker ${process.pid}: listening on port ${PORT}`);
  });
}
