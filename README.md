# 🏆 لوحة تحكم المسابقة - Competition Dashboard

لوحة تحكم احترافية عربية لإدارة مسابقة متصلة بـ Google Forms عبر Google Apps Script.

## المميزات

- **تصميم احترافي** بألوان أسود وذهبي
- **واجهة عربية** كاملة مع دعم RTL
- **متجاوبة** تعمل على الجوال والكمبيوتر
- **لوحة تحكم** كاملة مع 8 أزرار تحكم
- **صفحة إحصائيات** مع رسم بياني وتحديث تلقائي
- **إدارة مستخدمين** مع صلاحيات (مدير / مشاهد)
- **إعدادات** لربط Google Apps Script
- **إشعارات** نجاح وفشل احترافية
- **سجل أنشطة** لتتبع العمليات
- **معالجة أخطاء** متقدمة بدون تعطيل الموقع

## الملفات

```
competition-dashboard/
├── index.html      # الصفحة الرئيسية
├── style.css       # ملف التنسيقات
├── app.js          # ملف JavaScript الرئيسي
└── README.md       # هذا الملف
```

## طريقة الاستخدام

### 1. رفع الملفات
ارفع الملفات الثلاثة (`index.html`, `style.css`, `app.js`) على أي استضافة أو GitHub Pages.

### 2. إعداد Google Apps Script
1. أنشئ مشروع Google Apps Script جديد
2. أضف الكود التالي كمثال:

```javascript
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  
  switch(action) {
    case 'openForm':
      // كود فتح النموذج
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'closeForm':
      // كود إغلاق النموذج
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'update':
      // كود تحديث السؤال
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'update_open':
      // كود تحديث وفتح
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'delete':
      // كود حذف الردود
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'backup':
      // كود النسخ الاحتياطي
      return ContentService.createTextOutput(JSON.stringify({success: true}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'results1':
      // كود نتائج آخر سؤال
      return ContentService.createTextOutput(JSON.stringify({success: true, results: []}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'results3':
      // كود نتائج آخر 3 أسئلة
      return ContentService.createTextOutput(JSON.stringify({success: true, results: []}))
        .setMimeType(ContentService.MimeType.JSON);
    
    case 'stats':
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        totalResponses: 120,
        todayResponses: 30,
        lastResponse: new Date().toISOString(),
        correctAnswers: 25,
        totalAnswersOnLastQ: 30,
        lastQuestion: 'ما عاصمة مصر؟',
        formStatus: 'open'
      })).setMimeType(ContentService.MimeType.JSON);
    
    default:
      return ContentService.createTextOutput(JSON.stringify({success: false, message: 'Unknown action'}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. انشر السكربت كـ Web App
4. انسخ الرابط وضعه في إعدادات لوحة التحكم

### 3. تسجيل الدخول
- **اسم المستخدم الافتراضي:** `admin`
- **كلمة المرور الافتراضية:** `admin123`

> ⚠️ يُنصح بتغيير كلمة المرور فوراً من صفحة الإعدادات

## الأزرار والوظائف

| الزر | Action | الوصف |
|------|--------|-------|
| فتح النموذج | `openForm` | فتح نموذج Google Forms للمشاركين |
| إغلاق النموذج | `closeForm` | إغلاق النموذج ومنع الإجابات |
| تحديث السؤال | `update` | تحديث السؤال الحالي |
| تحديث وفتح | `update_open` | تحديث السؤال وفتح النموذج |
| حذف الردود | `delete` | حذف جميع الردود (مع تأكيد) |
| نسخ احتياطي | `backup` | عمل نسخة احتياطية |
| نتائج آخر سؤال | `results1` | عرض نتائج آخر سؤال |
| نتائج آخر 3 أسئلة | `results3` | عرض نتائج آخر 3 أسئلة |

## صلاحيات المستخدمين

| الصلاحية | الوصف |
|----------|-------|
| مدير (admin) | تحكم كامل في جميع الوظائف |
| مشاهد (viewer) | مشاهدة الإحصائيات والنتائج فقط |

## التقنيات المستخدمة

- HTML5
- CSS3 (مع CSS Variables)
- JavaScript (Vanilla JS)
- Chart.js (للرسوم البيانية)
- Font Awesome (للأيقونات)
- Google Fonts - Tajawal (للخط العربي)
- localStorage (لتخزين البيانات)

## طريقة الإرسال للسكربت

```javascript
fetch(SCRIPT_URL, {
  method: "POST",
  headers: { "Content-Type": "text/plain;charset=utf-8" },
  body: JSON.stringify({ action: "openForm" })
})
```

## الاستجابة المتوقعة

```json
{ "success": true }
```

أو للإحصائيات:

```json
{
  "success": true,
  "totalResponses": 120,
  "todayResponses": 30,
  "lastResponse": "2026-02-10T15:20:00",
  "correctAnswers": 25,
  "totalAnswersOnLastQ": 30,
  "lastQuestion": "ما عاصمة مصر؟",
  "formStatus": "open"
}
```

## الرخصة

هذا المشروع مفتوح المصدر ويمكنك استخدامه وتعديله بحرية.
