import { observer } from "mobx-react-lite";
import { Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { context } from "../state";
import { useContext } from "react";
import { LeafColumnFontMenu } from "./FontMenu";
import "./Font.css";
import { useTranslation } from "react-i18next";

export const Font = observer(function Font() {
  const theme = useTheme();
  const { state } = useContext(context);
  const rootColumn = state.settingsTabs.renderColumns;
  const { t } = useTranslation();
  return (
    <>
      {rootColumn ? (
        <div className="root-font-options">
          <div className="root-font-description">
            <Typography> {t("settings.font.notes1")}</Typography>
            <Typography> {t("settings.font.notes2")}</Typography>
            <Typography> {t("settings.font.notes3")}</Typography>
          </div>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
            <LeafColumnFontMenu className="font-menu-setting-tab-config" column={rootColumn} />
          </div>
        </div>
      ) : (
        <div className="chart-root-not-available">
          <Typography
            sx={{
              fontSize: theme.typography.pxToRem(18)
            }}>
            No Datapack is Selected
          </Typography>
        </div>
      )}
    </>
  );
});
