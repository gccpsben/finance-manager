code "./" | exit
wt.exe -w 0 -d "." cmd /k "cd ./server && npm run dev_watch"; split-pane -p "Git Bash" -H -d "."; mf up; split-pane -d "." cmd /k "cd ./frontend && npm run dev"