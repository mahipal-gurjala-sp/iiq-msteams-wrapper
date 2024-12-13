const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');

// Custom i18n webpack plugin
class I18nPlugin {
  constructor(translations) {
    this.translations = translations;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('I18nPlugin', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapAsync(
        'I18nPlugin',
        (data, cb) => {
          // Replace translation keys in HTML
          Object.keys(this.translations).forEach(key => {
            data.html = data.html.replace(
              new RegExp(`__\\('${key}'\\)`, 'g'), 
              this.translations[key]
            );
          });
          cb(null, data);
        }
      );
    });
  }
}

// Dynamically load translation files

const loadTranslations = (lang) => {
  const translationsPath = path.resolve(__dirname, `src/locales/${lang}.json`);
  return JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
};

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new I18nPlugin(loadTranslations('en')) // Default to English
  ],
};
