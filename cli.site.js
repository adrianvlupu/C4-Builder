const chalk = require('chalk');

module.exports = currentConfiguration => {
    if (!currentConfiguration.distFolder)
        return console.log(chalk.red('No destination folder configured'));

    console.log('serving your site using docsify');
    console.log(`go to ${chalk.green('http://localhost:3000')}`);

    const { spawnSync } = require('child_process');
    const child = spawnSync(`docsify.cmd`, ['serve', currentConfiguration.distFolder]);
    return;
};