#!/usr/bin/env node

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const fsextra = require('fs-extra');
let docsifyTemplate = require('./docsify.template.js');
const markdownpdf = require('md-to-pdf').mdToPdf;
const http = require('http');

const DIST_BACKUP_FOLDER_SUFFIX = '_bk';

const {
    encodeURIPath,
    makeDirectory,
    readFile,
    writeFile,
    plantUmlServerUrl,
    plantumlVersions
} = require('./utils.js');
const { date } = require('joi');

const getMime = (format) => {
    if (format == 'svg') return `image/svg+xml`;
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
            response.on('end', () => resolve(Buffer.concat(body).toString('base64')));
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
        // Skip output folder - this allows a user to use the top-level folder as ROOT_FOLDER.
        if (dir === options.DIST_FOLDER) {
            return
        }

        let name = getFolderName(dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        let item = tree.find((x) => x.dir === dir);
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

        let files = fs.readdirSync(dir).filter((x) => x.charAt(0) !== '_');
        for (const file of files) {
            //if folder
            if (fs.statSync(path.join(dir, file)).isDirectory()) {
                item.descendants.push(file);
                //create corresponding dist folder
                if (
                    options.GENERATE_WEBSITE ||
                    options.GENERATE_MD ||
                    options.GENERATE_PDF ||
                    options.GENERATE_LOCAL_IMAGES
                )
                    await makeDirectory(
                        path.join(options.DIST_FOLDER, dir.replace(options.ROOT_FOLDER, ''), file)
                    );

                await build(path.join(dir, file), dir);
            }
        }

        const mdFiles = files.filter((x) => path.extname(x).toLowerCase() === '.md');
        for (const mdFile of mdFiles) {
            const fileContents = await readFile(path.join(dir, mdFile));
            item.mdFiles.push(fileContents);
        }
        const pumlFiles = files.filter((x) => path.extname(x).toLowerCase() === '.puml');
        for (const pumlFile of pumlFiles) {
            const fileContents = await readFile(path.join(dir, pumlFile));
            const isDitaa = !!(fileContents ? fileContents.toString() : '').match(/(@startditaa)/gi);
            item.pumlFiles.push({ dir: pumlFile, content: fileContents, isDitaa });
        }
        item.pumlFiles.sort(function (a, b) {
            return ('' + a.dir).localeCompare(b.dir);
        });

        //copy all other files
        const otherFiles = options.EXCLUDE_OTHER_FILES
            ? []
            : files.filter(
                  (x) => x.charAt(0) === '_' || ['.md', '.puml'].indexOf(path.extname(x).toLowerCase()) === -1
              );

        for (const otherFile of otherFiles) {
            if (fs.statSync(path.join(dir, otherFile)).isDirectory()) continue;

            if (options.GENERATE_MD || options.GENERATE_PDF || options.GENERATE_WEBSITE)
                await fsextra.copy(
                    path.join(dir, otherFile),
                    path.join(options.DIST_FOLDER, dir.replace(options.ROOT_FOLDER, ''), otherFile)
                );
            if (options.GENERATE_COMPLETE_PDF_FILE || options.GENERATE_COMPLETE_MD_FILE)
                await fsextra.copy(path.join(dir, otherFile), path.join(options.DIST_FOLDER, otherFile));
        }
    };

    await build(dir);

    return tree;
};

