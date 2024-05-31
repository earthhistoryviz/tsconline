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
  const baseUrl = import.meta.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
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

export function loadRecaptcha() {
  const script = document.createElement("script");
  script.src = "https://www.google.com/recaptcha/api.js?render=6LegnOApAAAAACIFXyvL_6_ejS2CHnt3rRzkDGL2";
  document.body.appendChild(script);
}

export function removeRecaptcha() {
  const nodeBadge = document.querySelector(".grecaptcha-badge");
  if (nodeBadge && nodeBadge.parentNode) {
    document.body.removeChild(nodeBadge.parentNode);
  }
  const script = document.querySelector('script[src^="https://www.gstatic.com/recaptcha/releases"]');
  if (script) {
    script.remove();
  }
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grecaptcha: any;
  }
}

export async function executeRecaptcha(action: string): Promise<string> {
  try {
    const token = await window.grecaptcha.execute("6LegnOApAAAAACIFXyvL_6_ejS2CHnt3rRzkDGL2", { action });
    return token;
  } catch (error) {
    console.error("reCAPTCHA execution failed:", error);
    return "";
  }
}

/**
 * yields control to the event loop every `limit` calls
 * needs to be called with an object that has a count property
 * so that the count can be incremented and checked uniformly
 * @param counter
 * @param limit
 */
export async function yieldControl(counter: { count: number }, limit: number) {
  counter.count++;
  if (counter.count % limit === 0) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
