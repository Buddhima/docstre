var express = require('express');
var router = express.Router();

var http = require('http');

var config = require('../config.json');
var davConfig = config.dav_server;
var editorConfig = config.onlyoffice;
var docstreConfig = config.docstre;

var sess;

/* GET editor page. */
router.get('/', function(req, res) {
  console.log('document open request');

  var relUri = req.query.fileUri;

  if (relUri == '') res.send({"error" : "no file uri found!"});

  // file name related extration
  var fileNameParts = getCompleteFileName(relUri).split(".");
  var fileExt = fileNameParts.pop(); // get last part as extension
  var fileName = fileNameParts.join('.');

  if ((fileExt == '') || (fileName == '')) res.send({"error" : "invalid file name!"});

  // how editor can access Docstre
  var docstreLocation = 'http://' + editorConfig.docstreHost + ':' + editorConfig.docstrePort;

  // Generated key is saved in session & recheck when saving
  var fileKey = 'key_' + Date.now() + '_' + Math.floor((Math.random() * 10));
  // console.log('hash: ' + fileKey);

  sess = req.session;
  sess[fileKey] = relUri;

  if(getDocumentType(fileExt) == undefined) {
    // res..write("No supported viewer found for " + fileExt + " files");
    res.send({"error" : 404, "message" : "No supported viewer found for " + fileExt + " files"});
  }

  var argss = {
            apiUrl: editorConfig.apiUrl,
            file: {
                name: fileName,
                ext: fileExt,
                title: fileName + '.' + fileExt,
                uri: docstreLocation + '/editor/file_get?fileUri=' + relUri
            },
            editor: {
                type: "desktop",
                documentType: getDocumentType(fileExt),
                key: fileKey,
                callbackUrl: docstreLocation + '/editor/file_callback',
                mode: "edit",
                getServerUrl: docstreLocation,
                lang: editorConfig.lang,
                userid: generateUserId(docstreConfig.user.firstname, docstreConfig.user.lastname),
                firstname: docstreConfig.user.firstname,
                lastname: docstreConfig.user.lastname
            }
        };

  console.log(JSON.stringify(argss));

  res.render('editor', argss);
});

// get file name from a url
function getCompleteFileName(str) {
  return str.substring(str.lastIndexOf("/") + 1, str.length);
}

// generate identifier for the user
function generateUserId(firstname, lastname) {
  var stringToReplace = (firstname + '_' + lastname).toLowerCase();
  return stringToReplace.replace(/[^\w]/gi, '');
}

// identify document type from extension
var documentExts = [".docx", ".doc", ".odt", ".rtf", ".txt", ".html", ".htm", ".mht", ".pdf", ".djvu", ".fb2", ".epub", ".xps"];
var spreadsheetExts = [".xls", ".xlsx", ".ods", ".csv"];
var presentationExts = [".pps", ".ppsx", ".ppt", ".pptx", ".odp"];

function getDocumentType(ext) {
  ext = '.' + ext;

  if (documentExts.indexOf(ext) != -1) return "text";
  if (spreadsheetExts.indexOf(ext) != -1) return "spreadsheet";
  if (presentationExts.indexOf(ext) != -1) return "presentation";
}

/* get file for editing */
router.get('/file_get', function(req, res) {
  console.log('file_get request received');
  console.log(req.protocol + '://' + req.get('host') + req.originalUrl);

  var fileUri = req.query.fileUri;

  var options = {
    host : davConfig.host,
    port : davConfig.port,
    path : encodeUriFileNameOnly(fileUri),
    auth : davConfig.username + ':' + davConfig.password,
    agent : false
  };

  // console.log('HEADERS: ' + JSON.stringify(options));  

  // read from WebDAV-server and write back response
  http.request(options, function(proxy_response) {

    /*proxy_response.on('data', function (chunk) {res.write(chunk, 'binary');});
    proxy_response.on('end', function () {res.end();});*/

    res.writeHead(proxy_response.statusCode, proxy_response.headers);

    // pipe response from  webDAV server to editor's response
    proxy_response.pipe(res);

  }).end();
  
});

// only the file name get encoded in base-64
function encodeUriFileNameOnly(fileUri) {
  var rawFileName = getCompleteFileName(fileUri);
  return fileUri.replace(rawFileName, encodeURIComponent(rawFileName));
}

/* get file for editing */
router.post('/file_callback', function(req, res) {
  console.log('file_callback POST request received');

  console.log(req.body);

 
  if(req.body.status == 2 || req.body.status == 3) {
    var fileKey = req.body.key;
  
    var fileUri = sess[fileKey];
    var fileNameEncodedUri = encodeUriFileNameOnly(fileUri);

    // remove value from session
    delete sess[fileKey];

    // console.log('Found:' + fileNameEncodedUri);

    var downloadUrl = req.body.url;

    var put_options = {
      method : 'PUT',
      host : davConfig.host,
      port : davConfig.port,
      path : fileNameEncodedUri,
      auth : davConfig.username + ':' + davConfig.password,
      agent : false
    };

    var put_request = http.request(put_options, function(response) {});

    // pipe file from Editing Service to WebDAV server as a new version
    var get_request = http.get(downloadUrl, function(response) {

      response.pipe(put_request);

    }).end();   
  }

  // respond to editor's Editing Service
  res.write("{\"error\":0}");
  res.end();

});

module.exports = router;
