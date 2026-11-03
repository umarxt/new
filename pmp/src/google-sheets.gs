/**
 * استقبال نتائج محاكي PMP في Google Sheets
 *
 * الخطوات:
 * 1) أنشئ جدول Google Sheets جديدًا (أي اسم).
 * 2) من القائمة: الإضافات (Extensions) ← Apps Script.
 * 3) احذف كل ما في المحرر والصق هذا الملف كاملًا.
 * 4) TOKEN اختيارية: اتركها فارغة '' ليعمل الإرسال بدون كلمة سرية،
 *    أو ضع كلمة وضعها نفسها في sheetToken (أو متغير SHEET_TOKEN على Netlify).
 * 5) اضغط نشر (Deploy) ← نشر جديد (New deployment) ← النوع: تطبيق ويب (Web app):
 *      - Execute as (تنفيذ بصفة): Me (أنا)
 *      - Who has access (من يملك حق الوصول): Anyone (أي شخص)
 *    ثم نشر، ووافق على الصلاحيات المطلوبة.
 * 6) انسخ "رابط تطبيق الويب" الذي ينتهي بـ /exec.
 * 7) في ملف config.js ضع الرابط في sheetUrl (وكلمة السر في sheetToken إن استخدمتها).
 *
 * عند تعديل هذا الكود لاحقًا اختر: نشر ← إدارة عمليات النشر ← تعديل ← إصدار جديد.
 */
var TOKEN = '';
var SHEET_NAME = 'النتائج';
var HEADERS = ['وقت التسليم', 'الاسم', 'نوع الاختبار', 'عدد الأسئلة', 'الإجابات الصحيحة',
               'النسبة %', 'النتيجة', 'المستوى', 'الوقت المستخدم (دقيقة)', 'سبب الإنهاء',
               'الأفراد', 'العمليات', 'بيئة الأعمال', 'الأسئلة الخاطئة', 'معرّف المحاولة'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (TOKEN && d.token !== TOKEN) return out_({ ok: false, error: 'bad token' });

    // فحص بسيط يمنع الصفوف العشوائية
    if (typeof d.name !== 'string' || !d.name.trim() || d.name.length > 80 ||
        typeof d.total !== 'number' || typeof d.correct !== 'number' ||
        d.total < 1 || d.total > 400 || d.correct < 0 || d.correct > d.total) {
      return out_({ ok: false, error: 'bad data' });
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.setFrozenRows(1);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sh.setRightToLeft(true);
    }

    // منع تكرار نفس المحاولة إذا أُرسلت مرتين
    var last = sh.getLastRow();
    if (last > 1) {
      var from = Math.max(2, last - 300);
      var ids = sh.getRange(from, HEADERS.length, last - from + 1, 1).getValues();
      for (var i = 0; i < ids.length; i++) {
        if (String(ids[i][0]) === String(d.sid)) return out_({ ok: true, duplicate: true });
      }
    }

    var ended = { time: 'انتهى الوقت', manual: 'أنهى يدويًا', done: 'أكمل الأقسام' }[d.ended] || d.ended;
    sh.appendRow([
      new Date(d.time), d.name.trim(), String(d.mode).slice(0, 40), d.total, d.correct, d.pct, d.result, d.level,
      Math.round(d.seconds / 60), ended, String(d.people).slice(0, 12), String(d.process).slice(0, 12), String(d.business).slice(0, 12), String(d.wrong).slice(0, 2500), String(d.sid)
    ]);
    return out_({ ok: true });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// للتجربة من المتصفح: فتح الرابط يعرض هذه الرسالة فقط ولا يكشف أي بيانات
function doGet() { return out_({ ok: true, service: 'pmp-results' }); }

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
