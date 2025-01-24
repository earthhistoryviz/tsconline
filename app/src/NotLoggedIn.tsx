import { Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

export const NotLoggedIn = () => {
  const { t } = useTranslation();
  return <Typography className="not-logged-in-message">{t("workshops.login-first")}</Typography>;
};
