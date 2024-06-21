import { createTheme } from "@mui/material/styles";
import Color from "color";
declare module "@mui/material/styles" {
  interface Palette {
    backgroundColor: Palette["primary"];
    secondaryButton: Palette["primary"];
    button: Palette["primary"];
    altbackground: Palette["primary"];
    secondaryBackground: Palette["primary"];
    dark: Palette["primary"];
    navbar: Palette["primary"];
    selection: Palette["primary"];
    settings: Palette["primary"];
    mainGradient: Palette["primary"];
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
    warningAlert: Palette["primary"];
    icon: Palette["primary"];
  }

  interface PaletteOptions {
    backgroundColor?: PaletteOptions["primary"];
    altbackground?: PaletteOptions["primary"];
    secondaryButton?: PaletteOptions["primary"];
    secondaryBackground?: PaletteOptions["primary"];
    dark?: PaletteOptions["primary"];
    button?: PaletteOptions["primary"];
    navbar?: PaletteOptions["primary"];
    selection?: PaletteOptions["primary"];
    settings?: PaletteOptions["primary"];
    mainGradient?: PaletteOptions["primary"];
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
    warningAlert?: PaletteOptions["primary"];
    icon?: PaletteOptions["primary"];
  }
  interface ButtonPropsColorOverrides {
    backgroundColor: true;
    altBackground: true;
    mainGradient: true;
    secondaryBackground: true;
    navbar: true;
    selection: true;
    settings: true;
    on: true;
    off: true;
    disabled: true;
    tooltip: true;
    columnMenu: true;
    scrollbar: true;
    info: true;
    cardBackground: true;
    menuDropdown: true;
    errorAlert: true;
    errorText: true;
    snackbarAlert: true;
    warningAlert: true;
    secondaryButton: true;
    dark: true;
    icon: true;
  }
}
declare module "@mui/material/IconButton" {
  interface IconButtonPropsColorOverrides {
    icon: true;
  }
}

let baseTheme = createTheme({
  palette: {
    tonalOffset: 0.2,
    contrastThreshold: 3,
    primary: {
      main: "#ffffff"
    },
    secondary: {
      main: "#DDDDDD"
    },
    background: {
      default: "#f8f9fc"
    }
  },
  typography: {
    fontFamily: '"Titillium Web", sans-serif',
    subtitle1: {
      fontSize: "48px"
    }
  }
});

function createGradient(color1: string, color2: string) {
  const colorObj1 = Color(color1);
  const colorObj2 = Color(color2);

  const gradient = `linear-gradient(90deg, ${color1} 0%, ${color2} 100%)`;

  return {
    main: gradient,
    light: `linear-gradient(90deg, ${colorObj1.lighten(0.2)} 0%, ${colorObj2.lighten(0.2)} 100%)`,
    dark: `linear-gradient(90deg, ${colorObj1.darken(0.2)} 0%, ${colorObj2.darken(0.2)} 100%)`,
    contrastText: getContrastText(color1)
  };
}

function getContrastText(color1: string) {
  const color = Color(color1);
  const luminance = color.luminosity();
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

let darkTheme = createTheme(baseTheme, {
  palette: {
    mode: "dark",
    backgroundColor: baseTheme.palette.augmentColor({
      color: {
        main: "#151A22"
      },
      name: "background"
    }),
    divider: "#ffffff1f",
    text: {
      primary: "#f6f7f8",
      secondary: "#c6c6c6"
    },
    button: baseTheme.palette.augmentColor({
      color: {
        main: "#e56e03"
      },
      name: "button"
    }),
    secondaryButton: baseTheme.palette.augmentColor({
      color: {
        main: "#f64747"
      },
      name: "secondaryButton"
    }),
    mainGradient: createGradient("#F17F19", "#F25B28"),
    secondaryBackground: baseTheme.palette.augmentColor({
      color: {
        main: "#1A2029"
      },
      name: "secondaryBackground"
    }),
    icon: baseTheme.palette.augmentColor({
      color: {
        main: "#c6c6c6"
      },
      name: "icon"
    }),
    altbackground: {
      light: "#8FB7E7",
      main: "#72A4E1",
      dark: "#1D4E89"
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
    },
    warningAlert: {
      main: "#fffdc2"
    }
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
darkTheme = createTheme(darkTheme, {
  palette: {
    menuDropdown: {
      light: `${Color(darkTheme.palette.menuDropdown.main).lighten(0.3)}`,
      main: darkTheme.palette.menuDropdown.main
    },
    cardBackground: {
      light: `${Color(darkTheme.palette.cardBackground.main).lighten(0.3)}`,
      main: darkTheme.palette.cardBackground.main
    },
    navbar: {
      light: `${Color(darkTheme.palette.navbar.main).lighten(0.3)}`,
      main: darkTheme.palette.navbar.main,
      dark: `${Color(darkTheme.palette.navbar.main).darken(0.3)}`
    },
    settings: {
      light: `${Color(darkTheme.palette.altbackground.light).lighten(0.3)}`,
      main: `${Color(darkTheme.palette.altbackground.main).lighten(0.3)}`
    },
    button: {
      light: `${Color(darkTheme.palette.button.main).lighten(0.3)}`,
      main: darkTheme.palette.button.main,
      dark: `${Color(darkTheme.palette.button.main).darken(0.3)}`
    },
    selection: {
      dark: `${Color(darkTheme.palette.selection.main).darken(0.3)}`
    },
    on: {
      main: darkTheme.palette.on.main,
      dark: `${Color(darkTheme.palette.on.main).darken(0.3)}`
    }
  },
  components: {
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          "&.Mui-disabled": {
            color: darkTheme.palette.disabled.main
          }
        }
      }
    }
  }
});
darkTheme = createTheme(darkTheme, {
  components: {
    MuiAccordion: {
      styleOverrides: {
        root: {
          background: darkTheme.palette.settings.light
        }
      }
    }
  }
});

export default darkTheme;
