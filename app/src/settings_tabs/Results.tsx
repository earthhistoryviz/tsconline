import {
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  SvgIcon,
  Typography,
  Box,
  IconButton,
  TableRow
} from "@mui/material";
import React, { useContext } from "react";
import { Table } from "react-bootstrap";
import { TableComponents, TableVirtuoso } from "react-virtuoso";
import { CustomTooltip, StyledScrollbar, TSCCheckbox } from "../components";
import { context } from "../state";
import { observer } from "mobx-react-lite";
import { ErrorOutline } from "@mui/icons-material";
import NotesIcon from "@mui/icons-material/Notes";
import { useTheme } from "@mui/material/styles";
import { EventSearchInfo, GroupedEventSearchInfo } from "../types";
import { checkIfDataIsInRange, trimQuotes, willColumnBeVisibleOnChart } from "../util/util";
import bigDecimal from "js-big-decimal";
import HorizontalRuleIcon from "@mui/icons-material/HorizontalRule";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import FormatLineSpacingIcon from "@mui/icons-material/FormatLineSpacing";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";

import "./Results.css";
import { useTranslation } from "react-i18next";

const tooltipDelayTime = 400;

const Status = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  const on = willColumnBeVisibleOnChart(column, state.settingsTabs.columnHashMap);
  const ages = info.age;
  const dataInRange = ages
    ? checkIfDataIsInRange(
        ages.topAge,
        ages.baseAge,
        state.settings.timeSettings[column.units].topStageAge,
        state.settings.timeSettings[column.units].baseStageAge
      )
    : true;
  return (
    <div>
      {dataInRange ? (
        <CustomTooltip
          enterDelay={tooltipDelayTime}
          enterNextDelay={tooltipDelayTime}
          disableInteractive
          placement="top"
          title={on ? "Column Toggled ON" : "Column Toggled OFF"}>
          <TSCCheckbox
            className="status-checkbox"
            size="large"
            onClick={() => actions.toggleSettingsTabColumn(column)}
            checked={on}
          />
        </CustomTooltip>
      ) : (
        <CustomTooltip disableInteractive placement="top" title="age not within time interval">
          <ErrorOutline className="status-error-icon" color="error" />
        </CustomTooltip>
      )}
    </div>
  );
});

const Column = observer(({ info }: { info: EventSearchInfo }) => {
  const { state } = useContext(context);
  const { columnName, columnPath } = info;
  const column = state.settingsTabs.columnHashMap.get(columnName);

  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  return (
    <>
      <div className="search-result-column-container">
        <CustomTooltip
          enterDelay={tooltipDelayTime}
          enterNextDelay={tooltipDelayTime}
          placement="top"
          title={columnPath.map((value, pathIndex) => (
            <div key={pathIndex}>{value}</div>
          ))}>
          <Typography noWrap variant="subtitle2">
            {columnPath[0]}
          </Typography>
        </CustomTooltip>
      </div>
    </>
  );
});

const verifyAgesAndAddAgeMargin = (age: { topAge: number; baseAge: number } | undefined) => {
  if (!age) return null;
  let min = age.topAge;
  let max = age.baseAge;
  //for floating point inaccuracies
  if ((min = Number(bigDecimal.add(String(min), "-3"))) < 0) {
    min = 0;
  }
  if ((max = Number(bigDecimal.add(String(max), "3"))) < 0) {
    max = 0;
  }
  return { topAge: min, baseAge: max };
};

const Center = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  if (!info.age) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }

  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  const centerTimeOnEvent = () => {
    const ages = verifyAgesAndAddAgeMargin(info.age);
    if (!ages) return;
    actions.setTopStageAge(ages.topAge, info.unit);
    actions.setBaseStageAge(ages.baseAge, info.unit);
  };
  return (
    <CustomTooltip
      enterDelay={tooltipDelayTime}
      enterNextDelay={tooltipDelayTime}
      disableInteractive
      placement="top"
      title="center time interval within 3myr boundary">
      <IconButton
        onClick={() => {
          centerTimeOnEvent();
          actions.setColumnOn(false, column);
          actions.toggleSettingsTabColumn(column);
        }}
        sx={{ padding: 0 }}>
        <VerticalAlignCenterIcon color="info" />
      </IconButton>
    </CustomTooltip>
  );
});

