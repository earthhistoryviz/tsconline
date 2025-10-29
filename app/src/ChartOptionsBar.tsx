import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef, useState } from "react";
import { context } from "./state";
import { styled, useTheme } from "@mui/material/styles";
import "./Chart.css";
import { CustomTooltip, TSCMenuItem } from "./components";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomOutMapIcon from "@mui/icons-material/ZoomOutMap";
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import SettingsIcon from "@mui/icons-material/Settings";
import FileSaver from "file-saver";
import { ReactZoomPanPinchContentRef } from "react-zoom-pan-pinch";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography
} from "@mui/material";
import React from "react";
import isValidFilename from "valid-filename";
import { DownloadPdfCompleteMessage, DownloadPdfMessage } from "./types";
import { TSCLoadingButton } from "./components/TSCLoadingButton";
import { t } from "i18next";
import { ChartContext } from "./Chart";
import styles from "./ChartOptionsBar.module.css";
import Color from "color";
import { ControlledMenu, useClick, useMenuState } from "@szhsin/react-menu";
import { TSCButton } from "./components/TSCButton";
interface OptionsBarProps {
  transformRef: React.RefObject<ReactZoomPanPinchContentRef>;
  svgRef: React.RefObject<HTMLDivElement>;
  step: number;
  minScale: number;
  maxScale: number;
}

const StyledIconButton = styled(IconButton)(({ theme }) => ({
  "&:hover": {
    backgroundColor: Color(theme.palette.icon.main).alpha(0.2).toString()
  },
  borderRadius: 0,
  "&.active": {
    backgroundColor: Color(theme.palette.button.main).alpha(0.3).toString(),
    outline: `0.5px solid ${theme.palette.button.main}`
  }
}));

