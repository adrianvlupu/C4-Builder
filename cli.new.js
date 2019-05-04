const figlet = require('figlet');
const inquirer = require('inquirer');
const joi = require('joi');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const fsextra = require('fs-extra');

const {
    readFile,
    writeFile,
    makeDirectory,
} = require('./utils.js');

const validate = (schema) => answers => {
    return !(joi.validate(answers, schema).error);
};

module.exports = async () => {
    console.log('\nThis will create a new folder with the name of the project');

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
    let projectName = responses.projectName;

    // responses = await inquirer.prompt({
    //     type: 'list',
    //     name: 'template',
    //     message: 'Project template:',
    //     default: 'template',
    //     choices: [{
    //         name: 'Basic project from template',
    //         value: 'template'
    //     }, {
    //         name: 'Blank',
    //         value: 'blank'
    //     }]
    // });
    // let template = responses.template;

    await makeDirectory(projectName);

    //default project readme
    await fsextra.copy(path.join(__dirname, 'template'), path.join(process.cwd(), projectName));

    let readme = await readFile(path.join(__dirname, 'template', 'readme.md'));
    await writeFile(path.join(process.cwd(), projectName, 'README.MD'),
        `# ${projectName}\n\n${readme}`
    );

    console.log(chalk.green(`the project was created`));
    console.log(chalk.gray(`run the following commands`));
    console.log(`> cd ${projectName}`);
    console.log(`> c4builder`);
    console.log(chalk.gray(`the wizard will guide you through the rest of the configuration`));
    console.log(chalk.gray(`check out the ./${projectName}/docs folder created`));
    return;
};