import React, { useContext, useState } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { InputFileUpload, TSCButton } from './components';
import BugReportIcon from '@mui/icons-material/BugReport';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { Link, useNavigate } from 'react-router-dom';
import { context } from './state';

export const ReportBug: React.FC = () => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<File[] | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const [titleError, setTitleError] = useState(false);
    const [descriptionError, setDescriptionError] = useState(false);
    const { actions } = useContext(context);


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
        if (value.trim() !== '') {
            setTitleError(false);
        }
    };

    const clearDescriptionError = (value: string) => {
        if (value.trim() !== '') {
            setDescriptionError(false);
        }
    };


    const handleSubmit = () => {
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
        setIsSubmitted(true);

        const timer = setInterval(() => {
            setCountdown(prev => prev - 1);
        }, 1000);

        setTimeout(() => {
            clearInterval(timer);
            navigate('/');
        }, 5000);
    };

    return (
        <Box minHeight="80vh" display="flex" flexDirection="column" alignItems="center" justifyContent="center" bgcolor="background.main">
            <Box textAlign="center" mb={4}>
                <BugReportIcon sx={{ width: 48, height: 48 }} />
                <Typography variant="h4" component="h1" fontWeight="bold" mt={2} mb={3}>
                    Report a Bug
                </Typography>

                {!isSubmitted && (
                    <Typography variant="h6" maxWidth={900} mx="auto">
                        Thank you for helping us improve our product! Please provide the details below to help us
                        better understand the issue and resolve it as quickly as possible.
                    </Typography>
                )}
            </Box>

            {!isSubmitted ? (
                <Box bgcolor="background.main" border={1} p={3} width="100%" maxWidth="1000px" mt={2}>
                    <Box mb={3}>
                        <Typography variant="h6" mb={1}>
                            Name/ID
                        </Typography>
                        <TextField
                            fullWidth
                            variant="outlined"
                            required
                            placeholder="Bug Title"
                            value={title}
                            onChange={(e) => {
                                setTitle(e.target.value);
                                clearTitleError(e.target.value);
                            }}
                            error={titleError}
                            helperText={titleError ? "This field is required." : " "}
                            size="small"
                        />
                    </Box>

                    <Box>
                        <Typography variant="h6" mb={1}>
                            Please briefly describe the bug or issue you encountered.
                        </Typography>
                        <TextField
                            fullWidth
                            variant="outlined"
                            required
                            placeholder="Bug Description"
                            value={description}
                            onChange={(e) => {
                                setDescription(e.target.value);
                                clearDescriptionError(e.target.value);
                            }}
                            multiline
                            rows={6}
                            sx={{
                                '& .MuiInputBase-root textarea': {
                                    resize: 'both',
                                },
                            }}
                            error={descriptionError}
                            helperText={descriptionError ? "This field is required." : " "}
                            size="small"
                        />
                    </Box>
                    {files && files?.length > 0 && (
                        <Box mb={2}>
                            {files.map((file, index) => (
                                <Typography key={index} variant="body2" color="text.secondary">
                                    Attached: {file.name}
                                </Typography>
                            ))}
                        </Box>
                    )}
                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={2}>
                        <InputFileUpload
                            text="Attach Files"
                            onChange={handleFileUpload}
                            startIcon={<AttachFileIcon />}
                            multiple
                        />

                        <TSCButton onClick={handleSubmit}>
                            Send
                        </TSCButton>
                    </Box>
                </Box>
            ) : (
                <Box textAlign="center" mt={4}>
                    <Typography variant="h6" maxWidth={600} mx="auto">
                        Thank you for your feedback! We appreciate your help
                        <br />
                        in improving our product.
                    </Typography>

                    <Typography variant="h6" color="text.secondary" marginTop={2}>
                        You will be redirected to the homepage in {countdown} second{countdown !== 1 && 's'}...
                    </Typography>
                    <Typography variant="body2" color="text.secondary" marginTop={2}>
                        If you are not redirected,{' '}
                        <Link to="/" style={{ textDecoration: 'underline', color: 'inherit' }}>
                            click here
                        </Link>
                        {' '}to return to the homepage.
                    </Typography>

                </Box>
            )}
        </Box>

    );
};
