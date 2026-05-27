Set-Location $PSScriptRoot

$npm = 'C:\Program Files\nodejs\npm.cmd'

& $npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $npm run seed
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $npm start