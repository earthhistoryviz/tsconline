// If you are running in dev mode, prefix URL's with the dev server URL:

export function devSafeUrl(url: string) {
  if (url !== "" && !url.match(/^\//)) {
    throw new Error(
      `WARNING: You did not use an absolute path for your URL in a request to fetcher (i.e., one starting with a /).
        The url you passed to fetcher is: ${url}
        fetcher will prefix the path with the dev URL if you are running in dev mode, so relative paths do not work since you are not loading the page through the server.
        Therefore, you will probably encounter bugs on the dev side. The call stack here (to show you where you made the call) is: ${new Error().stack}`
    );
  }
  // vite sets this variable to true if you are running `yarn dev`, but if you
  // are running from the built files in dist/ (i.e. they are served to the
  // browser from the node server instead of the vite dev server), then it
  // will be false.
  if (import.meta.env.DEV) {
    // MCP endpoints are on a separate server at port 3001
    if (url.startsWith("/messages")) {
      return `http://localhost:3001${url}`;
    }
    // All other endpoints are on the main server at port 3000
    return `http://localhost:3000${url}`;
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

export async function loadRecaptcha() {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://www.google.com/recaptcha/api.js?render=6LegnOApAAAAACIFXyvL_6_ejS2CHnt3rRzkDGL2";
    script.id = "recaptcha-script";
    script.async = true;
    script.onload = () => {
      window.grecaptcha.ready(() => resolve());
    };
    script.onerror = (error) => reject(error);
    document.body.appendChild(script);
  });
}

export function removeRecaptcha() {
  const badges = document.querySelectorAll(".grecaptcha-badge");
  badges.forEach((badge) => {
    if (badge.parentNode) {
      document.body.removeChild(badge.parentNode);
    }
  });
  const script = document.getElementById("recaptcha-script");
  if (script) {
    script.remove();
  }
  const gstaticScripts = document.querySelectorAll('script[src^="https://www.gstatic.com/recaptcha/releases"]');
  gstaticScripts.forEach((script) => {
    script.remove();
  });
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    grecaptcha: any;
  }
}

export async function executeRecaptcha(action: string): Promise<string> {
  try {
    // If grecaptcha isn't available yet, attempt to load it.
    if (!window.grecaptcha || typeof window.grecaptcha.execute !== "function") {
      try {
        // loadRecaptcha appends the script and waits for ready()
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        await loadRecaptcha();
      } catch (e) {
        console.error("reCAPTCHA load failed:", e);
        return "";
      }
    }
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
  if (limit < 0) throw new Error("yieldControl limit must be greater than 0");
  if (counter.count % limit === 0) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

export function getRegex(string: string) {
  string = string.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  string = string.replace(/\*/g, ".*");
  return new RegExp(string, "i");
}
