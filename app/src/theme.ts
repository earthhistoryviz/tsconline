import { createTheme, Theme } from "@mui/material/styles";
declare module "@mui/material/styles" {
  interface Palette {
    backgroundColor: Palette["primary"];
    secondaryButton: Palette["primary"];
    button: Palette["primary"];
    secondaryBackground: Palette["primary"];
    selection: Palette["primary"];
    mainGradientLeft: Palette["primary"];
    mainGradientRight: Palette["primary"];
    on: Palette["primary"];
    off: Palette["primary"];
    disabled: Palette["primary"];
    tooltip: Palette["primary"];
    scrollbar: Palette["primary"];
    info: Palette["primary"];
    snackbarAlert: Palette["primary"];
    warningAlert: Palette["primary"];
    icon: Palette["primary"];
    dark: Palette["primary"];
  }

  interface PaletteOptions {
    backgroundColor?: PaletteOptions["primary"];
    secondaryButton?: PaletteOptions["primary"];
    secondaryBackground?: PaletteOptions["primary"];
    button?: PaletteOptions["primary"];
    selection?: PaletteOptions["primary"];
    mainGradientLeft?: PaletteOptions["primary"];
    mainGradientRight?: PaletteOptions["primary"];
    on?: PaletteOptions["primary"];
    off?: PaletteOptions["primary"];
    disabled?: PaletteOptions["primary"];
    tooltip?: PaletteOptions["primary"];
    scrollbar?: PaletteOptions["primary"];
    info?: PaletteOptions["primary"];
    snackbarAlert?: PaletteOptions["primary"];
    warningAlert?: PaletteOptions["primary"];
    icon?: PaletteOptions["primary"];
    dark?: PaletteOptions["primary"];
  }
}
declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    button: true;
    icon: true;
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
    button: true;
  }
}

function createThemeOverrides(theme: Theme) {
  return createTheme(theme, {
    components: {
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: theme.palette.icon.main
          }
        }
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            color: theme.palette.icon.main
          }
        }
      },
      MuiLink: {
        styleOverrides: {
          root: {
            color: theme.palette.text.primary
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundColor: theme.palette.backgroundColor.main
          }
        }
      },
      MuiSelect: {
        styleOverrides: {
          icon: {
            color: theme.palette.icon.main
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: theme.palette.secondaryBackground.main
          }
        }
      }
    }
  });
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
    snackbarAlert: {
      main: "#D5F5E3",
      light: "#D6EEF8"
    },
    warningAlert: {
      main: "#fffdc2"
    },
    scrollbar: {
      main: "#78716c"
    },
  },
  typography: {
    fontFamily: '"Titillium Web", sans-serif',
    subtitle1: {
      fontSize: "48px"
    }
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableRipple: true
      },
      styleOverrides: {
        root: {
          minWidth: "0px"
        }
      }
    }
  }
});
baseTheme = createTheme(baseTheme, {
  palette: {
    error: baseTheme.palette.augmentColor({
      color: {
        main: "#f64747"
      },
      name: "error"
    }),
    dark: baseTheme.palette.augmentColor({
      color: {
        main: "#0e1217"
      },
      name: "dark"
    })
  }
});

const disabled = "#393f40";
export let lightTheme = createTheme(baseTheme, {
  palette: {
    mode: "light",
    backgroundColor: baseTheme.palette.augmentColor({
      color: {
        main: "#f8f9f8"
      },
      name: "background"
    }),
    secondaryBackground: baseTheme.palette.augmentColor({
      color: {
        main: "#f1f0f0"
      },
      name: "secondaryBackground"
    }),
    divider: "#454545dd",
    text: {
      primary: "#262626",
      secondary: "#666666",
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
    icon: baseTheme.palette.augmentColor({
      color: {
        main: "#a8a29e"
      },
      name: "icon"
    }),
    selection: baseTheme.palette.augmentColor({
      color: {
        main: "#FF9900"
      },
      name: "selection"
    }),
    action: {
      disabled,
      disabledBackground: disabled,
      hover: "#ababab1a"
    }
  }
});

export let darkTheme = createTheme(baseTheme, {
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
    selection: baseTheme.palette.augmentColor({
      color: {
        main: "#FF9900"
      },
      name: "selection"
    }),
    action: {
      disabled,
      disabledBackground: disabled,
      hover: "#ababab1a"
    }
  }
});
darkTheme = createThemeOverrides(darkTheme);
lightTheme = createThemeOverrides(lightTheme);
