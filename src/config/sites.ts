export interface MonitoredSite {
  id: string;
  name: string;
  url: string;
  group?: string;
  expectedStatus?: number;
  timeoutMs?: number;
}

export const MONITORED_SITES: MonitoredSite[] = [
  {
    id: 'bax-vision',
    name: 'Bax Website',
    url: 'https://bax.vision',
    group: 'Main Services',
    expectedStatus: 200,
    timeoutMs: 10000,
  },
  {
    id: 'sorai-tw',
    name: 'STUDIO SORAI',
    url: 'https://sorai.tw',
    group: 'Main Services',
    expectedStatus: 200,
    timeoutMs: 10000,
  },
  {
    id: 'esports-sorai-tw',
    name: 'ESPORTS SORAI',
    url: 'https://esports.sorai.tw',
    group: 'Gaming & Esports',
    expectedStatus: 200,
    timeoutMs: 10000,
  },
];
