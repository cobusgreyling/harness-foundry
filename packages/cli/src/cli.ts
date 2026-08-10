#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import chalk from "chalk";
import { Command } from "commander";
import {
  loadMergedCatalog,
  loadStackFromFile,
  resolveStack,
  validateStack,
} from "@cobusgreyling/harness-foundry-compose";
import {
  SessionManifestSchema,
  sessionsDir,
  stackPath,
} from "@cobusgreyling/harness-foundry-core";
import {
  applyEvolveProposal,
  generateEvolveProposal,
  generateEvolveReport,
} from "@cobusgreyling/harness-foundry-evolve";
import {
  bridgeHostSession,
  detectHost,
  resolveHost,
  setupClaudeCode,
  setupCursor,
} from "@cobusgreyling/harness-foundry-host";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";
import { initProject } from "./init-project.js";

const program = new Command();

program
  .name("foundry")
  .description("Composable harness runtime for production agents")
  .version("0.5.0");

program
  .command("init")
  .description("Initialize .foundry harness scaffold in the current project")
  .option("--name <name>", "Harness stack name (default: directory name)")
  .option(
    "--from <preset>",
    "Stack preset or loop-engineering pattern (minimal | implementer | reviewer | triage | daily-triage | …)",
    "minimal",
  )
  .option("--dry-run", "Preview files that would be written without creating them")
  .option("--with-cursor", "Install Cursor rules and post-run hook")
  .option("--with-claude-code", "Install Claude Code helpers and post-run hook")
  .action(async (options: {
    name?: string;
    from: string;
    dryRun?: boolean;
    withCursor?: boolean;
    withClaudeCode?: boolean;
  }) => {
    const cwd = process.cwd();
    if (options.dryRun) {
      const result = await initProject(cwd, {
        name: options.name,
        from: options.from,
        withCursor: options.withCursor,
        withClaudeCode: options.withClaudeCode,
        dryRun: true,
      });
      console.log(chalk.yellow(`Dry-run: would initialize "${result.stackName}" (${result.preset})`));
      for (const file of result.filesWritten) {
        console.log(chalk.dim(`  ${file}`));
      }
      return;
    }
    const result = await initProject(cwd, {
      name: options.name,
      from: options.from,
      withCursor: options.withCursor,
      withClaudeCode: options.withClaudeCode,
    });
    console.log(chalk.green(`Harness "${result.stackName}" initialized (${result.preset})`));
    for (const file of result.filesWritten) {
      console.log(chalk.dim(`  ${file}`));
    }
    if (result.integrations.length > 0) {
      console.log(chalk.cyan(`Integrations: ${result.integrations.join(", ")}`));
    }
    console.log(chalk.dim("\nNext: foundry validate && foundry run"));
  });

