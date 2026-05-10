import React, { useEffect, useState } from 'react';
import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';

interface CampaignMetadata {
  readonly title: string;
  readonly description: string;
  readonly network: string;
  readonly proofServerUrl: string;
  readonly privacyModel: readonly string[];
  readonly tags: readonly string[];
}

interface HealthStatus {
  readonly service: string;
  readonly status: string;
}

const getMetadataApiUrl = (): string => {
  const candidate = (import.meta.env as Record<string, unknown>).VITE_METADATA_API_URL;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : 'http://127.0.0.1:8088';
};

const metadataApiUrl = getMetadataApiUrl();

export const MetadataPanel: React.FC = () => {
  const [campaign, setCampaign] = useState<CampaignMetadata>();
  const [health, setHealth] = useState<HealthStatus>();
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    const abortController = new AbortController();

    Promise.all([
      fetch(`${metadataApiUrl}/campaign`, { signal: abortController.signal }).then((response) => response.json()),
      fetch(`${metadataApiUrl}/health`, { signal: abortController.signal }).then((response) => response.json()),
    ])
      .then(([campaignBody, healthBody]) => {
        setCampaign(campaignBody as CampaignMetadata);
        setHealth(healthBody as HealthStatus);
      })
      .catch((error: unknown) => {
        if (!abortController.signal.aborted) {
          setErrorMessage(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <Box
      data-testid="metadata-panel"
      sx={{
        border: '1px solid rgba(168, 168, 168, 0.35)',
        borderRadius: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(8px)',
        color: 'white',
        maxWidth: 430,
        minWidth: 320,
        p: 3,
      }}
    >
      <Stack gap={2}>
        <Box>
          <Typography component="h1" fontSize={24} fontWeight={700}>
            {campaign?.title ?? 'Private Signal Board'}
          </Typography>
          <Typography color="primary" fontSize={14} mt={1}>
            {campaign?.description ?? 'Loading campaign metadata...'}
          </Typography>
        </Box>

        {errorMessage && (
          <Alert severity="warning" variant="outlined">
            Metadata API unavailable: {errorMessage}
          </Alert>
        )}

        <Stack direction="row" flexWrap="wrap" gap={1}>
          <Chip
            label={campaign?.network ?? 'preprod'}
            size="small"
            variant="outlined"
            sx={{ borderColor: 'rgba(255, 255, 255, 0.45)', color: 'white' }}
          />
          <Chip
            label={health?.status ?? 'checking'}
            size="small"
            variant="outlined"
            sx={{ borderColor: 'rgba(255, 255, 255, 0.45)', color: 'white' }}
          />
        </Stack>

        <Divider sx={{ borderColor: 'rgba(168, 168, 168, 0.25)' }} />

        <Box>
          <Typography color="primary" fontSize={12} fontWeight={700} textTransform="uppercase">
            Proof server
          </Typography>
          <Typography fontSize={14}>{campaign?.proofServerUrl ?? 'http://127.0.0.1:6300'}</Typography>
        </Box>

        <Box>
          <Typography color="primary" fontSize={12} fontWeight={700} textTransform="uppercase">
            Privacy model
          </Typography>
          <Stack component="ul" gap={0.75} sx={{ m: 0, pl: 2.25 }}>
            {(campaign?.privacyModel ?? []).map((item) => (
              <Typography component="li" fontSize={13} key={item}>
                {item}
              </Typography>
            ))}
          </Stack>
        </Box>

        <Stack direction="row" flexWrap="wrap" gap={1}>
          {(campaign?.tags ?? []).map((tag) => (
            <Chip label={tag} size="small" key={tag} />
          ))}
        </Stack>
      </Stack>
    </Box>
  );
};