export const OptionsBar: React.FC<OptionsBarProps> = observer(({ transformRef, svgRef, step, minScale, maxScale }) => {
  const { actions } = useContext(context);
  const { chartTabState, stateChartOptions, actionChartOptions, altSaveOptions } = useContext(ChartContext);
  const { chartZoomSettings } = chartTabState;
  let width = 0;
  const optionsBarRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const zoomSettingsRef = useRef<HTMLDivElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);
  const [menuState, toggleMenu] = useMenuState({ transition: true });
  const anchorProps = useClick(menuState.state, toggleMenu);
  const menuRef = useRef(null);
  const theme = useTheme();
  // store the width of the settings that shouldn't be hidden
  useEffect(() => {
    if (optionsBarRef.current && zoomSettingsRef.current && helpRef.current) {
      width = 0;
      Object.values([...zoomSettingsRef.current.children, ...helpRef.current.children]).forEach((child) => {
        width += child.clientWidth;
      });
    }
  }, []);
  // check if the options bar is overflowing
  useEffect(() => {
    const checkOverflow = () => {
      if (optionsBarRef.current && width > optionsBarRef.current.clientWidth) {
        setIsOverflowing(true);
      } else {
        setIsOverflowing(false);
      }
    };
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    return () => {
      window.removeEventListener("resize", checkOverflow);
    };
  }, [width]);

  const { enableScrollZoom, scale, resetMidX, zoomFitMidCoord, zoomFitMidCoordIsX, zoomFitScale } = chartZoomSettings;

  const container = transformRef.current;
  const content = svgRef?.current;
  if (!container || !content) {
    return;
  }
  //workaround for unexpected behavior
  //conditions for behavior: limitToBounds = true, zoomToScroll = false
  //after reset transformation or zoom fit, panning with touchpad jarringly misaligns chart from center
  //this doesn't happen if I do the function below, which cycles the zoom scroll function of the transform wrapper
  //soft requirement for this workaround: animation time for reset or fit = 0
  const OptionsButton = () => {
    const handleScrollZoom = () => {
      actions.setChartTabZoomSettings(chartZoomSettings, { enableScrollZoom: !enableScrollZoom });
    };
    return (
      <div>
        <StyledIconButton id="option-button" ref={menuRef} {...anchorProps}>
          <SettingsIcon />
        </StyledIconButton>
        <ControlledMenu
          {...menuState}
          viewScroll="close"
          anchorRef={menuRef}
          onClose={(e) => {
            if (e.reason === "click") return;
            toggleMenu(false);
          }}
          menuStyle={{ backgroundColor: theme.palette.dark.light, color: theme.palette.dark.contrastText }}>
          <TSCMenuItem
            type="checkbox"
            checked={enableScrollZoom}
            onClick={() => {
              handleScrollZoom();
            }}>
            <Typography>Zoom on Scroll</Typography>
          </TSCMenuItem>
          {isOverflowing &&
            (stateChartOptions || []).map(({ label, onChange, value }) => (
              <TSCMenuItem
                key={label}
                type="checkbox"
                checked={value}
                onClick={() => {
                  onChange(!value);
                }}>
                <Typography>{label}</Typography>
              </TSCMenuItem>
            ))}
        </ControlledMenu>
      </div>
    );
  };
  const ZoomInButton = () => {
    return (
      <CustomTooltip title="Zoom In">
        <StyledIconButton
          onClick={() => {
            if (scale < maxScale) {
              container.zoomIn(step, 0);
              actions.setChartTabZoomSettings(chartZoomSettings, { scale: scale + step });
            }
          }}>
          <ZoomInIcon />
        </StyledIconButton>
      </CustomTooltip>
    );
  };
  const ZoomOutButton = () => {
    return (
      <CustomTooltip title="Zoom Out">
        <StyledIconButton
          onClick={() => {
            if (scale > minScale) {
              container.zoomOut(step, 0);
              actions.setChartTabZoomSettings(chartZoomSettings, { scale: scale - step });
            }
          }}>
          <ZoomOutIcon />
        </StyledIconButton>
      </CustomTooltip>
    );
  };
  const ResetButton = () => {
    return (
      <CustomTooltip title="Reset Transformation">
        <StyledIconButton
          onClick={() => {
            container.setTransform(resetMidX, 0, 1, 0);
            actions.setChartTabZoomSettings(chartZoomSettings, { scale: 1 });
          }}>
          <RestartAltIcon />
        </StyledIconButton>
      </CustomTooltip>
    );
  };
  const ZoomFitButton = () => {
    return (
      <CustomTooltip title="Zoom Fit">
        <StyledIconButton
          onClick={() => {
            if (zoomFitMidCoordIsX) {
              container.setTransform(zoomFitMidCoord, 0, zoomFitScale, 0);
            } else {
              container.setTransform(0, zoomFitMidCoord, zoomFitScale, 0);
            }
            actions.setChartTabZoomSettings(chartZoomSettings, { scale: zoomFitScale });
          }}>
          <ZoomOutMapIcon />
        </StyledIconButton>
      </CustomTooltip>
    );
  };
  const NewWindowButton = () => {
    return (
      <CustomTooltip title="New Window">
        <StyledIconButton
          onClick={() => {
            openPreview()}}>
          <OpenInNewIcon />
        </StyledIconButton>
      </CustomTooltip>
    );
  };

  const openPreview = () => {
    const { chartContent, madeChart, chartTimelineEnabled, chartZoomSettings } = chartTabState;
    const snapshot = {
      chartContent: chartContent,
      madeChart: madeChart,
      chartTimelineEnabled: chartTabState.chartTimelineEnabled,
      chartZoomSettings: chartTabState.chartZoomSettings
    };
    try {
      localStorage.setItem("chartPreview", JSON.stringify(snapshot));
      window.open("/chart/preview", "_blank");
    } catch (err) {
      actions.pushSnackbar("Unable to open preview", "warning");      
      console.error("Failed to open preview", err);
    }
  };

  const HelpButton = () => {
    return (
      <div>
        <CustomTooltip
          title={
            <>
              ctrl/⊞/⌘ + Minus (-) - Zoom out
              <br />
              ctrl/⊞/⌘ + Plus (+) - Zoom in
              <br />
              Shift + Scroll - Horizontal Scroll
            </>
          }>
          <StyledIconButton>
            <HelpOutlineIcon />
          </StyledIconButton>
        </CustomTooltip>
      </div>
    );
  };
  return (
    <div className="options-bar" ref={optionsBarRef}>
      <div className="flex-row" ref={zoomSettingsRef}>
        <OptionsButton />
        <ZoomInButton />
        <ZoomOutButton />
        <ResetButton />
        <ZoomFitButton />
        <NewWindowButton />
        {(actionChartOptions || []).map(({ icon, label, onClick }) => {
          return (
            <Box key={label}>
              <CustomTooltip title={label} key="label">
                <StyledIconButton onClick={onClick}>{icon}</StyledIconButton>
              </CustomTooltip>
            </Box>
          );
        })}
        {!isOverflowing &&
          (stateChartOptions || []).map(({ icon, label, onChange, value }) => (
            <Box key={label}>
              <CustomTooltip title={label} key="label">
                <StyledIconButton className={`${value ? "active" : ""}`} onClick={() => onChange(!value)}>
                  {icon}
                </StyledIconButton>
              </CustomTooltip>
            </Box>
          ))}
        <DownloadButton svgRef={svgRef} altSaveOptions={altSaveOptions} />
      </div>
      <div className="flex-row" ref={helpRef}>
        <HelpButton />
      </div>
    </div>
  );
});


