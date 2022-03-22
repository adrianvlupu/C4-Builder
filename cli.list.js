const chalk = require('chalk');

module.exports = (currentConfiguration) => {
  console.log(`
CURRENT CONFIGURATION

Project Name: ${
    currentConfiguration.PROJECT_NAME ? chalk.green(currentConfiguration.PROJECT_NAME) : chalk.red('not set')
  }
Homepage Name: ${
    currentConfiguration.HOMEPAGE_NAME ? chalk.green(currentConfiguration.HOMEPAGE_NAME) : chalk.red('not set')
  }
Root Folder: ${currentConfiguration.ROOT_FOLDER ? chalk.green(currentConfiguration.ROOT_FOLDER) : chalk.red('not set')}
Destination Folder: ${
    currentConfiguration.DIST_FOLDER ? chalk.green(currentConfiguration.DIST_FOLDER) : chalk.red('not set')
  }
Generate multiple markdown files: ${
    currentConfiguration.GENERATE_MD !== undefined
      ? chalk.green(currentConfiguration.GENERATE_MD)
      : chalk.red('not set')
  }    
    ${
      currentConfiguration.generateMD
        ? `include basic navigation: ${chalk.green(currentConfiguration.INCLUDE_NAVIGATION || false)}
    include table of contents: ${chalk.green(currentConfiguration.INCLUDE_TABLE_OF_CONTENTS || false)}`
        : ''
    }
Generate a single complete markdown file: ${
    currentConfiguration.GENERATE_COMPLETE_MD_FILE !== undefined
      ? chalk.green(currentConfiguration.GENERATE_COMPLETE_MD_FILE)
      : chalk.red('not set')
  }
Generate multiple pdf files: ${
    currentConfiguration.GENERATE_PDF !== undefined
      ? chalk.green(currentConfiguration.GENERATE_PDF)
      : chalk.red('not set')
  }
Generate a single complete pdf file: ${
    currentConfiguration.GENERATE_COMPLETE_PDF_FILE !== undefined
      ? chalk.green(currentConfiguration.GENERATE_COMPLETE_PDF_FILE)
      : chalk.red('not set')
  }
    ${
      currentConfiguration.generatePDF || currentConfiguration.GENERATE_COMPLETE_PDF_FILE
        ? `Custom pdf css: ${
            currentConfiguration.PDF_CSS ? chalk.green(currentConfiguration.PDF_CSS) : chalk.red('not set')
          }`
        : ''
    }
Generate website: ${
    currentConfiguration.GENERATE_WEBSITE !== undefined
      ? chalk.green(currentConfiguration.GENERATE_WEBSITE)
      : chalk.red('not set')
  }
    ${
      currentConfiguration.GENERATE_WEBSITE
        ? `Website docsify theme: ${
            currentConfiguration.WEB_THEME ? chalk.green(currentConfiguration.WEB_THEME) : chalk.red('not set')
          }
    Path to a specific Docsify template: ${
      currentConfiguration.DOCSIFY_TEMPLATE ? chalk.green(currentConfiguration.DOCSIFY_TEMPLATE) : chalk.red('not set')
    }`
        : ''
    }
    Repository Url: ${
      currentConfiguration.REPO_NAME ? chalk.green(currentConfiguration.REPO_NAME) : chalk.red('not set')
    }
Include breadcrumbs: ${
    currentConfiguration.INCLUDE_BREADCRUMBS !== undefined
      ? chalk.green(currentConfiguration.INCLUDE_BREADCRUMBS)
      : chalk.red('not set')
  }

PlantUML version: ${
    currentConfiguration.PLANTUML_VERSION !== undefined
      ? chalk.green(currentConfiguration.PLANTUML_VERSION)
      : chalk.red('not set')
  }

Embed SVG diagram : ${
    currentConfiguration.EMBED_DIAGRAM !== undefined
      ? chalk.green(currentConfiguration.EMBED_DIAGRAM)
      : chalk.red('not set')
  }
Generate diagram images locally: ${
    currentConfiguration.GENERATE_LOCAL_IMAGES !== undefined
      ? chalk.green(currentConfiguration.GENERATE_LOCAL_IMAGES)
      : chalk.red('not set')
  }
Replace diagrams with a link: ${
    currentConfiguration.INCLUDE_LINK_TO_DIAGRAM !== undefined
      ? chalk.green(currentConfiguration.INCLUDE_LINK_TO_DIAGRAM)
      : chalk.red('not set')
  }
Place diagrams before text: ${
    currentConfiguration.DIAGRAMS_ON_TOP !== undefined
      ? chalk.green(currentConfiguration.DIAGRAMS_ON_TOP)
      : chalk.red('not set')
  }
PlantUML server url: ${
    currentConfiguration.PLANTUML_SERVER_URL !== undefined
      ? chalk.green(currentConfiguration.PLANTUML_SERVER_URL)
      : chalk.red('not set')
  }
Diagram format: ${
    currentConfiguration.DIAGRAM_FORMAT !== undefined
      ? chalk.green(currentConfiguration.DIAGRAM_FORMAT)
      : chalk.red('not set')
  }
Charset: ${
    currentConfiguration.CHARSET !== undefined ? chalk.green(currentConfiguration.CHARSET) : chalk.red('not set')
  }
`);
  return;
};
