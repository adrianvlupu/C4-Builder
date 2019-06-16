#!/usr/bin/env node

const build = require('./build.js');
const cli = require('./cli.js');

//main
(async () => {
    let conf = await cli();
    if (!conf)
        return process.exit(0);

    ROOT_FOLDER = conf.get('rootFolder');
    DIST_FOLDER = conf.get('distFolder');
    PROJECT_NAME = conf.get('projectName');
    GENERATE_MD = conf.get('generateMD');
    INCLUDE_NAVIGATION = conf.get('includeNavigation');
    INCLUDE_TABLE_OF_CONTENTS = conf.get('includeTableOfContents');
    GENERATE_COMPLETE_MD_FILE = conf.get('generateCompleteMD');
    GENERATE_PDF = conf.get('generatePDF');
    GENERATE_COMPLETE_PDF_FILE = conf.get('generateCompletePDF');
    GENERATE_WEBSITE = conf.get('generateWEB');
    HOMEPAGE_NAME = conf.get('homepageName');
    GENERATE_LOCAL_IMAGES = conf.get('generateLocalImages');
    INCLUDE_LINK_TO_DIAGRAM = conf.get('includeLinkToDiagram');
    INCLUDE_BREADCRUMBS = conf.get('includeBreadcrumbs');
    WEB_THEME = conf.get('webTheme');
    REPO_NAME = conf.get('repoUrl');
    PDF_CSS = conf.get('pdfCss') || PDF_CSS;
    DIAGRAMS_ON_TOP = conf.get('diagramsOnTop');

    await build();

    return process.exit(0);
})();