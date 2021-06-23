#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const fsextra = require('fs-extra');
let docsifyTemplate = require('./docsify.template.js');
const markdownpdf = require("md-to-pdf").mdToPdf;

const http = require('http');

const {
    encodeURIPath,
    makeDirectory,
    readFile,
    writeFile,
    plantUmlServerUrl,
    plantumlVersions
} = require('./utils.js');

const getMime = (format) => {
    if (format == 'svg')
        return `image/svg+xml`
    return `image/${format}`;
};

const httpGet = async (url) => {
    // return new pending promise
    return new Promise((resolve, reject) => {
        // select http or https module, depending on reqested url
        const lib = url.startsWith('https') ? require('https') : require('http');
        const request = lib.get(url, (response) => {
            // handle http errors
            if (response.statusCode < 200 || response.statusCode > 299) {
                reject(new Error('Failed to load page ' + url + ', status code: ' + response.statusCode));
            }
            // temporary data holder
            const body = [];
            // on every content chunk, push it to the data array
            response.on('data', (chunk) => body.push(chunk));
            // we are done, resolve promise with those joined chunks
            response.on('end', () => resolve((Buffer.concat(body)).toString('base64')));
        });
        // handle connection errors of the request
        request.on('error', (err) => reject(err));
    });
};

const getFolderName = (dir, root, homepage) => {
    return dir === root ? homepage : path.parse(dir).base;
};

const generateTree = async (dir, options) => {

    let tree = [];

    const build = async (dir, parent) => {
        let name = getFolderName(dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        let item = tree.find(x => x.dir === dir);
        if (!item) {
            item = {
                dir: dir,
                name: name,
                level: dir.split(path.sep).length,
                parent: parent,
                mdFiles: [],
                pumlFiles: [],
                descendants: []
            };
            tree.push(item);
        }

        let files = fs.readdirSync(dir).filter(x => x.charAt(0) !== '_');
        for (const file of files) {
            //if folder
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                item.descendants.push(file);
                //create corresponding dist folder
                if (options.GENERATE_WEBSITE || options.GENERATE_MD || options.GENERATE_PDF || options.GENERATE_LOCAL_IMAGES)
                    await makeDirectory(path.join(options.DIST_FOLDER, dir.replace(options.ROOT_FOLDER, ''), file));

                await build(path.join(dir, file), dir);
            }
        }

        const mdFiles = files.filter(x => path.extname(x).toLowerCase() === '.md');
        for (const mdFile of mdFiles) {
            const fileContents = await readFile(path.join(dir, mdFile));
            item.mdFiles.push(fileContents);
        }
        const pumlFiles = files.filter(x => path.extname(x).toLowerCase() === '.puml');
        for (const pumlFile of pumlFiles) {
            const fileContents = await readFile(path.join(dir, pumlFile));
            item.pumlFiles.push({ dir: pumlFile, content: fileContents });
        }
        item.pumlFiles.sort(function (a, b) {
            return ('' + a.dir).localeCompare(b.dir);
        });

        //copy all other files
        const otherFiles = files.filter(x => ['.md', '.puml'].indexOf(path.extname(x).toLowerCase()) === -1);
        for (const otherFile of otherFiles) {
            if (fs.statSync(path.join(dir, otherFile)).isDirectory())
                continue;

            if (options.GENERATE_MD || options.GENERATE_PDF || options.GENERATE_WEBSITE)
                await fsextra.copy(path.join(dir, otherFile), path.join(options.DIST_FOLDER, dir.replace(options.ROOT_FOLDER, ''), otherFile));
            if (options.GENERATE_COMPLETE_PDF_FILE || options.GENERATE_COMPLETE_MD_FILE)
                await fsextra.copy(path.join(dir, otherFile), path.join(options.DIST_FOLDER, otherFile));
        }
    };

    await build(dir);

    return tree;
};

