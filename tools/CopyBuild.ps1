Set-Location .\cbt-dict-pwa\
Get-Item * -Exclude .git | Remove-Item -Recurse
Copy-Item -Recurse ..\build\* . 
Copy-Item -Recurse ..\build\.nojekyll . 
