import { observer } from "mobx-react-lite";
import { Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { context } from "../state";
import { useContext } from "react";
import { LeafColumnFontMenu } from "./FontMenu";
import "./Font.css"
export const Font = observer(function Font() {
  const theme = useTheme();
  const { state } = useContext(context)
  const rootColumn = state.settingsTabs.columns
  return (
    <>
    {rootColumn ? 
    (
    <div className="root-font-options">
      <div className="root-font-description">
        <Typography> These are the default systemwide fonts.</Typography>
        <Typography> Changing one here will affect the entire chart.</Typography>
        <Typography> NOTE: These fonts can be changed on a column by column basis by using the Font button for each column</Typography>
      </div>
      <LeafColumnFontMenu column={rootColumn} />
    </div>
    )
    :
    (    
    <div className="chart-root-not-available">
      <Typography
        sx={{
          fontSize: theme.typography.pxToRem(18)
        }}>
          No Datapack is Selected
      </Typography>
    </div>
)
    }
    </>
  );
});
