import { safeExtractZip, scanRepository } from './scanner.js';
import { RiskWeights, BusinessCriticality } from './types.js';

interface RepoScanOptions {
  branch?: string;
  weights?: RiskWeights;
  defaultBusinessCriticality?: BusinessCriticality;
  defaultDataLifetime?: number;
  defaultMigrationTime?: number;
  threatHorizon?: number;
  confidenceThreshold?: number;
}

// Prohibit SSRF: Only allow known public git hosting providers via HTTPS
const ALLOWED_HOSTS = new Set([
  'github.com',
  'www.github.com',
  'gitlab.com',
  'www.gitlab.com',
  'bitbucket.org',
  'www.bitbucket.org',
]);

const FORBIDDEN_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^localhost$/i,
  /^::1$/,
];

export function validateRepoUrl(rawUrl: string): {
  valid: boolean;
  provider: 'github' | 'gitlab' | 'bitbucket' | null;
  owner: string;
  repo: string;
  normalizedUrl: string;
  error?: string;
} {
  try {
    const parsed = new URL(rawUrl.trim());

    if (parsed.protocol !== 'https:') {
      return { valid: false, provider: null, owner: '', repo: '', normalizedUrl: '', error: 'Only HTTPS URLs are permitted.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    for (const pattern of FORBIDDEN_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { valid: false, provider: null, owner: '', repo: '', normalizedUrl: '', error: 'SSRF Violation: Forbidden private or local host address.' };
      }
    }

    if (!ALLOWED_HOSTS.has(hostname)) {
      return {
        valid: false,
        provider: null,
        owner: '',
        repo: '',
        normalizedUrl: '',
        error: 'Only public repositories from GitHub, GitLab, or Bitbucket are permitted.',
      };
    }

    const segments = parsed.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/, '').split('/');
    if (segments.length < 2) {
      return {
        valid: false,
        provider: null,
        owner: '',
        repo: '',
        normalizedUrl: '',
        error: 'URL must include both organization/owner and repository name (e.g., https://github.com/owner/repo).',
      };
    }

    const owner = segments[0];
    const repo = segments[1];

    if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(repo)) {
      return {
        valid: false,
        provider: null,
        owner: '',
        repo: '',
        normalizedUrl: '',
        error: 'Owner and repository name contain invalid characters.',
      };
    }

    let provider: 'github' | 'gitlab' | 'bitbucket' = 'github';
    if (hostname.includes('gitlab')) provider = 'gitlab';
    else if (hostname.includes('bitbucket')) provider = 'bitbucket';

    return {
      valid: true,
      provider,
      owner,
      repo,
      normalizedUrl: `https://${hostname}/${owner}/${repo}`,
    };
  } catch (err) {
    return { valid: false, provider: null, owner: '', repo: '', normalizedUrl: '', error: 'Malformed URL provided.' };
  }
}

export async function fetchAndScanRemoteRepo(
  repoUrl: string,
  options: RepoScanOptions = {}
) {
  const validation = validateRepoUrl(repoUrl);
  if (!validation.valid || !validation.provider) {
    throw new Error(validation.error || 'Invalid repository URL');
  }

  const { provider, owner, repo } = validation;
  const branchCandidates = options.branch ? [options.branch] : ['main', 'master', 'trunk'];

  let zipBuffer: Buffer | null = null;
  let lastError: Error | null = null;

  for (const branch of branchCandidates) {
    let downloadUrl = '';
    if (provider === 'github') {
      downloadUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;
    } else if (provider === 'gitlab') {
      downloadUrl = `https://gitlab.com/${owner}/${repo}/-/archive/${branch}/${repo}-${branch}.zip`;
    } else if (provider === 'bitbucket') {
      downloadUrl = `https://bitbucket.org/${owner}/${repo}/get/${branch}.zip`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

      const response = await fetch(downloadUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'QuantumCryptographicRiskScanner/2.0',
          Accept: 'application/zip, application/octet-stream',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          continue; // Try next branch
        }
        throw new Error(`Repository download failed with status ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 35 * 1024 * 1024) {
        throw new Error('Repository archive exceeds maximum permitted scan size (35MB limit).');
      }

      const arrayBuf = await response.arrayBuffer();
      zipBuffer = Buffer.from(arrayBuf);
      break;
    } catch (err: any) {
      lastError = err;
    }
  }

  if (!zipBuffer) {
    throw new Error(
      lastError?.message ||
        `Could not retrieve repository archive for ${owner}/${repo}. Verify the repository is public and branches [${branchCandidates.join(', ')}] exist.`
    );
  }

  const extracted = safeExtractZip(zipBuffer, 35 * 1024 * 1024);
  if (extracted.length === 0) {
    throw new Error('No scannable code files found in the repository archive.');
  }

  const scanResult = scanRepository(extracted, options);

  return {
    repoName: `${owner}/${repo}`,
    repoUrl: validation.normalizedUrl,
    fileCount: extracted.length,
    totalSizeBytes: zipBuffer.length,
    ...scanResult,
    files: extracted,
  };
}