const generateImages = async (tree, options, onImageGenerated, conf) => {
    // Get the old checksums (from last run) of all PUML-files
    let oldChecksums = conf.get('checksums') || [];
    let newChecksums = [];
    const bkFolderName = options.DIST_FOLDER + DIST_BACKUP_FOLDER_SUFFIX;

    let totalImages = 0;
    let processedImages = 0;

    let ver = plantumlVersions.find((v) => v.version === options.PLANTUML_VERSION);
    if (options.PLANTUML_VERSION === 'latest') ver = plantumlVersions.find((v) => v.isLatest);
    if (!ver) throw new Error(`PlantUML version ${options.PLANTUML_VERSION} not supported`);

    const crypto = require('crypto');

    for (const item of tree) {
        totalImages += item.pumlFiles.length;
    }

    for (const item of tree) {
        for (const pumlFile of item.pumlFiles) {
            //There was a bug with this, that's why I require it inside the loop
            process.env.PLANTUML_HOME = path.join(__dirname, 'vendor', ver.jar);
            const plantuml = require('node-plantuml');

            // Calculate hash of current puml content
            let cksum = crypto
                .createHash('sha256')
                .update('' + pumlFile.content || '', 'utf-8')
                .digest('hex');

            // path to backup image file
            let bkFilePath = path.join(
                bkFolderName,
                item.dir.replace(options.ROOT_FOLDER, ''),
                `${path.parse(pumlFile.dir).name}.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
            );

            // path to image in dist folder
            let filePath = path.join(
                options.DIST_FOLDER,
                item.dir.replace(options.ROOT_FOLDER, ''),
                `${path.parse(pumlFile.dir).name}.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
            );

            // if checksum exists (PUML untouched) and file/image exists - copy image back from backup folder
            if (oldChecksums.find((x) => x === cksum) && (await fs.existsSync(bkFilePath))) {
                await fsextra.copyFileSync(bkFilePath, filePath);
            } else {
                //write diagram as image
                let stream = fs.createWriteStream(filePath);

                plantuml
                    .generate(path.join(item.dir, pumlFile.dir), {
                        format: pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT,
                        charset: options.CHARSET,
                        include: item.dir
                    })
                    .out.pipe(stream);

                await new Promise((resolve) => stream.on('finish', resolve));
            }
            processedImages++;
            if (onImageGenerated) onImageGenerated(processedImages, totalImages);

            // Add puml checksum
            newChecksums.push(cksum);
        }
    }

    // store all puml checksums
    conf.set('checksums', newChecksums);
};

const compileDocument = async (md, item, options, getDiagram) => {
    let MD = md;
    const alreadyIncludedPumls = [];
    const texts = [];
    const diagrams = [];
    const regex = /(?:!\[.*?\]\()(.*\.puml)(\))/g;

    for (const mdFile of item.mdFiles) {
        let content = mdFile.toString();

        let pumlRef;
        while ((pumlRef = regex.exec(content)) !== null) {
            if (pumlRef && pumlRef[1]) {
                const pumlFile = item.pumlFiles.find((x) => x.dir === pumlRef[1]);
                if (pumlFile) {
                    alreadyIncludedPumls.push(pumlRef[1]);
                    content = content.replace(pumlRef[0], await getDiagram(item, pumlFile, options));
                }
            }
        }
        texts.push(content);
    }
    for (const pumlFile of item.pumlFiles) {
        if (alreadyIncludedPumls.find((x) => x === pumlFile.dir)) {
            continue;
        }

        diagrams.push(await getDiagram(item, pumlFile, options));
    }

    let fullDoc = [];
    if (options.DIAGRAMS_ON_TOP) {
        fullDoc = [...diagrams, ...texts];
    } else {
        fullDoc = [...texts, ...diagrams];
    }

    for (const doc of fullDoc) {
        MD += '\n\n';
        MD += doc;
    }

    return MD;
};

const generateCompleteMD = async (tree, options) => {
    let filePromises = [];

    //title
    let MD = `# ${options.PROJECT_NAME}`;
    //table of contents
    let tableOfContents = '';
    for (const item of tree)
        tableOfContents += `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURIPath(
            item.name
        ).replace(/%20/g, '-')})\n`;
    MD += `\n\n${tableOfContents}\n---`;

    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        MD += `\n\n## ${name}`;
        if (name !== options.HOMEPAGE_NAME) {
            if (options.INCLUDE_BREADCRUMBS) MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
            MD += `\n\n[${options.HOMEPAGE_NAME}](#${encodeURIPath(options.PROJECT_NAME).replace(
                /%20/g,
                '-'
            )})`;
        }

        //concatenate markdown files
        MD = await compileDocument(MD, item, options, async (item, pumlFile, options) => {
            let diagramUrl = encodeURIPath(
                path.join(
                    path.dirname(pumlFile.dir),
                    path.parse(pumlFile.dir).name + `.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
                )
            );
            if (!options.GENERATE_LOCAL_IMAGES)
                diagramUrl = plantUmlServerUrl(
                    options.PLANTUML_SERVER_URL,
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT,
                    pumlFile.content
                );

            if (options.EMBED_DIAGRAM) {
                let imgContent = '';
                if (options.GENERATE_LOCAL_IMAGES)
                    imgContent = (
                        await readFile(
                            path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                diagramUrl
                            )
                        )
                    ).toString('base64');
                else imgContent = await httpGet(diagramUrl);

                let diagramImage = `\n![${path.parse(pumlFile.dir).name}](data:${getMime(
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT
                )};base64,${imgContent})\n`;

                let diagramLink = `\n[Download ${path.parse(pumlFile.dir).name} diagram](${encodeURIPath(
                    path.join(item.dir.replace(options.ROOT_FOLDER, ''), diagramUrl)
                )} ':ignore')`;
                return diagramImage + diagramLink;
            } else {
                let diagramImage = `![diagram](${diagramUrl})`;
                let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${encodeURIPath(
                    path.join(item.dir.replace(options.ROOT_FOLDER, ''), diagramUrl)
                )})`;
                if (!options.INCLUDE_LINK_TO_DIAGRAM)
                    //img
                    return diagramImage;
                //link
                else return diagramLink;
            }
        });
    }

    //write file to disk
    filePromises.push(writeFile(path.join(options.DIST_FOLDER, `${options.PROJECT_NAME}.md`), MD));

    return Promise.all(filePromises);
};

