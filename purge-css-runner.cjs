const { exec } = require('child_process');
const fs = require('fs');

// Run PurgeCSS using the CLI command
exec('purgecss --config ./purgecss.config.js --output ./purgecss-report', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error running PurgeCSS: ${error.message}`);
    return;
  }

  // Log the standard output of PurgeCSS
  console.log(stdout);

  // Instructions about ignoring CSS rules
  const instructions = `
======================================
Important PurgeCSS Information:
======================================
Unfortunately, PurgeCSS and similar tools are unable to handle dynamic styles effectively. Automating this process
can lead to false positives where all dynamic styles (e.g., MUI styles) are removed, or using the safelist option
might keep all styles of that type, even if they are not used. Therefore, it is recommended to manually add ignore
comments on the stylings flagged, and remove unwanted styling.

After ignoring styles, you can run PurgeCSS again to remove unused styles.
How to ignore styles:

Method 1:
Use /* purgecss ignore */ to ignore a specific rule, including grouped rules.
Example:
/* purgecss ignore */
.always-keep {
  display: flex;
  justify-content: center;
  /* This entire block will be ignored */
}

.button-hover:hover {
  color: white; /* This rule will be evaluated by PurgeCSS */
}

Method 2:
Use /* purgecss start ignore */ ... /* purgecss end ignore */ to ignore a block of CSS rules.
Example:
/* purgecss start ignore */
.multi-line-class {
  font-size: 14px;
}
.another-class {
  border: 1px solid black;
}
/* purgecss end ignore */

Note on Safelist:
- Use the 'safelist' option in purgecss.config.js to ignore dynamically applied styles. 
  *DO NOT RECOMMEND THIS.* It makes running PurgeCSS pointless as it will keep all styles of that type, 
  even if they are not used. Keep this note here for reference only.
`;

  // Write the instructions to the log file
  fs.appendFile('./purgecss-report/purgecss-log.txt', instructions, (err) => {
    if (err) {
      console.error(`Failed to write instructions: ${err.message}`);
    } else {
      console.log('Custom instructions added to PurgeCSS log.');
    }
  });
});
