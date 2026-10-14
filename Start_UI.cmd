@echo off
cd /d "%~dp0poster-ui"
set "NEXT_TELEMETRY_DISABLED=1"
set "npm_config_cache=D:\Lab2_Poster\Cache\npm"
set "TEMP=D:\Lab4_TokenGatedPoster\Temp"
set "TMP=D:\Lab4_TokenGatedPoster\Temp"
call npm run dev
pause