type DownloadButtonProps = {
  svgRef: React.RefObject<HTMLDivElement>;
  altSaveOptions?: {
    label: string;
    onClick: () => void;
  }[];
};
// we have to declare this outside of the component to avoid re-creating the function on every render
const DownloadButton: React.FC<DownloadButtonProps> = observer(({ svgRef, altSaveOptions }) => {
  const { actions } = useContext(context);
  const { chartTabState, downloadOptionLabel } = useContext(ChartContext);
  const { unsafeChartContent, downloadFilename, downloadFiletype } = chartTabState;
  // download button state
  const [saveMenuState, toggleSaveMenuState] = useMenuState({ transition: true });
  const [downloadOpen, setDownloadOpen] = useState(false);
  const theme = useTheme();
  const [isSavingChart, setIsSavingChart] = useState(false);
  const saveAnchorProps = useClick(saveMenuState.state, toggleSaveMenuState);
  const saveAnchorRef = useRef<HTMLButtonElement>(null);
  const mainOptionLabel = downloadOptionLabel ?? t("chart.save");
  const handleDownloadOpen = () => {
    setDownloadOpen(true);
  };

  const handleDownloadClose = () => {
    setDownloadOpen(false);
  };
  const handleFilenameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setChartTabState(chartTabState, { downloadFilename: e.target.value });
  };

  const svgToImageURI = (url: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject("Canvas context not found");
          return;
        }
        const pixelRatio = 3;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.drawImage(image, 0, 0);

        URL.revokeObjectURL(url);
        const imgURI = canvas.toDataURL();
        canvas.remove();
        resolve(imgURI);
      };
      image.onerror = () => {
        reject("Failed to load svg onto image");
      };
      image.width = width;
      image.height = height;
      image.src = url;
    });
  };

  async function downloadChart() {
    setIsSavingChart(true);
    try {
      if (downloadFiletype === "svg") {
        const blob = new Blob([unsafeChartContent]);
        FileSaver.saveAs(blob, downloadFilename + ".svg");
        actions.pushSnackbar("Saved Chart as SVG!", "success");
      } else {
        const svgNode = svgRef?.current?.children[0];
        if (!svgNode) return;
        if (!svgNode.getAttribute("height") || !svgNode.getAttribute("width")) return;
        //height and width in cm, so convert to pixels
        const svgHeight = Number(svgNode.getAttribute("height")!.slice(0, -2)) * 37.795;
        const svgWidth = Number(svgNode.getAttribute("width")!.slice(0, -2)) * 37.795;
        const svgString = chartTabState.chartContent;
        const svgBlob = new Blob([svgString], {
          type: "image/svg+xml;charset=utf-8"
        });

        const DOMURL = window.URL || window.webkitURL || window;
        const url = DOMURL.createObjectURL(svgBlob);

        let imgURI = "";
        try {
          imgURI = await svgToImageURI(url, svgWidth, svgHeight);
        } catch (e) {
          console.error(e);
          actions.pushSnackbar("Failed to download chart, please try again.", "warning");
        }
        if (downloadFiletype === "pdf") {
          actions.pushSnackbar("Generating a pdf will take a few seconds, feel free to close out of the popup", "info");
          const downloadWorker: Worker = new Worker(new URL("./util/workers/download-pdf.ts", import.meta.url), {
            type: "module"
          });
          const message: DownloadPdfMessage = { imgURI: imgURI, height: svgHeight, width: svgWidth };
          downloadWorker.postMessage(message);
          downloadWorker.onmessage = function (e: MessageEvent<DownloadPdfCompleteMessage>) {
            const { status, value } = e.data;
            if (status === "success" && value) {
              FileSaver.saveAs(value, downloadFilename + ".pdf");
              actions.pushSnackbar("Saved Chart as PDF!", "success");
            } else {
              actions.pushSnackbar("Saving Chart Timed Out", "info");
            }
            downloadWorker.terminate();
          };
        } else if (downloadFiletype === "png") {
          const a = document.createElement("a");
          a.download = downloadFilename + ".png"; // filename
          a.target = "_blank";
          a.href = imgURI;
          a.click();
          actions.pushSnackbar("Saved Chart as PNG!", "success");
          a.remove();
        }
        DOMURL.revokeObjectURL(url);
      }
    } finally {
      setIsSavingChart(false);
      setDownloadOpen(false);
    }
  }
  const options = [
    {
      label: mainOptionLabel,
      onClick: () => {
        handleDownloadOpen();
      }
    },
    ...(altSaveOptions || [])
  ];
  return (
    <div>
      {options.length > 1 ? (
        <>
          <TSCButton className={styles.saveButton} buttonType="gradient" ref={saveAnchorRef} {...saveAnchorProps}>
            {t("chart.save")}
          </TSCButton>
          <ControlledMenu
            {...saveMenuState}
            anchorRef={saveAnchorRef}
            className="settings-sub-menu"
            direction={"top"}
            align="start"
            menuStyle={{
              color: theme.palette.dark.contrastText,
              backgroundColor: theme.palette.dark.light,
              border: `1px solid ${theme.palette.divider}`
            }}
            onClose={() => toggleSaveMenuState(false)}>
            {options.map(({ label, onClick }) => (
              <TSCMenuItem key={label} className="" onClick={onClick}>
                <Typography>{label}</Typography>
              </TSCMenuItem>
            ))}
          </ControlledMenu>
        </>
      ) : (
        <>
          <TSCButton
            className={styles.saveButton}
            buttonType="gradient"
            onClick={() => {
              handleDownloadOpen();
            }}>
            {mainOptionLabel}
          </TSCButton>
        </>
      )}
      <Dialog
        disableRestoreFocus
        open={downloadOpen}
        onClose={() => {
          handleDownloadClose();
        }}
        PaperProps={{
          component: "form",
          onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault(); // to stop website from reloading
            if (!isValidFilename(downloadFilename)) {
              actions.pushSnackbar("Filename is not valid", "warning");
              return;
            }
            downloadChart();
          }
        }}>
        <DialogTitle>{mainOptionLabel}</DialogTitle>
        <DialogContent>
          <DialogContentText>Please enter the filename and select filetype.</DialogContentText>
          <div className="flex-row chart-download-button">
            <TextField
              defaultValue={downloadFilename}
              autoFocus
              required
              margin="normal"
              type="text"
              size="small"
              fullWidth
              label="filename"
              variant="standard"
              onChange={handleFilenameChange}
            />
            <Box sx={{ minWidth: 120 }}>
              <FormControl fullWidth margin="normal">
                <Select
                  variant="standard"
                  size="small"
                  value={downloadFiletype}
                  label="Age"
                  onChange={(e) => {
                    actions.setChartTabState(chartTabState, {
                      downloadFiletype: e.target.value as "svg" | "png" | "pdf"
                    });
                  }}>
                  <MenuItem value={"svg"}>.svg</MenuItem>
                  <MenuItem value={"pdf"}>.pdf</MenuItem>
                  <MenuItem value={"png"}>.png</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </div>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={handleDownloadClose}>
            Exit
          </Button>
          <TSCLoadingButton loading={isSavingChart} type="submit">
            Save
          </TSCLoadingButton>
        </DialogActions>
      </Dialog>
    </div>
  );
});
