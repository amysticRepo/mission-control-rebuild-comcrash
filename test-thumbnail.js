const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://localhost:3000/daily-news.html');
    await page.waitForSelector('.news-layer');
    await page.click('#syncButton');
    await new Promise(r => setTimeout(r, 4000));
    
    // check if .news-thumbnail exists
    const html = await page.evaluate(() => {
        const aiContainer = document.getElementById('aiNewsContainer');
        return aiContainer ? aiContainer.innerHTML : 'Not found';
    });
    console.log(html);
    await browser.close();
})();
