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
  generateEvolveProposal,
  generateEvolveReport,
} from "@cobusgreyling/harness-foundry-evolve";
import { runSession } from "@cobusgreyling/harness-foundry-runtime";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";
import { initProject } from "./init-project.js";

const program = new Command();

program
  .name("foundry")
  .description("Composable harness runtime for production agents")
  .version("0.2.0");

program
  .command("init")
  .description("Initialize .foundry harness scaffold in the current project")
  .option("--name <name>", "Harness stack name (default: directory name)")
  .option("--from <preset>", "Stack preset: minimal | implementer", "minimal")
  .action(async (options: { name?: string; from: string }) => {
    const preset = options.from === "implementer" ? "implementer" : "minimal";
    const cwd = process.cwd();
    const result = await initProject(cwd, { name: options.name, from: preset });
    console.log(chalk.green(`Harness "${result.stackName}" initialized (${result.preset})`));
    for (const file of result.filesWritten) {
      console.log(chalk.dim(`  ${file}`));
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
  .option("--turns <n>", "Number of turns", "1")
  .option("--dry-run", "Record session lifecycle without activating primitives")
  .action(async (options: { goal?: string; turns: string; dryRun?: boolean }) => {
    const cwd = process.cwd();
    try {
      const result = await runSession({
        projectRoot: cwd,
        goal: options.goal,
        turns: Number.parseInt(options.turns, 10),
        dryRun: options.dryRun,
      });
      console.log(chalk.green("Session complete"));
      console.log(chalk.dim(`  ID: ${result.manifest.id}`));
      console.log(chalk.dim(`  Status: ${result.manifest.status}`));
      console.log(chalk.dim(`  Turns: ${result.manifest.turnCount}`));
      console.log(chalk.dim(`  Trace: ${result.manifest.tracePath}`));
      console.log(chalk.dim("\nNext: foundry trace show --session " + result.manifest.id));
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
      const { report, proposalPath } = await generateEvolveProposal({
        projectRoot: cwd,
        sessionId: options.session,
        tracePath: traceFile,
        stack,
      });
      console.log(chalk.green(`L2 proposal written (report ${report.id})`));
      console.log(chalk.dim(`  ${proposalPath}`));
      console.log(chalk.yellow("Human gate: review before applying to stack.yaml"));
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});