# App
This document provides an overview of the app's architecture, state management, and key components. It is intended for developers working on the app to understand how to navigate and utilize the codebase effectively.

## Overview

This app structure is maintained through a `mob-x observable` state. Instead of using the hooks that are visible only at component level we keep a state variable that propogates over all components.

```js
export type State = {
  var1: boolean,
  var2: string,
};

export const state = observable<State>(
  {
    var1: false,
    var2: "on",
  };
)
```

For example, the above would keep track of two variables `var1` and `var2` that would keep their values until refresh. To change the state (located in `app/src/state/state.ts`) we use actions. Actions help keep our changes consistent and are located in `app/src/state/actions.ts`.

```js
export const setVar1 = action("setVar1", (newval: boolean) => {
  state.var1 = newval;
});
```

Another example above shows how you might setup an action for our state variable. If you try changing the state without using an action, it will most likely throw an error so don't worry about forgetting actions. But yes **_ONLY_** use actions to change the state.

To use this state variable and actions, you must use `useContext()` like so

```js
const { state, actions } = useContext(context);
```

This will keep the state and actions consistent. We set it up on the initial app startup in `index.ts` and keep the same context throughout, giving us the proper functionality we want.

## RenderColumnInfo

`RenderColumnInfo` is a flattened, MobX-observable structure used exclusively for **UI rendering**. It mirrors the deeply nested `ColumnInfo` structure but avoids performance issues by removing deep object references and replacing them with lightweight references like child names.

---

### Key Properties

```ts
type RenderColumnInfo = {
  children: string[]; // Flat child references (names only)
  columnRef: ColumnInfo; // Reference to the original ColumnInfo object
  isSelected: boolean; // UI-only flag for selection
  hasSelectedChildren: boolean; // Whether any children are selected
  dispose: () => void; // Function to dispose of reactions and clean up
} & Omit<ColumnInfo, "children" | "subInfo">;
```

### Why Use `RenderColumnInfo`

The original `ColumnInfo` is a **deeply nested tree**, which is great for modeling but causes performance issues with MobX and React.

- MobX observes deeply by default, so a change deep in the tree can cause **upstream components** to re-render, all the way to the root.
- This makes operations like **searching, expanding, and toggling visibility** expensive in large trees.

To fix this, we created `RenderColumnInfo`, a **flat structure** where:

- Each node stores `children` as an **array of string names** instead of full object references.
- Lookups are done through a shared `columnHashMap` (stored in state).
- Each object is **observable**, but only for the fields that actually need reactivity.

---

### Benefits

MobX does not need to set up deep tracking of the entire tree, which significantly improves performance. Additionally any changes to the `RenderColumnInfo` will only affect the specific column being changed, since it no longer keeps references to its children.

---

### When to Use `RenderColumnInfo` (and Caveats)

`RenderColumnInfo` should be used in **any UI component that renders column-related data**. It is specifically designed for rendering performance and responsiveness. You should **avoid using `ColumnInfo` directly in the UI**, as it is not optimized for observable rendering and can lead to performance issues. Even more problematic, `ColumnInfo` is not observable, so changes to it will not trigger re-renders in React components.

Most actions that modify column state should also target `RenderColumnInfo`. This ensures that:
- The **UI remains responsive**.
- Changes are automatically **reflected back to the underlying `ColumnInfo`** via MobX reactions set up in `column-actions.ts`.

#### When is it OK to use `ColumnInfo` directly?
Use `ColumnInfo` only when:
- You need access to properties **not present** in `RenderColumnInfo`, such as `subInfo`.
- You are performing **deep structural operations**, such as cloning the entire tree or modifying the **actual children** array.
  - `RenderColumnInfo` does **not store actual child references**, only child **names**. For tree-level manipulation, you must use both `RenderColumnInfo` and `ColumnInfo`.

---

Here's how we transform a `ColumnInfo` object into a `RenderColumnInfo` object:
```ts
export function convertColumnInfoToRenderColumnInfo(column: ColumnInfo): RenderColumnInfo {
  const renderColumn: RenderColumnInfo = observable.object(
    {
      name: column.name,
      editName: column.editName,
      fontsInfo: column.fontsInfo,
      fontOptions: column.fontOptions,
      on: column.on,
      popup: column.popup,
      children: column.children.map((child) => child.name),
      parent: column.parent,
      minAge: column.minAge,
      maxAge: column.maxAge,
      show: column.show,
      expanded: column.expanded,
      enableTitle: column.enableTitle,
      columnDisplayType: column.columnDisplayType,
      columnSpecificSettings: column.columnSpecificSettings,
      rgb: column.rgb,
      width: column.width,
      units: column.units,
      showAgeLabels: column.showAgeLabels,
      showUncertaintyLabels: column.showUncertaintyLabels,
      columnRef: column,
      isSelected: false,
      hasSelectedChildren: false,
      dispose: () => {}
    },
    {
      name: false,
      fontOptions: false,
      columnDisplayType: false,
      minAge: false,
      maxAge: false,
      units: false,
      columnRef: false,
      dispose: false
    }
  );
  addReactionToRenderColumnInfo(column, renderColumn);
  return renderColumn;
}
```
Properties like `subInfo` are intentionally excluded from `RenderColumnInfo` to improve performance, while non-observable properties (e.g., name, units, columnRef) are marked with false because they won’t change during the lifecycle

