var express = require('express');
var router = express.Router();

var http = require('http');

var config = require('../config.json').dav_server;

var xml2js = require('xml2js');
var parser = new xml2js.Parser();

/* copy a single file */
router.post('/copy', function(req, res) {
  console.log('copy request');
  res.send('not implemented yet');
});

/* delete a single file */
router.post('/delete', function(req, res) {
  console.log('delete request');
  res.send('not implemented yet');
});

/* get a single file */
router.post('/download', function(req, res) {
  console.log('download request');
  res.send('not implemented yet');
});

/* 
get folder listing. 
param body {"path":"/owncloud/..../file_name.ext"} - optional
*/
router.post('/list_folder', function(req, res) {
  console.log('list folder request');

  var pathToDir = ((req.body.path) ? req.body.path : config.rootPath);

  var options = {
  	method : 'PROPFIND',
  	host : config.host,
  	port : config.port,
  	path : pathToDir,
    auth : config.username + ':' + config.password,
    agent : false,
  	headers : {
  		'Content-Type' : 'application/xml',
  		'depth' : '1'
  	}
  };

  var callback = function(response) {
  	var body = '';

  	response.on('data', function(chunk) {
  		body += chunk;
  	});

  	response.on('end', function() {
  		//console.log(body);
  		jsonObjectConverter(body, function(err, result) {
  			res.send(result["d:multistatus"]["d:response"]);
  		});

  	});
  };

  var davRequest = http.request(options, callback);
  davRequest.write('<?xml version="1.0" encoding="utf-8" ?><propfind xmlns="DAV:"><allprop/></propfind>');
  davRequest.end();

});

/* convert xml string and invoke the callback */
var jsonObjectConverter = function(xmlData, callback) {
	parser.parseString(xmlData, function(err, result) {
		//console.log(xmlData);
		callback(err, JSON.parse(JSON.stringify(result)));
	});

};

/* move a single file */
router.post('/move', function(req, res) {
  console.log('move request');
  res.send('not implemented yet');
});

module.exports = router;