const Extend = observer(({ info }: { info: EventSearchInfo }) => {
  const { state, actions } = useContext(context);
  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!info.age) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }

  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }
  const extendTimeToIncludeEvent = () => {
    const ages = verifyAgesAndAddAgeMargin(info.age);
    if (!ages) return;
    if (state.settings.timeSettings[info.unit].topStageAge > ages.topAge) {
      actions.setTopStageAge(ages.topAge, info.unit);
    }
    if (state.settings.timeSettings[info.unit].baseStageAge < ages.baseAge) {
      actions.setBaseStageAge(ages.baseAge, info.unit);
    }
  };
  return (
    <CustomTooltip
      enterDelay={tooltipDelayTime}
      enterNextDelay={tooltipDelayTime}
      disableInteractive
      placement="top"
      title="extend time interval within 3myr boundary">
      <IconButton
        onClick={() => {
          extendTimeToIncludeEvent();
          actions.setColumnOn(false, column);
          actions.toggleSettingsTabColumn(column);
        }}
        sx={{ padding: 0 }}>
        <FormatLineSpacingIcon color="info" />
      </IconButton>
    </CustomTooltip>
  );
});

const Age = observer(({ info }: { info: EventSearchInfo }) => {
  const { state } = useContext(context);
  if (!info.age) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }

  const column = state.settingsTabs.columnHashMap.get(info.columnName);
  if (!column) {
    return (
      <SvgIcon>
        <ErrorOutline />
      </SvgIcon>
    );
  }

  const AgeDisplay = () => {
    if (!info.age)
      return (
        <SvgIcon>
          <ErrorOutline />
        </SvgIcon>
      );
    if (info.age.topAge === info.age.baseAge) {
      return <Typography variant="subtitle2">{info.age.topAge}</Typography>;
    }
    return (
      <Typography variant="subtitle2">
        {info.age.topAge} - {info.age.baseAge}
      </Typography>
    );
  };
  return <AgeDisplay />;
});

const Type = observer(({ info }: { info: EventSearchInfo }) => {
  if (!info.type) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }
  return <Typography variant="subtitle2">{info.type}</Typography>;
});

const Notes = observer(({ info }: { info: EventSearchInfo }) => {
  if (!info.notes) {
    return (
      <SvgIcon>
        <HorizontalRuleIcon />
      </SvgIcon>
    );
  }
  const addTargetBlank = (html: string) => {
    return html.replace(/<a\s+href=/g, '<a target="_blank" href=');
  };

  const content = trimQuotes(info.notes).replaceAll('""', '"');
  const processedContent = addTargetBlank(content);
  return (
    <CustomTooltip
      enterDelay={tooltipDelayTime}
      enterNextDelay={tooltipDelayTime}
      placement="top"
      title={
        <Box className="search-result-info-container">
          <StyledScrollbar className="scroll-bar">
            <Box
              className="search-result-info"
              sx={{ "& a": { color: "button.main" } }}
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </StyledScrollbar>
        </Box>
      }>
      <SvgIcon>
        <NotesIcon />
      </SvgIcon>
    </CustomTooltip>
  );
});

