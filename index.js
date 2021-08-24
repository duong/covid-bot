const axios = require('axios')
const cheerio = require('cheerio')

const baseurl = 'https://covidlive.com.au/report/daily-summary'

let squidChannelHook
let optusAmongUsHook
squidChannelHook = 'https://discordapp.com/api/webhooks/864122791242498108/IQ00RhZni9e8s5AF2HQIXFUinIFJOc67KQQ4O1JjImTbkv88soNNU3AY6mbGuGu8SRZR'
optusAmongUsHook = 'https://discordapp.com/api/webhooks/864123793156210689/-Ex_V_SDXA7w6ZFSkVKvNMmXNQ8g-6OK1KLnciOwzspdbg3WeRT-Kdc4jLxpflzxNr8S'
const duongDevHook = 'https://discordapp.com/api/webhooks/864108597158739970/9_w9BbECd33TVcicB4XjCGGXeQWHAVROqHjMjfn0_KOeuapWWBxafqhFDJSkaQf3ITqn'

const australianStatesToHook = {
    nsw: [
        duongDevHook,
        squidChannelHook,
        optusAmongUsHook
    ],
    qld: [
        duongDevHook,
        squidChannelHook,
    ],
    vic: [
        duongDevHook,
        squidChannelHook,
    ]
}

function isNumeric(value) {
    return /^[0-9,. ]*$/.test(value);
}

const formatResults = (results, source) => {
    const dailyUpdateOrder = [
        {
            label: 'Total locally acquired cases',
            key: 'Cases',
            total: 0,
            change: 2
        },
        {
            label: 'Total overseas acquired cases',
            key: 'Overseas',
            total: 0,
            change: 2
        },
        {
            label: 'Tests',
            key: 'Tests',
            total: 0,
            change: 2
        },
        {
            label: 'Deaths',
            key: 'Deaths',
            total: 0,
            change: 2
        },
        {
            label: 'Hospitalised',
            key: 'Hospitalised',
            total: 0,
            change: 2
        },
    ]

    let stringResult = ''
    for (let i = 0; i < dailyUpdateOrder.length; i++) {
        const data = dailyUpdateOrder[i]

        try {
            const change = results[data.key][data.change]
            const total = results[data.key][data.total]
            const label = data.label
            stringResult += `${label}: ${total} (+${change})\n`
        } catch (error) {
            console.error(`Failed formatting data for label: ${data.label}, key: ${data.total}}`)
            console.error(results)
            throw error
        }
    }

    stringResult += `\nRetrieved from ${source}\n\n`


    return stringResult
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

const getCovidData = async (state) => {
    const covidResults = {}
    const url = `${baseurl}/${state}`

    let res
    try {
        res = await axios.get(url)
    } catch (error) {
        console.error('Error when getting covid data')
        console.error(error)
    }
    if (res) {
        const $ = cheerio.load(res.data)
        const table = $('table > tbody > tr > td')
        let key = ''
        table.each((i, element) => {
            // console.log(i, $(element).text().trim())
            if (!$(element).attr('class').includes('Header')) {
                const text = $(element).text().trim().replace( /\s\s+/g, ' ' )
                if (isNumeric(text)) {
                    // console.log('is num', text)
                    covidResults[key].push(text)
                } else {
                    // console.log('is keys', text)
                    key = text
                    if (!covidResults[key]) {
                        covidResults[key] = []
                    }
                }
                // console.log($(element).attr('class'))
            }
        })
        const content = formatResults(covidResults, url)
        console.log(content)

        const webhooks = australianStatesToHook[state]
        webhooks.forEach(async (webhook) => {
            if (webhook) {
                try {
                    await axios.post(webhook, { username: `${state.toUpperCase()} COVID Daily ${getDate()}`, content })
                } catch (e) {
                    console.log(e)
                }
            }
        })
    } else {
        console.error('No result from axios')
    }
}

const main = async () => {
    const states = Object.keys(australianStatesToHook)
    states.forEach(async state => {
        await getCovidData(state)
    })
}

/**
 * Triggered from a message on a Cloud Pub/Sub topic.
 *
 * @param {!Object} event Event payload.
 * @param {!Object} context Metadata for the event.
 */
exports.helloPubSub = (event, context) => {
  main()
};
