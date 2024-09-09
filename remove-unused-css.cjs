const fs = require('fs');
const path = require('path');
const glob = require('glob');
const postcss = require('postcss');
const purgecss = require('@fullhuman/postcss-purgecss');

const cssFiles = glob.sync('app/src/**/*.css'); // Adjust the pattern if needed

cssFiles.forEach(file => {
  const cssContent = fs.readFileSync(file, 'utf-8');

  postcss([
    purgecss({
      content: ['app/src/**/*.{tsx,ts,jsx,js,html}'], // Adjust this pattern if necessary
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ])
    .process(cssContent, { from: file, to: file })
    .then(result => {
      fs.writeFileSync(file, result.css); // Directly replace the file with cleaned CSS
      console.log(`Processed and cleaned: ${file}`);
    })
    .catch(error => {
      console.error(`Error processing file ${file}:`, error);
    });
});
