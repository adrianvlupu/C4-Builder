const figlet = require('figlet');
const inquirer = require('inquirer');
const joi = require('joi');
const program = require('commander');
const package = require('./package.json');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const fsextra = require('fs-extra');

const help = require('./help');

const {
    readFile,
    writeFile,
    makeDirectory,
    clearConsole
} = require('./utils.js');

const validate = (schema) => answers => {
    return !(joi.validate(answers, schema).error);
};

module.exports = async () => {
    let responses;

    responses = await inquirer.prompt({
        type: 'input',
        name: 'projectName',
        message: 'Project Name',
        validate: answers => {
            let isValid = validate(joi.string().trim().optional())(answers);
            if (isValid) {
                if (answers.indexOf('/') !== -1 || answers.indexOf('\\') !== -1)
                    return false;

                //check if it already exists
                if (fs.existsSync(path.join(process.cwd(), answers))) {
                    let files = fs.readdirSync(path.join(process.cwd(), answers));
                    if (files.length > 0)
                        throw `Folder ${answers} is not empty`;
                }
                return true;
            }
            return false;
        }
    });

    await makeDirectory(responses.projectName);

    //default project readme
    let readme = await readFile(path.join(__dirname, 'template', 'readme.md'));
    await writeFile(path.join(process.cwd(), responses.projectName, 'README.MD'),
        `# ${responses.projectName}\n\n${readme}`
    );
    await writeFile(path.join(process.cwd(), responses.projectName, '.gitignore'),
        `*.pdf`
    );
    await fsextra.copy(path.join(__dirname, 'template', 'src'), path.join(process.cwd(), responses.projectName, 'src'));

    console.log(chalk.green(`the project was created`));
    console.log(chalk.gray(`run the following commands`));
    console.log(`> cd ${responses.projectName}`);
    console.log(`> c4builder`);
    console.log(chalk.gray(`the wizard will guide you through the rest of the configuration`));
    console.log(chalk.gray(`check out the ./${responses.projectName}/docs folder created`));
    return;
};