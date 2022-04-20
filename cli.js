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
const { build } = require('./build');
const watch = require('node-watch');

const { clearConsole } = require('./utils.js');

const intro = () => {
    console.log(chalk.blue(figlet.textSync('c4builder')));
    console.log(chalk.gray('Blow up your software documentation writing skills'));
};

const getOptions = (conf) => {
    return {
        PLANTUML_VERSION: conf.get('plantumlVersion'),
        GENERATE_MD: conf.get('generateMD'),
        GENERATE_PDF: conf.get('generatePDF'),
        GENERATE_WEBSITE: conf.get('generateWEB'),
        GENERATE_COMPLETE_MD_FILE: conf.get('generateCompleteMD'),
        GENERATE_COMPLETE_PDF_FILE: conf.get('generateCompletePDF'),
        GENERATE_LOCAL_IMAGES: conf.get('generateLocalImages'),
        EMBED_DIAGRAM: conf.get('embedDiagram'),
        ROOT_FOLDER: conf.get('rootFolder'),
        DIST_FOLDER: conf.get('distFolder'),
        PROJECT_NAME: conf.get('projectName'),
        REPO_NAME: conf.get('repoUrl'),
        HOMEPAGE_NAME: conf.get('homepageName'),
        WEB_THEME: conf.get('webTheme'),
        DOCSIFY_TEMPLATE: conf.get('docsifyTemplate'),
        INCLUDE_NAVIGATION: conf.get('includeNavigation'),
        INCLUDE_BREADCRUMBS: conf.get('includeBreadcrumbs'),
        INCLUDE_TABLE_OF_CONTENTS: conf.get('includeTableOfContents'),
        INCLUDE_LINK_TO_DIAGRAM: conf.get('includeLinkToDiagram'),
        PDF_CSS: conf.get('pdfCss') || path.join(__dirname, 'pdf.css'),
        DIAGRAMS_ON_TOP: conf.get('diagramsOnTop'),
        CHARSET: conf.get('charset'),
        WEB_PORT: conf.get('webPort'),
        HAS_RUN: conf.get('hasRun'),
        PLANTUML_SERVER_URL: conf.get('plantumlServerUrl'),
        DIAGRAM_FORMAT: conf.get('diagramFormat'),
        MD_FILE_NAME: 'README',
        WEB_FILE_NAME: 'HOME',
        SUPPORT_SEARCH: conf.get('supportSearch'),
        EXECUTE_SCRIPT: conf.get('executeScript'),
        EXCLUDE_OTHER_FILES: conf.get('excludeOtherFiles')
    };
};

module.exports = async () => {
    program
        .version(package.version)
        .option('new', 'create a new project from template')
        .option('config', 'change configuration for the current directory')
        .option('list', 'display the current configuration')
        .option('reset', 'clear all configuration')
        .option('site', 'serve the generated site')
        .option('-w, --watch', 'watch for changes and rebuild')
        .option('docs', 'a brief explanation for the available configuration options')
        .option('-p, --port <n>', 'port used for serving the generated site', parseInt)
        .parse(process.argv);

    let conf = { get: () => {} };
    if (!program.new)
        conf = new Configstore(
            process.cwd().split(path.sep).splice(1).join('_'),
            {},
            { configPath: path.join(process.cwd(), '.c4builder') }
        );

    if (program.docs) return cmdHelp();

    //initial options
    let options = getOptions(conf);

    if (program.new || program.config || !options.HAS_RUN) clearConsole();

    intro();

    if (!options.HAS_RUN && !program.new) {
        console.log(
            `\nif you created the project using the 'c4model new' command you can just press enter and go with the default options to get a basic idea of how it works.\n`
        );
        console.log(`you can always change the configuration by running > c4builder config\n`);
    }

    if (program.new) return cmdNewProject();
    if (program.list) return cmdList(options);

    if (program.reset) {
        conf.clear();
        console.log(`configuration was reset`);
        return;
    }

    await cmdCollect(options, conf, program);
    if (!program.config) {
        conf.set('hasRun', true);

        let isBuilding = false;
        let attemptedWatchBuild = false;
        //get options after wizard
        options = getOptions(conf);
        if (program.watch) {
            watch(options.ROOT_FOLDER, { recursive: true }, async (evt, name) => {
                // clearConsole();
                // intro();
                console.log(chalk.gray(`\n${name} changed. Rebuilding...`));
                if (isBuilding) {
                    attemptedWatchBuild = true;
                    if (
                        options.GENERATE_PDF ||
                        options.GENERATE_COMPLETE_PDF_FILE ||
                        options.GENERATE_LOCAL_IMAGES
                    )
                        console.log(
                            chalk.bold(
                                chalk.yellow(
                                    'Build already in progress, consider disabling pdf or local image generation '
                                )
                            )
                        );

                    return;
                }

                isBuilding = true;
                await build(options, conf);
                while (attemptedWatchBuild) {
                    attemptedWatchBuild = false;
                    await build(options);
                }
                isBuilding = false;
            });
        }

        isBuilding = true;
        await build(options, conf);
        isBuilding = false;

        if (program.site) return await cmdSite(options, program);

        if (options.GENERATE_WEBSITE && !program.watch) {
            console.log(chalk.gray('\nto view the generated website run'));
            console.log(`> c4builder site`);
        }
    }
};
