const puppeteer = require('puppeteer');
const kleur = require('kleur');
const STARTING_URL = process.argv?.[2] || 'https://meilisearch-staging.vercel.app/docs';
const URL_PATH_NAME = process.argv?.[3] || '/docs/';
const deadLinks = {};
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', message => {
    if (message.type() === 'error') {
      if (message.text().includes('status of 404')) {
        const pageUrl = page.url()
        deadLinks[pageUrl] = deadLinks[pageUrl] || []
        
        // console.log(message.stackTrace());
        console.log(`${kleur.red('Dead link')}: ${kleur.red(message.location().url || '')} on page ${pageUrl}`)
        deadLinks[pageUrl].push(message.location().url)
      }
    }
  });
  // Define the starting URL for the crawler
  const startingUrl = STARTING_URL;

  // Create a set to store visited URLs
  const visitedUrls = new Set();

  // Define a function to crawl a URL and extract page titles
  const crawl = async (url) => {
    // Mark the URL as visited
    visitedUrls.add(url);

    // Navigate to the page
    await page.goto(url);

    // Follow links to other pages on the site
    const links = await page.$$eval(`a[href^="${URL_PATH_NAME}"]`, links => links.map(link => link.href));
    for (const link of links) {
      if (!visitedUrls.has(link)) {
        await crawl(link);
      }
    }
  };

  // Start the crawler at the starting URL
  await crawl(startingUrl);

  await browser.close();
  

  if (Object.keys(deadLinks).length > 0) {
    console.log(kleur.red("Dead links were found. Logs written in 'dead-links.json'"))
    console.log(fs.writeFileSync("dead-links.json", JSON.stringify(deadLinks, null, 2)))
    process.exit(0);
  }
  console.log(kleur.green("No dead links <3"))
  process.exit(1);
})();
