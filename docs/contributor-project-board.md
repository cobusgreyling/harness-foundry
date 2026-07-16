# Contributor project board (optional)

Create a GitHub Project to triage contributor work. **One-time setup** (UI):

1. Go to [github.com/cobusgreyling/harness-foundry](https://github.com/cobusgreyling/harness-foundry) → **Projects** → **New project**
2. Choose **Board** template
3. Name: **harness-foundry contributor backlog**
4. Add columns:
   - **Good first** — filter: `label:"good first issue" is:open`
   - **Help wanted** — filter: `label:"help wanted" is:open`
   - **v0.4 / Future** — filter: `milestone:"v0.4"`
5. Pin the project on the repo README (optional)

CLI (requires `gh auth refresh -s project,read:project`):

```bash
gh auth refresh -h github.com -s project,read:project
gh project create --owner cobusgreyling --title "harness-foundry contributor backlog" --format board
```

Link issues from [good-first-issues.md](./good-first-issues.md).