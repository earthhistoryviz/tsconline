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
    mainGradientLeft: Palette["primary"];
    mainGradientRight: Palette["primary"];
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
    mainGradientLeft?: PaletteOptions["primary"];
    mainGradientRight?: PaletteOptions["primary"];
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
}
declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    button: true;
  }
}
declare module "@mui/material/IconButton" {
  interface IconButtonPropsColorOverrides {
    icon: true;
  }
}
declare module "@mui/material/SvgIcon" {
  interface SvgIconPropsColorOverrides {
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
const disabled = "#393f40";

let darkTheme = createTheme(baseTheme, {
  palette: {
    mode: "dark",
    backgroundColor: baseTheme.palette.augmentColor({
      color: {
        main: "#151A22"
      },
      name: "background"
    }),
    divider: "#454545dd",
    text: {
      primary: "#f6f7f8",
      secondary: "#c6c6c6",
      disabled
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
    mainGradientLeft: baseTheme.palette.augmentColor({
      color: {
        main: "#F17F19"
      },
      name: "mainGradientLeft"
    }),
    mainGradientRight: baseTheme.palette.augmentColor({
      color: {
        main: "#F25B28"
      },
      name: "mainGradientRight"
    }),
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
    action: {
      disabled,
      disabledBackground: disabled,
      hover: "#ababab1a"
    },
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
      main: "#FF9900"
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
      main: "#E44445"
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
    on: {
      main: darkTheme.palette.on.main,
      dark: `${Color(darkTheme.palette.on.main).darken(0.3)}`
    }
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true
      }
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: darkTheme.palette.icon.main
        }
      }
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: darkTheme.palette.icon.main
        }
      }
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: darkTheme.palette.text.primary
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: darkTheme.palette.backgroundColor.main
        }
      }
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: darkTheme.palette.icon.main
        }
      }
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: darkTheme.palette.secondaryBackground.main
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
