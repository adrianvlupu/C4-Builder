const chalk = require('chalk');

module.exports = (currentConfiguration) => {
    console.log(`
CURRENT CONFIGURATION

Project Name: ${currentConfiguration.projectName ? chalk.green(currentConfiguration.projectName) : chalk.red('not set')}
Homepage Name: ${currentConfiguration.homepageName ? chalk.green(currentConfiguration.homepageName) : chalk.red('not set')}
Root Folder: ${currentConfiguration.rootFolder ? chalk.green(currentConfiguration.rootFolder) : chalk.red('not set')}
Destination Folder: ${currentConfiguration.distFolder ? chalk.green(currentConfiguration.distFolder) : chalk.red('not set')}
Generate multiple markdown files: ${currentConfiguration.generateMD !== undefined ? chalk.green(currentConfiguration.generateMD) : chalk.red('not set')}    
    ${currentConfiguration.generateMD ?
            `include basic navigation: ${chalk.green(currentConfiguration.includeNavigation || false)}
    include table of contents: ${chalk.green(currentConfiguration.includeTableOfContents || false)}`
            : ''}
Generate a single complete markdown file: ${currentConfiguration.generateCompleteMD !== undefined ? chalk.green(currentConfiguration.generateCompleteMD) : chalk.red('not set')}
Generate multiple pdf files: ${currentConfiguration.generatePDF !== undefined ? chalk.green(currentConfiguration.generatePDF) : chalk.red('not set')}
Generate a single complete pdf file: ${currentConfiguration.generateCompletePDF !== undefined ? chalk.green(currentConfiguration.generateCompletePDF) : chalk.red('not set')}
    ${currentConfiguration.generatePDF || currentConfiguration.generateCompletePDF ?
            `Custom pdf css: ${currentConfiguration.pdfCss ? chalk.green(currentConfiguration.pdfCss) : chalk.red('not set')}`
            : ''}
Generate website: ${currentConfiguration.generateWEB !== undefined ? chalk.green(currentConfiguration.generateWEB) : chalk.red('not set')}
    ${currentConfiguration.generateWEB ?
            `Website docsify theme: ${currentConfiguration.webTheme ? chalk.green(currentConfiguration.webTheme) : chalk.red('not set')}`
            : ''}
Repository Url: ${currentConfiguration.repoUrl ? chalk.green(currentConfiguration.repoUrl) : chalk.red('not set')}
Include breadcrumbs: ${currentConfiguration.includeBreadcrumbs !== undefined ? chalk.green(currentConfiguration.includeBreadcrumbs) : chalk.red('not set')}
Generate diagram images locally: ${currentConfiguration.generateLocalImages !== undefined ? chalk.green(currentConfiguration.generateLocalImages) : chalk.red('not set')}
Replace diagrams with a link: ${currentConfiguration.includeLinkToDiagram !== undefined ? chalk.green(currentConfiguration.includeLinkToDiagram) : chalk.red('not set')}
Place diagrams before text: ${currentConfiguration.diagramsOnTop !== undefined ? chalk.green(currentConfiguration.diagramsOnTop) : chalk.red('not set')}
`);
    return;
};