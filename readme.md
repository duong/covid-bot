# Covid Reporting Bot

TARGET_SERVERS=$(cat ./secrets/input.yml) node -e 'require("./index").helloPubSub()'

