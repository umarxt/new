// يُشغَّل على Netlify قبل النشر: يضع رابط Google Sheets وكلمته السرية في config.js
// من متغيرات البيئة SHEET_URL و SHEET_TOKEN، حتى لا تُحفظا داخل المستودع.
// إن لم تُضبط المتغيرات يبقى الإرسال متوقفًا ولا يتغير شيء.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'config.js');
const url = (process.env.SHEET_URL || '').trim();
const token = (process.env.SHEET_TOKEN || '').trim();

if (!url) {
  console.log('SHEET_URL غير مضبوط: إرسال النتائج إلى Google Sheets متوقف.');
  process.exit(0);
}
if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
  console.error('SHEET_URL ليس رابط تطبيق ويب صالحًا من Apps Script (يجب أن ينتهي بـ /exec).');
  process.exit(1);
}

let src = fs.readFileSync(file, 'utf8');
const a = 'sheetUrl: "",', b = 'sheetToken: "",';
if (!src.includes(a) || !src.includes(b)) {
  console.error('لم أجد الحقلين sheetUrl و sheetToken فارغين في config.js.');
  process.exit(1);
}
src = src.replace(a, 'sheetUrl: ' + JSON.stringify(url) + ',')
         .replace(b, 'sheetToken: ' + JSON.stringify(token) + ',');
fs.writeFileSync(file, src);
console.log('تم ربط إرسال النتائج بـ Google Sheets.');
