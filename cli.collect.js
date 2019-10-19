const inquirer = require('inquirer');
const joi = require('joi');
const fs = require('fs');
const path = require('path');

const validate = (schema) => answers => {
    return !(joi.validate(answers, schema).error);
};

module.exports = async (currentConfiguration, conf, program) => {
    if (!currentConfiguration.projectName || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'projectName',
            message: 'Project Name',
            default: currentConfiguration.projectName || path.parse(process.cwd()).name,
            validate: validate(joi.string().trim().optional())
        });
        conf.set('projectName', responses.projectName);
    }

    if (!currentConfiguration.homepageName || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'homepageName',
            message: 'HomePage Name',
            default: currentConfiguration.homepageName || 'Overview',
            validate: validate(joi.string().trim().optional())
        });
        conf.set('homepageName', responses.homepageName);
    }

    if (!currentConfiguration.rootFolder || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'rootFolder',
            message: 'Root documentation folder',
            default: currentConfiguration.rootFolder || 'src',
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

    if (!currentConfiguration.distFolder || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'distFolder',
            message: 'Destination folder',
            default: currentConfiguration.distFolder || 'docs',
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

    if (currentConfiguration.generateMD === undefined || currentConfiguration.generateCompleteMD === undefined ||
        currentConfiguration.generatePDF === undefined || currentConfiguration.generateCompletePDF === undefined ||
        currentConfiguration.generateWEB === undefined || program.config) {

        let defaults = [
            currentConfiguration.generateMD === undefined ? 'generateMD' : currentConfiguration.generateMD ? 'generateMD' : null,
            currentConfiguration.generatePDF === undefined ? 'generatePDF' : currentConfiguration.generatePDF ? 'generatePDF' : null,
            currentConfiguration.generateCompleteMD === undefined ? 'generateCompleteMD' : currentConfiguration.generateCompleteMD ? 'generateCompleteMD' : null,
            currentConfiguration.generateCompletePDF === undefined ? 'generateCompletePDF' : currentConfiguration.generateCompletePDF ? 'generateCompletePDF' : null,
            currentConfiguration.generateWEB === undefined ? 'generateWEB' : currentConfiguration.generateWEB ? 'generateWEB' : null
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
                default: currentConfiguration.includeNavigation === undefined ? false : currentConfiguration.includeNavigation
            });
            conf.set('includeNavigation', mdOptions.includeNavigation);

            mdOptions = await inquirer.prompt({
                type: 'confirm',
                name: 'includeTableOfContents',
                message: 'Include navigable table of contents?',
                default: currentConfiguration.includeTableOfContents === undefined ? true : currentConfiguration.includeTableOfContents
            });
            conf.set('includeTableOfContents', mdOptions.includeTableOfContents);
        }

        if (!!responses.generate.find(x => x === 'generateWEB')) {
            let webOptions = await inquirer.prompt({
                type: 'input',
                name: 'webTheme',
                message: 'Change the default docsify theme?',
                default: currentConfiguration.webTheme || '//unpkg.com/docsify/lib/themes/vue.css'
            });
            conf.set('webTheme', webOptions.webTheme);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'repoUrl',
                message: 'Include a repository url?',
                default: currentConfiguration.repoUrl
            });
            conf.set('repoUrl', webOptions.repoUrl);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'webPort',
                message: 'Change the default serve port?',
                default: currentConfiguration.webPort || '3000'
            });
            conf.set('webPort', webOptions.webPort);
        }

        if (!!responses.generate.find(x => x === 'generatePDF' || x === 'generateCompletePDF')) {
            let pdfOptions = await inquirer.prompt({
                type: 'input',
                name: 'pdfCss',
                message: 'Add a custom css for the pdf (filename)?',
                default: currentConfiguration.pdfCss
            });
            conf.set('pdfCss', pdfOptions.pdfCss);
        }
    }
    if (currentConfiguration.generateLocalImages === undefined ||
        currentConfiguration.includeBreadcrumbs === undefined || currentConfiguration.includeLinkToDiagram === undefined || program.config) {
        let defaults = [
            currentConfiguration.includeBreadcrumbs === undefined ? 'includeBreadcrumbs' : currentConfiguration.includeBreadcrumbs ? 'includeBreadcrumbs' : null,
            currentConfiguration.generateLocalImages === undefined ? null : currentConfiguration.generateLocalImages ? 'generateLocalImages' : null,
            currentConfiguration.includeLinkToDiagram === undefined ? null : currentConfiguration.includeLinkToDiagram ? 'includeLinkToDiagram' : null,
            currentConfiguration.diagramsOnTop === undefined ? null : currentConfiguration.diagramsOnTop ? 'diagramsOnTop' : null
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
            }, {
                name: 'Place diagrams before text',
                value: 'diagramsOnTop'
            }]
        });
        conf.set('includeBreadcrumbs', !!responses.generate.find(x => x === 'includeBreadcrumbs'));
        conf.set('generateLocalImages', !!responses.generate.find(x => x === 'generateLocalImages'));
        conf.set('includeLinkToDiagram', !!responses.generate.find(x => x === 'includeLinkToDiagram'));
        conf.set('diagramsOnTop', !!responses.generate.find(x => x === 'diagramsOnTop'));
    }

    if (!currentConfiguration.charset || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'charset',
            message: 'Change the default charset',
            default: currentConfiguration.charset || 'UTF-8'
        });
        conf.set('charset', responses.charset);
    }
};