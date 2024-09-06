module.exports = {
    content: ['./app/src/**/*.{ts,tsx,html,js}'], // Path to content files
    css: ['./app/src/**/*.css'], // Path to CSS files
    safelist: {
      standard: [], // Add exact class names here if you want to safelist specific classes
      deep: [], // Use regex patterns here for classes to safelist
      greedy: [], // Use regex patterns here for classes to safelist
    },
    output: './purgecss-report', // Output directory for PurgeCSS results
  };

/*
  You can add stylings to safelist to prevent PurgeCSS from removing them, but I DO NOT RECOMMEND IT.
  You should instead add ignore comments as shown in the output file of purgecss
  If you add safelist, it will be applied to all stylings of that type, thus even if it were unused, it will be kept.

  But if you still want to use it, here is how you can use it:
  
  standard: ['always-keep-class', 'another-fixed-class'], // Exact class names to keep
  deep: [/^dynamic-/, /^grid-/, /bg-/], // Regex patterns to keep classes starting with 'dynamic-', 'grid-', or 'bg-'
  greedy: [/^bg-/, /^text-/], // Regex patterns to keep classes starting with 'bg-' or 'text-'
  
  Difference between deep and greedy is that deep will keep the exact class names and classes
  starting with the specified patterns, while greedy will only keep classes starting with the specified patterns.
  on the other hand, standard will keep the exact class names specified in the array.
 */