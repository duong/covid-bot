# Covid Reporting Bot

This bot publishes information about Australia's covid cases daily.

## Commands

Testing: 
```
TARGET_SERVERS=$(cat ./secrets/input.yml) node -e 'require("./index").helloPubSub()'
```
