var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  //res.render('turtle', { title: 'Express' });
  res.sendfile('views/turtle.html');
});

module.exports = router;
