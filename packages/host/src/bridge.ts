import {
  runSession,
  type RunSessionOptions,
  type RunSessionResult,
} from "@cobusgreyling/harness-foundry-runtime";
import { resolveHost, type HostKind } from "./detect.js";

export type BridgeSessionOptions = Omit<RunSessionOptions, "host"> & {
  host?: "auto" | HostKind;
};

export async function bridgeHostSession(
  options: BridgeSessionOptions,
): Promise<RunSessionResult & { host: HostKind }> {
  const host = await resolveHost(options.host ?? "auto", options.projectRoot);
  const result = await runSession({ ...options, host });

  return {
    ...result,
    host,
    manifest: {
      ...result.manifest,
    },
  };
}