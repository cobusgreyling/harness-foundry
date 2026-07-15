import type { HostKind } from "./detect.js";

export type HostSetupResult = {
  host: HostKind;
  filesWritten: string[];
};