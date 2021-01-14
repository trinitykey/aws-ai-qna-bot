const chromium = require('chrome-aws-lambda');


async function getTextFromUrl(url)
{
    let result = null;
    let browser = null;
  
    try {
      browser = await chromium.puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath,
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
  
      let page = await browser.newPage();
  
      await page.goto(url);
  
      result = await page.$eval('*', el => el.innerText); 
      console.log(result);;
    } catch (error) {
      return callback(error);
    } finally {
      if (browser !== null) {
        await browser.close();
      }
    }
}
exports.handler = async (event, context) => {


  return result;
};

;(async function main () {
    try {
      await getTextFromUrl("https://dlt.ri.gov/apprenticeship/")
    } catch(err){
      // handle error
    }
  })()