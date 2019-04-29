const figlet = require('figlet');
const inquirer = require('inquirer');
const joi = require('joi');
const program = require('commander');
const package = require('./package.json');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const help = require('./help');
const newProject = require('./newProject');
const Configstore = require('configstore');

const {
    makeDirectory,
    clearConsole
} = require('./utils.js');

const validate = (schema) => answers => {
    return !(joi.validate(answers, schema).error);
};

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
        .parse(process.argv);

    let conf = { get: () => { } };
    if (!program.new)
        conf = new Configstore(process.cwd().split(path.sep).splice(1).join('_'), {}, { configPath: path.join(process.cwd(), '.c4builder') });

    if (program.docs)
        return help();

    let rootFolder = conf.get('rootFolder');
    let distFolder = conf.get('distFolder');
    let projectName = conf.get('projectName');
    let generateMD = conf.get('generateMD');
    let includeNavigation = conf.get('includeNavigation');
    let includeTableOfContents = conf.get('includeTableOfContents');
    let generateCompleteMD = conf.get('generateCompleteMD');
    let generatePDF = conf.get('generatePDF');
    let generateCompletePDF = conf.get('generateCompletePDF');
    let generateWEB = conf.get('generateWEB');
    let homepageName = conf.get('homepageName');
    let generateLocalImages = conf.get('generateLocalImages');
    let includeLinkToDiagram = conf.get('includeLinkToDiagram');
    let includeBreadcrumbs = conf.get('includeBreadcrumbs');
    let webTheme = conf.get('webTheme');
    let repoUrl = conf.get('repoUrl');
    let pdfCss = conf.get('pdfCss');

    let hasRun = conf.get('hasRun');

    if (program.new || program.config || !hasRun)
        clearConsole();
    console.log(chalk.blue(figlet.textSync('c4builder')));
    console.log(chalk.gray('Blow up your software documentation writing skills'));

    if (!hasRun && !program.new) {
        console.log(`\nif you created the project using the 'c4model new' command you can just press enter and go with the default options to get a basic idea of how it works.\n`);
        console.log(`you can always change the configuration by running > c4builder config\n`);
    }

    if (program.new) {
        console.log('\nThis will create a new folder with the name of the project');
        return newProject();
    }

    if (program.list) {
        console.log(`\nCurrent configuration`);
        console.log(`\nProject Name: ${projectName ? chalk.green(projectName) : chalk.red('not set')}`);
        console.log(`Homepage Name: ${homepageName ? chalk.green(homepageName) : chalk.red('not set')}`);
        console.log(`Root Folder: ${rootFolder ? chalk.green(rootFolder) : chalk.red('not set')}`);
        console.log(`Destination Folder: ${distFolder ? chalk.green(distFolder) : chalk.red('not set')}`);

        console.log(`Generate multiple markdown files: ${generateMD !== undefined ? chalk.green(generateMD) : chalk.red('not set')}`);
        if (generateMD) {
            console.log(`  include basic navigation: ${chalk.green(includeNavigation || false)}`);
            console.log(`  include table of contents: ${chalk.green(includeTableOfContents || false)}`);
        }
        console.log(`Generate a single complete markdown file: ${generateCompleteMD !== undefined ? chalk.green(generateCompleteMD) : chalk.red('not set')}`)
        console.log(`Generate multiple pdf files: ${generatePDF !== undefined ? chalk.green(generatePDF) : chalk.red('not set')}`);
        console.log(`Generate a single complete pdf file: ${generateCompletePDF !== undefined ? chalk.green(generateCompletePDF) : chalk.red('not set')}`);
        if (generatePDF || generateCompletePDF)
            console.log(`Custom pdf css: ${pdfCss ? chalk.green(pdfCss) : chalk.red('not set')}`);
        console.log(`Generate website: ${generateWEB !== undefined ? chalk.green(generateWEB) : chalk.red('not set')}`);
        if (generateWEB)
            console.log(`  Website docsify theme: ${webTheme ? chalk.green(webTheme) : chalk.red('not set')}`);
        console.log(`Repository Url: ${repoUrl ? chalk.green(repoUrl) : chalk.red('not set')}`);

        console.log(`Include breadcrumbs: ${includeBreadcrumbs !== undefined ? chalk.green(includeBreadcrumbs) : chalk.red('not set')}`);
        console.log(`Generate diagram images locally: ${generateLocalImages !== undefined ? chalk.green(generateLocalImages) : chalk.red('not set')}`);
        console.log(`Replace diagrams with a link: ${includeLinkToDiagram !== undefined ? chalk.green(includeLinkToDiagram) : chalk.red('not set')}`);
        return;
    }

    if (program.site) {
        if (!distFolder)
            return console.log(chalk.red('No destination folder configured'));

        console.log('serving your site using docsify');
        console.log(`go to ${chalk.green('http://localhost:3000')}`);

        const { spawnSync } = require('child_process');
        const child = spawnSync(`docsify.cmd`, ['serve', distFolder]);
        return;
    }

    if (program.reset) {
        conf.clear();
        console.log(`configuration was reset`);
        return;
    }

    //collect configuration
    if (!projectName || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'projectName',
            message: 'Project Name',
            default: projectName || path.parse(process.cwd()).name,
            validate: validate(joi.string().trim().optional())
        });
        conf.set('projectName', responses.projectName);
    }

    if (!homepageName || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'homepageName',
            message: 'HomePage Name',
            default: homepageName || 'Overview',
            validate: validate(joi.string().trim().optional())
        });
        conf.set('homepageName', responses.homepageName);
    }

    if (!rootFolder || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'rootFolder',
            message: 'Root documentation folder',
            default: rootFolder || 'src',
            validate: answers => {
                let isValid = validate(joi.string().trim().optional())(answers);
                if (isValid) {
                    if (answers.indexOf('/') !== -1 || answers.indexOf('\\') !== -1)
                        return false;

                    //check it's an actual folder
                    let isDirectory = fs.statSync(path.join(process.cwd(), answers)).isDirectory();
                    if (isDirectory)
                        return true;
                }
                return false;
            }
        });
        conf.set('rootFolder', responses.rootFolder);
    }

    if (!distFolder || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'distFolder',
            message: 'Destination folder',
            default: distFolder || 'docs',
            validate: answers => {
                let isValid = validate(joi.string().trim().optional());
                if (isValid) {
                    if (answers.indexOf('/') !== -1 || answers.indexOf('\\') !== -1)
                        return false;
                    return true;
                }
                return false;
            }
        });
        conf.set('distFolder', responses.distFolder);
    }

    if (generateMD === undefined || generateCompleteMD === undefined ||
        generatePDF === undefined || generateCompletePDF === undefined ||
        generateWEB === undefined || program.config) {

        let defaults = [
            generateMD === undefined ? 'generateMD' : generateMD ? 'generateMD' : null,
            generatePDF === undefined ? 'generatePDF' : generatePDF ? 'generatePDF' : null,
            generateCompleteMD === undefined ? 'generateCompleteMD' : generateCompleteMD ? 'generateCompleteMD' : null,
            generateCompletePDF === undefined ? 'generateCompletePDF' : generateCompletePDF ? 'generateCompletePDF' : null,
            generateWEB === undefined ? 'generateWEB' : generateWEB ? 'generateWEB' : null
        ];

        responses = await inquirer.prompt({
            type: 'checkbox',
            name: 'generate',
            message: 'Compilation format:',
            default: defaults,
            choices: [{
                name: 'Multiple markdown files',
                value: 'generateMD'
            }, {
                name: 'Generate a single complete markdown file',
                value: 'generateCompleteMD'
            }, {
                name: 'Generate multiple pdf files',
                value: 'generatePDF'
            }, {
                name: 'Generate a single complete pdf file',
                value: 'generateCompletePDF'
            }, {
                name: 'Generate website',
                value: 'generateWEB'
            }]
        });

        conf.set('generateMD', !!responses.generate.find(x => x === 'generateMD'));
        conf.set('generatePDF', !!responses.generate.find(x => x === 'generatePDF'));
        conf.set('generateCompleteMD', !!responses.generate.find(x => x === 'generateCompleteMD'));
        conf.set('generateCompletePDF', !!responses.generate.find(x => x === 'generateCompletePDF'));
        conf.set('generateWEB', !!responses.generate.find(x => x === 'generateWEB'));

        if (!!responses.generate.find(x => x === 'generateMD')) {
            let mdOptions = await inquirer.prompt({
                type: 'confirm',
                name: 'includeNavigation',
                message: 'Include basic navigation?',
                default: includeNavigation === undefined ? false : includeNavigation
            });
            conf.set('includeNavigation', mdOptions.includeNavigation);

            mdOptions = await inquirer.prompt({
                type: 'confirm',
                name: 'includeTableOfContents',
                message: 'Include navigable table of contents?',
                default: includeTableOfContents === undefined ? true : includeTableOfContents
            });
            conf.set('includeTableOfContents', mdOptions.includeTableOfContents);
        }

        if (!!responses.generate.find(x => x === 'generateWEB')) {
            let webOptions = await inquirer.prompt({
                type: 'input',
                name: 'webTheme',
                message: 'Change the default docsify theme?',
                default: webTheme || '//unpkg.com/docsify/lib/themes/vue.css'
            });
            conf.set('webTheme', webOptions.webTheme);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'repoUrl',
                message: 'Include a repository url?',
                default: repoUrl
            });
            conf.set('repoUrl', webOptions.repoUrl);
        }

        if (!!responses.generate.find(x => x === 'generatePDF' || x === 'generateCompletePDF')) {
            let pdfOptions = await inquirer.prompt({
                type: 'input',
                name: 'pdfCss',
                message: 'Add a custom css for the pdf?',
                default: pdfCss
            });
            conf.set('pdfCss', pdfOptions.pdfCss);
        }
    }
    if (generateLocalImages === undefined ||
        includeBreadcrumbs === undefined || includeLinkToDiagram === undefined || program.config) {
        let defaults = [
            includeBreadcrumbs === undefined ? 'includeBreadcrumbs' : includeBreadcrumbs ? 'includeBreadcrumbs' : null,
            generateLocalImages === undefined ? null : generateLocalImages ? 'generateLocalImages' : null,
            includeLinkToDiagram === undefined ? null : includeLinkToDiagram ? 'includeLinkToDiagram' : null
        ];
        responses = await inquirer.prompt({
            type: 'checkbox',
            name: 'generate',
            message: 'Compilation format:',
            default: defaults,
            choices: [{
                name: 'Include breadcrumbs',
                value: 'includeBreadcrumbs'
            }, {
                name: 'Generate diagram images locally',
                value: 'generateLocalImages'
            }, {
                name: 'Replace diagrams with a link',
                value: 'includeLinkToDiagram'
            }]
        });
        conf.set('includeBreadcrumbs', !!responses.generate.find(x => x === 'includeBreadcrumbs'));
        conf.set('generateLocalImages', !!responses.generate.find(x => x === 'generateLocalImages'));
        conf.set('includeLinkToDiagram', !!responses.generate.find(x => x === 'includeLinkToDiagram'));
    }

    if (!program.config) {
        conf.set('hasRun', true);

        return conf;
    }
};