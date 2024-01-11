# tsconline

---

## What are we doing?

---

Our goal with this project is to increase accessibility of TSCreator to geologists everywhere by porting the java application TSCreator to an online interface. See [here](https://timescalecreator.org/index/index.php) for information on TSCreator. If you haven't already, ask a team member for the java application and take some time to go through the java application's quick start guide and familiarize yourself with the interface. We intend to implement every feature of the java program on this website. The features currently working are the generation of charts.

This project utilizes React.js with Typescript and Java.

The current state of the website is available [here](http://dev.timescalecreator.org:3000/) for reference.

## Structure

---

This monorepo has 3 workspaces: `app`, `shared`, and `server`. Anything shared between
the app and server (i.e. types and assertions) goes in `shared`. Keep as much backend work like parsing on the `server` end.

---

## General Server Structure

---

The server run on port 3000 by default, and will serve the following routes:

| **Route**              | **Description**                                                                    |
| :--------------------- | ---------------------------------------------------------------------------------- |
| `/_`                   | Serves any files in `app/dist`.                                                    |
| `/presets`             | Node process reads `server/public/presets` to build JSON.                          |
| `/charts:usecache`     | POST settings file here to make a chart, URL returned.                             |
| `/public/_`            | GET anything in the `server/public` folder (i.e., charts).                         |
| `/datapackinfo/:files` | GET column settings info, map info, and grabs map images from decrypted datapacks. |
| `/removecache`         | POST removes cache of previously generated charts                                  |
| `/pdfstatus:hash`      | GET whether the pdf is readable from the hashed generated chart                    |

---

These `routes` can be found in server/src/routes.ts

---

## General App Structure

---

We use mobx-observable state to keep track of the website state. To change the `state` we use action methods located in `app/src/state/actions.ts`. **ONLY** use `actions` to change the state.

The color of the app and any components are managed through `app/src/theme.tsx`. Don't use any hardcoded colors. This allows for consistency throughout. This will require you to use inline styling. See [here](theme.md) for more info on theme.

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
