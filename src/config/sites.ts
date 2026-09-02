export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  probeUrl?: string;
  fallbackUrl?: string;
  group?: string;
  expectedStatus?: number;
  timeoutMs?: number;
}

export const MONITORED_SITES: MonitoredSite[] = [
  {
    id: 'bax-vision',
    name: 'Bax Website',
    url: 'https://bax.vision',
    probeUrl: 'https://bax.vision/robots.txt',
    fallbackUrl: 'https://bax.vision/',
    group: 'Main Services',
    timeoutMs: 10000,
  },
  {
    id: 'sorai-tw',
    name: 'STUDIO SORAI',
    url: 'https://sorai.tw',
    probeUrl: 'https://sorai.tw/',
    group: 'Main Services',
    timeoutMs: 10000,
  },
  {
    id: 'esports-sorai-tw',
    name: 'ESPORTS SORAI',
    url: 'https://esports.sorai.tw',
    probeUrl: 'https://esports.sorai.tw/robots.txt',
    fallbackUrl: 'https://esports.sorai.tw/',
    group: 'Gaming & Esports',
    timeoutMs: 10000,
  },
  {
    id: 'cms-sorai-tw',
    name: 'SORAI CMS',
    url: 'https://cms.sorai.tw',
    probeUrl: 'https://cms.sorai.tw/admin',
    fallbackUrl: 'https://cms.sorai.tw/robots.txt',
    group: 'Platform',
    timeoutMs: 10000,
  },
];
