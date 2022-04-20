// {
//     name: '{{name}}',
//     repo: '',
//     loadSidebar: true,
//     auto2top: true,
//     homepage: 'index.md',
//     plantuml: {
//       skin: 'classic'
//     },
//     stylesheet: ''
//   }
module.exports = (options) => {
    return `<!DOCTYPE html>
    <html lang="en">
    
    <head>
        <meta charset="UTF-8">
        <title>${options.name}</title>
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
        <meta name="description" content="Description">
        <meta name="viewport"
        content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
        <link rel="stylesheet" href="${options.stylesheet}">
    </head>
    
    <body>
        <div id="app"></div>
        <script>
        window.$docsify = ${JSON.stringify(options, null, 2)};
        </script>
        <script src="//unpkg.com/docsify/lib/docsify.min.js"></script>
        <script src="//unpkg.com/docsify-plantuml/dist/docsify-plantuml.min.js"></script>
        <script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/zoom-image.min.js"></script>
        ${
            !!options.supportSearch &&
            `<script src="//cdn.jsdelivr.net/npm/docsify/lib/plugins/search.min.js"></script>`
        }
        ${
            !!options.executeScript &&
            `<script src="//unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>`
        }
    </body>
    
    </html>`;
};
