import { chromium } from 'playwright'; import fs from 'fs';
const b = await chromium.launch({executablePath: process.env.CH}); const p = await b.newPage();
for (const [s,n] of [['budget-planner','Budget-Planner-Guide.pdf'],['debt-payoff-planner','Debt-Payoff-Planner-Guide.pdf']]) {
  const d='/home/user/aban-news-landing/content/etsy/en/'+s+'/files/';
  await p.goto('file://'+d+'_guide.html'); await p.pdf({path:d+n,format:'A4',printBackground:true,preferCSSPageSize:true}); fs.unlinkSync(d+'_guide.html'); console.log('→',n);
}
await b.close();
