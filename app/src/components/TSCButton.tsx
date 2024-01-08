import { Button, ButtonProps } from '@mui/material'
import { useTheme } from "@mui/material/styles";

export const TSCButton: React.FC<ButtonProps>  = ( props ) => {
  const theme = useTheme();

  return (
    <Button
      {...props} 
      sx={{
        backgroundColor: theme.palette.button.main, 
        color: "#FFFFFF",
        ":hover": {
          backgroundColor: theme.palette.button.light,
        },
        ":active": {
          backgroundColor: theme.palette.button.dark,
        },
        ...props?.sx,
      }}
      style={{
        // width: "325px", 
        // height: "75px", 
        height: "7vh",
        width: "16vh", 
        marginLeft: "auto", 
        marginRight: "auto", 
        ...props?.style,
      }}
      variant="contained"
    >
      {props?.children}
    </Button>
  );
}
