const { override, addWebpackAlias, addWebpackModuleRule } = require('customize-cra')


const path = require('path')

module.exports = override(
    addWebpackAlias({fs: 'pdfkit/js/virtual-fs.js'}),
    addWebpackModuleRule({ enforce: 'post', test: /fontkit[/\\]index.js$/, loader: "transform-loader?brfs" }),
    addWebpackModuleRule({ enforce: 'post', test: /unicode-properties[/\\]index.js$/, loader: "transform-loader?brfs" }),
    addWebpackModuleRule({ enforce: 'post', test: /linebreak[/\\]src[/\\]linebreaker.js/, loader: "transform-loader?brfs" }),
    addWebpackModuleRule({ test: /src[/\\]assets/, loader: 'arraybuffer-loader' }),
    addWebpackModuleRule({ test: /\.afm$/, loader: 'raw-loader' }),
    addWebpackModuleRule({ test: /src\/makePDF\.js/, loader: 'raw-loader' })
)