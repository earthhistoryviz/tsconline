import { observer } from "mobx-react-lite";
import { useLocation, useNavigate, useParams } from "react-router";
import styles from "./DatapackProfile.module.css";
import { useContext, useEffect, useRef, useState } from "react";
import { context } from "./state";
import { devSafeUrl } from "./util";
import { Box, IconButton, Typography } from "@mui/material";
import * as d3 from "d3";
import { CustomDivider, TagButton } from "./components";
import { CustomTabs } from "./components/TSCCustomTabs";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Discussion } from "./components/TSCDiscussion";
import CampaignIcon from "@mui/icons-material/Campaign";
import { PageNotFound } from "./PageNotFound";
import { BaseDatapackProps, Datapack, DatapackWarning } from "@tsconline/shared";

export const DatapackProfile = observer(() => {
  const { state } = useContext(context);
  const { id } = useParams();
  const defaultImageUrl = devSafeUrl("/datapack-images/default.png");
  const navigate = useNavigate();
  const [tabIndex, setTabIndex] = useState(0);
  if (!id) return <PageNotFound />;
  const query = new URLSearchParams(useLocation().search);
  const fetchDatapack = () => {
    let datapack: Datapack | undefined;
    switch (query.get("index")) {
      case "server":
        datapack = state.datapackCollection.serverDatapackIndex[id];
        break;
      case "public_user":
        datapack = state.datapackCollection.publicUserDatapackIndex[id];
        break;
      case "private_user":
        datapack = state.datapackCollection.privateUserDatapackIndex[id];
        break;
      case "workshop":
        datapack = state.datapackCollection.workshopDatapackIndex[id];
        break;
      default:
        datapack =
          state.datapackCollection.serverDatapackIndex[id] ||
          state.datapackCollection.publicUserDatapackIndex[id] ||
          state.datapackCollection.privateUserDatapackIndex[id] ||
          state.datapackCollection.workshopDatapackIndex[id] ||
          null;
        break;
    }
    return datapack;
  };
  const datapack = fetchDatapack();
  if (!datapack) return <PageNotFound />;
  const tabs = [
    {
      id: "About",
      tab: "About"
    },
    {
      id: "View Data",
      tab: "View Data"
    },
    {
      id: "Discussion",
      tab: "Discussion"
    },
    {
      id: "Warnings",
      tab: <WarningsTab count={datapack.warnings ? datapack.warnings.length : 0} />
    }
  ];
  return (
    <div className={styles.adjcontainer}>
      <div className={styles.container}>
        <div className={styles.header}>
          <IconButton className={styles.back} onClick={() => navigate("/settings")}>
            <ArrowBackIcon className={styles.icon} />
          </IconButton>
          <Typography className={styles.ht}>{datapack.title}</Typography>
          <img className={styles.di} src={datapack.image || defaultImageUrl} />
        </div>
        <CustomTabs
          className={styles.tabs}
          centered
          value={tabIndex}
          onChange={(val) => setTabIndex(val)}
          tabs={tabs}
        />
        <CustomDivider className={styles.divider} />
        <DatapackProfileContent index={tabIndex} datapack={datapack} />
      </div>
    </div>
  );
});

type WarningTabProps = {
  count: number;
};
const WarningsTab: React.FC<WarningTabProps> = ({ count }) => {
  return (
    <div className={styles.wtc}>
      Warnings{count > 0 && <span className={styles.number}>{`${count > 99 ? `99+` : count}`}</span>}
    </div>
  );
};

type DatapackProfileContentProps = {
  index: number;
  datapack: BaseDatapackProps;
};
const DatapackProfileContent: React.FC<DatapackProfileContentProps> = ({ index, datapack }) => {
  switch (index) {
    case 0:
      return <About datapack={datapack} />;
    case 1:
      return <ViewData datapack={datapack} />;
    case 2:
      return <Discussion />;
    case 3:
      return (
        datapack.warnings &&
        datapack.warnings.length > 0 &&
        datapack.warnings.map((warning, index) => (
          <DatapackWarningAlert
            key={warning.lineNumber + warning.warning + warning.message + index}
            warning={warning}
          />
        ))
      );
    default:
      return <About datapack={datapack} />;
  }
};
type AboutProps = {
  datapack: BaseDatapackProps;
};
const About: React.FC<AboutProps> = ({ datapack }) => {
  return (
    <Box className={styles.about} bgcolor="secondaryBackground.main">
      <div className={styles.ah}>
        <Typography className={styles.dt}>Description</Typography>
        <Typography className={styles.description}>{datapack.description}</Typography>
        {datapack.notes && <Typography className={styles.dt}>Notes</Typography>}
        {datapack.notes && <Typography className={styles.description}>{datapack.notes}</Typography>}
        {datapack.contact && <Typography className={styles.dt}>Contact</Typography>}
        {datapack.contact && <Typography className={styles.description}>{datapack.contact}</Typography>}
      </div>
      <div className={styles.additional}>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Authored By</Typography>
          <Typography>{datapack.authoredBy}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Created</Typography>
          <Typography>{datapack.date || "Unknown"}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Total Columns</Typography>
          <Typography>{datapack.totalColumns}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Name</Typography>
          <Typography>{datapack.file}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>File Size</Typography>
          <Typography>{datapack.size}</Typography>
        </div>
        <div className={styles.ai}>
          <Typography className={styles.aih}>Tags</Typography>
          <div className={styles.tags}>
            {datapack.tags[0]
              ? datapack.tags.map((tag) => (
                  <TagButton key={tag}>
                    <Typography fontSize="0.9rem">{tag}</Typography>
                  </TagButton>
                ))
              : "No tags"}
          </div>
        </div>
      </div>
    </Box>
  );
};

