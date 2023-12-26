
// If you are running in dev mode, prefix URL's with the dev server URL:

const devurl = "http://localhost:3000";
export function devSafeUrl(url: string) {
  if (!url.match(/^\//)) {
    console.log('WARNING: you did not use an absolute path for your URL in a request to fetcher (i.e. one starting with a /).');
    console.log('The url you passed to fetcher is: ', url);
    console.log('fetcher will prefix the path with the dev URL if you are running in dev mode, so relative paths do not work since you are not loading the page through the server.');
    console.log('Therefore, you will probably have bugs on the dev side.  The call stack here (to show you where you made the call) is: ', (new Error()).stack);
  }

  // vite sets this variable to true if you are running `yarn dev`, but if you
  // are running from the built files in dist/ (i.e. they are served to the 
  // browser from the node server instead of the vite dev server), then it 
  // will be false.
  if (import.meta.env.DEV) {
    console.log(devurl + url)
    return devurl + url;
  }
  console.log(url)
  return url;
}

export async function fetcher(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
  // if (import.meta.env.DEV) {
  //   if (typeof args[0] === 'string') { 
  //     args[0] = devSafeUrl(args[0]);
  //   }
  // }
  args[0] = "http://dev.timescalecreator.org:3000"
  console.log(args[0])
  return fetch(...args);
}
