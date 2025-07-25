import { HTTPMethods, RouteOptions } from "fastify";

export interface RouteDefinition {
  method: string;
  url: string;
  body?: object;
  recaptchaAction?: string;
  hasAuth?: boolean;
}

const findPrehandlerFromRouteOptions = (routeOptions: RouteOptions, handlerName: string) => {
  if (Array.isArray(routeOptions.preHandler)) {
    return routeOptions.preHandler.find((fn) => typeof fn === "function" && fn.name === handlerName);
  } else if (typeof routeOptions.preHandler === "function" && routeOptions.preHandler.name === handlerName) {
    return routeOptions.preHandler;
  }
  return undefined;
};

/**
 * This will initialize the app routes based on ONE routeOptions object.
 * @param routeOptions
 * @param options
 * @returns
 */
export function initializeAppRoutes(
  routeOptions: RouteOptions,
  options?: {
    recaptchaHandlerName?: string;
    verifyAuthHandlerName?: string;
  }
) {
  const appRoutes: RouteDefinition[] = [];
  const hasRecaptchaAction = (obj: object): obj is { recaptchaAction: string } => {
    return "recaptchaAction" in obj && typeof obj.recaptchaAction === "string";
  };
  let recaptchaAction: string = "";
  let hasAuth: boolean = false;
  if (options?.recaptchaHandlerName) {
    const preHandler = findPrehandlerFromRouteOptions(routeOptions, options.recaptchaHandlerName);
    if (preHandler && hasRecaptchaAction(preHandler)) {
      recaptchaAction = preHandler.recaptchaAction;
    }
  }
  if (options?.verifyAuthHandlerName) {
    const preHandler = findPrehandlerFromRouteOptions(routeOptions, options.verifyAuthHandlerName);
    if (preHandler && typeof preHandler === "function" && preHandler.name === options.verifyAuthHandlerName) {
      hasAuth = true;
    }
  }
  if (Array.isArray(routeOptions.method)) {
    routeOptions.method.forEach((method) => {
      appRoutes.push({
        method: method as HTTPMethods,
        url: routeOptions.url,
        recaptchaAction: recaptchaAction ? recaptchaAction : undefined,
        hasAuth: options?.verifyAuthHandlerName ? hasAuth : undefined
      });
    });
  } else {
    appRoutes.push({
      method: routeOptions.method as HTTPMethods,
      url: routeOptions.url,
      recaptchaAction: recaptchaAction ? recaptchaAction : undefined,
      hasAuth: options?.verifyAuthHandlerName ? hasAuth : undefined
    });
  }
  return appRoutes;
}

const normalizeToRegex = (url: string) => new RegExp("^" + url.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/") + "$");
/**
 * Make sure that the app routes are actually defined in the tests.
 * @param appRoutes the routes registered in the app with the use of onRoute hook
 * @param testDefinedRoutes the routes defined in the tests manually
 * @returns
 */
export const getMissingRoutesInActualRegistered = (
  appRoutes: RouteDefinition[],
  testDefinedRoutes: RouteDefinition[]
) => {
  return appRoutes.filter(({ method, url, hasAuth, recaptchaAction }) => {
    const regex = normalizeToRegex(url);
    // If the route has auth or recaptcha action, we need to check if it is defined in the test defined routes
    return !testDefinedRoutes.some(
      (r) =>
        r.method === method && regex.test(r.url) && !!r.hasAuth === !!hasAuth && r.recaptchaAction === recaptchaAction
    );
  });
};
/**
 * Make sure that the test defined routes are actually registered in the app.
 * @param appRoutes
 * @param testDefinedRoutes
 * @returns
 */
export const getUnexpectedRoutesInActualRegistered = (
  appRoutes: RouteDefinition[],
  testDefinedRoutes: RouteDefinition[]
) => {
  return testDefinedRoutes.filter(({ method, url, hasAuth, recaptchaAction }) => {
    return !appRoutes.some(
      (route) =>
        route.method === method &&
        normalizeToRegex(route.url).test(url) &&
        !!route.hasAuth === !!hasAuth &&
        route.recaptchaAction === recaptchaAction
    );
  });
};

export const oneToOneMatch = (appRoutes: RouteDefinition[], testDefinedRoutes: RouteDefinition[]) => {
  const missingInActual = getMissingRoutesInActualRegistered(appRoutes, testDefinedRoutes);
  const unexpectedInActual = getUnexpectedRoutesInActualRegistered(appRoutes, testDefinedRoutes);
  if (missingInActual.length > 0) {
    console.log("❌ Missing in actual routes:");
    console.table(missingInActual);
    console.log("Defined routes:");
    console.table(testDefinedRoutes);
    console.log("Actual routes:");
    console.table(appRoutes);
  }

  if (unexpectedInActual.length > 0) {
    console.log("❌ Extra routes not defined in appRoutes:");
    console.table(unexpectedInActual);
    console.log("Expected routes:");
    console.table(testDefinedRoutes);
    console.log("Actual routes:");
    console.table(appRoutes);
  }

  return {
    missingInActual,
    unexpectedInActual
  };
};
