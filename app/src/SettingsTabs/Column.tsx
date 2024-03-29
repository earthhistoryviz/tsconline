import { observer } from "mobx-react-lite";
import React, { useContext, useState } from "react";
import Typography from "@mui/material/Typography";
import { context } from "../state";
import { ColumnInfo } from "@tsconline/shared";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ColumnContainer, AccordionDetails, TSCCheckbox, AccordionSummary, Accordion, TSCButton } from "../components";

import { ColumnMenu } from "./ColumnMenu";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useTheme } from "@mui/material/styles";
import { Tooltip } from "@mui/material";
import "./Column.css";
import { checkIfDataIsInRange } from "../util/util";

type ColumnAccordionProps = {
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
    const char = string.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return hash;
}

const ColumnAccordion: React.FC<ColumnAccordionProps> = observer(
  ({ details, expandedAccordions, accordionClicked }) => {
    const { actions, state } = useContext(context);
    const theme = useTheme();
    //for keeping the original name for array access
    function clickColumnName() {
      actions.setcolumnSelected(details.name);
    }
    const hasChildren = details.children && Object.keys(details.children).length > 0;
    const columnName = (
      <div>
        <Typography className="ColumnName" sx={{ fontSize: "0.97rem" }} style={{ padding: "6px" }}>
          {details.editName}
        </Typography>
      </div>
    );

    const dataInrange = checkIfDataIsInRange(
      details.minAge,
      details.maxAge,
      state.settings.topStageAge,
      state.settings.baseStageAge
    );

    function checkbox(leaf: string) {
      const tooltipOrCheckBox =
        !dataInrange && !(details.name === "Ma" || details.name === "Root") ? (
          <Tooltip
            title="Data not included in time range"
            placement="top"
            arrow
            slotProps={{
              popper: {
                modifiers: [
                  {
                    name: "offset",
                    options: {
                      offset: [0, -10]
                    }
                  }
                ]
              }
            }}>
            <ErrorOutlineIcon
              className="error-icon"
              style={{
                color: theme.palette.error.main
              }}
            />
          </Tooltip>
        ) : (
          <TSCCheckbox
            checked={details.on}
            onChange={() => {
              actions.toggleSettingsTabColumn(details.name);
            }}
          />
        );

      return (
        <>
          <ColumnContainer>
            <div className={"column-checkbox " + leaf} onClick={() => clickColumnName()}>
              {tooltipOrCheckBox}

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
        }}>
        <AccordionSummary aria-controls="panel-content" id="panel-header">
          <div
            onClick={(event) => {
              //stops accordion from expanding/collapsing when clicking on the name or checkbox
              event.stopPropagation();
            }}>
            {checkbox("")}
          </div>
        </AccordionSummary>
        <AccordionDetails>
          <>
            {details.children &&
              Object.entries(details.children).map(([childName, childDetails]) => (
                <ColumnAccordion
                  key={childName}
                  details={childDetails}
                  expandedAccordions={expandedAccordions}
                  accordionClicked={accordionClicked}
                />
              ))}
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
  const accordions = state.settingsTabs.columns ? stringToHash(state.settingsTabs.columns.name) : 0;
  const [expandedAccordions, setExpandedAccordions] = useState<number[]>([accordions]);
  //if column not in expanded list, add it
  //if column in expanded list, remove it
  const accordionClicked = (name: string) => {
    if (expandedAccordions.includes(stringToHash(name))) {
      setExpandedAccordions(expandedAccordions.filter((number) => number !== stringToHash(name)));
    } else setExpandedAccordions([...expandedAccordions, stringToHash(name)]);
  };
  //replaces expanded list with only top level column open
  //which collpases everything
  const collapseAll = () => {
    if (!state.settingsTabs.columns) return;
    setExpandedAccordions([stringToHash(state.settingsTabs.columns!.name)]);
  };
  //helper function for expand all for going through all the columns
  function recurseThroughColumn(array: number[], columns: ColumnInfo[]) {
    columns.forEach((elem) => {
      array.push(stringToHash(elem.name));
      recurseThroughColumn(array, elem.children);
    });
  }
  //adds every column to the expand list
  const expandAll = () => {
    const newArray: number[] = [];
    if (!state.settingsTabs.columns) return;
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
        }}>
        Generate
      </TSCButton>
      <div className="column-accordion-and-menu">
        <Box
          className="hide-scrollbar column-accordion-wrapper"
          sx={{
            border: `1px solid gray`,
            borderRadius: "4px",
            zIndex: 0,
            padding: "10px"
          }}>
          <TSCButton
            id="column-generate-button-top"
            onClick={() => {
              expandAll();
            }}>
            Expand All
          </TSCButton>
          <TSCButton
            id="column-generate-button-top"
            onClick={() => {
              collapseAll();
            }}>
            collapse All
          </TSCButton>
          {state.settingsTabs.columns && (
            <ColumnAccordion
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
