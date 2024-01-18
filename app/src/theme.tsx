import { createTheme } from '@mui/material/styles';
import Color from 'color';
declare module '@mui/material/styles' {
    interface Palette {
      altbackground: Palette['primary'];
      dark: Palette['primary'];
      button: Palette['primary'];
      navbar: Palette['primary'];
      selection: Palette['primary'];
      settings: Palette['primary'];
      gradient: Palette['primary'];
      on: Palette['primary'];
      off: Palette['primary'];
      disabled: Palette['primary'];
    }
  
    interface PaletteOptions {
      altbackground?: PaletteOptions['primary'];
      dark?: PaletteOptions['primary'];
      button?: PaletteOptions['primary'];
      navbar?: PaletteOptions['primary'];
      selection?: PaletteOptions['primary'];
      settings?: PaletteOptions['primary'];
      gradient?: PaletteOptions['primary'];
      on?: PaletteOptions['primary'];
      off?: PaletteOptions['primary'];
      disabled?: PaletteOptions['primary'];
    }
  }

let theme = createTheme({
    palette: {
        primary: {
            main: "#D3D3D3",
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
            dark: "#1D4E89",
        },
        button: {
            main: "#6693C9",
        },
        dark: {
            light: "#6D8A96",
            main: "#001A23"
        },
        navbar: {
            light: "#6693C9",
            main: "#27476E",
            dark: "#16262E"
        },
        selection: {
            light: "#B1ADE2",
            main: "#9792E3"
        },
        on: {
          main: '#2ecc71'
        },
        off: {
          main: '#f64747'
        },
        disabled: {
          main: '#95a5a6'
        }
        
    },
    typography: {
        fontFamily: '"Titillium Web", sans-serif',
    },
    components: {
        MuiButton: {
          styleOverrides: {
            root: {
              minWidth: '0px', 
            },
          },
        },
      },
});
theme = createTheme(theme, {
  palette: {
    gradient: {
      main: `linear-gradient(to top, 
              ${Color(theme.palette.altbackground.main)
              .lighten(0.3)}, 
            ${Color(theme.palette.altbackground.light)
              .rotate(24)
              .lighten(0.3)})`,
    },
    settings: {
      light: `${Color(theme.palette.altbackground.light)
              .lighten(0.3)}`,
      main: `${Color(theme.palette.altbackground.main)
              .lighten(0.3)}`
    },
    button : {
      light: `${Color(theme.palette.button.main).lighten(0.3)}`,
      main: theme.palette.button.main,
      dark: `${Color(theme.palette.button.main).darken(0.3)}`,
    },
    selection : {
      dark: `${Color(theme.palette.selection.main).darken(0.3)}`,
    }
  },
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
})

export default theme;
