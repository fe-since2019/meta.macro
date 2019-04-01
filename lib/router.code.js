const fs = require('fs');
const path = require('path');

const generatedPath = path.resolve(process.cwd(), 'src/router-config.json');
const generatedRouter = path.resolve(process.cwd(), 'src/router.js');

const alias = '~';

module.exports = function generateCode(pages) {
    fs.writeFileSync(generatedPath, JSON.stringify(pages, null, 2));
    const keys = Object.keys(pages);

    const staticImports = [];
    const dynamicImports = [];
    const urlMappings = {};
    const duplicated = [];

    keys.forEach((file) => {
        const meta = pages[file];

        if (!meta.params || !meta.params.length || (typeof meta.params[0] !== 'string')) {
            throw new Error(`请指定页面访问的路径: 如@${meta.callee}('/home')`)
        }
        const pageParams = meta.params[1];

        if (pageParams && Object.prototype.toString.call(pageParams) !== '[object Object]') {
            throw new Error(`请指定页面访问的路径参数: 如@${meta.callee}('/home', {async: true, chunk: "common"})`);
        }

        const url = meta.params[0];
        if (!urlMappings[url]) {
            urlMappings[url] = true;
        } else {
            duplicated.push(url);
        }
        meta.url = url;
        meta.import = path.join(alias, path.relative(path.resolve(process.cwd(), 'src'), file)).replace(/\\\\/g, '/');

        if (pageParams && pageParams.async) {
            if (!pageParams.chunk) {
                pageParams.chunk = 'default';
            }
            meta.chunk = pageParams.chunk;
            dynamicImports.push(meta);
            return;
        }

        meta.name = path.basename(file).replace(/\.[^\.]*$/, '');
        staticImports.push(meta);

    })

    fs.writeFileSync(generatedRouter, `import React from 'react';
import Loadable from 'react-loadable';
import Loading from './Loading';
${staticImports.map(dependency => `import ${dependency.name} from '${dependency.import}';`).join('\n')}
const lazy = loader => Loadable({
    delay: 400,
    loading: Loading,
    loader,
  });

const rootConfig = [
  ${dynamicImports.map((dependency) => `{
    path: "${dependency.url}",
    component: lazy(() => import(/* webpackChunkName: "${dependency.chunk}" */ '${dependency.import}')),
  }`
        ).concat(staticImports.map((dependency) => `{
    path: "${dependency.url}",
    component: ${dependency.name},
  }`
        )).join(', ')}
];
${duplicated.length ? `throw new Error('URL Conflict! Multiple Page try Mounting the Same URL: ${JSON.stringify(duplicated)}')` : ''}
export default rootConfig;
      `
    )
}