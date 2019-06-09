const chalk = require('chalk');
const path = require('path');
const express = require('express')
const app = express()

module.exports = (currentConfiguration, program) => {
    if (!currentConfiguration.distFolder)
        return console.log(chalk.red('No destination folder configured'));

    const port = program.port || currentConfiguration.webPort;
    app.get('/*', express.static(path.join(currentConfiguration.distFolder)));

    return new Promise((resolve, reject) => {
        app.listen(port, () => {
            console.log('serving your docsify site');
            console.log(`go to ${chalk.green('http://localhost:' + (program.port || currentConfiguration.webPort))}`);
        });
    });
};