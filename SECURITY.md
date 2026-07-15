# Security

## Reporting

Email security issues privately to the repository owner via GitHub Security Advisories or direct contact. Do not open public issues for undisclosed vulnerabilities.

## API keys

- `ANTHROPIC_API_KEY` is read from the environment only — never written to traces or evidence
- `.foundry/` session data may contain goals and traces; add `.foundry/sessions/` to `.gitignore` (default)

## Evidence

Evidence packages may include session goals and trace summaries. Review before sharing outside your team.