export const Results = observer(({ groupedEvents }: { groupedEvents: GroupedEventSearchInfo[] }) => {
  const theme = useTheme();
  //this is necessary to prevent table hierachy errors
  //virtuoso assigns each array element to a table row, and a table row can't be a child
  //of a table row which would be necessary for display without stretching the array.
  const stretchedEvents: (string | EventSearchInfo)[] = groupedEvents.flatMap((value) => {
    return [value.key, ...value.info];
  });
  function EventGroup(index: number, info: string | EventSearchInfo) {
    if (typeof info === "string") {
      return (
        <TableCell
          className="event-group-identifier"
          align="center"
          sx={{ backgroundColor: theme.palette.secondaryBackground.main }}
          colSpan={7}>
          <Typography variant="h6">
            <Box className="event-group-identifier-text">{info}</Box>
          </Typography>
        </TableCell>
      );
    } else {
      return (
        <>
          <TableCell className="search-result-status-column" align="left">
            <Status info={info} />
          </TableCell>
          <TableCell className="search-result-center-column" align="left">
            <Center info={info} />
          </TableCell>
          <TableCell className="search-result-extend-column" align="left">
            <Extend info={info} />
          </TableCell>
          <TableCell className="search-result-column-column" align="left">
            <Column info={info} />
          </TableCell>
          <TableCell className="search-result-age-column" align="center">
            <Age info={info} />
          </TableCell>
          <TableCell className="search-result-type-column" align="center">
            <Type info={info} />
          </TableCell>
          <TableCell className="search-result-notes-column" align="right">
            <Notes info={info} />
          </TableCell>
        </>
      );
    }
  }

  const VirtuosoTableComponents: TableComponents<string | EventSearchInfo> = {
    Scroller: React.forwardRef<HTMLDivElement>((props, ref) => (
      <TableContainer
        component={Paper}
        sx={{ backgroundColor: theme.palette.backgroundColor.main }}
        {...props}
        ref={ref}
      />
    )),
    Table: (props) => <Table {...props} style={{ width: "100%", borderSpacing: "0px" }} />,
    TableBody: React.forwardRef<HTMLTableSectionElement>((props, ref) => <TableBody {...props} ref={ref} />)
  };

  //add display names for linter
  if (!VirtuosoTableComponents.Scroller || !VirtuosoTableComponents.TableBody) return;
  VirtuosoTableComponents.Scroller.displayName = "Scroller";
  VirtuosoTableComponents.TableBody.displayName = "TableBody";
  const { t } = useTranslation();
  return (
    <Box className="table-container" id="event-search-results-table">
      <CustomTooltip
        enterDelay={tooltipDelayTime}
        enterNextDelay={tooltipDelayTime}
        placement="top"
        title={
          <>
            Status: for ages with a range, the error outline will only show up if the entire range is outside the
            selected time interval.
            <br />
            Center: sets the time interval to the selected age surrounded with 3myr
            <br />
            Extend: takes the smallest top age and greatest base age between the current time interval and the selected
            age surrounded with 3myr
            <br />
          </>
        }>
        <HelpOutlineIcon />
      </CustomTooltip>
      <TableVirtuoso
        className="events-search-results-table"
        fixedHeaderContent={() => (
          <TableRow>
            <TableCell className="event-group-header-text search-result-status-column" align="left">
              {t("settings.search.header.status")}
            </TableCell>
            <TableCell className="event-group-header-text search-result-center-column" align="left">
              {t("settings.search.header.center")}
            </TableCell>
            <TableCell className="event-group-header-text search-result-extend-column" align="left">
              {t("settings.search.header.extend")}
            </TableCell>
            <TableCell className="event-group-header-text search-result-column-column" align="left">
              {t("settings.search.header.column")}
            </TableCell>
            <TableCell className="event-group-header-text search-result-age-column" align="center">
              {t("settings.search.header.age")}
            </TableCell>
            <TableCell className="event-group-header-text search-result-qualifier-column" align="center">
              {t("settings.search.header.qualifier")}
            </TableCell>
            <TableCell className="event-group-header-text search-result-notes-column" align="right">
              {t("settings.search.header.notes")}
            </TableCell>
          </TableRow>
        )}
        data={stretchedEvents}
        components={VirtuosoTableComponents}
        itemContent={EventGroup}
      />
    </Box>
  );
});
