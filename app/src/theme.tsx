import { createTheme } from '@mui/material/styles';
declare module '@mui/material/styles' {
    interface Palette {
      altbackground: Palette['primary'];
      dark: Palette['primary'];
      button: Palette['primary'];
      navbar: Palette['primary'];
      selection: Palette['primary'];
    }
  
    interface PaletteOptions {
      altbackground?: PaletteOptions['primary'];
      dark?: PaletteOptions['primary'];
      button?: PaletteOptions['primary'];
      navbar?: PaletteOptions['primary'];
      selection?: PaletteOptions['primary'];
    }
  }

const theme = createTheme({
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
            main: "#E2FDFF"
        },
        button: {
            main: "#3C91E6"
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
        }
    },
    typography: {
        fontFamily: '"Titillium Web", sans-serif',
        // fontFamily: '"Cinzel", sans-serif',
    },
    components: {
        // changes for the mappack buttons
        MuiButton: {
          styleOverrides: {
            root: {
              minWidth: '0px', // Override min-width
            },
          },
        },
      },
});

export default theme;