const generateCompletePDF = async (tree, options) => {
    //title
    let MD = `# ${options.PROJECT_NAME}`;
    //table of contents
    let tableOfContents = '';
    for (const item of tree)
        tableOfContents += `${'  '.repeat(item.level - 1)}* [${item.name}](#${encodeURIPath(
            item.name
        ).replace(/%20/g, '-')})\n`;
    MD += `\n\n${tableOfContents}\n---`;

    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        MD += `\n\n## ${name}`;
        //bradcrumbs
        if (name !== options.HOMEPAGE_NAME) {
            if (options.INCLUDE_BREADCRUMBS) MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;
        }

        //concatenate markdown files
        MD = await compileDocument(MD, item, options, async (item, pumlFile, options) => {
            let diagramUrl = encodeURIPath(
                path.join(
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    path.parse(pumlFile.dir).name + `.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
                )
            );
            if (!options.GENERATE_LOCAL_IMAGES)
                diagramUrl = plantUmlServerUrl(
                    options.PLANTUML_SERVER_URL,
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT,
                    pumlFile.content
                );

            let diagramImage = `![diagram](${diagramUrl})`;

            return diagramImage;
        });
    }

    //write temp file
    await writeFile(path.join(options.DIST_FOLDER, `${options.PROJECT_NAME}_TEMP.md`), MD);
    //convert to pdf
    await markdownpdf(
        {
            path: './' + path.join(options.DIST_FOLDER, `${options.PROJECT_NAME}_TEMP.md`)
        },
        {
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
            dest: path.join(options.DIST_FOLDER, `${options.PROJECT_NAME}.pdf`)
        }
    ).catch(console.error);

    // remove temp file
    await fsextra.remove(path.join(options.DIST_FOLDER, `${options.PROJECT_NAME}_TEMP.md`));
};

const generateMD = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = tree.length;

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
                let isDown = item.level < _item.level;
                let label = `${item.dir === _item.dir ? '**' : ''}${_item.name}${
                    item.dir === _item.dir ? '**' : ''
                }`;
                tableOfContents += `${'  '.repeat(_item.level - 1)}* [${label}](${encodeURIPath(
                    path.join(
                        // '/',
                        // options.DIST_FOLDER,
                        './',
                        item.level - 1 > 0 ? '../'.repeat(item.level - 1) : '',
                        _item.dir.replace(options.ROOT_FOLDER, ''),
                        `${options.MD_FILE_NAME}.md`
                    )
                )})\n`; //slice 1 if root and down
            }
            MD += `\n\n${tableOfContents}\n---`;
        }
        //parent menu
        if (item.parent && options.INCLUDE_NAVIGATION) {
            let parentName = getFolderName(item.parent, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
            MD += `\n\n[${parentName} (up)](${encodeURIPath(
                path.join(
                    // '/',
                    // options.DIST_FOLDER,
                    './',
                    item.level - 1 > 0 ? '../'.repeat(item.level - 1) : '',
                    item.parent.replace(options.ROOT_FOLDER, ''),
                    `${options.MD_FILE_NAME}.md`
                )
            )})`;
        }

        //exclude files and folders prefixed with _
        let descendantsMenu = '';
        for (const file of item.descendants) {
            descendantsMenu += `\n\n- [${file}](${encodeURIPath(
                path.join(
                    // '/',
                    // options.DIST_FOLDER,
                    './',
                    item.level - 1 > 0 ? '../'.repeat(item.level - 1) : '',
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    file,
                    `${options.MD_FILE_NAME}.md`
                )
            )})`;
        }
        //descendants menu
        if (descendantsMenu && options.INCLUDE_NAVIGATION) MD += `${descendantsMenu}`;
        //separator
        if (options.INCLUDE_NAVIGATION) MD += `\n\n---`;

        //concatenate markdown files
        MD = await compileDocument(MD, item, options, async (item, pumlFile, options) => {
            let diagramUrl = encodeURIPath(
                path.join(
                    path.dirname(pumlFile.dir),
                    path.parse(pumlFile.dir).name + `.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
                )
            );
            if (!options.GENERATE_LOCAL_IMAGES)
                diagramUrl = plantUmlServerUrl(
                    options.PLANTUML_SERVER_URL,
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT,
                    pumlFile.content
                );

            if (options.EMBED_DIAGRAM) {
                let imgContent = '';
                if (options.GENERATE_LOCAL_IMAGES)
                    imgContent = (
                        await readFile(
                            path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                diagramUrl
                            )
                        )
                    ).toString('base64');
                else imgContent = await httpGet(diagramUrl);

                let diagramImage = `\n![${path.parse(pumlFile.dir).name}](data:${getMime(
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT
                )};base64,${imgContent})\n`;

                let diagramLink = `[Download ${
                    path.parse(pumlFile.dir).name
                } diagram](${diagramUrl} ':ignore')`;
                return diagramImage + diagramLink;
            } else {
                let diagramImage = `![diagram](${diagramUrl})`;
                let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${diagramUrl})`;
                if (!options.INCLUDE_LINK_TO_DIAGRAM)
                    //img
                    return diagramImage;
                //link
                else return diagramLink;
            }
        });

        //write to disk
        filePromises.push(
            writeFile(
                path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${options.MD_FILE_NAME}.md`
                ),
                MD
            ).then(() => {
                processedCount++;
                if (onProgress) onProgress(processedCount, totalCount);
            })
        );
    }

    return Promise.all(filePromises);
};

