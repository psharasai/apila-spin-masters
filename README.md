# Apila Spin Masters

Static site for the EIPL Apila TT League — rankings, tournaments, players, and head-to-head stats.

Live site: https://apilatt.web.app

## Local development

Run from the repo root (`Q:\src\personal\apila-spin-masters`).

### Start the local server

Foreground (press `Ctrl+C` to stop):

```powershell
python -m http.server 8765
```

Background (keeps the terminal free):

```powershell
Start-Process python -ArgumentList '-m','http.server','8765' -WindowStyle Hidden
```

Then open <http://localhost:8765/index.html>.

### Stop the background server

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8765 -State Listen).OwningProcess -Force
```
