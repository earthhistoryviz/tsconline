import React from "react";
import { Box, Typography, Grid, Divider, IconButton } from "@mui/material";
import TSCreatorLogo from './assets/TSCreatorLogo.png';
import { useNavigate } from "react-router";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import "./WorkshopDetails.css"
type Workshop = {
    title: string;
    start: string;
    end: string;
    workshopId: number;
    active: boolean;
    datapacks: string[];
};

type WorkshopDetailsProps = {
    workshop: Workshop;
    onBack: () => void; // Callback for going back
};

const WorkshopDetails: React.FC<WorkshopDetailsProps> = ({ workshop, onBack }) => {
    const navigate = useNavigate();
    return (

        <Box padding={4} bgcolor="secondaryBackground.main" borderRadius={2}>
            {/* Header Section */}
            <Grid container alignItems="center" justifyContent="space-between" >
                <Box display="flex" alignItems="center" gap={2}>
                    <IconButton className="back" onClick={onBack}>
                        <ArrowBackIcon className="icon" />
                    </IconButton>

                </Box>
                <Typography className="ht">{workshop.title}</Typography>
                <Box>
                    <img
                        src={TSCreatorLogo} // Placeholder image
                        alt={`${workshop.title} image`}
                        className="di"
                    />
                </Box>
            </Grid>

            <Divider sx={{ marginBottom: 4 }} />

            {/* Details Section */}
            <Grid container spacing={4}>
                <Grid item xs={6}>
                    <Typography variant="h6">Start Date</Typography>
                    <Typography>{workshop.start}</Typography>

                    <Typography variant="h6" sx={{ marginTop: 2 }}>
                        End Date
                    </Typography>
                    <Typography>{workshop.end}</Typography>

                    <Typography variant="h6" sx={{ marginTop: 2 }}>
                        Active
                    </Typography>
                    <Typography>{workshop.active ? "Yes" : "No"}</Typography>
                </Grid>

                <Grid item xs={6}>
                    <Typography variant="h6">Data Packs</Typography>
                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                            marginTop: 1,
                        }}
                    >
                        {workshop.datapacks.length > 0 ? (
                            workshop.datapacks.map((datapack, index) => (
                                <Typography key={index}>• {datapack}</Typography>
                            ))
                        ) : (
                            <Typography>No datapacks available</Typography>
                        )}
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default WorkshopDetails;
