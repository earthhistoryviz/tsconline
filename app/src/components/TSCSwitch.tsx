import { Switch, SwitchProps, styled } from "@mui/material";

const StyledSwitch = styled(Switch)(
  ({ theme }) => `
    .MuiSwitch-switchBase {
        color: ${theme.palette.secondaryBackground.dark};
    }
    .MuiSwitch-thumb {
        color: ${theme.palette.button.light};
    }
    .MuiSwitch-track {
        background-color: ${theme.palette.button.light};
    }
    .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track {
        background-color: ${theme.palette.button.main};
    }
    .MuiSwitch-switchBase.Mui-checked > .MuiSwitch-thumb {
        color: ${theme.palette.button.main};
    }
    .MuiSwitch-switchBase.Mui-disabled.Mui-checked > .MuiSwitch-thumb{
        background-color: ${theme.palette.disabled.main};
    }
`
);

export const TSCSwitch: React.FC<SwitchProps> = (props) => {
  return <StyledSwitch {...props}></StyledSwitch>;
};
