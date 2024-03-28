// If you are running in dev mode, prefix URL's with the dev server URL:

export function devSafeUrl(url: string) {
  if (!url.match(/^\//)) {
    throw new Error(
      `WARNING: You did not use an absolute path for your URL in a request to fetcher (i.e., one starting with a /).
        The url you passed to fetcher is: ${url}
        fetcher will prefix the path with the dev URL if you are running in dev mode, so relative paths do not work since you are not loading the page through the server.
        Therefore, you will probably encounter bugs on the dev side. The call stack here (to show you where you made the call) is: ${new Error().stack}`
    );
  }
  let baseUrl = "http://localhost:3000";
  if (import.meta.env.VITE_SERVER_URL) {
    baseUrl = import.meta.env.VITE_SERVER_URL;
  }
  if (!import.meta.env.DEV && !url.startsWith(baseUrl)) {
    throw new Error(`ERROR: The path does not start with the base URL. Path: ${url}, Base URL: ${baseUrl}`);
  }

  // vite sets this variable to true if you are running `yarn dev`, but if you
  // are running from the built files in dist/ (i.e. they are served to the
  // browser from the node server instead of the vite dev server), then it
  // will be false.
  if (import.meta.env.DEV) {
    return baseUrl + url;
  }
  return url;
}

export async function fetcher(...args: Parameters<typeof fetch>): ReturnType<typeof fetch> {
  if (import.meta.env.DEV) {
    if (typeof args[0] === "string") {
      args[0] = devSafeUrl(args[0]);
    }
  }
  return fetch(...args);
}
