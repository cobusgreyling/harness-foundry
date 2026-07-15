# with-outerloop

Wire harness-foundry evidence to [outerloop](https://github.com/cobusgreyling/outerloop) governance.

```bash
npx @cobusgreyling/outerloop init    # optional but recommended
npx @cobusgreyling/harness-foundry init --from implementer
```

Enable evidence in `.foundry/hooks/outerloop.yaml`:

```yaml
enabled: true
```

```bash
foundry run --goal "Implement with evidence"
# → .foundry/sessions/<id>/evidence.json
# → .outerloop/evidence/<id>.json (if outerloop initialized)

outerloop verdict review <evidence-id>
```