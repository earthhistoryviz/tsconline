import { HTMLAttributes, useState } from "react";
import "./TSCCustomTabs.css";
import { observer } from "mobx-react-lite";
import { Box, Button, useTheme } from "@mui/material";
type CustomTabsProps = {
  tabs: { id: string; tab: React.ReactNode }[];
  value?: number;
  onChange?: (index: number) => void;
  width?: number;
  height?: number;
  tabIndicatorLength?: number;
  centered?: boolean;
  orientation?: "horizontal" | "vertical-left" | "vertical-right";
} & Omit<HTMLAttributes<HTMLDivElement>, "onChange">;
export const CustomTabs: React.FC<CustomTabsProps> = observer(
  ({
    tabs,
    value,
    orientation = "horizontal",
    width = 80,
    height = 40,
    tabIndicatorLength,
    centered = false,
    onChange,
    ...props
  }) => {
    const [selectedTab, setSelectedTab] = useState<number>(value || 0);
  const theme = useTheme();
    height = Math.min(height, 100);
    width = Math.min(width, 200);
    let tabIndicatorLengthDiff;
    // to center the tab indicator
    if (orientation === "vertical-left" || orientation === "vertical-right") {
      tabIndicatorLength = tabIndicatorLength || height;
      tabIndicatorLengthDiff = Math.abs(tabIndicatorLength - height);
    } else {
      tabIndicatorLength = tabIndicatorLength || width;
      tabIndicatorLengthDiff = Math.abs(tabIndicatorLength - width);
    }
    const horizontalOrientation = {
      transform: `translateX(calc(${(value ?? selectedTab) * width}px + ${tabIndicatorLengthDiff / 2}px))`,
      height: `2px`,
      top: `${height}px`,
      width: `${tabIndicatorLength}px`
    };
    const verticalOrientation = {
      transform: `translateY(calc(${(value ?? selectedTab) * height}px + ${tabIndicatorLengthDiff / 2}px))`,
      height: `${tabIndicatorLength}px`,
      width: `2px`,
      left: `${orientation === "vertical-left" ? "0" : `${width}px`}`
    };
    return (
      <div className="tsc-custom-tabs" {...props}>
        <div
          className="tsc-tab-buttons"
          style={{ flexDirection: `${orientation === "horizontal" ? "row" : "column"}` }}>
          <Box
            className={`tsc-tab-indicator`}
            style={orientation === "horizontal" ? horizontalOrientation : verticalOrientation}
            sx={{ bgcolor: "button.light" }}
          />
          {tabs.map((val, index) => (
            <Button
              key={val.id}
              tabIndex={0}
              sx={{
                textTransform: "none",
                width: `${width}px`,
                height: `${height}px`,
                textAlign: `${centered ? "center" : orientation === "vertical-left" ? "right" : "left"}`,
                padding: `${centered ? "0" : orientation === "vertical-left" ? "10px 5px 10px 15px" : "10px 15px 10px 5px"}`,
                color: `${selectedTab === index ? "button.light" : "text.primary"}`
              }}
              className={`tsc-tab-panel ${(value ?? selectedTab) === index ? "tsc-tab-panel-selected" : ""}`}
              onClick={() => {
                if (selectedTab === index) return;
                setSelectedTab(index);
                if (onChange) onChange(index);
              }}>
              {val.tab}
            </Button>
          ))}
        </div>
      </div>
    );
  }
);
