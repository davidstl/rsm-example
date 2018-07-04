// Imports
var net = require('net');
var log4js = require('log4js');

log4js.configure({
	appenders: {
		out: {type: 'stdout', layout: {type: 'basic'}},
		app: {type: 'file', layout: {type: 'basic'}, filename: '/log/turnbased.log', maxLogSize: 10485760, backups: 5}
	},
	categories: {
		default: {appenders: ['out', 'app'], level: 'debug'}
	}
});

var logger = log4js.getLogger('main');

var ConnectionManager = require('./ConnectionManager.js');

// Constants
var PORT = 9306;

// Create our TCP server
var server = net.createServer();
server.listen(PORT);
logger.info("TCP server listning on port " + PORT);

// Receive connections
server.on('connection', function(socket)
{
	try
	{
		logger.info("Received connection - " + socket.remoteAddress + ":" + socket.remotePort);
		ConnectionManager.createConnection(socket);
	}
	catch (e)
	{
		logger.error("Exception: " + e);
	}
});
