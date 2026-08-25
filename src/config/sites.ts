export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  probeUrl?: string;
  group?: string;
  expectedStatus?: number | number[];
  timeoutMs?: number;
}

export const MONITORED_SITES: MonitoredSite[] = [
  {
    id: 'bax-vision',
    name: 'Bax Website',
    url: 'https://bax.vision',
    probeUrl: 'https://bax.vision/robots.txt',
    group: 'Main Services',
    timeoutMs: 10000,
  },
  {
    id: 'sorai-tw',
    name: 'STUDIO SORAI',
    url: 'https://sorai.tw',
    probeUrl: 'https://sorai.tw/robots.txt',
    group: 'Main Services',
    timeoutMs: 10000,
  },
  {
    id: 'esports-sorai-tw',
    name: 'ESPORTS SORAI',
    url: 'https://esports.sorai.tw',
    probeUrl: 'https://esports.sorai.tw/robots.txt',
    group: 'Gaming & Esports',
    timeoutMs: 10000,
  },
];
