const figlet = require('figlet');
const chalk = require('chalk');

module.exports = () => {
    console.log(chalk.blue(figlet.textSync('c4builder')));
    console.log(`Full documentation\n${chalk.blue('https://adrianvlupu.github.io/C4-Builder/')}`);

    console.log('\nCONFIGURATION OPTIONS');

    console.log(chalk.cyan('\nProject Name'));
    console.log(`Will be used as the #header of the resulting documentation.`);

    console.log(chalk.cyan('\nHomePage Name'));
    console.log(`Will be used as the ##title for the root folder markdown files.`);

    console.log(chalk.cyan('\nRoot Folder'));
    console.log(`The folder that will be parsed recursively by c4builder and compile the final documentation.`);

    console.log(chalk.cyan('\nDestination Folder'));
    console.log(`The folder that will hold the final documentation.\nThis folder will get erased on each build so don't include any other files.`);

    console.log(chalk.cyan('\nGenerate multiple markdown files'));
    console.log(`It will merge all the markdown and plantuml files from a folder into a single file.\nThe file will contain all the content from the markdown files and attach the diagram images at the bottom.\nThe directory structure from the destination folder will be the same as the root folder.`);

    console.log(chalk.cyan('\n  Include basic navigation'));
    console.log(`  It includes markdown links at the top of each file. It enables a drill-down style navigation.`);

    console.log(chalk.cyan('\n  Include table of contents'));
    console.log(`  It includes a tree style table of contents at the top of each file.`);

    console.log(chalk.cyan('\nGenerate a single complete markdown file'));
    console.log(`Compiles the documentation into a single markdown file. Each section will have a return to top link.`);

    console.log(chalk.cyan('\nGenerate multiple pdf files'));
    console.log(`Similar to multiple markdown files. It will follow the the same directory structure but it will export a pdf version instead of markdown.`);

    console.log(chalk.cyan('\nGenerate a single complete pdf file'));
    console.log(`Compiles the documentation into a single pdf file.`);

    console.log(chalk.cyan('\nGenerate website'));
    console.log(`Uses docsify to generate a website with a sidebar for navigation. The site can be easily deployed to github pages.`);

    console.log(chalk.cyan('\nGenerate diagram images locally'));
    console.log(`Uses the localy installed plantuml package to build svg images for each diagram.`);

    console.log(chalk.cyan('\nReplace diagrams with a link'));
    console.log(`Replaces the diagram images at the bottom of the files with links.\n`);

    console.log(chalk.cyan('\nInclude breadcrumbs'));
    console.log(`Shows the original folder hierarchy after each title\n`);
};