process.title = 'selene-webui';

var http = require('http');
var nconf = require('nconf');
var node_static = require('node-static');
var repl = require('repl');
var winston = require('winston');

//////////////
// Settings //
//////////////

nconf.argv().env();

nconf.file(__dirname + '/config.json');

nconf.defaults({
  host: '0.0.0.0',
  port: 8080,
  silent: false,
  logLevelConsole: 'info',
  logLevelFile: 'info',
  logFile: __dirname + '/server.log',
  logFileSize: 100*1024,
  repl: false
});

var logger = new winston.Logger({
  transports: [
    new winston.transports.Console({
      level: nconf.get('logLevelConsole'),
      silent: nconf.get('silent'),
      timestamp: true,
      colorize: true
    }),
    new winston.transports.File({
      level: nconf.get('logLevelFile'),
      silent: nconf.get('silent'),
      timestamp: true,
      filename: nconf.get('logFile'),
      json: false,
      maxFiles: 1,
      maxsize: nconf.get('logFileSize'),
      tailable: true
    }),
  ]
});

winston.Logger.prototype.getHighestLogLevel = function() {
  var result = 0;
  
  for(var i in logger.transports) {
    result = Math.max(result, logger.levels[logger.transports[i].level || logger.level]);
  }
  
  return result;
}

var highest_log_level = logger.getHighestLogLevel();

process.on('uncaughtException', function (e) {
  logger.error('Uncaught ' + e.stack);
  process.exit(1);
});

/////////////////
// HTTP Server //
/////////////////

var file_server = new node_static.Server(__dirname + '/http');

var http_server = http.createServer(function(request, response) {
  request.on('end', function() {
    file_server.serve(request, response);
    logger.verbose(request.method + ' ' + request.url + ' - ' + response.statusCode);
  }).resume();
});

http_server.listen(nconf.get('port'), nconf.get('host'), function() {
  logger.info('HTTP server listening at http://' + http_server.address().address + ':' +  http_server.address().port + '/');
});

//////////
// REPL //
//////////

if(nconf.get('repl')) {
  var cli = repl.start({});
  
  cli.context.nconf              = nconf;
  cli.context.repl               = repl;
  cli.context.winston            = winston;
  
  cli.context.http_server = http_server;
  cli.context.logger = logger;
}