const generatePDF = async (tree, options, onProgress) => {
    let processedCount = 0;
    let totalCount = tree.length;

    let filePromises = [];
    for (const item of tree) {
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);
        //title
        let MD = `# ${name}`;
        if (options.INCLUDE_BREADCRUMBS && name !== options.HOMEPAGE_NAME)
            MD += `\n\n\`${item.dir.replace(options.ROOT_FOLDER, '')}\``;

        //concatenate markdown files
        MD = await compileDocument(MD, item, options, async (item, pumlFile, options) => {
            let diagramUrl = encodeURIPath(
                path.parse(pumlFile.dir).name + `.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
            );
            if (!options.GENERATE_LOCAL_IMAGES)
                diagramUrl = plantUmlServerUrl(
                    options.PLANTUML_SERVER_URL,
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT,
                    pumlFile.content
                );

            let diagramImage = `![diagram](${diagramUrl})`;

            return diagramImage;
        });

        //write temp file
        filePromises.push(
            writeFile(
                path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${options.MD_FILE_NAME}_TEMP.md`
                ),
                MD
            )
                .then(() => {
                    return markdownpdf(
                        {
                            path: path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                `${options.MD_FILE_NAME}_TEMP.md`
                            )
                        },
                        {
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
                        }
                    ).catch(console.error);
                })
                .then(() => {
                    //remove temp file
                    fsextra.removeSync(
                        path.join(
                            options.DIST_FOLDER,
                            item.dir.replace(options.ROOT_FOLDER, ''),
                            `${options.MD_FILE_NAME}_TEMP.md`
                        )
                    );
                })
                .then(() => {
                    processedCount++;
                    if (onProgress) onProgress(processedCount, totalCount);
                })
        );
    }

    return Promise.all(filePromises);
};

