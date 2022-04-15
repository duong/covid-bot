#!/bin/sh -x

gcloud functions deploy 'discord-covid-update' \
  --trigger-topic='discord-covid-update2' \
  --entry-point='helloPubSub' \
  --memory='128MB' \
  --timeout='30s' \
  --runtime='nodejs14' \
  --project='duong-dev' \
  --region='australia-southeast1'
