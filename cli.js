const figlet = require('figlet');
const program = require('commander');
const package = require('./package.json');
const chalk = require('chalk');
const path = require('path');

const Configstore = require('configstore');

const cmdHelp = require('./cli.help');
const cmdNewProject = require('./cli.new');
const cmdList = require('./cli.list');
const cmdSite = require('./cli.site');
const cmdCollect = require('./cli.collect');

const {
    clearConsole
} = require('./utils.js');

module.exports = async () => {
    let responses;

    program
        .version(package.version)
        .option('new', 'create a new project from template')
        .option('config', 'change configuration for the current directory')
        .option('list', 'display the current configuration')
        .option('reset', 'clear all configuration')
        .option('site', 'serve the generated site')
        .option('docs', 'a brief explanation for the available configuration options')
        .option('-p, --port <n>', 'port used for serving the generated site', parseInt)
        .parse(process.argv);

    let conf = { get: () => { } };
    if (!program.new)
        conf = new Configstore(process.cwd().split(path.sep).splice(1).join('_'), {}, { configPath: path.join(process.cwd(), '.c4builder') });

    if (program.docs)
        return cmdHelp();

    let currentConfiguration = {
        rootFolder: conf.get('rootFolder'),
        distFolder: conf.get('distFolder'),
        projectName: conf.get('projectName'),
        generateMD: conf.get('generateMD'),
        includeNavigation: conf.get('includeNavigation'),
        includeTableOfContents: conf.get('includeTableOfContents'),
        generateCompleteMD: conf.get('generateCompleteMD'),
        generatePDF: conf.get('generatePDF'),
        generateCompletePDF: conf.get('generateCompletePDF'),
        generateWEB: conf.get('generateWEB'),
        homepageName: conf.get('homepageName'),
        generateLocalImages: conf.get('generateLocalImages'),
        includeLinkToDiagram: conf.get('includeLinkToDiagram'),
        includeBreadcrumbs: conf.get('includeBreadcrumbs'),
        webTheme: conf.get('webTheme'),
        webPort: conf.get('webPort'),
        repoUrl: conf.get('repoUrl'),
        pdfCss: conf.get('pdfCss'),
        diagramsOnTop: conf.get('diagramsOnTop'),
        hasRun: conf.get('hasRun')
    }

    if (program.new || program.config || !currentConfiguration.hasRun)
        clearConsole();

    console.log(chalk.blue(figlet.textSync('c4builder')));
    console.log(chalk.gray('Blow up your software documentation writing skills'));

    if (!currentConfiguration.hasRun && !program.new) {
        console.log(`\nif you created the project using the 'c4model new' command you can just press enter and go with the default options to get a basic idea of how it works.\n`);
        console.log(`you can always change the configuration by running > c4builder config\n`);
    }

    if (program.new)
        return cmdNewProject();
    if (program.list)
        return cmdList(currentConfiguration);

    if (program.site)
        return await cmdSite(currentConfiguration, program);

    if (program.reset) {
        conf.clear();
        console.log(`configuration was reset`);
        return;
    }

    await cmdCollect(currentConfiguration, conf, program);

    if (!program.config) {
        conf.set('hasRun', true);

        return conf;
    }
};