const generateWebMD = async (tree, options) => {
    let filePromises = [];
    let docsifySideBar = '';

    for (const item of tree) {
        //sidebar
        docsifySideBar += `${'  '.repeat(item.level - 1)}* [${item.name}](${encodeURIPath(
            path.join(...path.join(item.dir).split(path.sep).splice(1), options.WEB_FILE_NAME)
        )})\n`;
        let name = getFolderName(item.dir, options.ROOT_FOLDER, options.HOMEPAGE_NAME);

        //title
        let MD = `# ${name}`;

        //concatenate markdown files
        MD = await compileDocument(MD, item, options, async (item, pumlFile, options) => {
            let diagramUrl = encodeURIPath(
                path.join(
                    path.dirname(pumlFile.dir),
                    path.parse(pumlFile.dir).name + `.${pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT}`
                )
            );
            if (!options.GENERATE_LOCAL_IMAGES)
                diagramUrl = plantUmlServerUrl(
                    options.PLANTUML_SERVER_URL,
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT,
                    pumlFile.content
                );

            if (options.EMBED_DIAGRAM) {
                let imgContent = '';
                if (options.GENERATE_LOCAL_IMAGES)
                    imgContent = (
                        await readFile(
                            path.join(
                                options.DIST_FOLDER,
                                item.dir.replace(options.ROOT_FOLDER, ''),
                                diagramUrl
                            )
                        )
                    ).toString('base64');
                else imgContent = await httpGet(diagramUrl);

                let diagramImage = `\n![${path.parse(pumlFile.dir).name}](data:${getMime(
                    pumlFile.isDitaa ? 'png' : options.DIAGRAM_FORMAT
                )};base64,${imgContent})\n`;

                let diagramLink = `[Download ${
                    path.parse(pumlFile.dir).name
                } diagram](${diagramUrl} ':ignore')`;

                return diagramImage + diagramLink;
            } else {
                let diagramImage = `![diagram](${diagramUrl})`;
                let diagramLink = `[Go to ${path.parse(pumlFile.dir).name} diagram](${diagramUrl})`;
                if (!options.INCLUDE_LINK_TO_DIAGRAM)
                    //img
                    return diagramImage;
                //link
                else return diagramLink;
            }
        });

        //write to disk
        filePromises.push(
            writeFile(
                path.join(
                    options.DIST_FOLDER,
                    item.dir.replace(options.ROOT_FOLDER, ''),
                    `${options.WEB_FILE_NAME}.md`
                ),
                MD
            )
        );
    }

    if (options.DOCSIFY_TEMPLATE && options.DOCSIFY_TEMPLATE !== '') {
        docsifyTemplate = require(path.join(process.cwd(), options.DOCSIFY_TEMPLATE));
    }

    //docsify homepage
    filePromises.push(
        writeFile(
            path.join(options.DIST_FOLDER, `index.html`),
            docsifyTemplate({
                name: options.PROJECT_NAME,
                repo: options.REPO_NAME,
                loadSidebar: true,
                auto2top: true,
                homepage: `${options.WEB_FILE_NAME}.md`,
                plantuml: {
                    skin: 'classic'
                },
                stylesheet: options.WEB_THEME,
                alias: { '/.*/_sidebar.md': '/_sidebar.md' },
                supportSearch: options.SUPPORT_SEARCH
            })
        )
    );

    //github pages preparation
    filePromises.push(writeFile(path.join(options.DIST_FOLDER, `.nojekyll`), ''));

    //sidebar
    filePromises.push(writeFile(path.join(options.DIST_FOLDER, '_sidebar.md'), docsifySideBar));

    return Promise.all(filePromises);
};

const build = async (options, conf) => {
    let start_date = new Date();
    const bkFolderName = options.DIST_FOLDER + DIST_BACKUP_FOLDER_SUFFIX;

    // Generating local images, remove old backup image folder, rename current dist folder to new backup
    if (options.GENERATE_LOCAL_IMAGES) {
        await fsextra.removeSync(bkFolderName);
        if (await fsextra.existsSync(options.DIST_FOLDER)) {
            await fsextra.rename(options.DIST_FOLDER, bkFolderName);
        }
    } else {
        //clear dist directory
        await fsextra.emptyDir(options.DIST_FOLDER);
    }
    await makeDirectory(path.join(options.DIST_FOLDER));

    //actual build
    console.log(chalk.green(`\nbuilding documentation in ./${options.DIST_FOLDER}`));
    let tree = await generateTree(options.ROOT_FOLDER, options);
    console.log(chalk.blue(`parsed ${tree.length} folders`));
    if (options.GENERATE_LOCAL_IMAGES) {
        console.log(chalk.blue('generating images'));
        await generateImages(
            tree,
            options,
            (count, total) => {
                process.stdout.write(`processed ${count}/${total} images\r`);
            },
            conf
        );
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

    // Remove image backup folder
    await fsextra.removeSync(bkFolderName);

    console.log(chalk.green(`built in ${(new Date() - start_date) / 1000} seconds`));
};
exports.build = build;