const generateImages = async (tree, options, onImageGenerated) => {
    let imagePromises = [];
    let totalImages = 0;
    let processedImages = 0;

    for (const item of tree) {
        let files = fs.readdirSync(item.dir).filter(x => x.charAt(0) !== '_');
        const pumlFiles = files.filter(x => path.extname(x).toLowerCase() === '.puml');
        for (const pumlFile of pumlFiles) {
            //write diagram as image
            let stream = fs.createWriteStream(
                path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${path.parse(pumlFile).name}.${options.DIAGRAM_FORMAT}`
                )
            );

            let ver = plantumlVersions.find(v => v.version === options.PLANTUML_VERSION);
            if (options.PLANTUML_VERSION === 'latest')
                ver = plantumlVersions.find(v => v.isLatest);
            if (!ver)
                throw new Error(`PlantUML version ${options.PLANTUML_VERSION} not supported`);

            process.env.PLANTUML_HOME = path.join(__dirname, 'vendor', ver.jar);
            const plantuml = require('node-plantuml');

            plantuml
                .generate(path.join(item.dir, pumlFile), { format: options.DIAGRAM_FORMAT, charset: options.CHARSET, include: item.dir })
                .out
                .pipe(stream);

            totalImages++;

            imagePromises.push(new Promise(resolve => stream.on('finish', resolve)).then(() => {
                processedImages++;
                if (onImageGenerated)
                    onImageGenerated(processedImages, totalImages);
            }));
        }
    }

    return Promise.all(imagePromises);
};

const generateCompleteMD = async (tree, options) => {
    let filePromises = [];

    //title
    let MD = `# ${options.PROJECT_NAME}`;
    //table of contents
    let tableOfContents = '';
    for (const item of tree)
        tableOfContents += `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURIPath(item.name).replace(/%20/g, '-')})\n`;
    MD += `\n\n${tableOfContents}\n---`;

    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        MD += `\n\n## ${name}`;
        if (name !== options.HOMEPAGE_NAME) {
            if (options.INCLUDE_BREADCRUMBS)
                MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
            MD += `\n\n[${options.HOMEPAGE_NAME}](#${encodeURIPath(options.PROJECT_NAME).replace(/%20/g, '-')})`;
        }

        //concatenate markdown files
        const appendText = () => {
            for (const mdFile of item.mdFiles) {
                MD += '\n\n';
                MD += mdFile;
            }
        };
        //add diagrams
        const appendImages = async () => {
            for (const pumlFile of item.pumlFiles) {
                MD += '\n\n';

                let diagramUrl = encodeURIPath(path.join(
                    path.dirname(pumlFile.dir),
                    path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
                ));
                if (!options.GENERATE_LOCAL_IMAGES)
                    diagramUrl = plantUmlServerUrl(options.PLANTUML_SERVER_URL, options.DIAGRAM_FORMAT, pumlFile.content);

                if (options.EMBED_DIAGRAM) {
                    let imgContent = "";
                    if (options.GENERATE_LOCAL_IMAGES)
                        imgContent = (await readFile(
                            path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                diagramUrl
                            ))).toString('base64');
                    else
                        imgContent = await httpGet(diagramUrl);

                    MD += `\n![${path.parse(pumlFile.dir).name}](data:${getMime(options.DIAGRAM_FORMAT)};base64,${imgContent})\n`;

                    let diagramLink = `\n[Download ${path.parse(pumlFile.dir).name} diagram](${encodeURIPath(path.join(
                        item.dir.replace(options.ROOT_FOLDER, ''),
                        diagramUrl
                    ))} ':ignore')`;
                    MD += diagramLink;
                } else {
                    let diagramImage = `![diagram](${diagramUrl})`;
                    let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${encodeURIPath(path.join(
                        item.dir.replace(options.ROOT_FOLDER, ''),
                        diagramUrl
                    ))})`;
                    if (!options.INCLUDE_LINK_TO_DIAGRAM) //img
                        MD += diagramImage;
                    else //link
                        MD += diagramLink;
                }

            }
        };

        if (options.DIAGRAMS_ON_TOP) {
            await appendImages();
            appendText();
        } else {
            appendText();
            await appendImages();
        }
    }

    //write file to disk
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        `${options.PROJECT_NAME}.md`
    ), MD));

    return Promise.all(filePromises);
};

const generateCompletePDF = async (tree, options) => {
    //title
    let MD = `# ${options.PROJECT_NAME}`;
    //table of contents
    let tableOfContents = '';
    for (const item of tree)
        tableOfContents += `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURIPath(item.name).replace(/%20/g, '-')})\n`;
    MD += `\n\n${tableOfContents}\n---`;

    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        MD += `\n\n## ${name}`;
        //bradcrumbs
        if (name !== options.HOMEPAGE_NAME) {
            if (options.INCLUDE_BREADCRUMBS)
                MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
        }

        //concatenate markdown files
        const appendText = () => {
            for (const mdFile of item.mdFiles) {
                MD += '\n\n';
                MD += mdFile;
            }
        };
        //add diagrams
        const appendImages = () => {
            for (const pumlFile of item.pumlFiles) {
                MD += '\n\n';
                let diagramUrl = encodeURIPath(path.join(
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
                ));
                if (!options.GENERATE_LOCAL_IMAGES)
                    diagramUrl = plantUmlServerUrl(options.PLANTUML_SERVER_URL, options.DIAGRAM_FORMAT, pumlFile.content);

                let diagramImage = `![diagram](${diagramUrl})`;

                MD += diagramImage;
            }
        };

        if (options.DIAGRAMS_ON_TOP) {
            appendImages();
            appendText();
        } else {
            appendText();
            appendImages();
        }
    }

    //write temp file
    await writeFile(path.join(
        options.DIST_FOLDER,
        `${options.PROJECT_NAME}_TEMP.md`
    ), MD);
    //convert to pdf
    await markdownpdf({
        path:
            './' + path.join(
                options.DIST_FOLDER,
                `${options.PROJECT_NAME}_TEMP.md`
            )
    }, {
        stylesheet: [options.PDF_CSS],
        pdf_options: {
            scale: 1,
            displayHeaderFooter: false,
            printBackground: true,
            landscape: false,
            pageRanges: '',
            format: 'A4',
            width: '',
            height: '',
            margin: {
                top: '1.5cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        },
        dest: path.join(
            options.DIST_FOLDER,
            `${options.PROJECT_NAME}.pdf`
        )
    }).catch(console.error);

    // remove temp file
    await fsextra.remove(path.join(
        options.DIST_FOLDER,
        `${options.PROJECT_NAME}_TEMP.md`
    ));
};

const generateMD = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = 0;

    let filePromises = [];
    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        //title
        let MD = `# ${name}`;
        //bradcrumbs
        if (options.INCLUDE_BREADCRUMBS && name !== options.HOMEPAGE_NAME)
            MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
        //table of contents
        if (options.INCLUDE_TABLE_OF_CONTENTS) {
            let tableOfContents = '';
            for (const _item of tree) {
                let label = `${item.dir === _item.dir ? '**' : ''}${_item.name}${item.dir === _item.dir ? '**' : ''}`
                tableOfContents += `${'  '.repeat(_item.level - 1)}* [${label}](${encodeURIPath(path.join(
                    '/',
                    options.DIST_FOLDER,
                    _item.dir.replace(options.ROOT_FOLDER, ''),
                    `${options.MD_FILE_NAME}.md`
                ))})\n`;
            }
            MD += `\n\n${tableOfContents}\n---`;
        }
        //parent menu
        if (item.parent && options.INCLUDE_NAVIGATION) {
            let parentName = getFolderName(item.parent, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
            MD += `\n\n[${parentName} (up)](${encodeURIPath(path.join(
                '/',
                options.DIST_FOLDER,
                item.parent.replace(options.ROOT_FOLDER, ''),
                `${options.MD_FILE_NAME}.md`
            ))})`;
        }

        //exclude files and folders prefixed with _
        let descendantsMenu = '';
        for (const file of item.descendants) {
            descendantsMenu += `\n\n- [${file}](${encodeURIPath(path.join(
                '/',
                options.DIST_FOLDER,
                item.dir.replace(options.ROOT_FOLDER, ''),
                file,
                `${options.MD_FILE_NAME}.md`
            ))})`;
        }
        //descendants menu
        if (descendantsMenu && options.INCLUDE_NAVIGATION)
            MD += `${descendantsMenu}`;
        //separator
        if (options.INCLUDE_NAVIGATION)
            MD += `\n\n---`;

        //concatenate markdown files
        const appendText = () => {
            for (const mdFile of item.mdFiles) {
                MD += '\n\n';
                MD += mdFile;
            }
        };
        //add diagrams
        const appendImages = async () => {
            for (const pumlFile of item.pumlFiles) {
                MD += '\n\n';

                let diagramUrl = encodeURIPath(path.join(
                    path.dirname(pumlFile.dir),
                    path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
                ));
                if (!options.GENERATE_LOCAL_IMAGES)
                    diagramUrl = plantUmlServerUrl(options.PLANTUML_SERVER_URL, options.DIAGRAM_FORMAT, pumlFile.content);

                if (options.EMBED_DIAGRAM) {
                    let imgContent = "";
                    if (options.GENERATE_LOCAL_IMAGES)
                        imgContent = (await readFile(
                            path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                diagramUrl
                            ))).toString('base64');
                    else
                        imgContent = await httpGet(diagramUrl);

                    MD += `\n![${path.parse(pumlFile.dir).name}](data:${getMime(options.DIAGRAM_FORMAT)};base64,${imgContent})\n`;

                    let diagramLink = `[Download ${path.parse(pumlFile.dir).name} diagram](${diagramUrl} ':ignore')`;
                    MD += diagramLink;

                } else {

                    let diagramImage = `![diagram](${diagramUrl})`;
                    let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${diagramUrl})`;
                    if (!options.INCLUDE_LINK_TO_DIAGRAM) //img
                        MD += diagramImage;
                    else //link
                        MD += diagramLink;
                }

            }
        };

        if (options.DIAGRAMS_ON_TOP) {
            await appendImages();
            appendText();
        } else {
            appendText();
            await appendImages();
        }

        //write to disk
        totalCount++;
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            item.dir.replace(options.ROOT_FOLDER, ''),
            `${options.MD_FILE_NAME}.md`
        ), MD).then(() => {
            processedCount++;
            if (onProgress)
                onProgress(processedCount, totalCount);
        }));
    }

    return Promise.all(filePromises);
};

const generatePDF = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = 0;

    let filePromises = [];
    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        //title
        let MD = `# ${name}`;
        if (options.INCLUDE_BREADCRUMBS && name !== options.HOMEPAGE_NAME)
            MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;

        //concatenate markdown files
        const appendText = () => {
            for (const mdFile of item.mdFiles) {
                MD += '\n\n';
                MD += mdFile;
            }
        };
        //add diagrams
        const appendImages = () => {
            for (const pumlFile of item.pumlFiles) {
                MD += '\n\n';
                let diagramUrl = encodeURIPath(path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`);
                if (!options.GENERATE_LOCAL_IMAGES)
                    diagramUrl = plantUmlServerUrl(options.PLANTUML_SERVER_URL, options.DIAGRAM_FORMAT, pumlFile.content);

                let diagramImage = `![diagram](${diagramUrl})`;

                MD += diagramImage;
            }
        };

        if (options.DIAGRAMS_ON_TOP) {
            appendImages();
            appendText();
        } else {
            appendText();
            appendImages();
        }

        totalCount++;
        //write temp file
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            item.dir.replace(options.ROOT_FOLDER, ''),
            `${options.MD_FILE_NAME}_TEMP.md`
        ), MD).then(() => {
            return markdownpdf({
                path:
                    path.join(
                        options.DIST_FOLDER,
                        item.dir.replace(options.ROOT_FOLDER, ''),
                        `${options.MD_FILE_NAME}_TEMP.md`
                    )
            }, {
                stylesheet: [options.PDF_CSS],
                pdf_options: {
                    scale: 1,
                    displayHeaderFooter: false,
                    printBackground: true,
                    landscape: false,
                    pageRanges: '',
                    format: 'A4',
                    width: '',
                    height: '',
                    margin: {
                        top: '1.5cm',
                        right: '1cm',
                        bottom: '1cm',
                        left: '1cm'
                    }
                },
                dest: path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${name}.pdf`
                )
            }).catch(console.error);
        }).then(() => {
            //remove temp file
            fsextra.removeSync(path.join(
                options.DIST_FOLDER,
                item.dir.replace(options.ROOT_FOLDER, ''),
                `${options.MD_FILE_NAME}_TEMP.md`
            ));
        }).then(() => {
            processedCount++;
            if (onProgress)
                onProgress(processedCount, totalCount);
        }));
    }

    return Promise.all(filePromises);
};

const generateWebMD = async (tree, options) => {
    let filePromises = [];
    let docsifySideBar = '';

    for (const item of tree) {
        //sidebar
        docsifySideBar += `${'  '.repeat(item.level - 1)}* [${item.name}](${encodeURIPath(path.join(...path.join(item.dir).split(path.sep).splice(1), options.WEB_FILE_NAME))})\n`;
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        let MD = `# ${name}`;

        //concatenate markdown files
        const appendText = () => {
            for (const mdFile of item.mdFiles) {
                MD += '\n\n';
                MD += mdFile;
            }
        };
        //add diagrams
        const appendImages = async () => {
            for (const pumlFile of item.pumlFiles) {
                MD += '\n\n';

                let diagramUrl = encodeURIPath(path.join(
                    path.dirname(pumlFile.dir),
                    path.parse(pumlFile.dir).name + `.${options.DIAGRAM_FORMAT}`
                ));
                if (!options.GENERATE_LOCAL_IMAGES)
                    diagramUrl = plantUmlServerUrl(options.PLANTUML_SERVER_URL, options.DIAGRAM_FORMAT, pumlFile.content);

                if (options.EMBED_DIAGRAM) {
                    let imgContent = "";
                    if (options.GENERATE_LOCAL_IMAGES)
                        imgContent = (await readFile(
                            path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                diagramUrl
                            ))).toString('base64');
                    else
                        imgContent = await httpGet(diagramUrl);

                    MD += `\n![${path.parse(pumlFile.dir).name}](data:${getMime(options.DIAGRAM_FORMAT)};base64,${imgContent})\n`;

                    let diagramLink = `[Download ${path.parse(pumlFile.dir).name} diagram](${diagramUrl} ':ignore')`;
                    MD += diagramLink;

                } else {
                    let diagramImage = `![diagram](${diagramUrl})`;
                    let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${diagramUrl})`;
                    if (!options.INCLUDE_LINK_TO_DIAGRAM) //img
                        MD += diagramImage;
                    else //link
                        MD += diagramLink;
                }
            }
        };

        if (options.DIAGRAMS_ON_TOP) {
            await appendImages();
            appendText();
        } else {
            appendText();
            await appendImages();
        }

        //write to disk
        filePromises.push(writeFile(path.join(
            options.DIST_FOLDER,
            item.dir.replace(options.ROOT_FOLDER, ''),
            `${options.WEB_FILE_NAME}.md`
        ), MD));
    }

    if (options.DOCSIFY_TEMPLATE && options.DOCSIFY_TEMPLATE !== "") {
        docsifyTemplate = require(path.join(process.cwd(), options.DOCSIFY_TEMPLATE));
    }

    //docsify homepage
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        `index.html`
    ), docsifyTemplate({
        name: options.PROJECT_NAME,
        repo: options.REPO_NAME,
        loadSidebar: true,
        auto2top: true,
        homepage: `${options.WEB_FILE_NAME}.md`,
        plantuml: {
            skin: 'classic'
        },
        stylesheet: options.WEB_THEME
    })));

    //github pages preparation
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        `.nojekyll`
    ), ''));

    //sidebar
    filePromises.push(writeFile(path.join(
        options.DIST_FOLDER,
        '_sidebar.md'
    ), docsifySideBar));

    return Promise.all(filePromises);
};

const build = async (options) => {
    let start_date = new Date();

    //clear dist directory
    await fsextra.emptyDir(options.DIST_FOLDER);
    await makeDirectory(path.join(options.DIST_FOLDER));

    //actual build
    console.log(chalk.green(`\nbuilding documentation in ./${options.DIST_FOLDER}`));
    let tree = await generateTree(options.ROOT_FOLDER, options);
    console.log(chalk.blue(`parsed ${tree.length} folders`));
    if (options.GENERATE_LOCAL_IMAGES) {
        console.log(chalk.blue('generating images'));
        await generateImages(tree, options, (count, total) => {
            process.stdout.write(`processed ${count}/${total} images\r`);
        });
        console.log('');
    }
    if (options.GENERATE_MD) {
        console.log(chalk.blue('generating markdown files'));
        await generateMD(tree, options, (count, total) => {
            process.stdout.write(`processed ${count}/${total} files\r`);
        });
        console.log('');
    }
    if (options.GENERATE_WEBSITE) {
        console.log(chalk.blue('generating docsify site'));
        await generateWebMD(tree, options);
    }
    if (options.GENERATE_COMPLETE_MD_FILE) {
        console.log(chalk.blue('generating complete markdown file'));
        await generateCompleteMD(tree, options);
    }
    if (options.GENERATE_COMPLETE_PDF_FILE) {
        console.log(chalk.blue('generating complete pdf file'));
        await generateCompletePDF(tree, options);
    }
    if (options.GENERATE_PDF) {
        console.log(chalk.blue('generating pdf files'));
        await generatePDF(tree, options, (count, total) => {
            process.stdout.write(`processed ${count}/${total} files\r`);
        });
        console.log('');
    }

    console.log(chalk.green(`built in ${(new Date() - start_date) / 1000} seconds`));
};
exports.build = build;
