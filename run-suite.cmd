@echo off
cd /d "C:\Users\barry\Documents\geschool"
echo STARTED_SUITE %DATE% %TIME%
npx --no-install playwright test --reporter=line --retries=1 --timeout=120000 --workers=1 1>e2e-ref-run.log 2>&1
echo SUITE_EXITCODE_%ERRORLEVEL% >> e2e-ref-run.log
