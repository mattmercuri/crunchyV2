import { parse } from 'tldts';

export function getDomain(url: string) {
  return parse(url).domain?.toLowerCase();
}
