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
        employees: {
            hrefs: [],
            list: []
        }
    };
    const company_selectors = params.linkedin.selectors.company;

    // --- banner
    // linkedIn url
    company.banner.linkedin_url = params.linkedin.urls.apcapital.landing;

    // company.banner.name = await page.$x(company_selectors.banner.name);
    // company.banner.nb_followers = await page.$x(company_selectors.banner.nb_followers);
    
    // company.banner.link_to_employee_list
    let hrefs = []
    hrefs = await page.evaluate(
        () => Array.from(
            document.querySelectorAll('a[href]'),
            a => a.getAttribute('href')
        )
    );
    for (var i = 0; i < hrefs.length; i++) {
        if (hrefs[i].startsWith("/search/results/people/")) {
            company.banner.link_to_employee_list = "https://www.linkedin.com" + hrefs[i];
            break;
        }
    }
    if (company.banner.link_to_employee_list === "") {
        company.banner.link_to_employee_list = "na";
    }

    // --- about
    // wait untill content is loaded:
    await page.waitForXPath("//h4[contains(., 'Présentation')]", 5000);
    
    // company.about.description
    const [presentation_h4] = await page.$x("//h4[contains(., 'Présentation')]");
    if (presentation_h4) {
        let elem = await page.evaluateHandle(el => el.nextElementSibling, presentation_h4);
        company.about.description = (await (await elem.getProperty("textContent")).jsonValue()).trim();
        console.log(chalk.green("description:", company.about.description));
    } else {
        company.about.description = "na";
        console.log(chalk.redBright("no description"));
    }
    
    // company.about.site_url
    const [site_web_dt] = await page.$x("//dt[contains(., 'Site web')]");
    if (site_web_dt) {
        let elem_site_web = await page.evaluateHandle(el => el.nextElementSibling, site_web_dt);
        company.about.site_url = (await (await elem_site_web.getProperty("textContent")).jsonValue()).trim();
        console.log(chalk.green("site_url:", company.about.site_url));
    } else {
        company.about.site_url = "na";
        console.log(chalk.redBright("no site_url"));
    }

    // company.about.sector
    const [sector_dt] = await page.$x("//dt[contains(., 'Secteur')]");
    if (sector_dt) {
        let elem_sector = await page.evaluateHandle(el => el.nextElementSibling, sector_dt);
        company.about.sector = (await (await elem_sector.getProperty("textContent")).jsonValue()).trim();
        console.log(chalk.green("sector:", company.about.sector));
    } else {
        company.about.sector = "na";
        console.log(chalk.redBright("no sector"));
    }

    // company.about.employee_range
    const [employee_range_dt] = await page.$x("//dt[contains(., 'Taille de ')]");
    if (employee_range_dt) {
        let elem_employee_range = await page.evaluateHandle(el => el.nextElementSibling, employee_range_dt);
        company.about.employee_range = (await (await elem_employee_range.getProperty("textContent")).jsonValue()).trim();
        console.log(chalk.green("employee_range:", company.about.employee_range));
        // company.about.employee_count
        try {
            const [employee_count_dt] = await page.$x(`//dd[contains(., '${company.about.employee_range}')]`);
            if (employee_count_dt) {
                let elem_employee_count = await page.evaluateHandle(el => el.nextElementSibling, employee_count_dt);
                let result = (await (await elem_employee_count.getProperty("textContent")).jsonValue()).trim();
                let i = result.indexOf("sur LinkedIn");
                company.about.elem_employee_count = result.substring(0, i + 12);
            } else {
                company.about.elem_employee_count = "na";
                console.log(chalk.redBright("no elem_employee_count"));
            }
            console.log(chalk.green("elem_employee_count:", company.about.elem_employee_count));
        } catch {
            company.about.elem_employee_count = "na";
            console.log(chalk.redBright("error, no elem_employee_count"));
        }
    } else {
        company.about.employee_range = "na";
        console.log(chalk.redBright("no employee_range"));
    }

    // company.about.headquarters
    const [headquarters_dt] = await page.$x("//dt[contains(., 'Siège social')]");
    if (headquarters_dt) {
        let elem_headquarters = await page.evaluateHandle(el => el.nextElementSibling, headquarters_dt);
        company.about.headquarters = (await (await elem_headquarters.getProperty("textContent")).jsonValue()).trim();
        console.log(chalk.green("headquarters:", company.about.headquarters));
    } else {
        company.about.headquarters = "na";
        console.log(chalk.redBright("no headquarters"));
    }

    // company.about.type
    const [type_dt] = await page.$x("//dt[contains(., 'Type')]");
    if (type_dt) {
        let elem_type = await page.evaluateHandle(el => el.nextElementSibling, type_dt);
        company.about.type = (await (await elem_type.getProperty("textContent")).jsonValue()).trim();
        console.log(chalk.green("type:", company.about.type));
    } else {
        company.about.type = "na";
        console.log(chalk.redBright("no type"));
    }

    /* -------------------------------- */
    // people
    /* -------------------------------- */
    if (company.banner.link_to_employee_list != "na") {
        await page.goto(company.banner.link_to_employee_list, { waitUntil: 'domcontentloaded' });
        console.log(chalk.green("page is now:", page.url()));
        
        // get hrefs employees
        // await page.waitForXPath("//h4[contains(., 'Présentation')]", 5000);
        let hrefs = []
        hrefs = await page.evaluate(
            () => Array.from(
                document.querySelectorAll('a[href]'),
                a => a.getAttribute('href')
            )
        );
        for (var i = 0; i < hrefs.length; i++) {
            if (hrefs[i].startsWith("/in/")) {
                company.employees.hrefs.push("https://www.linkedin.com" + hrefs[i]);
            }
        }
        try {
            // employee.name
            // await page.evaluate(() => {
            //     let elements = document.getElementsByClassName('distance-badge separator ember-view');
            // });
            const elements = await page.$$('span.distance-badge');
            elements.forEach(async element => {
                let employee = {
                    linkedin_url: company.employees.hrefs[i],
                    name: "",
                    position: "",
                    location: ""
                }
                let separator = await page.evaluateHandle(el => el.previousElementSibling, element);
                employee.name = (await (await separator.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("employee.name:", employee.name));
                company.employees.list.push(employee);
            })
        } catch (error) {
            console.log(chalk.redBright("error employee:", error));
        }
        console.table(company.employees.hrefs)            
        console.table(company.employees.list)            
    }
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