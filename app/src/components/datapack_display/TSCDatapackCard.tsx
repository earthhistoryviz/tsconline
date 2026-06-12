import CloseIcon from "@mui/icons-material/Close";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  Skeleton,
  Theme,
  Tooltip,
  Typography,
  useTheme
} from "@mui/material";
import { DatapackConfigForChartRequest, DatapackMetadata } from "@tsconline/shared";
import Color from "color";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./TSCDatapackCard.module.css";
import { Loader } from "../TSCComponents";
import { useNavigate } from "react-router";
import { DatapackMenu } from "../../settings_tabs/Datapack";
import {
  getDatapackProfileImageUrl,
  getDatapackUUID,
  getNavigationRouteForDatapackProfile
} from "../../state/non-action-util";

// green colors for datapacks staged for the chart (shared with rows + header)
export function datapackAddedColors(theme: Theme) {
  const main = theme.palette.mode === "light" ? "#2e7d32" : "#66bb6a";
  return {
    main,
    contrast: "#ffffff",
    tint: Color(main).alpha(0.12).string(),
    tintHover: Color(main).alpha(0.2).string(),
    cardTint: Color(main).alpha(0.08).string()
  };
}

// add / added / remove button shared across all datapack display modes
type DatapackChartActionProps = {
  selected: boolean;
  loading?: boolean;
  compact?: boolean;
  fullWidth?: boolean;
  onClick: (e: React.MouseEvent) => void | Promise<void>;
};

export const DatapackChartAction = ({ selected, loading, compact, fullWidth, onClick }: DatapackChartActionProps) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const added = datapackAddedColors(theme);

  const addLabel = t("settings.datapacks.add-to-chart");
  const inChartLabel = t("settings.datapacks.in-chart-short");
  const removeLabel = t("settings.datapacks.remove-from-chart");

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    void onClick(e);
  };

  if (loading) {
    return (
      <Box className="datapack-chart-action" display="flex" justifyContent="center">
        <Loader />
      </Box>
    );
  }

  // not staged yet — show add button
  if (!selected) {
    return (
      <Button
        className="datapack-chart-action"
        size="small"
        variant="outlined"
        fullWidth={fullWidth}
        startIcon={<PlaylistAddIcon sx={{ fontSize: compact ? 16 : 18 }} />}
        onClick={handleClick}
        sx={{
          flexShrink: 0,
          textTransform: "none",
          fontWeight: 600,
          fontSize: compact ? "0.68rem" : "0.8rem",
          minWidth: compact ? 76 : fullWidth ? undefined : 124,
          px: compact ? 0.75 : 1.5,
          py: compact ? 0.25 : 0.5,
          whiteSpace: "nowrap",
          borderWidth: 1.5,
          borderColor: theme.palette.divider,
          color: "text.primary",
          bgcolor: "backgroundColor.main",
          "&:hover": {
            bgcolor: added.cardTint,
            borderColor: added.main,
            color: added.main
          }
        }}>
        {addLabel}
      </Button>
    );
  }

  // staged — show "added" chip and a separate remove control
  return (
    <Box
      className="datapack-chart-action"
      display="flex"
      alignItems="center"
      gap={0.5}
      width={fullWidth ? "100%" : "auto"}
      flexShrink={0}>
      <Chip
        label={inChartLabel}
        size="small"
        sx={{
          flex: fullWidth ? 1 : undefined,
          fontWeight: 600,
          fontSize: compact ? "0.68rem" : "0.75rem",
          height: compact ? 26 : 28,
          bgcolor: Color(added.main).alpha(0.12).string(),
          color: added.main,
          border: `1px solid ${added.main}`,
          "& .MuiChip-label": { px: compact ? 0.75 : 1 }
        }}
      />
      {/* compact view uses a small x button; row/card use a "remove" button */}
      {compact ? (
        <Tooltip title={removeLabel}>
          <IconButton
            className="datapack-chart-remove"
            size="small"
            aria-label={removeLabel}
            onClick={handleClick}
            sx={{
              p: 0.5,
              border: "1px solid",
              borderColor: "divider",
              "&:hover": {
                borderColor: "error.main",
                color: "error.main",
                bgcolor: Color(theme.palette.error.main).alpha(0.08).string()
              }
            }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      ) : (
        <Button
          className="datapack-chart-remove"
          size="small"
          variant="outlined"
          startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
          onClick={handleClick}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: "0.75rem",
            minWidth: fullWidth ? undefined : 88,
            flexShrink: 0,
            px: 1.25,
            py: 0.25,
            borderColor: "divider",
            color: "text.secondary",
            "&:hover": {
              borderColor: "error.main",
              color: "error.main",
              bgcolor: Color(theme.palette.error.main).alpha(0.06).string()
            }
          }}>
          {removeLabel}
        </Button>
      )}
    </Box>
  );
};

