const axios = require('axios')
const cheerio = require('cheerio')

const dates = [
    // '20210601',
    // '20210602',
    // '20210603',
    // '20210604',
    // '20210605',
    // '20210606',
    // '20210607',
    // '20210608',
    // '20210609',
    // '20210610',
    // '20210611',
    // '20210612',
    // '20210613',
    // '20210614',
    // '20210615',
    // '20210616',
    // '20210617',
    // '20210618',
    // '20210619',
    // '20210620',
    // '20210621',
    // '20210622',
    // '20210623',
    // '20210624',
    // '20210625',
    // '20210626',
    // '20210627',
    // '20210629',
    '20210630',
    '20210631',

    '20210701',
    '20210702',
    '20210703',
    '20210704',
    '20210705',
    '20210706',
    '20210707',
    '20210708',
    '20210709',
    '20210710',
    '20210711',
    '20210712'
]


function isNumeric(value) {
    return /^[0-9,. ]*$/.test(value);
}

const formatResults = (results, date) => {
    const dailyUpdateOrder = [
        {
            label: 'Total locally acquired cases today',
            key: 'Total',
            index: 0
        },
        {
            label: 'Locally acquired – linked to known case or cluster',
            key: 'Locally acquired – linked to known case or cluster',
            index: 0
        },
        {
            label: 'Locally acquired – no links to known case or cluster',
            key: 'Locally acquired – no links to known case or cluster',
            index: 0
        },
        {
            label: 'Locally acquired – investigation ongoing',
            key: 'Locally acquired – investigation ongoing',
            index: 0
        },
        {
            label: 'Overseas',
            key: 'Overseas',
            index: 0
        },
        {
            label: 'Interstate',
            key: 'Interstate',
            index: 0
        },
    ]

    const vaccinationUpdateOrder = [
        {
            label: 'NSW Health – first doses',
            key: 'NSW Health – first doses',
            index: 0
        },
        {
            label: 'NSW Health – second doses',
            key: 'NSW Health – second doses',
            index: 0
        },
    ]

    let stringResult = '\n\n'

    stringResult += `Daily COVID-19 update for ${date} retrieved from https://www.health.nsw.gov.au/news/Pages/${date}_00.aspx\n\n`
    for (let i = 0; i < dailyUpdateOrder.length; i++) {
        const data = dailyUpdateOrder[i]

        try {
            stringResult += `${data.label}: ${results[data.key][data.index]}\n`
        } catch (error) {
            console.error(`Failed formatting data for date: ${date}, label: ${data.label}, key: ${data.key}}`)
            console.error(results)
            throw error
        }
    }

    // stringResult += `\n\nDaily vaccination update for ${date}\n\n`
    // for (let i = 0; i < vaccinationUpdateOrder.length; i++) {
    //     const data = vaccinationUpdateOrder[i]
    //     stringResult += `${data.label}: ${results[data.key][data.index]}\n`
    // }
    return stringResult
}

const getCovidData = async (date) => {
    const covidResults = {}

    let res
    try {
        res = await axios.get(`https://www.health.nsw.gov.au/news/Pages/${date}_00.aspx`)
    } catch (error) {
        console.error('Error when getting covid data')
        console.error(error)
    }
    if (res) {
        const $ = cheerio.load(res.data)
        const table = $('table > tbody > tr > td')
        let key = ''
        table.each((i, element) => {
            console.log(i, $(element).text().trim())
            if (!$(element).attr('class').includes('Header')) {
                const text = $(element).text().trim().replace( /\s\s+/g, ' ' )
                if (isNumeric(text)) {
                    console.log('is num', text)
                    covidResults[key].push(text)
                } else {
                    console.log('is keys', text)
                    key = text
                    if (!covidResults[key]) {
                        covidResults[key] = []
                    }
                }
                // console.log($(element).attr('class'))
            }
        })
        console.log(date, covidResults)
        const stringResult = formatResults(covidResults, date)
        console.log(stringResult)

    } else {
        console.error('No result from axios')
    }
    // axios
    // .get(url)
    // .then(response => {
    //   const $ = cheerio.load(response.data);
 
    //   const image = $('img')
  
    //   $("img").each((i, elem) => {
    //     {
    //        ...
    //     })
    //   ...
    // })
}

const main = async () => {
    for (let i = 0; i < dates.length; i++) {
        console.log('--------------------------------------------')
        await getCovidData(dates[i])
    }
}

main()
