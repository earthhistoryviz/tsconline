import React, { useContext, useState } from "react";
import { Box, Typography, TextField, useTheme } from "@mui/material";
import { InputFileUpload, TSCButton, TSCDialogLoader } from "./components";
import BugReportIcon from "@mui/icons-material/BugReport";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Link, useNavigate } from "react-router-dom";
import { context } from "./state";
import { useTranslation } from "react-i18next";
import { ErrorCodes } from "./util/error-codes";

export const ReportBug: React.FC = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[] | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [titleError, setTitleError] = useState(false);
  const [descriptionError, setDescriptionError] = useState(false);
  const { actions } = useContext(context);
  const { t } = useTranslation();
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) {
      return;
    }

    const filesArray = Array.from(uploadedFiles);

    setFiles((prevFiles) => {
      const fileMap = new Map<string, File>();
      let duplicated = false;

      prevFiles?.forEach((file) => fileMap.set(file.name, file));

      filesArray.forEach((file) => {
        if (fileMap.has(file.name)) {
          duplicated = true;
        }
        fileMap.set(file.name, file);
      });

      if (duplicated) {
        actions.pushSnackbar("Duplicate file detected. The newest uploaded versions have been kept.", "warning");
      }

      return Array.from(fileMap.values());
    });
  };
  const clearTitleError = (value: string) => {
    if (value.trim() !== "") {
      setTitleError(false);
    }
  };

  const clearDescriptionError = (value: string) => {
    if (value.trim() !== "") {
      setDescriptionError(false);
    }
  };

  const handleSubmit = async () => {
    let hasError = false;

    if (!title.trim()) {
      setTitleError(true);
      hasError = true;
    } else {
      setTitleError(false);
    }

    if (!description.trim()) {
      setDescriptionError(true);
      hasError = true;
    } else {
      setDescriptionError(false);
    }

    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      // TODO: add backend stuff. This is just a mock
      await mockSubmitBugReport();
      setIsSubmitted(true);
      const timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      setTimeout(() => {
        clearInterval(timer);
        navigate("/");
      }, 5000);
    } catch (error) {
      actions.pushError(ErrorCodes.USER_SUBMIT_BUG_REPORT_FAILED);
    } finally {
      setLoading(false);
    }
  };

  // TODO: add backend stuff. This is just a mock
  const mockSubmitBugReport = async (): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 2000));
  };

  return (
    <Box
      minHeight="70vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      bgcolor="background.main"
      mt={10}
      mb={10}>
      <Box textAlign="center" mb={isSubmitted ? 0 : 4}>
        <BugReportIcon sx={{ width: 48, height: 48 }} />
        <Typography variant="h4" component="h1" fontWeight="bold" mt={2} mb={3}>
          {t("report-bug.title")}
        </Typography>

        {!isSubmitted && (
          <Typography variant="h6" maxWidth={900} mx="auto" m={1}>
            {t("report-bug.subtitle")}
          </Typography>
        )}
      </Box>
      <TSCDialogLoader
        open={loading}
        headerText={t("report-bug.loading-header")}
        subHeaderText={t("report-bug.loading-subheader")}
      />

      {!isSubmitted ? (
        <Box
          bgcolor="background.main"
          border={1}
          sx={{
            border: `1px solid ${theme.palette.divider}`
          }}
          p={3}
          mt={2}
          width="90%"
          maxWidth="1000px">
          <Box mb={3}>
            <Typography variant="h6" mb={1}>
              {t("report-bug.name")}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              required
              placeholder={t("report-bug.name-placeholder")}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clearTitleError(e.target.value);
              }}
              error={titleError}
              helperText={titleError ? t("report-bug.helper-text") : " "}
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="h6" mb={1}>
              {t("report-bug.description")}
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              required
              placeholder={t("report-bug.description-placeholder")}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clearDescriptionError(e.target.value);
              }}
              multiline
              rows={6}
              error={descriptionError}
              helperText={descriptionError ? t("report-bug.helper-text") : " "}
              size="small"
            />
          </Box>
          {files && files?.length > 0 && (
            <Box mb={2}>
              {files.map((file, index) => (
                <Typography key={index} variant="body2" color="text.secondary">
                  {t("report-bug.attached")} {file.name}
                </Typography>
              ))}
            </Box>
          )}
          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
            <InputFileUpload
              text={t("report-bug.attach-files")}
              onChange={handleFileUpload}
              startIcon={<AttachFileIcon />}
              multiple
            />

            <TSCButton onClick={handleSubmit}>{t("report-bug.send")}</TSCButton>
          </Box>
        </Box>
      ) : (
        <Box textAlign="center">
          <Typography variant="h6" maxWidth={600} mx="auto">
            {t("report-bug.thank-you")}
          </Typography>

          <Typography variant="h6" color="text.secondary" marginTop={2}>
            {t("report-bug.redirect")}
            {countdown} {t("report-bug.second")}
            {countdown !== 1 && "s"}...
          </Typography>
          <Typography variant="body2" color="text.secondary" marginTop={2}>
            {t("report-bug.not-redirect")}{" "}
            <Link to="/" style={{ textDecoration: "underline", color: "inherit" }}>
              {t("report-bug.click-here")}
            </Link>{" "}
            {t("report-bug.return-to-homepage")}
          </Typography>
        </Box>
      )}
    </Box>
  );
};
