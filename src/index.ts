const cheerio = require('cheerio');
const YAML = require('yaml');
const { createLogger, format, transports } = require('winston');
const axios = require('axios');

type State = 'nsw' | 'qld' | 'vic' | 'act' | 'wa' | 'sa' | 'nt' | 'tas'

const {
  combine, timestamp, prettyPrint,
} = format;

const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    prettyPrint(),
  ),
  defaultMeta: { service: 'covid-bot' },
  transports: [
    //
    // - Write all logs with importance level of `error` or less to `error.log`
    // - Write all logs with importance level of `info` or less to `combined.log`
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.colorize(),
        format.simple(),
      ),
    }),
  ],
});

// states provided by covidlive.com.au
const statesData: { [state: string] : any; } = {
  nsw: {
    color: '9829',
    url: 'https://www.youtube.com/watch?v=dtYFBzsy3Ds',
  },
  qld: {
    color: '4198428',
  },
  vic: {
    color: '30592',
    url: 'https://www.youtube.com/watch?v=Ns15eHLDv1I',
  },
  act: {
    color: '2762856',
  },
  wa: {
    color: '2055992',
  },
  sa: {
    color: '15537995',
  },
  nt: {
    color: '13126657',
  },
  tas: {
    color: '11905114',
  },
};
const states = Object.keys(statesData);
const baseurl = 'https://covidlive.com.au/report/daily-summary'; // data source

const isNumeric = (value: string) => /^[0-9,. K%>]*$/.test(value);

// Formats the scraped data into ready to be published form
const formatResults = (results: any) => {
  const dailyUpdateOrder = [
    {
      label: 'Total locally acquired cases',
      key: 'Cases',
      total: 0,
      change: 2,
      inline: false,
    },
    // {
    //     label: 'Total overseas acquired cases',
    //     key: 'Overseas',
    //     total: 0,
    //     change: 2
    // },
    {
      label: '3rd Dose',
      key: 'COVID LIVE',
      total: 0,
      inline: true,
    },
    {
      label: 'Cases 7d Avg',
      key: 'COVID LIVE',
      total: 1,
      inline: true,
    },
    {
      label: 'ICU',
      key: 'ICU',
      total: 0,
      inline: false,
    },
    {
      label: 'Deaths',
      key: 'Deaths',
      total: 0,
      change: 2,
      inline: true,
    },
    {
      label: 'Tests',
      key: 'Tests',
      total: 0,
      change: 2,
      inline: false,
    },
    // {
    //     label: 'Hospitalised',
    //     key: 'Hospitalised',
    //     total: 0,
    //     change: 2
    // },
  ];

  const fields = [];

  for (let i = 0; i < dailyUpdateOrder.length; i += 1) {
    const data = dailyUpdateOrder[i];
    let label = '';

    try {
      const change = data.change !== undefined ? results[data.key][data.change] : null;
      const total = data.total != null ? results[data.key][data.total] : null;
      label = data.label;

      let value = '';
      value += total;
      if (change) {
        value += ` (+${change})`;
      }
      fields.push({
        name: label,
        value,
        inline: data.inline,
      });
    } catch (error) {
      logger.error(
        `Failed formatting data for label: ${label}, key: ${data.total}}`,
      );
      logger.error(results);
      throw error;
    }
  }

  return fields;
};

const getDate = () => {
  // current timestamp in milliseconds
  const ts = Date.now();

  const dateOb = new Date(ts);
  const date = dateOb.getDate();
  const month = dateOb.getMonth() + 1;
  const year = dateOb.getFullYear();

  // prints date & time in DD-MM-YYYY format
  return `${date}-${month}-${year}`;
};

// Does some web scraping from the given cheerio data
const scrapStateData = (data: any) => {
  const stateData: { [state: string] : any; } = {};

  const $ = cheerio.load(data);
  const table = $('table > tbody > tr > td');
  let key = '';
  table.each((i: number, element: any) => {
    const classAttr = $(element).attr('class');
    if (!classAttr?.includes('Header')) {
      const text = $(element).text().trim().replace(/\s\s+/g, ' ');
      if (isNumeric(text)) {
        stateData[key].push(text);
      } else {
        key = text;
        if (!stateData[key]) {
          stateData[key] = [];
        }
      }
    }
  });

  return stateData;
};

