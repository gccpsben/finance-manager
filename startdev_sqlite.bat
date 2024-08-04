code "./" | exit
wt.exe -w 0 -d "." cmd /k "cd ./server-sqlite && npm run dev_watch"; split-pane -p "Git Bash" -H -d "."; mf up; split-pane -d "." cmd /k "cd ./frontend-sqlite && npm run dev"