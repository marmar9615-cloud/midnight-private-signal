import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export interface CampaignMetadata {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly network: 'preprod' | 'preview' | 'local';
  readonly proofServerUrl: string;
  readonly privacyModel: readonly string[];
  readonly tags: readonly string[];
}

export interface ContractMetadata {
  readonly contractAddress: string;
  readonly label: string;
  readonly notes: string;
  readonly tags: readonly string[];
  readonly updatedAt: string;
}

export interface CampaignStore {
  readonly getCampaign: () => CampaignMetadata;
  readonly setCampaign: (metadata: CampaignMetadata) => CampaignMetadata;
  readonly getContractMetadata: (contractAddress: string) => ContractMetadata | undefined;
  readonly setContractMetadata: (metadata: Omit<ContractMetadata, 'updatedAt'>) => ContractMetadata;
}

export const defaultCampaignMetadata: CampaignMetadata = {
  id: 'private-signal-board',
  title: 'Private Signal Board',
  description: 'A Midnight bulletin board with shielded author control and off-chain campaign metadata.',
  network: 'preprod',
  proofServerUrl: 'http://127.0.0.1:6300',
  privacyModel: [
    'The Compact contract stores only public board state and a commitment to the current author.',
    'The author secret remains in private state and is supplied through a TypeScript witness.',
    'The metadata API stores non-sensitive campaign labels outside the contract.',
  ],
  tags: ['compact', 'witnesses', 'react', 'off-chain-metadata'],
};

const maxBodyBytes = 64 * 1024;

export const createCampaignStore = (initialCampaign: CampaignMetadata = defaultCampaignMetadata): CampaignStore => {
  let campaign = initialCampaign;
  const contracts = new Map<string, ContractMetadata>();

  return {
    getCampaign: () => campaign,
    setCampaign: (metadata) => {
      campaign = validateCampaignMetadata(metadata);
      return campaign;
    },
    getContractMetadata: (contractAddress) => contracts.get(contractAddress),
    setContractMetadata: (metadata) => {
      const stored = validateContractMetadata({
        ...metadata,
        updatedAt: new Date().toISOString(),
      });
      contracts.set(stored.contractAddress, stored);
      return stored;
    },
  };
};

export const createMetadataServer = (store: CampaignStore = createCampaignStore()): Server =>
  createServer(async (request, response) => {
    setCorsHeaders(response);

    if (request.method === 'OPTIONS') {
      sendJson(response, 204, {});
      return;
    }

    try {
      const url = new URL(request.url ?? '/', 'http://metadata.local');

      if (request.method === 'GET' && url.pathname === '/health') {
        sendJson(response, 200, {
          service: 'private-signal-metadata-api',
          status: 'ok',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/campaign') {
        sendJson(response, 200, store.getCampaign());
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/campaign') {
        const payload = await readJsonBody<CampaignMetadata>(request);
        sendJson(response, 200, store.setCampaign(payload));
        return;
      }

      const metadataMatch = /^\/contracts\/([^/]+)\/metadata$/.exec(url.pathname);
      if (metadataMatch?.[1]) {
        const contractAddress = decodeURIComponent(metadataMatch[1]);

        if (request.method === 'GET') {
          const metadata = store.getContractMetadata(contractAddress);
          sendJson(response, metadata ? 200 : 404, metadata ?? { error: 'metadata not found' });
          return;
        }

        if (request.method === 'PUT') {
          const payload = await readJsonBody<Omit<ContractMetadata, 'contractAddress' | 'updatedAt'>>(request);
          sendJson(
            response,
            200,
            store.setContractMetadata({
              contractAddress,
              label: payload.label,
              notes: payload.notes,
              tags: payload.tags,
            }),
          );
          return;
        }
      }

      sendJson(response, 404, { error: 'route not found' });
    } catch (error) {
      sendJson(response, 400, { error: error instanceof Error ? error.message : String(error) });
    }
  });

const validateCampaignMetadata = (metadata: CampaignMetadata): CampaignMetadata => {
  if (!metadata.id || !metadata.title || !metadata.description) {
    throw new Error('campaign metadata requires id, title, and description');
  }
  if (!['preprod', 'preview', 'local'].includes(metadata.network)) {
    throw new Error('campaign network must be preprod, preview, or local');
  }
  new URL(metadata.proofServerUrl);
  return {
    ...metadata,
    privacyModel: [...metadata.privacyModel].slice(0, 8),
    tags: [...metadata.tags].slice(0, 12),
  };
};

const validateContractMetadata = (metadata: ContractMetadata): ContractMetadata => {
  if (!/^[A-Za-z0-9:_-]{8,128}$/.test(metadata.contractAddress)) {
    throw new Error('contract address has an unexpected format');
  }
  if (!metadata.label || metadata.label.length > 80) {
    throw new Error('contract metadata label is required and must be 80 characters or less');
  }
  if (metadata.notes.length > 800) {
    throw new Error('contract metadata notes must be 800 characters or less');
  }
  return {
    ...metadata,
    tags: [...metadata.tags].slice(0, 12),
  };
};

const readJsonBody = async <T>(request: IncomingMessage): Promise<T> => {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBodyBytes) {
      throw new Error('request body is too large');
    }
    chunks.push(buffer);
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
};

const setCorsHeaders = (response: ServerResponse): void => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Headers', 'content-type');
  response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
};

const sendJson = (response: ServerResponse, statusCode: number, body: unknown): void => {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(statusCode === 204 ? undefined : JSON.stringify(body, null, 2));
};
