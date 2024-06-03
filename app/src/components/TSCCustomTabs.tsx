import { HTMLAttributes, useState } from "react";
import "./TSCCustomTabs.css";
import { useTheme } from "@mui/material";
type CustomTabsProps = {
  tabs: string[];
  width?: number;
  height?: number;
  tabIndicatorLength?: number;
  orientation?: "horizontal" | "vertical";
} & HTMLAttributes<HTMLDivElement>;
export const CustomTabs: React.FC<CustomTabsProps> = ({
  tabs,
  orientation = "horizontal",
  width = 80,
  height = 40,
  tabIndicatorLength,
  ...props
}) => {
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const theme = useTheme();
  const handleTabClick = (index: number) => {
    setSelectedTab(index);
  };
  height = Math.min(height, 100);
  width = Math.min(width, 200);
  let tabIndicatorLengthDiff;
  // to center the tab indicator
  if (orientation === "vertical") {
    tabIndicatorLength = tabIndicatorLength || height;
    tabIndicatorLengthDiff = Math.abs(tabIndicatorLength - height);
  } else {
    tabIndicatorLength = tabIndicatorLength || width;
    tabIndicatorLengthDiff = Math.abs(tabIndicatorLength - width);
  }
  const style = {
    backgroundColor: theme.palette.selection.main
  };
  const horizontalOrientation = {
    transform: `translateX(calc(${selectedTab * 100}% + ${tabIndicatorLengthDiff / 2}px))`,
    height: `3px`,
    width: `${tabIndicatorLength}px`,
    ...style
  };
  const verticalOrientation = {
    transform: `translateY(calc(${selectedTab * height}px + ${tabIndicatorLengthDiff / 2}px))`,
    height: `${tabIndicatorLength}px`,
    width: `2px`,
    left: `${width}px`,
    ...style
  };
  return (
    <div
      className="tsc-custom-tabs"
      style={{ flexDirection: `${orientation === "horizontal" ? "row" : "column"}` }}
      {...props}>
      <div className="tsc-tab-buttons">
        <div
          className={`tsc-tab-indicator`}
          style={orientation === "horizontal" ? horizontalOrientation : verticalOrientation}
        />
        {tabs.map((tab, index) => (
          <button
            tabIndex={0}
            style={{
              width: `${width}px`,
              height: `${height}px`,
              color: `${selectedTab === index ? theme.palette.selection.main : `rgb(0, 26, 35)`}`
            }}
            className={`tsc-tab-panel`}
            onClick={() => handleTabClick(index)}>
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
};
