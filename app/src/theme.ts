import { createTheme } from "@mui/material/styles";
import Color from "color";
declare module "@mui/material/styles" {
  interface Palette {
    altbackground: Palette["primary"];
    dark: Palette["primary"];
    button: Palette["primary"];
    navbar: Palette["primary"];
    selection: Palette["primary"];
    settings: Palette["primary"];
    gradient: Palette["primary"];
    on: Palette["primary"];
    off: Palette["primary"];
    disabled: Palette["primary"];
    tooltip: Palette["primary"];
    columnMenu: Palette["primary"];
    scrollbar: Palette["primary"];
    info: Palette["primary"];
    cardBackground: Palette["primary"];
    menuDropdown: Palette["primary"];
    errorAlert: Palette["primary"];
    errorText: Palette["primary"];
    snackbarAlert: Palette["primary"];
  }

  interface PaletteOptions {
    altbackground?: PaletteOptions["primary"];
    dark?: PaletteOptions["primary"];
    button?: PaletteOptions["primary"];
    navbar?: PaletteOptions["primary"];
    selection?: PaletteOptions["primary"];
    settings?: PaletteOptions["primary"];
    gradient?: PaletteOptions["primary"];
    on?: PaletteOptions["primary"];
    off?: PaletteOptions["primary"];
    disabled?: PaletteOptions["primary"];
    tooltip?: PaletteOptions["primary"];
    columnMenu?: PaletteOptions["primary"];
    scrollbar?: PaletteOptions["primary"];
    info?: PaletteOptions["primary"];
    cardBackground?: PaletteOptions["primary"];
    menuDropdown?: PaletteOptions["primary"];
    errorAlert?: PaletteOptions["primary"];
    errorText?: PaletteOptions["primary"];
    snackbarAlert?: PaletteOptions["primary"];
  }
  interface Theme {
    gradients: {
      [key: string]: string;
    };
  }
  interface ThemeOptions {
    gradients?: {
      [key: string]: string;
    };
  }
}

let theme = createTheme({
  palette: {
    primary: {
      main: "#D3D3D3"
    },
    secondary: {
      main: "#DDDDDD"
    },
    background: {
      default: "#FAF9F9"
    },
    altbackground: {
      light: "#8FB7E7",
      main: "#72A4E1",
      dark: "#1D4E89"
    },
    button: {
      main: "#6693C9"
    },
    dark: {
      light: "#6D8A96",
      main: "#001A23"
    },
    navbar: {
      main: "#16262E"
    },
    selection: {
      light: "#B1ADE2",
      main: "#9792E3"
    },
    on: {
      main: "#2ecc71"
    },
    off: {
      main: "#f64747"
    },
    disabled: {
      main: "#95a5a6"
    },
    info: {
      main: "#0891b2"
    },
    tooltip: {
      main: "#231f20"
    },
    columnMenu: {
      main: "#E0FBFC"
    },
    scrollbar: {
      main: "#78716c"
    },
    error: {
      main: "#FF0000"
    },
    cardBackground: {
      main: "#27476E"
    },
    menuDropdown: {
      main: "#343F46"
    },
    errorAlert: {
      main: "#ffe5e0"
    },
    errorText: {
      main: "#c71f16"
    },
    snackbarAlert: {
      main: "#D5F5E3",
      light: "#D6EEF8"
    }
  },
  typography: {
    fontFamily: '"Titillium Web", sans-serif'
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minWidth: "0px"
        }
      }
    }
  }
});
theme = createTheme(theme, {
  palette: {
    menuDropdown: {
      light: `${Color(theme.palette.menuDropdown.main).lighten(0.3)}`,
      main: theme.palette.menuDropdown.main
    },
    cardBackground: {
      light: `${Color(theme.palette.cardBackground.main).lighten(0.3)}`,
      main: theme.palette.cardBackground.main
    },
    navbar: {
      light: `${Color(theme.palette.navbar.main).lighten(0.3)}`,
      main: theme.palette.navbar.main,
      dark: `${Color(theme.palette.navbar.main).darken(0.3)}`
    },
    settings: {
      light: `${Color(theme.palette.altbackground.light).lighten(0.3)}`,
      main: `${Color(theme.palette.altbackground.main).lighten(0.3)}`
    },
    button: {
      light: `${Color(theme.palette.button.main).lighten(0.3)}`,
      main: theme.palette.button.main,
      dark: `${Color(theme.palette.button.main).darken(0.3)}`
    },
    selection: {
      dark: `${Color(theme.palette.selection.main).darken(0.3)}`
    },
    on: {
      main: theme.palette.on.main,
      dark: `${Color(theme.palette.on.main).darken(0.3)}`
    }
  },
  gradients: {
    main: `linear-gradient(to top, 
            ${Color(theme.palette.altbackground.main).lighten(0.3)}, 
          ${Color(theme.palette.altbackground.light).rotate(24).lighten(0.3)})`
  }
});
theme = createTheme(theme, {
  components: {
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: theme.palette.settings.light
        }
      }
    }
  }
});

export default theme;
