# App

---

## Overview

---

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
