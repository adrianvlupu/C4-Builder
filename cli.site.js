const chalk = require('chalk');
const path = require('path');

module.exports = (currentConfiguration, program) => {
    if (!currentConfiguration.distFolder)
        return console.log(chalk.red('No destination folder configured'));

    console.log('serving your docsify site');
    console.log(`go to ${chalk.green('http://localhost:' + (program.port || currentConfiguration.webPort))}`);

    const { spawnSync } = require('child_process');
    const child = spawnSync(`node`, [path.join(__dirname, 'node_modules', 'http-server', 'bin', 'http-server'), currentConfiguration.distFolder, '-p ' + (program.port || currentConfiguration.webPort)]);
    return;
};