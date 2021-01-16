'use strict';
const mc = require('minecraft-protocol');
const connect = require('connect');
const childProcess = require('child_process');

const logger = require('./sleepingLogger').getLogger();
const settings = require('./sleepingSettings').getSettings();

let mcServer;
let mcProcess;

const startMinecraft = function () {
    logger.info(`----------- Starting Minecraft : ${settings.minecraftCommand} ----------- `);

    // settings.minecraftCommand = 'notepad';
    mcProcess = childProcess.execSync(settings.minecraftCommand, {
        stdio: "inherit"
    });

    logger.info('----------- Minecraft stopped -----------');
};

process.on('SIGINT', () => {
    logger.info('SIGINT signal received.');
    closeSleeping();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('SIGTERM  signal received.');
    closeSleeping();
    process.exit(0);
});

process.on('uncaughtException', function (err) {
    logger.warn(`Caught uncaughtException: ${JSON.stringify(err)}`);

    if (err.code === 'ECONNRESET') {
        logger.info('Connection reset client side... Keep on going.');
        return;
    }
    if (err.code === 'EADDRINUSE') {
        logger.info(`A server is already using the port ${settings.serverPort}. Kill it and restart the app.`)
    }
    if (err.message !== 'undefined'
        // && err.message.indexOf('handshaking.toServer')
    ) {
        logger.error('Something bad happened', err.message);
    }

    logger.info('...Exiting...');
    process.exit(1);
});

const initMain = function () {

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', function (text) {
        if (text.indexOf('quit') > -1) {
            closeServer();
        }
    });

    initServer();
};

const initServer = function () {
    mcServer = mc.createServer({
        'online-mode': settings.serverOnlineMode,
        encryption: false,
        // host: '0.0.0.0',
        motd: settings.serverName,
        port: settings.serverPort,
        version: settings.serverVersion,
        beforePing: function (reponse, client) {
            reponse.favicon = faviconString;
        }
    });

    logger.info(`Waiting for a Prince to come. [${settings.serverPort}] Or someone to type quit.`);

    mcServer.on('connection', function (client) {
        logger.info(`A Prince has taken a quick peek. [${client.protocolState}_${client.version}]`);
    });

    mcServer.on('listening', function (client) {
        logger.info('Ready for battle', client);
    });

    mcServer.on('login', function (client) {

        logger.info(`Prince [${client.username}.${client.state}] has come, time to wake up.`);

        client.on('end', function (client) {
            logger.info('The prince is gone, for now', client);
            closeServer();
        });
        logger.info('Sending best regards', settings.loginMessage);
        client.end(settings.loginMessage);

    });

    mcServer.on('error', function (error) {
        logger.info('Something went wrong in wonderland', error);
    });

};

const closeSleeping = function () {
    logger.info('Cleaning up the place.');

    if (mcServer !== undefined) {
        mcServer.close();
    }

    if (webServer !== undefined) {
        webServer.close();
    }
};

const closeServer = function () {

    closeSleeping();

    if (settings.startMinecraft > 0) {
        startMinecraft();

        logger.info('...Time to kill me if you want...');
        setTimeout(function () {
            logger.info('...Too late !...');
            initServer();
        }, 5000); // restart server
    }
};

initMain();
