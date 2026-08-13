const COMMANDS = [
  "init",
  "validate",
  "stack",
  "primitives",
  "sessions",
  "run",
  "host",
  "trace",
  "evolve",
  "completion",
];

const PRESETS = [
  "minimal",
  "implementer",
  "reviewer",
  "triage",
  "ci-sweeper",
  "mcp-worker",
  "with-outerloop",
];

export function renderCompletionScript(shell: "bash" | "zsh" | "fish"): string {
  if (shell === "fish") {
    return [
      "complete -c foundry -f",
      ...COMMANDS.map((c) => `complete -c foundry -n "__fish_use_subcommand" -a ${c}`),
      `complete -c foundry -n "__fish_seen_subcommand_from init" -l from -a "${PRESETS.join(" ")}"`,
      "complete -c foundry -n \"__fish_seen_subcommand_from run\" -l host -a \"auto standalone cursor claude-code\"",
      "complete -c foundry -n \"__fish_seen_subcommand_from host\" -a \"detect integrate\"",
      "complete -c foundry -n \"__fish_seen_subcommand_from evolve\" -a \"report proposal apply\"",
      "complete -c foundry -n \"__fish_seen_subcommand_from trace\" -a \"show replay\"",
      "",
    ].join("\n");
  }

  const bashFn = `_foundry_completions() {
  local cur="\${COMP_WORDS[COMP_CWORD]}"
  local cmd="\${COMP_WORDS[1]}"
  local opts="${COMMANDS.join(" ")}"
  if [[ \${COMP_CWORD} -eq 1 ]]; then
    COMPREPLY=( $(compgen -W "$opts" -- "$cur") )
    return
  fi
  case "$cmd" in
    init) COMPREPLY=( $(compgen -W "--from --name --dry-run --with-cursor --with-claude-code ${PRESETS.join(" ")}" -- "$cur") ) ;;
    run) COMPREPLY=( $(compgen -W "--goal --turns --host --dry-run --project-root auto standalone cursor claude-code" -- "$cur") ) ;;
    host) COMPREPLY=( $(compgen -W "detect integrate cursor claude-code" -- "$cur") ) ;;
    stack) COMPREPLY=( $(compgen -W "show" -- "$cur") ) ;;
    primitives) COMPREPLY=( $(compgen -W "list show" -- "$cur") ) ;;
    sessions) COMPREPLY=( $(compgen -W "list" -- "$cur") ) ;;
    trace) COMPREPLY=( $(compgen -W "show replay --session" -- "$cur") ) ;;
    evolve) COMPREPLY=( $(compgen -W "report proposal apply --session --proposal --yes" -- "$cur") ) ;;
    completion) COMPREPLY=( $(compgen -W "bash zsh fish" -- "$cur") ) ;;
    *) COMPREPLY=() ;;
  esac
}
complete -F _foundry_completions foundry
`;

  if (shell === "zsh") {
    return `#compdef foundry
${bashFn}
`;
  }

  return bashFn;
}
