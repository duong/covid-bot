#!/bin/sh -x

gcloud functions deploy 'discord-covid-update' \
  --trigger-topic='discord-covid-update2' \
  --entry-point='covidBot' \
  --memory='128MB' \
  --timeout='30s' \
  --runtime='nodejs14' \
  --project='duong-dev' \
  --region='australia-southeast1' \
  --set-secrets='TARGET_SERVERS=projects/374547579835/secrets/TARGET_SERVERS/versions/3'
