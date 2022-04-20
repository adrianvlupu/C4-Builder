const inquirer = require('inquirer');
const joi = require('joi');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { plantumlVersions } = require('./utils');

const validate = (schema) => (answers) => {
    //just in case
    if (joi.validate) {
        return !joi.validate(answers, schema).error;
    } else {
        return !schema.validate(answers).error;
    }
};

module.exports = async (currentConfiguration, conf, program) => {
    if (!currentConfiguration.PROJECT_NAME || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'projectName',
            message: 'Project Name',
            default: currentConfiguration.PROJECT_NAME || path.parse(process.cwd()).name,
            validate: validate(joi.string().trim().optional())
        });
        conf.set('projectName', responses.projectName);
    }

    if (!currentConfiguration.HOMEPAGE_NAME || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'homepageName',
            message: 'HomePage Name',
            default: currentConfiguration.HOMEPAGE_NAME || 'Overview',
            validate: validate(joi.string().trim().optional())
        });
        conf.set('homepageName', responses.homepageName);
    }

    if (!currentConfiguration.ROOT_FOLDER || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'rootFolder',
            message: 'Root documentation folder',
            default: currentConfiguration.ROOT_FOLDER || 'src',
            validate: (answers) => {
                let isValid = validate(joi.string().trim().optional())(answers);
                if (isValid) {
                    if (answers.indexOf('/') !== -1 || answers.indexOf('\\') !== -1) return false;

                    //check it's an actual folder
                    let isDirectory = fs.statSync(path.join(process.cwd(), answers)).isDirectory();
                    if (isDirectory) return true;
                }
                return false;
            }
        });
        conf.set('rootFolder', responses.rootFolder);
    }

    if (!currentConfiguration.DIST_FOLDER || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'distFolder',
            message: 'Destination folder',
            default: currentConfiguration.DIST_FOLDER || 'docs',
            validate: (answers) => {
                let isValid = validate(joi.string().trim().optional());
                if (isValid) {
                    if (answers.indexOf('/') !== -1 || answers.indexOf('\\') !== -1) return false;
                    return true;
                }
                return false;
            }
        });
        conf.set('distFolder', responses.distFolder);
    }

    if (
        currentConfiguration.GENERATE_MD === undefined ||
        currentConfiguration.GENERATE_COMPLETE_MD_FILE === undefined ||
        currentConfiguration.GENERATE_PDF === undefined ||
        currentConfiguration.GENERATE_COMPLETE_PDF_FILE === undefined ||
        currentConfiguration.GENERATE_WEBSITE === undefined ||
        program.config
    ) {
        let defaults = [
            currentConfiguration.GENERATE_MD === undefined
                ? null
                : currentConfiguration.GENERATE_MD
                ? 'generateMD'
                : null,
            currentConfiguration.GENERATE_PDF === undefined
                ? 'generatePDF'
                : currentConfiguration.GENERATE_PDF
                ? 'generatePDF'
                : null,
            currentConfiguration.GENERATE_COMPLETE_MD_FILE === undefined
                ? null
                : currentConfiguration.GENERATE_COMPLETE_MD_FILE
                ? 'generateCompleteMD'
                : null,
            currentConfiguration.GENERATE_COMPLETE_PDF_FILE === undefined
                ? 'generateCompletePDF'
                : currentConfiguration.GENERATE_COMPLETE_PDF_FILE
                ? 'generateCompletePDF'
                : null,
            currentConfiguration.GENERATE_WEBSITE === undefined
                ? 'generateWEB'
                : currentConfiguration.GENERATE_WEBSITE
                ? 'generateWEB'
                : null
        ];

        responses = await inquirer.prompt({
            type: 'checkbox',
            name: 'generate',
            message: 'Compilation format:',
            default: defaults,
            choices: [
                {
                    name: 'Multiple markdown files',
                    value: 'generateMD'
                },
                {
                    name: 'Generate a single complete markdown file',
                    value: 'generateCompleteMD'
                },
                {
                    name: 'Generate multiple pdf files',
                    value: 'generatePDF'
                },
                {
                    name: 'Generate a single complete pdf file',
                    value: 'generateCompletePDF'
                },
                {
                    name: 'Generate website',
                    value: 'generateWEB'
                }
            ]
        });

        conf.set('generateMD', !!responses.generate.find((x) => x === 'generateMD'));
        conf.set('generatePDF', !!responses.generate.find((x) => x === 'generatePDF'));
        conf.set('generateCompleteMD', !!responses.generate.find((x) => x === 'generateCompleteMD'));
        conf.set('generateCompletePDF', !!responses.generate.find((x) => x === 'generateCompletePDF'));
        conf.set('generateWEB', !!responses.generate.find((x) => x === 'generateWEB'));

        if (!!responses.generate.find((x) => x === 'generateMD')) {
            let mdOptions = await inquirer.prompt({
                type: 'confirm',
                name: 'includeNavigation',
                message: 'Include basic navigation?',
                default:
                    currentConfiguration.INCLUDE_NAVIGATION === undefined
                        ? false
                        : currentConfiguration.INCLUDE_NAVIGATION
            });
            conf.set('includeNavigation', mdOptions.includeNavigation);

            mdOptions = await inquirer.prompt({
                type: 'confirm',
                name: 'includeTableOfContents',
                message: 'Include navigable table of contents?',
                default:
                    currentConfiguration.INCLUDE_TABLE_OF_CONTENTS === undefined
                        ? true
                        : currentConfiguration.INCLUDE_TABLE_OF_CONTENTS
            });
            conf.set('includeTableOfContents', mdOptions.includeTableOfContents);
        }

        if (!!responses.generate.find((x) => x === 'generateWEB')) {
            let webOptions = await inquirer.prompt({
                type: 'input',
                name: 'webTheme',
                message: 'Change the default docsify theme?',
                default: currentConfiguration.WEB_THEME || '//unpkg.com/docsify/lib/themes/vue.css'
            });
            conf.set('webTheme', webOptions.webTheme);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'supportSearch',
                message: 'Support search on navbar?',
                default: true
            });
            conf.set('supportSearch', webOptions.supportSearch);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'repoUrl',
                message: 'Include a repository url?',
                default: currentConfiguration.REPO_NAME
            });
            conf.set('repoUrl', webOptions.repoUrl);

            webOptions = await inquirer.prompt({
                type: 'confirm',
                name: 'executeScript',
                message: 'Support script execution and OpenAPI rendering?',
                default: 
                    currentConfiguration.executeScript === undefined
                    ? false
                    : currentConfiguration.executeScript
            });
            conf.set('executeScript', webOptions.executeScript);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'docsifyTemplate',
                message: 'Path to a specific Docsify template?',
                default: ''
            });
            conf.set('docsifyTemplate', webOptions.docsifyTemplate);

            webOptions = await inquirer.prompt({
                type: 'input',
                name: 'webPort',
                message: 'Change the default serve port?',
                default: currentConfiguration.WEB_PORT || '3000'
            });
            conf.set('webPort', webOptions.webPort);
        }

        if (!!responses.generate.find((x) => x === 'generatePDF' || x === 'generateCompletePDF')) {
            let pdfOptions = await inquirer.prompt({
                type: 'input',
                name: 'pdfCss',
                message: 'Add a custom css for the pdf (filename)?',
                default: currentConfiguration.PDF_CSS
            });
            conf.set('pdfCss', pdfOptions.pdfCss);
        }
    }

    let plantumlVersion, ver;
    if (currentConfiguration.PLANTUML_VERSION === undefined || program.config) {
        let defaultPlantumlVersion =
            currentConfiguration.PLANTUML_VERSION === undefined
                ? 'latest'
                : currentConfiguration.PLANTUML_VERSION;
        responses = await inquirer.prompt({
            type: 'list',
            name: 'plantumlVersion',
            message: 'PlantUML version:',
            default: defaultPlantumlVersion,
            choices: plantumlVersions
                .map((v) => {
                    return {
                        name: v.version,
                        value: v.version
                    };
                })
                .concat({
                    name: 'latest (compatible with plantuml online server)',
                    value: 'latest'
                })
        });
        plantumlVersion = responses.plantumlVersion;
        conf.set('plantumlVersion', plantumlVersion);
        if (
            currentConfiguration.PLANTUML_VERSION &&
            plantumlVersion !== currentConfiguration.PLANTUML_VERSION
        ) {
            console.log(chalk.bold(chalk.yellow('WARNING:')));
            console.log(
                chalk.bold(
                    chalk.yellow(
                        `You need to update the plantuml file to include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/${plantumlVersion}.`
                    )
                )
            );
        }
    } else {
        plantumlVersion = currentConfiguration.PLANTUML_VERSION;
    }
    ver = plantumlVersions.find((v) => v.version === plantumlVersion);
    if (plantumlVersion === 'latest') ver = plantumlVersions.find((v) => v.isLatest);
    if (!ver) throw new Error(`PlantUML version ${options.PLANTUML_VERSION} not supported`);
    if (!ver.isLatest) {
        console.log(
            chalk.bold(
                chalk.yellow(
                    `Generating diagram images using the online plantuml server will break on version ${ver.version}.`
                )
            )
        );
        console.log(
            chalk.bold(chalk.yellow(`The build will generate diagram images using the included ${ver.jar}.`))
        );
    }

    if (
        currentConfiguration.GENERATE_LOCAL_IMAGES === undefined ||
        currentConfiguration.EMBED_DIAGRAM === undefined ||
        currentConfiguration.INCLUDE_BREADCRUMBS === undefined ||
        currentConfiguration.INCLUDE_LINK_TO_DIAGRAM === undefined ||
        currentConfiguration.EXCLUDE_OTHER_FILES === undefined ||
        program.config
    ) {
        let defaults = [
            currentConfiguration.INCLUDE_BREADCRUMBS === undefined
                ? 'includeBreadcrumbs'
                : currentConfiguration.INCLUDE_BREADCRUMBS
                ? 'includeBreadcrumbs'
                : null,
            currentConfiguration.GENERATE_LOCAL_IMAGES === undefined
                ? null
                : currentConfiguration.GENERATE_LOCAL_IMAGES
                ? 'generateLocalImages'
                : null,
            currentConfiguration.INCLUDE_LINK_TO_DIAGRAM === undefined
                ? null
                : currentConfiguration.INCLUDE_LINK_TO_DIAGRAM
                ? 'includeLinkToDiagram'
                : null,
            currentConfiguration.DIAGRAMS_ON_TOP === undefined
                ? 'diagramsOnTop'
                : currentConfiguration.DIAGRAMS_ON_TOP
                ? 'diagramsOnTop'
                : null,
            currentConfiguration.EMBED_DIAGRAM === undefined
                ? null
                : currentConfiguration.EMBED_DIAGRAM
                ? 'embedDiagram'
                : null,
            currentConfiguration.EXCLUDE_OTHER_FILES === undefined
                ? null
                : currentConfiguration.EXCLUDE_OTHER_FILES
                ? 'excludeOtherFiles'
                : null
        ];
        let choices = [
            {
                name: 'Include breadcrumbs',
                value: 'includeBreadcrumbs'
            },
            {
                name: 'Replace diagrams with a link',
                value: 'includeLinkToDiagram'
            },
            {
                name: 'Place diagrams before text',
                value: 'diagramsOnTop'
            },
            {
                name: 'Embed SVG Diagram',
                value: 'embedDiagram'
            },
            {
                name: 'Exclude other files',
                value: 'excludeOtherFiles'
            }
        ];
        if (ver.isLatest)
            choices.push({
                name: 'Generate diagram images locally',
                value: 'generateLocalImages'
            });

        responses = await inquirer.prompt({
            type: 'checkbox',
            name: 'generate',
            message: 'Compilation format:',
            default: defaults,
            choices: choices
        });
        conf.set('includeBreadcrumbs', !!responses.generate.find((x) => x === 'includeBreadcrumbs'));
        conf.set('includeLinkToDiagram', !!responses.generate.find((x) => x === 'includeLinkToDiagram'));
        conf.set('diagramsOnTop', !!responses.generate.find((x) => x === 'diagramsOnTop'));
        conf.set('embedDiagram', !!responses.generate.find((x) => x === 'embedDiagram'));
        conf.set('excludeOtherFiles', !!responses.generate.find((x) => x === 'excludeOtherFiles'));

        if (ver.isLatest) {
            conf.set('generateLocalImages', !!responses.generate.find((x) => x === 'generateLocalImages'));
        } else {
            conf.set('generateLocalImages', true);
        }
    }

    if (!currentConfiguration.PLANTUML_SERVER_URL || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'plantumlServerUrl',
            message: 'PlantUML Server URL',
            default: currentConfiguration.PLANTUML_SERVER_URL || 'https://www.plantuml.com/plantuml',
            validate: validate(joi.string().trim().optional())
        });
        conf.set('plantumlServerUrl', responses.plantumlServerUrl);
    }

    if (!currentConfiguration.DIAGRAM_FORMAT || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'diagramFormat',
            message: 'Diagram Image Format',
            default: currentConfiguration.DIAGRAM_FORMAT || 'svg',
            validate: validate(joi.string().trim().optional())
        });
        conf.set('diagramFormat', responses.diagramFormat);
    }

    if (!currentConfiguration.CHARSET || program.config) {
        responses = await inquirer.prompt({
            type: 'input',
            name: 'charset',
            message: 'Change the default charset',
            default: currentConfiguration.CHARSET || 'UTF-8'
        });
        conf.set('charset', responses.charset);
    }
};
