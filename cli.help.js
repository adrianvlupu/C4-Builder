const figlet = require('figlet');
const chalk = require('chalk');

module.exports = () => {
    console.log(chalk.blue(figlet.textSync('c4builder')));
    console.log(`
Full documentation
${chalk.blue('https://adrianvlupu.github.io/C4-Builder/')}

CONFIGURATION OPTIONS 
${chalk.cyan('Project Name')}
Will be used as the #header of the resulting documentation.
${chalk.cyan('HomePage Name')}
Will be used as the ##title for the root folder markdown files.
${chalk.cyan('Root Folder')}
The folder that will be parsed recursively by c4builder and compile the final documentation.
${chalk.cyan('Destination Folder')}
The folder that will hold the final documentation.
This folder will get erased on each build so don't include any other files.
${chalk.cyan('Generate multiple markdown files')}
It will merge all the markdown and plantuml files from a folder into a single file.
The file will contain all the content from the markdown files and attach the diagram images.
The directory structure from the destination folder will be the same as the root folder.
    ${chalk.cyan('Include basic navigation')}
    It includes markdown links at the top of each file. It enables a drill-down style navigation.
    ${chalk.cyan('Include table of contents')}
    It includes a tree style table of contents at the top of each file.
${chalk.cyan('Generate a single complete markdown file')}
Compiles the documentation into a single markdown file. Each section will have a return to top link.
${chalk.cyan('Generate multiple pdf files')}
Similar to multiple markdown files. It will follow the the same directory structure but it will export a pdf version instead of markdown.
${chalk.cyan('Generate a single complete pdf file')}
Compiles the documentation into a single pdf file.
    ${chalk.cyan('Custom PDF CSS')}
    Change the default pdf used for the pdf generation. Useful for changing font size on higher resolution displays
${chalk.cyan('Generate website')}
Uses docsify to generate a website with a sidebar for navigation. The site can be easily deployed to github pages.
    ${chalk.cyan('Website docsify theme')}
    Changes the default theme of the generated docsify website
${chalk.cyan('PlantUML version')}
Uses the specific plantuml version jar file for generating images.
${chalk.cyan('Generate diagram images locally')}
Uses the localy installed plantuml package to build svg images for each diagram.
${chalk.cyan('Replace diagrams with a link')}
Replaces the diagram images with links.
${chalk.cyan('Include breadcrumbs')}
Shows the original folder hierarchy after each title.
${chalk.cyan('Place diagrams before text')}
Choose to place diagrams before or after the text.
${chalk.cyan('Diagram format')}
Choose diagram format. Available format: png and svg.
    `);
};