---

### Syncinc Back With Reactions

To keep the UI state in sync with the original model, we use MobX reactions. These watch changes in `RenderColumnInfo` and apply them back to the underlying `ColumnInfo`. This is handled in `column-actions.ts` in the following function:
```ts
export function addReactionToRenderColumnInfo(column: ColumnInfo, renderColumn: RenderColumnInfo) {
  const dispose = reaction(
    () => ({
      on: renderColumn.on,
      expanded: renderColumn.expanded,
      show: renderColumn.show,
      editname: renderColumn.editName
    }),
    (updated) => {
      column.on = updated.on;
      column.expanded = updated.expanded;
      column.show = updated.show;
      column.editName = updated.editname;
    }
  );
  const dispose1 = reaction(
    () => ({
      fontsInfo: toJS(renderColumn.fontsInfo),
      popup: renderColumn.popup,
      parent: renderColumn.parent,
      enableTitle: renderColumn.enableTitle,
      width: renderColumn.width,
      rgb: toJS(renderColumn.rgb),
      columnSpecificSettings: toJS(renderColumn.columnSpecificSettings),
      showAgeLabels: renderColumn.showAgeLabels,
      showUncertaintyLabels: renderColumn.showUncertaintyLabels
    }),
    (updated) => {
      column.fontsInfo = updated.fontsInfo;
      column.popup = updated.popup;
      column.parent = updated.parent;
      column.enableTitle = updated.enableTitle;
      column.width = updated.width;
      column.rgb = updated.rgb;
      column.columnSpecificSettings = updated.columnSpecificSettings;
      column.showAgeLabels = updated.showAgeLabels;
      column.showUncertaintyLabels = updated.showUncertaintyLabels;
    }
  );
  renderColumn.dispose = () => {
    dispose();
    dispose1();
  };
}
```
#### Why Two Reactions?
- The first reaction watches simple, frequently updated properties.
- The second reaction handles complex observable objects like `fontsInfo`, `rgb`, and `columnSpecificSettings` using `toJS()` to deeply compare values.
- Splitting them means thatn the first reaction can quickly update simple properties without needing to deeply compare complex objects, improving performance.

`dispose()` is called to clean up reactions when the `RenderColumnInfo` is no longer needed, preventing memory leaks.

## React Strict Mode

This app uses **React Strict Mode** in development, which is enabled in `main.tsx` by wrapping the app with `<React.StrictMode>`. This can help discover bugs in our components by intentionally running certain functions and effects **twice** in development (but **only once** in production).

### What This Means:

- **Effects (like `useEffect`) will run twice** on mount to ensure they are idempotent.
- Components may render twice to help identify side effects that should not occur during rendering.
- You may see code that appears to run twice in development, which is expected behavior.

In the majority of cases, this behavior is beneficial as it helps catch bugs that might not be apparent in a single render. Ideally, your component should always return the same output given the same input, regardless of how many times it is rendered or effects are run.

Below is an example where we need to handle the double rendering of effects properly, especially when dealing with asynchronous operations like fetching data or initializing components.
```ts
useEffect(() => {
    const controller = new AbortController();
    initializePage(controller).catch((e) => {
      console.error("Error fetching datapack", e);
      displayServerError(e, ErrorCodes.UNABLE_TO_FETCH_DATAPACKS, ErrorMessages[ErrorCodes.UNABLE_TO_FETCH_DATAPACKS]);
    });
    return () => {
      if (shouldLoadRecaptcha) {
        removeRecaptcha();
      }
      // if the user navigates away from the page quickly, the recaptcha script will be removed but the fetch will still be in progress causing an error as well as a zombie fetch request so we need to abort the fetch request
      // a second issue is that due to strict mode the initial fetch will be aborted because React will call the cleanup before fetching is done causing the page to flicker to the 404 page for a split second
      // the second fetch in the second useEffect will be successful and the page will render correctly
      // this is not an issue in prod since strict mode is disabled
      if (import.meta.env.PROD) {
        // if we're in prod, we do want to abort to prevent errors and zombie fetch requests
        // but if we're in dev, skip aborting so we don’t see that flicker, will see occasional recaptcha errors
        controller.abort();
      }
    };
  }, [queryType, id, isMetadataInitialized, metadataLoading]);
```

Strict Mode does not affect production builds, but it’s useful for catching side-effect-related bugs early. If you’re debugging and confused about something happening twice, this is likely why.