program
  .command("validate")
  .description("Validate active stack against primitive catalogue")
  .action(async () => {
    const cwd = process.cwd();
    try {
      const stack = await loadStackFromFile(stackPath(cwd));
      const catalog = await loadMergedCatalog(cwd);
      const result = validateStack(stack, catalog);
      if (result.valid) {
        console.log(chalk.green("Stack is valid."));
      } else {
        console.error(chalk.red("Stack validation failed:"));
        for (const err of result.errors) console.error(chalk.red(`  • ${err}`));
        process.exitCode = 1;
      }
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

const stack = program.command("stack").description("Inspect harness stack");

stack
  .command("show")
  .description("Show active harness stack")
  .action(async () => {
    const cwd = process.cwd();
    try {
      const loaded = await loadStackFromFile(stackPath(cwd));
      const resolved = resolveStack(loaded);
      const validation = validateStack(loaded, await loadMergedCatalog(cwd));

      console.log(chalk.bold(`${loaded.name} v${loaded.version}`));
      if (loaded.description) console.log(chalk.dim(loaded.description));
      console.log();

      for (const [layer, refs] of Object.entries(resolved.byLayer)) {
        console.log(chalk.cyan(layer));
        for (const ref of refs) {
          console.log(`  - ${ref.primitive}`);
        }
        console.log();
      }

      for (const warning of validation.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
      }
    } catch {
      console.error(chalk.red("No active stack. Run: foundry init"));
      process.exitCode = 1;
    }
  });

const primitives = program.command("primitives").description("Primitive catalogue");

primitives
  .command("list")
  .description("List available primitives")
  .action(async () => {
    const cwd = process.cwd();
    const catalog = await loadMergedCatalog(cwd);
    const entries = [...catalog.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (const entry of entries) {
      console.log(`${chalk.cyan(entry.layer.padEnd(12))} ${chalk.bold(entry.id)}`);
      console.log(chalk.dim(`  ${entry.description}`));
    }
    console.log(chalk.dim(`\n${entries.length} primitive(s)`));
  });

primitives
  .command("show")
  .description("Show a single primitive definition")
  .argument("<id>", "Primitive id (e.g. control/tool-call-cap)")
  .action(async (id: string) => {
    const cwd = process.cwd();
    const catalog = await loadMergedCatalog(cwd);
    const entry = catalog.get(id);
    if (!entry) {
      console.error(chalk.red(`Unknown primitive: ${id}`));
      process.exitCode = 1;
      return;
    }
    console.log(chalk.bold(entry.id));
    console.log(chalk.cyan(`layer: ${entry.layer}`));
    console.log(entry.description);
    if (entry.defaults && Object.keys(entry.defaults).length > 0) {
      console.log(chalk.dim("defaults:"));
      console.log(JSON.stringify(entry.defaults, null, 2));
    }
  });

const sessions = program.command("sessions").description("Session history");

sessions
  .command("list")
  .description("List harness sessions")
  .action(async () => {
    const cwd = process.cwd();
    const dir = sessionsDir(cwd);
    let entries: string[];
    try {
      entries = await fs.readdir(dir);
    } catch {
      console.log(chalk.dim("No sessions yet. Run: foundry run"));
      return;
    }

    for (const id of entries.sort().reverse()) {
      const manifestPath = path.join(dir, id, "manifest.json");
      try {
        const raw = await fs.readFile(manifestPath, "utf8");
        const manifest = SessionManifestSchema.parse(JSON.parse(raw));
        console.log(
          `${chalk.bold(id)} ${chalk.dim(manifest.startedAt)} ${manifest.status} turns=${manifest.turnCount}`,
        );
      } catch {
        console.log(chalk.dim(id));
      }
    }
  });

program
  .command("run")
  .description("Run a harness session against the active stack")
  .option("--goal <goal>", "Session goal")
  .option("--turns <n>", "Max model↔tool turns (default 8)", "8")
  .option("--host <host>", "Host adapter: auto | cursor | claude-code | standalone", "auto")
  .option("--dry-run", "Record session lifecycle without activating primitives")
  .action(async (options: { goal?: string; turns: string; host: string; dryRun?: boolean }) => {
    const cwd = process.cwd();
    const host = await resolveHost(
      options.host as "auto" | "cursor" | "claude-code" | "standalone",
      cwd,
    );
    try {
      const result = await bridgeHostSession({
        projectRoot: cwd,
        goal: options.goal,
        turns: Number.parseInt(options.turns, 10),
        dryRun: options.dryRun,
        host,
      });
      console.log(chalk.green("Session complete"));
      console.log(chalk.dim(`  ID: ${result.manifest.id}`));
      console.log(chalk.dim(`  Host: ${result.host}`));
      console.log(chalk.dim(`  Status: ${result.manifest.status}`));
      console.log(chalk.dim(`  Turns: ${result.manifest.turnCount}`));
      console.log(chalk.dim(`  Trace: ${result.manifest.tracePath}`));
      console.log(chalk.dim("\nNext: foundry trace show --session " + result.manifest.id));
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

const host = program.command("host").description("Host adapters (Cursor, Claude Code)");

host
  .command("detect")
  .description("Detect active host environment")
  .action(async () => {
    const cwd = process.cwd();
    const detection = await detectHost(cwd);
    console.log(chalk.green(`Host: ${detection.host}`));
    for (const signal of detection.signals) {
      console.log(chalk.dim(`  • ${signal}`));
    }
  });

host
  .command("integrate")
  .description("Install host integration files")
  .argument("<target>", "cursor | claude-code")
  .action(async (target: string) => {
    const cwd = process.cwd();
    try {
      if (target === "cursor") {
        const result = await setupCursor(cwd);
        console.log(chalk.green("Cursor integration installed"));
        for (const file of result.filesWritten) console.log(chalk.dim(`  ${file}`));
        return;
      }
      if (target === "claude-code") {
        const result = await setupClaudeCode(cwd);
        console.log(chalk.green("Claude Code integration installed"));
        for (const file of result.filesWritten) console.log(chalk.dim(`  ${file}`));
        return;
      }
      console.error(chalk.red(`Unknown host: ${target}. Use cursor or claude-code.`));
      process.exitCode = 1;
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

const trace = program.command("trace").description("Inspect session traces");

trace
  .command("show")
  .description("Show trace events for a session")
  .requiredOption("--session <id>", "Session ID")
  .action(async (options: { session: string }) => {
    const cwd = process.cwd();
    const traceFile = path.join(cwd, ".foundry", "sessions", options.session, "trace.jsonl");
    const events = await readTraceEvents(traceFile);

    if (events.length === 0) {
      console.error(chalk.red(`No trace found for session ${options.session}`));
      process.exitCode = 1;
      return;
    }

    for (const event of events) {
      const label = event.primitive ? `${event.type} (${event.primitive})` : event.type;
      console.log(`${chalk.dim(event.timestamp)} ${chalk.bold(label)}`);
      if (event.detail) console.log(chalk.dim(`  ${event.detail}`));
    }
  });

const evolve = program.command("evolve").description("Trace-driven harness evolution");

evolve
  .command("report")
  .description("Generate L1 evolution report from a session trace")
  .requiredOption("--session <id>", "Session ID")
  .action(async (options: { session: string }) => {
    const cwd = process.cwd();
    const traceFile = path.join(cwd, ".foundry", "sessions", options.session, "trace.jsonl");
    try {
      const stack = await loadStackFromFile(stackPath(cwd));
      const report = await generateEvolveReport({
        projectRoot: cwd,
        sessionId: options.session,
        tracePath: traceFile,
        stack,
      });
      console.log(chalk.green(`Evolution report ${report.id} (L1 report-only)`));
      for (const finding of report.findings) {
        const color =
          finding.severity === "critical"
            ? chalk.red
            : finding.severity === "warn"
              ? chalk.yellow
              : chalk.blue;
        console.log(color(`  [${finding.severity}] ${finding.message}`));
        if (finding.suggestion) console.log(chalk.dim(`    → ${finding.suggestion}`));
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

evolve
  .command("proposal")
  .description("Generate L2 stack proposal from a session trace (human review required)")
  .requiredOption("--session <id>", "Session ID")
  .action(async (options: { session: string }) => {
    const cwd = process.cwd();
    const traceFile = path.join(cwd, ".foundry", "sessions", options.session, "trace.jsonl");
    try {
      const stack = await loadStackFromFile(stackPath(cwd));
      const { report, proposalPath, proposalId } = await generateEvolveProposal({
        projectRoot: cwd,
        sessionId: options.session,
        tracePath: traceFile,
        stack,
      });
      console.log(chalk.green(`L2 proposal written (report ${report.id})`));
      console.log(chalk.dim(`  id: ${proposalId}`));
      console.log(chalk.dim(`  ${proposalPath}`));
      console.log(
        chalk.yellow("Human gate: review, then foundry evolve apply --proposal <id> --yes"),
      );
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

evolve
  .command("apply")
  .description("Apply an L2 proposal to stack.yaml (requires --yes human gate)")
  .requiredOption("--proposal <idOrPath>", "Proposal UUID or path to .yaml")
  .option("--yes", "Confirm human review complete (required)")
  .action(async (options: { proposal: string; yes?: boolean }) => {
    const cwd = process.cwd();
    try {
      const result = await applyEvolveProposal({
        projectRoot: cwd,
        proposal: options.proposal,
        yes: Boolean(options.yes),
      });
      console.log(chalk.green(`Applied proposal ${result.proposalId}`));
      console.log(chalk.dim(`  stack: ${result.stackPath}`));
      console.log(chalk.dim(`  audit: ${result.auditPath}`));
      if (result.added.length) {
        console.log(chalk.cyan("  added:"));
        for (const a of result.added) console.log(chalk.cyan(`    + ${a.primitive}`));
      }
      if (result.skipped.length) {
        console.log(chalk.dim("  skipped (already present):"));
        for (const s of result.skipped) console.log(chalk.dim(`    · ${s.primitive}`));
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
