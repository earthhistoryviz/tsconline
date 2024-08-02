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

### AccordionSummary

This `AccordionSummary` is styled in `TSCColumns.tsx` and styles the accordion 'title' used in `Columns.tsx`.

#### Styles

`expandIcon` (Icon): Set to ArrowForwardIosSharpIcon. The icon that you click to expand or compress the accordion

`fontSize` (number): set to 0.9em

`.MuiAccordionSummary-expandIconWrapper.Mui-expanded` (object): Set to rotate the icon 90 degrees

` .MuiAccordionSummary-content` (object): Set to center items and 0px margin

---

### AccordionDetails

---

This `AccordionDetails` is styled in `TSCColumns.tsx` and styles the accordion 'content' used in `Columns.tsx`. Is a styled version of the `MuiAccordionDetails`

#### Styles

`padding` (number): Set to `theme.spacing(2)`

`border` (number): Set to only above and below

`.MuiAccordionDetails-root` (object): Set to padding "4px 8px 4px"

---

### ColumnContainer

---

This `ColumnContainer` is styled in `TSCColumns.tsx` and styles the box that holds the Accordion used in `Columns.tsx`.

#### Styles

`display` (string): Set to `flex`

`alignItems` (string): Set to center

`padding` (number): Set to padding 0px

---

### TSCIcon

---

This `TSCIcon` displays any sort of icon at default `100px`

#### Props

`src` (string): The URL of the image to be displayed.

`alt` (string): The alternative text for the image.

`size` (number | string): The size of the image. It defaults to "100px" if `not` provided.

`...props` (BoxProps): Any additional BoxProps that can be applied to the underlying Box component.

#### Usage

```js
import React from "react";
import { TSCIcon } from "./path-to-your-component";

const MyComponent = () => {
  return (
    <TSCIcon
      src="path/to/icon.png"
      alt="Icon description"
      size={32}
      // additional BoxProps can be passed here
    />
  );
};
```

### TSCMapList

---

`TSCMapList` is the list of images from a mappack that was sent from the server. Displayed in a MUI list, this has a component hook to set up the hidden dialog that will display `MapViewer`. Recursively will open `MapDialog`. This is used in `server/src/MapPoint.tsx`

#### Props

`mapInfo` (MapInfo): This is the `MapInfo` of the datapacks selected that holds all the information needed. For more information on [MapInfo](shared.md#shared)

#### State

The component uses the `useState` hook to manage two state variables:

`selectedMap`: Keeps track of the currently selected map's name.

`isDialogOpen`: Tracks whether the dialog box that holds the `selectedMap` is open or closed.

#### Event Handlers

`handleRowClick`: Invoked when a map item is clicked. It sets the selectedMap to the clicked map's name and opens the dialog box.

`handleCloseDialog`: Invoked when the dialog box is closed. It resets the selectedMap and closes the dialog box.

### MapDialog

---

`MapDialog` allows for nested dialog windows to recursively open children maps if they exist. By passing `openChild` to `MapViewer` we create endless windows. Since the child is not known until later, we set the nested dialog to the `name` map.

#### Props

`name` (string): The name of the map selected and chosen to display on this map.

#### State

`dialogOpen`: Keeps track of whether the nested dialog is open or closed.

`childName`: Stores the name of the child map to be displayed.

#### Event Handlers

`handleCloseDialog`: Invoked when the close button of the current dialog is clicked. It sets `dialogOpen` to false, closing the dialog.

`openChild`: Invoked when a child map needs to be opened. It sets `dialogOpen` to true and updates `childName` with the name of the child map.
