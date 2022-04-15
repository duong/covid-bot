const axios = require('axios')
const cheerio = require('cheerio')
const YAML = require('yaml')

// states provided by covidlive.com.au
const statesData = {
    nsw: {
        color: '9829',
        url: 'https://www.youtube.com/watch?v=dtYFBzsy3Ds'
    },
    qld: {
        color: '4198428'
    },
    vic: {
        color: '30592',
        url: 'https://www.youtube.com/watch?v=Ns15eHLDv1I'
    },
    act: {
        color: '2762856'
    },
    wa: {
        color: '2055992'
    },
    sa: {
        color: '15537995'
    },
    nt: {
        color: '13126657'
    },
    tas: {
        color: '11905114'
    },
}
const states = Object.keys(statesData)
const baseurl = 'https://covidlive.com.au/report/daily-summary' // data source

const isNumeric = (value) => {
    return /^[0-9,. K%>]*$/.test(value);
}

// Formats the scraped data into ready to be published form
const formatResults = (results, state) => {
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
    ]

    const fields = []

    for (let i = 0; i < dailyUpdateOrder.length; i++) {
        const data = dailyUpdateOrder[i]

        try {

            const change = data.change != undefined ? results[data.key][data.change] : null
            const total = data.total != null ? results[data.key][data.total] : null
            const label = data.label

            let value = ''
            value += total
            if (change) {
                value += ` (+${change})`
            }
            fields.push({
                name: data.label,
                value,
                inline: data.inline,
            })
        } catch (error) {
            console.error(`Failed formatting data for label: ${data.label}, key: ${data.total}}`)
            console.error(results)
            throw error
        }
    }

    return fields
}

const getDate = () => {
    // current timestamp in milliseconds
    let ts = Date.now();

    let date_ob = new Date(ts);
    let date = date_ob.getDate();
    let month = date_ob.getMonth() + 1;
    let year = date_ob.getFullYear();

    // prints date & time in DD-MM-YYYY format
    return date + "-" + month + "-" + year
}

// Does some web scraping from the given cheerio data
const scrapStateData = (data) => {
    const stateData = {}
    
    const $ = cheerio.load(data)
    const table = $('table > tbody > tr > td')
    let key = ''
    table.each((i, element) => {
        if (!$(element).attr('class').includes('Header')) {
            const text = $(element).text().trim().replace( /\s\s+/g, ' ' )
            if (isNumeric(text)) {
                stateData[key].push(text)
            } else {
                key = text
                if (!stateData[key]) {
                    stateData[key] = []
                }
            }
        }
    })

    return stateData
}

const mergeStatesData = (covidStatesData, states) => {
    const embeds = []

    let stringResult = ''

    for (let i = 0; i < states.length; i++) {
        const state = states[i]

        embeds.push({
            title: `**${state.toUpperCase()}**`,
            url: statesData[state].url ? statesData[state].url : `${baseurl}/${state}`, // easter eggs
            fields: covidStatesData[state],
            color: statesData[state].color,
        })
    }

    return embeds
}

/**
 * Gets covid data for all states
 */
const getCovidData = async () => {
    console.log('Getting covid data for states:', states)
    const covidStatesData = {}
    for (let i = 0; i < states.length; i++) {
        const state = states[i]

        // Retrieve state data
        const url = `${baseurl}/${state}`
        let res
        try {
            res = await axios.get(url)
        } catch (error) {
            console.error(`Error when getting covid data for state ${state}`)
            console.error(error)
        }

        // Scrape the data and format it
        if (res && res.data) {
            console.log('Scraping data for state', state)
            const stateData = scrapStateData(res.data)
            console.log('Got scraped data', stateData)
            const content = formatResults(stateData, state)
            console.log('Got formatted results: ', content)
            covidStatesData[state] = content
        } else {
            console.error(`No result from axios for state ${state}`)
        }
    }
    return covidStatesData
}

const publishCovidData = async (targetServers, covidStatesData) => {
    const keys = Object.keys(targetServers)
    for (let i = 0; i < keys.length; i++) {
        const serverName = keys[i]
        const targetServer = targetServers[serverName]
        console.log('processing target server, ', targetServer)
        const { hook, states } = targetServer

        const embeds = mergeStatesData(covidStatesData, states)
        console.log('embeds', embeds)
        try {
            await axios.post(hook, {
                username: `COVID Daily ${getDate()}`,
                embeds,
                content: `Data retrieved from [COVID Live](${baseurl}) \n Source code available [here](https://github.com/duong/covid-bot)`
            })
        } catch (e) {
            console.error('Failed to publish data ', embeds)
            console.error(e)
        }
    }
}

const main = async () => {
    // Check the TARGET_SERVERS env variable is supplied
    if (!process.env.TARGET_SERVERS) {
        console.error('TARGET_SERVERS environement variable not provided. Please ensure TARGET_SERVERS is set')
        process.exit(1)
    }

    // Parse TARGET_SERVERS data
    console.log('Parsing target servers data')
    let targetServers
    try {
        targetServers = YAML.parse(process.env.TARGET_SERVERS)
    } catch (error) {
        console.error('Failed to parse TARGET_SERVERS, ensure TARGET_SERVERS is valid yml')
        throw error
    }

    // Ensure each object has hook and states
    console.log('Validating input for TARGET_SERVERS: ', targetServers)
    const keys = Object.keys(targetServers)
    for (let i = 0; i < keys.length; i++) {
        const name = keys[i]
        const server = targetServers[name]
        if (!server.hook || !server.states || server.states.length == 0) {
            console.error('Invalid TARGET_SERVERS structure, please ensure all servers have a valid hook and states')
            process.exit(1)
        }
    }

    // Start the bot
    console.log('Successfully validated input, starting covid reporting bot...')
    const covidStatesData = await getCovidData(targetServers)
    console.log('covidStatesData', covidStatesData)
    await publishCovidData(targetServers, covidStatesData)

    console.log('Done.')
    return true
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.helloPubSub = (event, context) => {
  main()
}
