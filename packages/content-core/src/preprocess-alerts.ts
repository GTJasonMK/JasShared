const ALERT_MARKER_REGEX = /^(>\s*)\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\r?\n?/gm;

export function preprocessAlerts(content: string): string {
  return content.replace(ALERT_MARKER_REGEX, "$1ALERTBOX$2ALERTBOX\n");
}
