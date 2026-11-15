// Links to the manufacturer's original help documents. simpleplant.de is
// gone, so they point at the Internet Archive's copies. The documents exist
// in German only.
import { Series } from './protocol';

const ARCHIVE = 'https://web.archive.org/web';
const FILES = 'https://cdn.shopify.com/s/files/1/0644/7038/4874/files';

const archived = (timestamp: string, url: string) => `${ARCHIVE}/${timestamp}/${url}`;

export type HelpTopic = 'manual' | 'setup' | 'care' | 'faq';

export const HELP_TOPICS: HelpTopic[] = ['manual', 'setup', 'care', 'faq'];

const FAQ = archived('20231201092405', 'https://simpleplant.de/pages/faq');

const LINKS: Record<Series, Record<HelpTopic, string>> = {
  standard: {
    manual: archived('20240706005052', `${FILES}/Manual_smartGarten__X__DE_A5.pdf?v=1681138372`),
    setup: archived('20261115154355', `${FILES}/Aufbau.pdf?v=1681491353`),
    care: archived('20240706011400', `${FILES}/Pflege.pdf?v=1681140136`),
    faq: FAQ,
  },
  S: {
    manual: archived('20240705141344', `${FILES}/Manual_smartGarten_S_DE_A5.pdf?v=1682062130`),
    setup: archived('20240705135505', `${FILES}/AufbauS.pdf?v=1681491354`),
    care: archived('20240706000535', `${FILES}/PflegeS.pdf?v=1681140136`),
    faq: FAQ,
  },
  E: {
    manual: archived('20240706061040', `${FILES}/Manual_smartGarten_E_DE_A5.pdf?v=1682062130`),
    setup: archived('20240706012919', `${FILES}/AufbauE.pdf?v=1681491340`),
    care: archived('20240705233325', `${FILES}/PflegeE.pdf?v=1681491341`),
    faq: FAQ,
  },
};

export function helpLink(series: Series, topic: HelpTopic): string {
  return LINKS[series][topic];
}