type TSCDatapackCardProps = {
  datapack?: DatapackMetadata;
  value?: boolean;
  onChange?: (datapack: DatapackConfigForChartRequest) => Promise<void>;
};
export const TSCDatapackCard: React.FC<TSCDatapackCardProps> = ({ datapack, value, onChange }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const added = datapackAddedColors(theme);
  const [loading, setLoading] = useState(false);
  const skeleton = !datapack || !onChange || value === undefined;

  // go to the datapack detail page (image, title, or description click)
  const openProfile = () => {
    if (skeleton) return;
    navigate(getNavigationRouteForDatapackProfile(getDatapackUUID(datapack), datapack.title, datapack.type));
  };

  // add or remove this datapack from the staged chart selection
  const toggleChart = async () => {
    if (loading || skeleton) return;
    setLoading(true);
    await onChange(datapack);
    setLoading(false);
  };

  return (
    <Card
      className={styles.card}
      sx={{
        // green highlight when staged for the chart
        border: "1px solid",
        borderColor: value ? added.main : "divider",
        bgcolor: value ? added.cardTint : "secondaryBackground.main",
        boxShadow: "none"
      }}>
      <Box onClick={openProfile} sx={{ cursor: skeleton ? "default" : "pointer" }}>
        {skeleton ? (
          <Skeleton height="140px" />
        ) : (
          <CardMedia component="img" height="140" image={getDatapackProfileImageUrl(datapack)} />
        )}
        <CardContent className={styles.cc}>
          <div className={styles.hc}>
            {skeleton ? (
              <Skeleton className={styles.header} width="90%" />
            ) : (
              <Typography className={styles.header}>{datapack.title}</Typography>
            )}
            {!skeleton && (
              <DatapackMenu
                datapack={datapack}
                button={
                  <IconButton className={styles.other} onClick={(e) => e.stopPropagation()}>
                    <span className={styles.more} />
                  </IconButton>
                }
              />
            )}
          </div>
          {skeleton ? (
            <Skeleton className={styles.description} width="90%" />
          ) : (
            <Typography className={styles.description}>{datapack.description}</Typography>
          )}
          {skeleton ? (
            <Skeleton className={styles.fd} width="90%" />
          ) : (
            <Typography className={styles.fd}>{datapack.authoredBy}</Typography>
          )}
        </CardContent>
      </Box>
      {/* bottom add/remove button and view count */}
      <Box className={styles.actionBar} onClick={(e) => e.stopPropagation()}>
        <Box className={styles.actionButton}>
          {skeleton ? (
            <Skeleton height={36} sx={{ borderRadius: 1 }} />
          ) : (
            <DatapackChartAction selected={!!value} loading={loading} fullWidth onClick={toggleChart} />
          )}
        </Box>
        <div className={styles.vc}>
          {skeleton ? (
            <Skeleton width="30px" sx={{ marginRight: "10px" }} />
          ) : (
            <Typography className={styles.views}>100</Typography>
          )}
          {skeleton ? <Skeleton width="10px" /> : <span className={styles.eye} />}
        </div>
      </Box>
    </Card>
  );
};
