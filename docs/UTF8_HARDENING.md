# UTF-8 Recurrence Prevention

## 1) VSCode workspace settings
- File: `.vscode/settings.json`
- Enforces UTF-8, disables auto-guess encoding, keeps LF newline.

## 2) Git normalization
- File: `.gitattributes`
- Forces UTF-8 working-tree encoding for source/doc/config files.

## 3) PowerShell persistent UTF-8
Run once:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-powershell-utf8.ps1
```

Then open a new terminal.

## 4) Verify

```powershell
npm run check:utf8
```

## 5) Daily safe workflow
- Prefer editing Korean text directly in VSCode editor.
- Avoid large Korean replacements via shell pipes.
- Run `npm run check:utf8` before commit.
