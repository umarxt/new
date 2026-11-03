/**
 * استقبال نتائج محاكي PMP في Google Sheets
 *
 * الخطوات:
 * 1) أنشئ جدول Google Sheets جديدًا (أي اسم).
 * 2) من القائمة: الإضافات (Extensions) ← Apps Script.
 * 3) احذف كل ما في المحرر والصق هذا الملف كاملًا.
 * 4) غيّر قيمة TOKEN أدناه إلى كلمة سرية من اختيارك (حروف وأرقام).
 * 5) اضغط نشر (Deploy) ← نشر جديد (New deployment) ← النوع: تطبيق ويب (Web app):
 *      - Execute as (تنفيذ بصفة): Me (أنا)
 *      - Who has access (من يملك حق الوصول): Anyone (أي شخص)
 *    ثم نشر، ووافق على الصلاحيات المطلوبة.
 * 6) انسخ "رابط تطبيق الويب" الذي ينتهي بـ /exec.
 * 7) في ملف config.js ضع الرابط في sheetUrl والكلمة السرية في sheetToken.
 *
 * عند تعديل هذا الكود لاحقًا اختر: نشر ← إدارة عمليات النشر ← تعديل ← إصدار جديد.
 */
var TOKEN = 'غيّرني-إلى-كلمة-سرية';
var SHEET_NAME = 'النتائج';
var HEADERS = ['وقت التسليم', 'الاسم', 'نوع الاختبار', 'عدد الأسئلة', 'الإجابات الصحيحة',
               'النسبة %', 'النتيجة', 'المستوى', 'الوقت المستخدم (دقيقة)', 'سبب الإنهاء',
               'الأفراد', 'العمليات', 'بيئة الأعمال', 'الأسئلة الخاطئة', 'معرّف المحاولة'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.token !== TOKEN) return out_({ ok: false, error: 'bad token' });

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
      new Date(d.time), d.name, d.mode, d.total, d.correct, d.pct, d.result, d.level,
      Math.round(d.seconds / 60), ended, d.people, d.process, d.business, d.wrong, String(d.sid)
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