const mergeStatesData = (covidStatesData: { [state: string] : any; }, serverStates: State[]) => {
  const embeds = [];

  for (let i = 0; i < serverStates.length; i += 1) {
    const state = serverStates[i];

    embeds.push({
      title: `**${state.toUpperCase()}**`,
      url: statesData[state].url
        ? statesData[state].url : `${baseurl}/${state}`, // easter eggs
      fields: covidStatesData[state],
      color: statesData[state].color,
    });
  }

  return embeds;
};

/**
 * Gets covid data for all states
 */
const getCovidData = async () => {
  logger.info('Getting covid data for states:', states);
  const covidStatesData: { [state: string] : any; } = {};
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < states.length; i++) {
    const state = states[i];

    // Retrieve state data
    const url = `${baseurl}/${state}`;
    let res;
    try {
      // eslint-disable-next-line no-await-in-loop
      res = await axios.get(url);
    } catch (error) {
      logger.error(`Error when getting covid data for state ${state}`);
      logger.error(error);
    }

    // Scrape the data and format it
    if (res && res.data) {
      logger.info('Scraping data for state', state);
      const stateData = scrapStateData(res.data);
      logger.info('Got scraped data', stateData);
      const content = formatResults(stateData);
      logger.info('Got formatted results: ', content);
      covidStatesData[state] = content;
    } else {
      logger.error(`No result from axios for state ${state}`);
    }
  }
  return covidStatesData;
};

const publishCovidData = async (targetServers: any, covidStatesData: any) => {
  const keys = Object.keys(targetServers);
  for (let i = 0; i < keys.length; i += 1) {
    const serverName = keys[i];
    const targetServer = targetServers[serverName];
    logger.info('processing target server, ', targetServer);
    const { hook } = targetServer;

    const embeds = mergeStatesData(covidStatesData, targetServer.states);
    logger.info('embeds', embeds);
    try {
      // eslint-disable-next-line no-await-in-loop
      await axios.post(hook, {
        username: `COVID Daily ${getDate()}`,
        embeds,
        content: `Data retrieved from [COVID Live](${baseurl}) \n Source code available [here](https://github.com/duong/covid-bot)`,
      });
    } catch (e) {
      logger.error('Failed to publish data ', embeds);
      logger.error(e);
    }
  }
};

const main = async () => {
  // Check the TARGET_SERVERS env variable is supplied
  if (!process.env.TARGET_SERVERS) {
    logger.error(
      'TARGET_SERVERS environement variable not provided. Please ensure TARGET_SERVERS is set',
    );
    process.exit(1);
  }

  // Parse TARGET_SERVERS data
  logger.info('Parsing target servers data');
  let targetServers: { [state: string]: any; };
  try {
    targetServers = YAML.parse(process.env.TARGET_SERVERS);
  } catch (error) {
    logger.error('Failed to parse TARGET_SERVERS, ensure TARGET_SERVERS is valid yml');
    throw error;
  }

  // Ensure each object has hook and states
  logger.info('Validating input for TARGET_SERVERS: ', targetServers);
  const keys = Object.keys(targetServers);
  for (let i = 0; i < keys.length; i += 1) {
    const name: string = keys[i];
    const server = targetServers[name];
    if (!server.hook || !server.states || server.states.length === 0) {
      logger.error('Invalid TARGET_SERVERS structure, please ensure all servers have a valid hook and states');
      process.exit(1);
    }
  }

  // Start the bot
  logger.info('Successfully validated input, starting covid reporting bot...');
  const covidStatesData = await getCovidData();
  logger.info('covidStatesData', covidStatesData);
  await publishCovidData(targetServers, covidStatesData);

  logger.info('Done.');
  return true;
};

if (process.env.RUN_DEV) {
  main();
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
const covidBot = () => {
  main();
};

module.exports = { covidBot };
