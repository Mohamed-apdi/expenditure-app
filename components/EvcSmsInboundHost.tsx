import { useSmsListener } from "~/lib/hooks/useSmsListener";

/** Mount-only: wires EVC SMS listener (Android dev/production builds). */
export function EvcSmsInboundHost() {
  useSmsListener();
  return null;
}
