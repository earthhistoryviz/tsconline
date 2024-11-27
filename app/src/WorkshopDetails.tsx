import React from "react";
import { Box, Typography, Grid, Divider, IconButton } from "@mui/material";
import TSCreatorLogo from "./assets/TSCreatorLogo.png";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "./WorkshopDetails.css";
import { TSCButton } from "./components";

// TODO: change this when backend is finished
type Workshop = {
  title: string;
  start: string;
  end: string;
  workshopId: number;
  active: boolean;
  datapacks: string[];
  description: string;
  files: string[];
  downloadLink: string;
};

type WorkshopDetailsProps = {
  workshop: Workshop;
  onBack: () => void; // Callback for going back
};

const WorkshopDetails: React.FC<WorkshopDetailsProps> = ({ workshop, onBack }) => {
  return (
    <Box padding={4} borderRadius={2}>
      {/* Header Section */}
      <Grid container alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
        </Box>
        <Typography variant="h5" fontWeight={"bold"}>
          {workshop.title}
        </Typography>
        <Box>
          <img
            src={TSCreatorLogo}
            alt={`${workshop.title} image`}
            style={{ width: 100, height: 100, objectFit: "cover" }}
          />
        </Box>
      </Grid>

      <Divider sx={{ marginY: 4 }} />

      <Box
        sx={{
          backgroundColor: "secondaryBackground.main",
          padding: 4,
          borderRadius: 2,
          margin: "0 auto",
          boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)"
        }}>
        <Grid container spacing={4}>
          <Grid item xs={3}>
            {/* Dates */}
            <Typography variant="h6" fontWeight={"bold"}>
              Start Date
            </Typography>
            <Typography>{workshop.start}</Typography>

            <Typography variant="h6" fontWeight={"bold"}>
              End Date
            </Typography>
            <Typography>{workshop.end}</Typography>

            <Divider sx={{ marginY: 1 }} />

            {/* Data Packs */}
            <Typography variant="h6" fontWeight={"bold"}>
              Data Packs
            </Typography>
            <Box>
              {workshop.datapacks.length > 0 ? (
                workshop.datapacks.map((datapack, index) => <Typography key={index}>• {datapack}</Typography>)
              ) : (
                <Typography>No datapacks available</Typography>
              )}
            </Box>

            <Divider sx={{ marginY: 1 }} />

            {/* Files */}
            <Typography variant="h6" fontWeight={"bold"}>
              Files
            </Typography>
            <Box>
              {workshop.files.length > 0 ? (
                <>
                  {workshop.files.map((file, index) => (
                    <Typography key={index}>• {file}</Typography>
                  ))}
                  <TSCButton variant="contained" color="primary" sx={{ marginTop: 2 }} href={workshop.downloadLink}>
                    Download Files
                  </TSCButton>
                </>
              ) : (
                <Typography>No files available</Typography>
              )}
            </Box>
          </Grid>

          <Grid item xs={8}>
            <Typography variant="h6" fontWeight={"bold"}>
              Description
            </Typography>
            <Typography sx={{ marginTop: 1 }}>{workshop.description}</Typography>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default WorkshopDetails;
