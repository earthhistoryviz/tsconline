import { observer } from "mobx-react-lite";
import React, { useContext, useRef, useState } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import {
  ColumnContainer,
  AccordionDetails,
  TSCCheckbox,
  AccordionSummary,
  Accordion,
  TSCButton,
} from "../components";

import { ColumnMenu } from "./ColumnMenu";

import "./Column.css";

type ColumnAccordionProps = {
  name: string;
  details: ColumnInfo;
  expandedAccordions: number[];
  accordionClicked: (name: string) => void;
};

//for using integers instead of strings inside expandAccordion state array
//to increase speed
function stringToHash(string: string): number {
  let hash = 0;

  if (string.length == 0) return hash;

  for (let i = 0; i < string.length; i++) {
    let char = string.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return hash;
}

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(
  ({ name, details, expandedAccordions, accordionClicked }) => {
    const theme = useTheme();
    const { state, actions } = useContext(context);
    //for keeping the original name for array access
    function clickColumnName() {
      actions.setcolumnSelected(details.name);
    }
    const hasChildren =
      details.children && Object.keys(details.children).length > 0;
    const columnName = (
      <div>
        <Typography
          className="ColumnName"
          sx={{ fontSize: "0.97rem" }}
          style={{ padding: "6px" }}
        >
          {details.editName}
        </Typography>
      </div>
    );
    function checkbox(leaf: string) {
      return (
        <>
          <ColumnContainer>
            <div
              className={"column-checkbox " + leaf}
              onClick={() => clickColumnName()}
            >
              <TSCCheckbox
                checked={details.on}
                onChange={() => {
                  actions.toggleSettingsTabColumn(details.name);
                }}
              />
              {columnName}
            </div>
          </ColumnContainer>
        </>
      );
    }

    // if there are no children, don't make an accordion
    if (!hasChildren) {
      return checkbox("column-leaf");
    }
    return (
      <Accordion
        //checks if column name is in expand list
        expanded={expandedAccordions.includes(stringToHash(details.name))}
        onChange={() => {
          accordionClicked(details.name);
        }}
      >
        <AccordionSummary aria-controls="panel-content" id="panel-header">
          <div
            onClick={(event) => {
              //stops accordion from expanding/collapsing when clicking on the name or checkbox
              event.stopPropagation();
            }}
          >
            {checkbox("")}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <>
            {details.children &&
              Object.entries(details.children).map(
                ([childName, childDetails], childIndex) => (
                  <ColumnAccordion
                    key={childName}
                    name={childDetails.editName}
                    details={childDetails}
                    expandedAccordions={expandedAccordions}
                    accordionClicked={accordionClicked}
                  />
                )
              )}
          </>
        </AccordionDetails>
      </Accordion>
    );
  }
);

// column with generate button, and accordion columns
export const Column = observer(function Column() {
  const { state, actions } = useContext(context);
  const navigate = useNavigate();
  //state array of column names that are expanded
  const [expandedAccordions, setExpandedAccordions] = useState<number[]>([
    stringToHash(state.settingsTabs.columns!.name),
  ]);
  //if column not in expanded list, add it
  //if column in expanded list, remove it
  const accordionClicked = (name: string) => {
    if (expandedAccordions.includes(stringToHash(name))) {
      setExpandedAccordions(
        expandedAccordions.filter((number) => number !== stringToHash(name))
      );
    } else setExpandedAccordions([...expandedAccordions, stringToHash(name)]);
  };
  //replaces expanded list with only top level column open
  //which collpases everything
  const collapseAll = () => {
    setExpandedAccordions([stringToHash(state.settingsTabs.columns!.name)]);
  };
  //helper function for expand all for going through all the columns
  function recurseThroughColumn(array: number[], columns: ColumnInfo[]) {
    columns.forEach((elem, index) => {
      array.push(stringToHash(elem.name));
      recurseThroughColumn(array, elem.children);
    });
  }
  //adds every column to the expand list
  const expandAll = () => {
    const newArray: number[] = [];
    newArray.push(stringToHash(state.settingsTabs.columns!.name));
    recurseThroughColumn(newArray, state.settingsTabs.columns!.children);
    setExpandedAccordions(newArray);
  };

  return (
    <div className="column-top-level">
      <TSCButton
        id="column-generate-button-top"
        onClick={() => {
          actions.fetchChartFromServer(navigate);
        }}
      >
        Generate
      </TSCButton>
      <div className="column-accordion-and-menu">
        <Box
          className="hide-scrollbar column-accordion-wrapper"
          sx={{
            border: `1px solid gray`,
            borderRadius: "4px",
            zIndex: 0,
            padding: "10px",
          }}
        >
          <TSCButton
            id="column-generate-button-top"
            onClick={() => {
              expandAll();
            }}
          >
            Expand All
          </TSCButton>
          <TSCButton
            id="column-generate-button-top"
            onClick={() => {
              collapseAll();
            }}
          >
            collapse All
          </TSCButton>
          {state.settingsTabs.columns && (
            <ColumnAccordion
              name={state.settingsTabs.columns.name}
              details={state.settingsTabs.columns}
              expandedAccordions={expandedAccordions}
              accordionClicked={accordionClicked}
            />
          )}
        </Box>
        <ColumnMenu />
      </div>
    </div>
  );
});
