#!/bin/bash

# Simple monitoring script untuk Discord Bot
LOG_FILE="~/discord-bot/logs/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check if container is running
if docker ps | grep -q "villain-seraphyx-bot"; then
    echo "[$DATE] ✅ Bot is running" >> $LOG_FILE
else
    echo "[$DATE] ❌ Bot is not running, attempting restart..." >> $LOG_FILE
    cd ~/discord-bot
    docker-compose restart discord-bot
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "[$DATE] ⚠️ Disk usage is ${DISK_USAGE}%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | grep Mem | awk '{printf("%.2f", $3/$2 * 100.0)}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "[$DATE] ⚠️ Memory usage is ${MEM_USAGE}%" >> $LOG_FILE
fi
