# Covid Reporting Bot

This bot publishes information about Australia's covid cases daily.

![alt text](https://github.com/duong/covid-bot/blob/master/example-covid.PNG?raw=true)

## Environment variables

### TARGET_SERVERS

Provide in yml format. Allows you to specify what servers for the bot to publish information to.

Generate a hook from discord webhooks.

Specify a list of states which you are interested in retrieving data from.

```
---
some-server-name:
  hook: "https://discord.com/api/webhooks/.../..."
  states:
    - nsw
    - qld
    - vic
    - act
    - wa
    - sa
    - nt
    - tas 
another-server-name:
  hook: "https://discord.com/api/webhooks/.../..."
  states:
    - nsw
    - qld
    - vic
    - tas 
```

## Commands

Testing: 
```
TARGET_SERVERS=$(cat ./secrets/input.yml) node -e 'require("./index").helloPubSub()'
```
