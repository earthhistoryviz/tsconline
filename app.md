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

## TSC Components

---

### TSC Button

`TSCButton` is a wrapped Material UI button that has consistent button colors and variant contained. Currently used on all buttons except for `MapPoint` buttons.

#### Styles

`backgroundColor` (string): Background color for the button. Default: Theme's button main color.

`color` (string): Text color for the button. Default: #FFFFFF (white).

`:hover` (object): Styles applied when the button is hovered over. Default: Changes background color to theme's button light color.

`:active` (object): Styles applied when the button is in an active state (pressed).
Default: Changes background color to theme's button dark color.

```js
backgroundColor: theme.palette.button.main,
color: "#FFFFF",
onHover: {
    backgroundColor: theme.palette.button.light
},
onActive: {
    backgroundColor: theme.palette.button.dark
}
variant = "contained"
```

### TSC Tabs

The `TSCCardList` component is a customizable card designed for displaying information in a visually appealing way. Currently used to display presets on the `Home.tsx` page.

#### Props

`img` (string): Path to the main image for the card.

`logo` (string): Path to the logo image for the card.

`title` (ReactNode): The title/content of the card.

`date` (string): Date to be displayed on the card.

`onInfoClick` (function): Callback function to handle the info button click.

`generateChart` (function): Callback function to handle the chart generation button click.

#### Styles

`StyledRoot`: Styled div for the root container of the card.

`CardMediaCover`: Styled MUI CardMedia for the card media cover (background image).

`StyledH2`: Styled h2 for the heading element.

`StyledContent`: Styled div for the main content area of the card.

`AvatarLogo`: Styled MUI Avatar for the logo displayed as an avatar.

`ClickableCard`: Styled ButtonBase for the clickable card area. **_NOTE: Currently not used_**

`StyledDivDate`: Styled div for the date display.

#### Notes

The generateChart function is intended for handling the button click to generate a chart. Import functions as needed for any needed functionality.

#### Usage

```js
import React from "react";
import { TSCCardList } from "./path-to-your-component";

const MyComponent = () => {
  return (
    <TSCCardList
      color="#3498db"
      img="path/to/image.jpg"
      logo="path/to/logo.jpg"
      title="Card Title"
      date="2024-01-17"
      onInfoClick={() => {
        // Handle info click
      }}
      generateChart={() => {
        // Handle chart generation
      }}
    />
  );
};
```

### TSCCheckbox

---

The `TSCCheckbox` component accepts all the props that the Material-UI Checkbox component supports. Refer to the Material-UI Checkbox API documentation for a comprehensive list of available props. Used in `columns` and `time` settings tabs.

#### Props

`checked` (boolean): The checked state of the checkbox.

`onChange` (function): Callback function triggered when the checkbox state changes.

#### Styles

`size` (string): Set automatically to small

`sx` (object): sets default color to `theme.palette.primary.main` and checked state to `theme.palette.selection.main`

Notes
The component uses Material-UI's useTheme hook to access the theme.

Custom styles can be applied using the sx prop in addition to the provided styling.

### Accordion

This `Accordion` is styled in `TSCColumns.tsx` and styles the accordion used in `Columns.tsx`.

#### Styles

`disableGutters` (boolean): It removes the margin between two expanded accordion items and the increase of height.

`elevation` (number): Removes the shadow effect to 0.

`square` (boolean): rounded corners are disabled.

`border` (string): Set to 1px divider theme color.

`:not(:last-child)` (object): Sets border on the bottom to 0 if it's not the last child

`:before` (object): hides any elements placed before the accordion.

---
