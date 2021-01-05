const express = require('express');
const morgan = require('morgan');

const app = express();

if (!process.env.NODE_ENV) app.use(morgan('dev'));

//JSON body parser middleware
app.use(express.json());

const router = express.Router();

router.route('/').get((req, res) => {
  res.send('Hi There!');
});

app.use('/api/v1', router);

module.exports = app;
