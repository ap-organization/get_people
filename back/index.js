'use strict'

// requires
const puppeteer = require('puppeteer');
const params = require('./params.json');
const chalk = require('chalk');
const { GoogleSpreadsheet } = require('google-spreadsheet');

// auto scroll page
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function printerror(error) {
    console.error("error:", error);
    await browser.close();
    process.exit(0);
}

// login + scrap the mfs pages
async function scrapper() {
    /* -------------------------------- */
    // init Puppeteer
    /* -------------------------------- */
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            // '--headless', // comment to debug
            '--disable-gpu',
        ]
    });
    let page = await browser.newPage();
    console.log("page user agent: " + browser.userAgent());
    // await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
    /* -------------------------------- */
    
    /* -------------------------------- */
    // login to LinkedIn
    /* -------------------------------- */
    await page.goto(params.linkedin.urls.login, { waitUntil: 'domcontentloaded' });
    await page.type('#username', params.linkedin.auth.mail, { delay: 30 });
    await page.type('#password', params.linkedin.auth.password, { delay: 30 });    
    await Promise.all([ await page.click('#app__container > main > div:nth-child(3) > form > div.login__form_action_container > button') ]);
    await page.waitForNavigation({ waitUntil: 'domcontentloaded'});
    // await page.waitForTimeout(5000);
    try {
        console.log("trying to login ...");
        if (page.url() != params.linkedin.urls.feed) {
            /* -------------------------------- */
            // verification
            /* -------------------------------- */
            await printerror("!=feed: need verification");
            /* -------------------------------- */
        }
        await page.waitFor(params.linkedin.selectors.login_proof_selector);            
        console.log(chalk.green("successfully logged in"));
    } catch (error) {
        await printerror(error);
    }
    /* -------------------------------- */
    
    /* -------------------------------- */
    // init GoogleSpreadsheet
    /* -------------------------------- */
    // const doc = new GoogleSpreadsheet(params.gsheet.id);
    // await doc.useServiceAccountAuth({
    //     client_email: creds.client_email,
    //     private_key: creds.private_key,
    // });
    // await doc.loadInfo();
    // const sheet = doc.sheetsByIndex[0];
    /* -------------------------------- */

    /* -------------------------------- */
    // go to company profile page and get data
    /* -------------------------------- */
    await page.goto(params.linkedin.urls.apcapital.about, { waitUntil: 'domcontentloaded' });
    console.log(chalk.green("page is now:", page.url()));
    let company = {
        banner: {
            site_url: "",
            name: "",
            nb_followers: "",
            link_to_employee_list: ""
        },
        landing: {

        },
        about: {
            description: "",
            site_url: "",
            sector: "",
            employee_range: "",
            employee_count: "",
            headquarters: "",
            type: ""
        },
        offers: {
        },
        people: {
        },
        employee_list: {
            employee_card: {
                element_classname: "",
                name: "",
                is_premium: "",
                position: "",
                location: ""
            }
        }
    };
    const company_selectors = params.linkedin.selectors.company;

    // banner
    company.banner.linkedin_url = params.linkedin.urls.apcapital.landing;
    // company.banner.name = await page.$x(company_selectors.banner.name);
    // company.banner.nb_followers = await page.$x(company_selectors.banner.nb_followers);
    // company.banner.link_to_employee_list = await page.$x(company_selectors.banner.link_to_employee_list);

    // about
    // company.about.description = await page.$x(company_selectors.about.description);
    // company.about.site_url = await page.$x(company_selectors.about.site_url);
    
    await page.waitForXPath("//dt[contains(., 'Site web')]", 5000);
    const [site_web_dts] = await page.$x("//dt[contains(., 'Site web')]");
    if (site_web_dts) {
        let first_elem = await page.evaluateHandle(el => el.nextElementSibling, site_web_dts);
        company.about.site_url = (await (await first_elem.getProperty("textContent")).jsonValue()).trim();
        console.log("site_url:", company.about.site_url);
    } else {
        company.about.site_url = "na";
        console.log("no site_url");
    }

    // company.about.employee_range = await page.$x(company_selectors.about.employee_range);
    // company.about.employee_count = await page.$x(company_selectors.about.employee_count);
    // company.about.headquarters = await page.$x(company_selectors.about.headquarters);
    // company.about.type = await page.$x(company_selectors.about.type);

    // people
    // company.employee_list = {};
    // todo: loop
    /* -------------------------------- */


    /* -------------------------------- */
    // 
    /* -------------------------------- */
    /* -------------------------------- */
    
    /* -------------------------------- */
    // close Puppeteer
    /* -------------------------------- */
    // await browser.close();
    /* -------------------------------- */
}

/* -------------------------------- */
async function main() {
    await scrapper();
}

main();