type DatapackWarningProps = {
  warning: DatapackWarning;
};
export const DatapackWarningAlert: React.FC<DatapackWarningProps> = ({ warning }) => {
  return (
    <Box className={styles.dwc} bgcolor="secondaryBackground.light">
      <CampaignIcon className={styles.dwi} />
      <Box>
        {warning.lineNumber !== undefined && (
          <Typography fontWeight={600}>{`Warning found on line ${warning.lineNumber}`}</Typography>
        )}
        <Typography>{warning.warning}</Typography>
        {warning.message && <Typography fontStyle="italic">{warning.message}</Typography>}
      </Box>
    </Box>
  );
};

type ViewDataProps = {
  datapack: BaseDatapackProps;
};

const ViewData: React.FC<ViewDataProps> = ({ datapack }) => {
  return (
    <div style={{ width: "100%" }}>
      <Box className={styles.vd} bgcolor="secondaryBackground.main">
        <Typography className={styles.dt}>Column type count</Typography>
        <PieChart data={datapack.columnTypeCount} />
      </Box>
    </div>
  );
};

type PieChartProps = {
  data: Record<string, number>;
};

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const ref = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove(); // Clear previous content

    const width = 300;
    const height = 200;
    const radius = Math.min(width, height) / 2;

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const pie = d3
      .pie<{ label: string; value: number }>()
      .sort(null)
      .value((d) => d.value);

    const arc = d3
      .arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .outerRadius(radius - 10)
      .innerRadius(0);

    const arcOver = d3
      .arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .outerRadius(radius - 5)
      .innerRadius(0);

    const chartData = Object.entries(data)
      .filter(([_, value]) => value > 0)
      .map(([label, value]) => ({ label, value }));

    const g = svg.append("g").attr("transform", `translate(${width / 2},${height / 2})`);

    const tooltip = d3
      .select("body")
      .append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "#fff")
      .style("border", "1px solid #ccc")
      .style("padding", "5px")
      .style("border-radius", "4px")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("color", "black");

    const arcs = g
      .selectAll(".arc")
      .data(pie(chartData))
      .enter()
      .append("g")
      .attr("class", "arc")
      .on("mouseover", function (event, d) {
        d3.select(this)
          .select("path")
          .transition()
          .duration(200)
          .attr("d", function (d) {
            return arcOver(d as d3.PieArcDatum<{ label: string; value: number }>);
          });

        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip
          .html(`${d.data.label}: ${d.data.value}`)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      })
      .on("mousemove", function (event) {
        tooltip.style("left", event.pageX + 10 + "px").style("top", event.pageY - 28 + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .select("path")
          .transition()
          .duration(200)
          .attr("d", function (d) {
            return arcOver(d as d3.PieArcDatum<{ label: string; value: number }>);
          });

        tooltip.transition().duration(500).style("opacity", 0);
      });

    arcs
      .append("path")
      .attr("d", arc)
      .style("fill", (d) => color(d.data.label))
      .transition()
      .ease(d3.easeBounce)
      .duration(1000)
      .attrTween("d", function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t: number) => {
          const interpolatedArc = arc(i(t));
          return interpolatedArc as string;
        };
      });

    arcs
      .append("text")
      .attr("transform", (d) => `translate(${arc.centroid(d)})`)
      .attr("dy", ".35em")
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .text((d) => d.data.label)
      .style("fill", "#fff")
      .transition()
      .ease(d3.easeLinear)
      .delay(1000)
      .duration(500)
      .style("opacity", 1);

    // Clean up the tooltip on unmount
    return () => {
      tooltip.remove();
    };
  }, [data]);

  return <svg ref={ref} width="100%" height="100%" viewBox="0 0 600 400" preserveAspectRatio="xMinYMin meet"></svg>;
};
