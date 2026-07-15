#!/usr/bin/env node
import chalk from "chalk";
import { Command } from "commander";
import {
  loadStackFromFile,
  resolveStack,
  validateStack,
} from "@cobusgreyling/harness-foundry-compose";
import { stackPath } from "@cobusgreyling/harness-foundry-core";
import { generateEvolveReport } from "@cobusgreyling/harness-foundry-evolve";
import { runSession } from "@cobusgreyling/harness-foundry-runtime";
import { readTraceEvents } from "@cobusgreyling/harness-foundry-trace";
import { initProject } from "./init-project.js";

const program = new Command();

program
  .name("foundry")
  .description("Composable harness runtime for production agents")
  .version("0.1.0");

program
  .command("init")
  .description("Initialize .foundry harness scaffold in the current project")
  .option("--name <name>", "Harness stack name (default: directory name)")
  .action(async (options: { name?: string }) => {
    const cwd = process.cwd();
    const result = await initProject(cwd, { name: options.name });
    console.log(chalk.green(`Harness "${result.stackName}" initialized`));
    for (const file of result.filesWritten) {
      console.log(chalk.dim(`  ${file}`));
    }
    console.log(chalk.dim("\nNext: foundry stack show && foundry run"));
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
      const validation = validateStack(loaded);

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

      if (validation.warnings.length > 0) {
        console.log(chalk.yellow("Warnings:"));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  • ${warning}`));
        }
      }
    } catch {
      console.error(chalk.red("No active stack. Run: foundry init"));
      process.exitCode = 1;
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
    const traceFile = `${cwd}/.foundry/sessions/${options.session}/trace.jsonl`;
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
    const traceFile = `${cwd}/.foundry/sessions/${options.session}/trace.jsonl`;
    try {
      const report = await generateEvolveReport({
        projectRoot: cwd,
        sessionId: options.session,
        tracePath: traceFile,
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

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});