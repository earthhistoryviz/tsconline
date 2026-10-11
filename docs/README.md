# tsconline

---

## What are we doing?

---

Our goal with this project is to increase accessibility of TSCreator to geologists everywhere by porting the java application TSCreator to an online interface. See [here](https://timescalecreator.org/index/index.php) for information on TSCreator. If you haven't already, ask a team member for the java application and take some time to go through the java application's quick start guide and familiarize yourself with the interface. We intend to implement every feature of the java program on this website. The features currently working include chart generation, datapack workflows, workshops, help pages, crossplot, auth, admin tooling, and MCP integration.

This project utilizes React.js with Typescript, Fastify, and Java.

The current state of the website is available [here](https://tsconline.timescalecreator.org) for reference.

## Structure

---

This monorepo has 4 workspaces: [app](#general-app-structure), [shared](#general-shared-structure), [server](/server.md#server), and `mcp`. Anything shared between
the app, server, and mcp packages (i.e. types and assertions) goes in `shared`. Keep as much backend work like parsing on the `server` end.

---

## General Server Structure

---

The server runs on port 3000 by default, and will serve the following routes:

| **Route**              | **Description**                                                                    |
| :--------------------- | ---------------------------------------------------------------------------------- |
| `/_`                   | Serves any files in `app/dist`.                                                                 |
| `/presets`             | Returns the presets generated from `server/public/presets`.                                      |
| `/public/_`            | GET anything in the `server/public` folder (i.e., charts).                                      |
| `/chart`               | WebSocket endpoint that generates charts and returns progress updates and the final chart path. |
| `/cached-chart/:hash`  | Returns cached chart filepaths for a previously generated chart.                                |
| `/removecache`         | POST removes cache of previously generated charts.                                               |
| `/cache-stats`         | GET reports stats for the cached chart directory.                                                |

---

These [routes](server.md#routes) are registered in `server/src/index.ts` and handled across `server/src/routes`, `server/src/admin`, `server/src/workshop`, and `server/src/crossplot`.

---

## General App Structure

---

We use mobx-observable state to keep track of the website state. To change the `state` we use action methods located in `app/src/state/actions.ts`. **ONLY** use `actions` to change the state.

The color of the app and any components are managed through `app/src/theme.ts`. Don't use any hardcoded colors. This allows for consistency throughout. This will require you to use inline styling.

### Theme Wrapping Example

```js
const TSCExample = styled((props: TSCExampleProps) => (
  <WrappedComponent {...props} />
))(({ theme }) => {
  return {
    color: theme.palette.primary.main,
  };
});
```

For any general use components, wrap them and put them in the components folder. Export them from `app/src/components/index.ts`.

---

## General Shared Structure

This is where we keep all shared types between the server and app. To maintain consistency between requests to and from the app to server, use an assert method to verify types. There is a general type called `ServerResponseError` that is returned to the app when there is an error. The app side catches this correctly, but will need to develop a dialog for the user to see.

```js
export type ExampleType = {
  stringVar: string;
  booleanVar: boolean;
  arrayVar: string[];
};
export function assertExampleType(o: any): asserts o is ExampleType {
  if (typeof o !== "object") throw new Error("ExampleType must be an object");
  if (typeof o.stringVar !== "string")
    throw new Error("ExampleType must have a stringVar string");
  if (typeof o.booleanVar !== "boolean")
    throw new Error("ExampleType must have a booleanVar boolean");
  if (!Array.isArray(o.arrayVar))
    throw new Error("ExampleType must have an arrayVar array");
}
export type ExampleResponse = ExampleType | ServerResponseError
```

The server should send `ExampleResponse` to the app, and the app should use `assertExampleType` within a `try-catch` block and if it's not `ExampleType` then try `isServerResponseError`.

**_Any type changes that are made, must be built again so the app and server can access them. This is done by `yarn build` in `shared` or in `tsconline`_**

---

## General MCP Structure

The `mcp` workspace contains the standalone Model Context Protocol server used for GeoGPT / MCP integrations. It runs separately from the main website server and defaults to port `3001`.

The MCP server uses Fastify and the official MCP SDK. The main entrypoint is `mcp/src/index.ts`, route registration is handled in `mcp/src/fastify.ts`, and the MCP tools/resources/session logic lives in `mcp/src/mcp.ts`.

The MCP server expects an `MCP_AUTH_TOKEN` in the environment and currently supports:

- streamable HTTP transport at `/streamable-http`
- legacy SSE transport at `/sse` and `/messages`
- in-memory MCP sessions
- chart state syncing with the main TSCOnline app
- datapack listing, column listing, chart updates, login flows, and datapack upload tools

Anything shared between the app, server, and MCP server should still live in `shared`.
