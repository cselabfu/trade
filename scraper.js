const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { parse } = require('path');

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin());



async function scrapeYahooFinanceTable() {
    let browser;
    try {
        // Launch the browser
        browser = await puppeteer.launch({
            headless: config.headless,
            slowMo: config.slowMo,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        const page = await browser.newPage();

        // Set a realistic user agent
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        );

        console.log(`Navigating to ${config.url}...`);
        await page.goto(config.url, {
            waitUntil: 'networkidle2',
            timeout: 30000,
        });
        // await page.goto(config.url, { waitUntil: "domcontentloaded" });


        // Wait for the table to load
        console.log('Waiting for the table to load...');
        let res = await page.waitForSelector('table', {
            timeout: 30000,
        });
        // await page.waitForFunction(
        //     'window.performance.timing.loadEventEnd - window.performance.timing.navigationStart >= 500'
        //   );


        // Extract table data
        console.log('Extracting table data...');
        const tableData = await page.evaluate(() => {



            const table = document.querySelector('table');
            const rows = Array.from(table.querySelectorAll('tr'));

            return rows.map(row => {
                const columns = Array.from(row.querySelectorAll('td, th'));
                return columns.map(column => column.textContent.trim());
            });
        });

        // const pageSourceHTML = await page.content();

        // // console.log(pageSourceHTML);
        // fs.writeFileSync(config.outputFile + ".html", pageSourceHTML);

        // Filter out empty rows and format the data
        const filteredData = tableData.filter(row => row.length > 0 && !row.every(cell => cell === ''));

        // Prepare CSV content
        let csvContent = '';
        filteredData.forEach(row => {
            csvContent += row.join(',') + '\n';
        });

        // Save to file
        fs.writeFileSync(config.outputFile, csvContent);
        console.log(`Data successfully saved to ${config.outputFile}`);

        // Display first few rows in console for verification
        console.log('\nFirst few rows of extracted data:');
        console.log(filteredData.slice(0, 5).map(row => row.join(' | ')).join('\n'));

    } catch (error) {
        console.error('Error during scraping:', error);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run the scraper
// scrapeYahooFinanceTable();


// Configuration
const config = {
    url: 'https://finance.yahoo.com/quote/{{CODE}}/history/?period1={{START}}&period2={{END}}',
    outputFile: 'data/{{CODE}}_{{START}}_{{END}}.csv',
    headless: true, // Set to false to see the browser in action
    slowMo: 50, // Slows down Puppeteer operations by the specified amount of milliseconds
};

// const urls = [
//     'https://finance.yahoo.com/quote/CL%3DF/history/',
//     'https://finance.yahoo.com/quote/ES%3DF/history/',
//     // Add more URLs here
// ];

async function scrapeMultiplePages() {

    fs.readFile('item.json', 'utf8', async function (err, data) {
        if (err) throw err;
        let CODES = JSON.parse(data);

        let START = parseInt(Date.parse('2020-01-01 00:00:00') / 1000);
        let END = parseInt(Date.now() / 1000);

        for (let i = 0; i < CODES.length; i++) {
            console.log(CODES[i]);

            let CODE = CODES[i]['item'];
            let NAME = CODES[i]['name'];
            console.log(CODE);

            let url = `https://finance.yahoo.com/quote/${CODE.replace(/=/g, "%3D")}/history/?period1=${START}&period2=${END}`;
            console.log(url);

            config.url = url;
            // config.outputFile = `${url.split('/')[4]}_data.csv`; // Creates unique filenames
            config.outputFile = `data/${NAME}_${CODE}_${START}_${END}_data.csv`; // Creates unique filenames
            await scrapeYahooFinanceTable();
        }
    });

}

// Run the multi-page scraper instead
scrapeMultiplePages();