const puppeteer = require('puppeteer');
const axios = require('axios');
const kleur = require('kleur');
const STARTING_URL = process.argv?.[2] || 'https://meilisearch-staging.vercel.app/docs';
const URL_PATH_NAME = process.argv?.[3] || '/docs/';
const deadLinks = new Map();
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', message => {
    if (message.type() === 'error') {
      if (message.text().includes('status of 404')) {
        const pageUrl = page.url()
        
        if (deadLinks.has(pageUrl)) {
          const pageSet = deadLinks.get(pageUrl)
          pageSet.add(message.location().url)
          deadLinks.set(pageUrl, pageSet)
        } else {
          const pageSet = new Set()
          pageSet.add(message.location().url)
          deadLinks.set(pageUrl, pageSet)
        }
        
        console.log(`${kleur.blue(message.location().url || '')} ${kleur.red('in')} ${kleur.blue(pageUrl)} - ${kleur.red('is dead!')}`)
      }
    }
  });
  // Define the starting URL for the crawler
  const startingUrl = STARTING_URL;

  // Create a set to store visited URLs
  const visitedUrls = new Set();
  const requestedUrls = new Set();
  const deadLinksCache = new Set();

  // Define a function to crawl a URL and extract page titles
  const crawl = async (url) => {
    // Mark the URL as visited
    visitedUrls.add(url);

    // Navigate to the page
    await page.goto(url);


    // All links on page
    const allLinks = await page.$$eval(`a`, links => links.map(link => link.href));
    
    for (let link of allLinks) {
      link = link.replace(/#.*$/i, '')
      try {
        if (!requestedUrls.has(link)) {
          await axios(link)
        } else if (deadLinksCache.has(link)) {
          throw new Error()
        }
      } catch (e) {
        // console.log(`${kleur.red('Dead link')}: ${kleur.red(link)} on page ${url}`)
        console.log(`${kleur.blue(link)} ${kleur.red('in')} ${kleur.blue(url)} - ${kleur.red('is dead!')}`)
        if (deadLinks.has(url)) {
          const pageSet = deadLinks.get(url)
          pageSet.add(link)
          deadLinks.set(url, pageSet)
        } else {
          const pageSet = new Set()
          pageSet.add(link)
          deadLinks.set(url, pageSet)
        }
        deadLinksCache.add(link)
      }
      requestedUrls.add(link)
    }
    // Follow links to other pages on the site
    const links = await page.$$eval(`a[href^="${URL_PATH_NAME}"]`, links => links.map(link => link.href));
    for (let link of links) {
      link = link.replace(/#.*$/i, '')
      if (!visitedUrls.has(link)) {
        fs.appendFileSync("visited-urls.txt", `${link}\n`)
        await crawl(link);
      }
    }
  };

  // Start the crawler at the starting URL
  await crawl(startingUrl);

  await browser.close();
  

  if (deadLinks.size > 0) {
    console.log(kleur.red("Dead links were found. Logs written in 'dead-links.json'"))
    const deadLinksObj = Object.fromEntries(deadLinks)
    for (const key in deadLinksObj) {
      deadLinksObj[key] = [...deadLinksObj[key]]
    }
    fs.writeFileSync("dead-links.json", JSON.stringify(deadLinksObj, null, 2))
    process.exit(0);
  }
  console.log(kleur.green("No dead links <3"))
  process.exit(1);
})();
