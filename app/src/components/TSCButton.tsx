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
      variant="contained"
    >
      {props?.children}
    </Button>
  );
}
