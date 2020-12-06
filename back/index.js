// todo
// validations if link finish by /about for case: target_company=https://www.linkedin.com/company//about/

'use strict'

// requires
const puppeteer = require('puppeteer');
const params = require('./params.json');
const chalk = require('chalk');

const errors = {
    "!query": "!query - can't find query param",
    "!puppeteer": "!puppeteer - can't init puppeteer",
    "!login": "!login - can't login on LinkedIn",
    "!feed": "!feed - can't reach /feed",
    "!profile": "!profile - can't find company profile on linkedin",
    "!about": "!about - could not perform /about scrapping",
    "!employees": "!employees - could not perform employees scrapping"
}

// auto scroll helper
// Used for: some websites load data as you navigate, and you may need to reproduce a full “human” browsing to get the information you need.
// @param {puppeteer object} page - the page to scroll down
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

/**
 * wait
 * @param {puppeteer object} page - the page to scroll down
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * run_exit
 * @param {string} status 
 */
const run_exit = (status) => {
    console.log(chalk.yellow("exit", status));
    process.exit(status);
}

/**
 * @params (Request) req - request with query params
 * @params (Response?) res - json response
 */
exports.scrapper = async (req, res) => {
    console.log(chalk.cyan("--- cloud function"));

    /* -------------------------------- */
    // debug
    /* -------------------------------- */
    let DEBUG;
    // DEBUG = true;
    console.log(chalk.yellow("req.method:"), JSON.stringify(req.method));
    console.log(chalk.yellow("req.params:"), JSON.stringify(req.params));
    console.log(chalk.yellow("req.query:"), JSON.stringify(req.query));
    console.log(chalk.yellow("req.body:"), JSON.stringify(req.body));
    /* -------------------------------- */

    /* -------------------------------- */
    // prepare response to send
    /* -------------------------------- */
    res.setHeader('Content-Type', 'application/json');
    let output = {
        query: {
            target_company: "",
            target_lead: ""
        },
        results: {
            company: {
                exists: false,
                linkedin_url: "",
                banner: {
                    name: "",
                    nb_followers: "",
                    link_to_employee_list: ""
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
                employees: {
                    hrefs: [],
                    list: []
                }
            },
            lead: {
                exists: false,
                name: "",
                linkedin_profile: ""
            }
        }
    };
    /* -------------------------------- */

    /* -------------------------------- */
    // check query string in req.query:
    // @param {string} target_company - must exist
    // @param {string} target_lead - is optional
    /* -------------------------------- */
    console.log(chalk.cyan("--- parse query params"));
    output.query.target_company = req.query.hasOwnProperty('target_company') ? req.query.target_company.trim() : "na";
    output.query.target_lead = req.query.hasOwnProperty('target_lead') ? req.query.target_lead.trim() : "na";
    if (output.query.target_company === "na") {
        res.status(400).send({ "error": errors["!query"] });
        return;
    }
    /* -------------------------------- */

    /* -------------------------------- */
    // proxy
    /* -------------------------------- */
    // todo
    let some_ip = '51.254.182.54:1000';
    // proxybot: "https://proxybot.io/api/v1/#KEY#?geolocation_code=mx&url=https://whatismycountry.com";
    /* -------------------------------- */

    /* -------------------------------- */
    // init Puppeteer
    /* -------------------------------- */
    console.log(chalk.cyan("--- init puppeteer"));
    let args = [
        '--disable-gpu',
        '--no-sandbox',
        // '--headless',
        `--proxy-server=${some_ip}`,
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-first-run',
        '--no-zygote',
        '--proxy-bypass-list=*',
        '--deterministic-fetch',
    ];
    let browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: args
    });
    let page = await browser.newPage();
    // console.log("default browser user agent: " + browser.userAgent());
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');
    // console.log("new browser user agent: " + browser.userAgent());
    /* -------------------------------- */

    try {
        /* -------------------------------- */
        // login to LinkedIn
        /* -------------------------------- */
        console.log(chalk.cyan("--- login to LinkedIn"));
        try {
            console.log(chalk.yellow("go to:"), params.linkedin.urls.login);
            await page.goto(params.linkedin.urls.login, { waitUntil: 'domcontentloaded' });
            await page.type('#username', params.linkedin.auth.fake.mail, { delay: 30 });
            await page.type('#password', params.linkedin.auth.fake.password, { delay: 30 });
            console.log(chalk.yellow("submit login form"));
            const [submit_button] = await page.$x("//button[contains(., 'S’identifier')]");
            await page.evaluateHandle(el => el.click(), submit_button);
            console.log(chalk.yellow("waiting for page to load ..."));
            await wait(5000);
            /* -------------------------------- */
            // check if redirection
            /* -------------------------------- */
            if (page.url() != params.linkedin.urls.feed) {
                console.log(chalk.red("ok now on:", page.url()));
                console.log(chalk.red("go get the code"));
                await wait(1000 * 30);
                /* -------------------------------- */
                // init GoogleSpreadsheet to get verification code
                /* -------------------------------- */
                console.log("trying to fetch gsheet ...");
                const doc = new GoogleSpreadsheet(params.gsheet.id);
                await doc.useServiceAccountAuth({
                    client_email: params.gsheet.client_email,
                    private_key: params.gsheet.private_key,
                });
                await doc.loadInfo();
                const sheet = doc.sheetsByIndex[0];
                await sheet.loadCells('A1:A1');
                const a1 = sheet.getCell(0, 0);
                console.log(a1.value);
                /* -------------------------------- */

                /* -------------------------------- */
                // verification
                /* -------------------------------- */
                console.log("trying to type code label");
                await page.type('#input__email_verification_pin', String(a1.value), { delay: 30 }); // params.linkedin.auth.fake.password

                console.log(chalk.yellow("trying to get code submit"));
                const [code_submit] = await page.$x("//button[contains(., 'Envoyer')]");
                if (code_submit) { console.log("code_submit is selected"); };
                await page.evaluateHandle(el => el.click(), code_submit);
                console.log(chalk.yellow("waiting for page to load ..."));
                await wait(5000);
                console.log("ok now on:", page.url());
                /* -------------------------------- */

                /* -------------------------------- */
                // retry check if != feed
                /* -------------------------------- */
                if (page.url() != params.linkedin.urls.feed) {
                    console.log(chalk.red("still !feed error, page is", page.url()));
                    console.log(chalk.cyan("--- closing puppeteer"));
                    res.status(422).send({ "error": errors["!feed"] });
                    await page.close();
                    await browser.close();
                    // process.exit(0);
                    return;
                }
                /* -------------------------------- */
            }
            /* -------------------------------- */
            console.log(chalk.yellow("waiting for selector #global-nav-search"));
            await page.waitForSelector('#global-nav-search');
            console.log(chalk.green("successfully logged in"));
        } catch (error) {
            console.log(chalk.red("error:", error));
            console.log(chalk.cyan("--- closing puppeteer"));
            res.status(422).send({ "error": errors["!login"] });
            await page.close();
            await browser.close();
            // process.exit(0);
            return;
        }
        /* -------------------------------- */

        /* -------------------------------- */
        // go to company/about page and get data
        /* -------------------------------- */
        try {
            console.log(chalk.cyan("--- get target company data"));
            console.log(chalk.yellow("go to:", output.query.target_company));
            await page.goto(output.query.target_company, { waitUntil: 'domcontentloaded' });
            // await wait(1000);
            // await page.waitForNavigation();

            /* -------------------------------- */
            // check if profile exists
            /* -------------------------------- */
            const [company_doesnt_exit] = await page.$x("//p[contains(., 'est pas disponible')]");
            if (company_doesnt_exit) {
                console.log(chalk.red("profile", output.query.target_company, "does not exist"));
                console.log(chalk.cyan("--- closing puppeteer"));
                res.status(422).send({ "error": errors["!profile"] });
                await page.close();
                await browser.close();
                // process.exit(0);
                return;
            }
            /* -------------------------------- */
            console.log(chalk.green("company does exist, page.url():"), page.url());

            // --- about banner
            // output.results.company.linkedIn url
            output.results.company.linkedin_url = page.url();
            // output.results.company.banner.link_to_employee_list
            let hrefs = []
            hrefs = await page.evaluate(
                () => Array.from(
                    document.querySelectorAll('a[href]'),
                    a => a.getAttribute('href')
                )
            );
            output.results.company.banner.link_to_employee_list = "na"
            for (var i = 0; i < hrefs.length; i++) {
                if (hrefs[i].startsWith("/search/results/people/")) {
                    output.results.company.banner.link_to_employee_list = "https://www.linkedin.com" + hrefs[i];
                    break;
                }
            }

            // --- about body
            // output.results.company.about.description
            const [presentation_h4] = await page.$x("//h4[contains(., 'Présentation')]");
            if (presentation_h4) {
                let elem = await page.evaluateHandle(el => el.nextElementSibling, presentation_h4);
                output.results.company.about.description = (await (await elem.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("description:"), output.results.company.about.description);
            } else {
                output.results.company.about.description = "na";
                console.log(chalk.redBright("no description"));
            }
            // output.results.company.about.site_url
            const [site_web_dt] = await page.$x("//dt[contains(., 'Site web')]");
            if (site_web_dt) {
                let elem_site_web = await page.evaluateHandle(el => el.nextElementSibling, site_web_dt);
                output.results.company.about.site_url = (await (await elem_site_web.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("site_url:"), output.results.company.about.site_url);
            } else {
                output.results.company.about.site_url = "na";
                console.log(chalk.redBright("no site_url"));
            }
            // output.results.company.about.sector
            const [sector_dt] = await page.$x("//dt[contains(., 'Secteur')]");
            if (sector_dt) {
                let elem_sector = await page.evaluateHandle(el => el.nextElementSibling, sector_dt);
                output.results.company.about.sector = (await (await elem_sector.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("sector:"), output.results.company.about.sector);
            } else {
                output.results.company.about.sector = "na";
                console.log(chalk.redBright("no sector"));
            }
            // output.results.company.about.employee_range
            const [employee_range_dt] = await page.$x("//dt[contains(., 'Taille de ')]");
            if (employee_range_dt) {
                let elem_employee_range = await page.evaluateHandle(el => el.nextElementSibling, employee_range_dt);
                output.results.company.about.employee_range = (await (await elem_employee_range.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("employee_range:"), output.results.company.about.employee_range);
                // output.results.company.about.employee_count
                try {
                    const [employee_count_dt] = await page.$x(`//dd[contains(., '${output.results.company.about.employee_range}')]`);
                    if (employee_count_dt) {
                        let elem_employee_count = await page.evaluateHandle(el => el.nextElementSibling, employee_count_dt);
                        let result = (await (await elem_employee_count.getProperty("textContent")).jsonValue()).trim();
                        let i = result.indexOf("sur LinkedIn");
                        output.results.company.about.elem_employee_count = result.substring(0, i + 12);
                        console.log(chalk.green("elem_employee_count:"), output.results.company.about.elem_employee_count);
                    } else {
                        output.results.company.about.elem_employee_count = "na";
                        console.log(chalk.redBright("no elem_employee_count"));
                    }
                } catch {
                    output.results.company.about.elem_employee_count = "na";
                    console.log(chalk.redBright("error, no elem_employee_count:", error));
                }
            } else {
                output.results.company.about.employee_range = "na";
                console.log(chalk.redBright("no employee_range"));
            }
            // output.results.company.about.headquarters
            const [headquarters_dt] = await page.$x("//dt[contains(., 'Siège social')]");
            if (headquarters_dt) {
                let elem_headquarters = await page.evaluateHandle(el => el.nextElementSibling, headquarters_dt);
                output.results.company.about.headquarters = (await (await elem_headquarters.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("headquarters:"), output.results.company.about.headquarters);
            } else {
                output.results.company.about.headquarters = "na";
                console.log(chalk.redBright("no headquarters"));
            }
            // output.results.company.about.type
            const [type_dt] = await page.$x("//dt[contains(., 'Type')]");
            if (type_dt) {
                let elem_type = await page.evaluateHandle(el => el.nextElementSibling, type_dt);
                output.results.company.about.type = (await (await elem_type.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("type:"), output.results.company.about.type);
            } else {
                output.results.company.about.type = "na";
                console.log(chalk.redBright("no type"));
            }
        } catch {
            console.log(chalk.cyan("--- closing puppeteer"));
            res.status(422).send({ "error": errors["!about"] });
            await page.close();
            await browser.close();
            // process.exit(0);
            return;
        }

        /* -------------------------------- */
        // if link to employees, go to and get names (skip for now)
        /* -------------------------------- */
        if (output.results.company.banner.link_to_employee_list != "na") {
            try {
                console.log(chalk.cyan("--- get list of employees"));
                await page.goto(output.results.company.banner.link_to_employee_list, { waitUntil: 'domcontentloaded' });
                await autoScroll(page);
                console.log(chalk.yellow("page.url() is now:", page.url()));
                // get hrefs employees
                let hrefs = [];
                hrefs = await page.evaluate(
                    () => Array.from(
                        document.querySelectorAll('a[href]'),
                        a => a.getAttribute('href')
                    )
                );
                // get linkedIn url profiles
                for (var i = 0; i < hrefs.length; i++) {
                    if (hrefs[i].startsWith("/in/")) {
                        if (!output.results.company.employees.hrefs.includes("https://www.linkedin.com" + hrefs[i])) {
                            let complete_url = "https://www.linkedin.com" + hrefs[i];
                            console.log(chalk.green("employee.url:"), complete_url);
                            output.results.company.employees.hrefs.push(complete_url);
                            if (output.query.target_lead != "na" && complete_url === output.query.target_lead) {
                                output.results.lead.linkedin_profile = complete_url;
                            }
                        }
                    }
                }
                // get names
                // const elements = await page.$$('span.distance-badge');
                // for (var i = 0; i < elements.length; i++) {
                //     let employee = {
                //         linkedin_url: "",
                //         name: "",
                //         position: "",
                //         location: ""
                //     }
                //     let span_with_name = await page.evaluateHandle(el => el.previousElementSibling, elements[i]);
                //     employee.name = (await (await span_with_name.getProperty("textContent")).jsonValue()).trim();
                //     output.results.company.employees.list.push(employee);
                //     console.log(chalk.green("employee.name:"), employee.name);
                // }

                // get employee data
                for (var i = 0; i < output.results.company.employees.hrefs.length; i++) {
                    let employee = {
                        linkedin_url: "na",
                        name: "na",
                        position: "na",
                        location: "na",
                        isFounder: "false",
                        isCEO: "false",
                        isCFO: "false",
                        isCTO: "false"
                    }
                    employee.linkedin_url = output.results.company.employees.hrefs[i];
                    let href_i = output.results.company.employees.hrefs[i].substring(24);
                    console.log("href_i:", href_i);
                    const a_hrefs_employee = await page.$x(`//a[@href='${href_i}']`);
                    // name
                    let name = await page.evaluateHandle(el => el, a_hrefs_employee[1]);
                    employee.name = (await (await name.getProperty("textContent")).jsonValue()).trim().split(/\n/)[0];
                    // position
                    let position = await page.evaluateHandle(el => el.nextElementSibling, a_hrefs_employee[1]);
                    employee.position = (await (await position.getProperty("textContent")).jsonValue()).trim();
                    // position
                    let location = await page.evaluateHandle(el => el.nextElementSibling, position);
                    employee.location = (await (await location.getProperty("textContent")).jsonValue()).trim();
                    // is key
                    let position_lower = employee.position.toLowerCase();
                    let founder_titles = ["fondateur", "cofondateur", "co-fondateur", "founder", "cofounder", "co-founder"];
                    let ceo_titles = ["ceo", "managing partner"];
                    let cfo_titles = ["cfo"];
                    let cto_titles = ["cto"];
                    for (var j = 0; j < founder_titles.length; j++) {
                        if (position_lower.includes(founder_titles[j])) { employee.isFounder = "true"; }
                    }
                    for (var j = 0; j < ceo_titles.length; j++) {
                        if (position_lower.includes(ceo_titles[j])) { employee.isCEO = "true"; }
                    }
                    for (var j = 0; j < cfo_titles.length; j++) {
                        if (position_lower.includes(cfo_titles[j])) { employee.isCFO = "true"; }
                    }
                    for (var j = 0; j < cto_titles.length; j++) {
                        if (position_lower.includes(cto_titles[j])) { employee.isCTO = "true"; }
                    }
                    console.table(employee);
                    output.results.company.employees.list.push(employee);
                }
            } catch (error) {
                console.log(chalk.red("error:", error));
                console.log(chalk.cyan("--- closing puppeteer"));
                res.status(422).send({ "error": errors["!employees"] });
                await page.close();
                await browser.close();
                // process.exit(0);
                return;
            }
        }
        /* -------------------------------- */

        /* -------------------------------- */
        // get name of target lead
        /* -------------------------------- */
        if (output.query.target_lead != "na") {
            console.log(chalk.cyan("--- get name of target lead"));
            console.log(chalk.yellow("go to:", output.query.target_lead));
            await page.goto(output.query.target_lead, { waitUntil: 'domcontentloaded' });
            // await page.waitForNavigation();
            // await wait(1000);

            /* -------------------------------- */
            // check if lead profile exists
            /* -------------------------------- */
            const [lead_doesnt_exit] = await page.$x("//h1[contains(., 'est pas disponible')]");
            if (lead_doesnt_exit) {
                console.log(chalk.red("profile", output.query.target_lead, "does NOT exist"));
                console.log(chalk.cyan("--- closing puppeteer"));
                res.status(422).send({ "error": errors["!profile"] });
                await page.close();
                await browser.close();
                // process.exit(0);
                return;
            }
            /* -------------------------------- */
            console.log(chalk.green("lead target does exist, page.url():", page.url()));
            output.results.lead.linkedin_profile = page.url().trim();

            const elements = await page.$$('span.distance-badge');
            if (elements) {
                let parent = await page.evaluateHandle(el => el.parentElement, elements[0]);
                let previous = await page.evaluateHandle(el => el.previousElementSibling, parent);
                output.results.lead.name = (await (await previous.getProperty("textContent")).jsonValue()).trim();
                console.log(chalk.green("lead.name:"), output.results.lead.name);
            }
        }
        /* -------------------------------- */

        /* -------------------------------- */
        // close Puppeteer
        /* -------------------------------- */
        console.log(chalk.cyan("--- closing puppeteer"));
        res.status(200).send(JSON.stringify(output)).end();
        await page.close();
        await browser.close();
        // process.exit(0);
        return;
        /* -------------------------------- */
    } catch {
        console.log(chalk.cyan("--- closing puppeteer"));
        res.status(422).send({ "error": errors["!puppeteer"] });
        await page.close();
        await browser.close();
        // process.exit(0);
        return;
    }
}