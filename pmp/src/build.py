#!/usr/bin/env python3
"""يحوّل ملفات الأسئلة النصية في هذا المجلد (part*.txt) إلى ملف ../questions.js

صيغة السؤال في الملفات النصية:
    #رقم مجال [fill قيمة]      المجال: p الأفراد | r العمليات | b بيئة الأعمال
    نص السؤال (يمكن أن يمتد على عدة أسطر)
    - الخيار الأول
    - الخيار الثاني
    - الخيار الثالث
    - الخيار الرابع
    = B                         رمز الإجابة الصحيحة: A أو B أو C أو D
    (سؤال الإدخال الرقمي: السطر الأخير = الرقم، ولا توجد خيارات)
    (سطر يبدأ بـ "شرح:" بعد الإجابة يضيف شرحًا للسؤال)

التشغيل:  python3 build.py
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "questions.js")
DOMAINS = {"p": "people", "r": "process", "b": "business"}
LETTERS = "ABCD"

questions, seen, errors = [], set(), []


def parse_block(block, src):
    lines = [l.rstrip() for l in block.strip().split("\n")]
    head = re.match(r"#(\d+)\s+([prb])(?:\s+fill\s+(\S+))?$", lines[0])
    if not head:
        errors.append(f"{src}: رأس غير صالح: {lines[0]!r}")
        return
    num, dom, fill = int(head.group(1)), head.group(2), head.group(3)
    stem, opts, ans, expl = [], [], None, []
    for l in lines[1:]:
        if l.startswith("- "):
            opts.append(l[2:].strip())
        elif l.startswith("= "):
            ans = l[2:].strip()
        elif l.startswith("شرح:"):
            expl.append(l[4:].strip())
        elif not opts and ans is None:
            stem.append(l)
        elif expl:
            expl.append(l)
        else:
            errors.append(f"#{num}: سطر في غير موضعه: {l!r}")
    q = {"id": f"Q{num}", "domain": DOMAINS[dom], "q": "\n".join(stem).strip()}
    if num in seen:
        errors.append(f"#{num}: رقم مكرر")
    seen.add(num)
    if fill is not None:
        if opts:
            errors.append(f"#{num}: سؤال رقمي لا يحتاج خيارات")
        q["type"] = "fill"
        q["answer"] = float(ans) if "." in str(ans) else int(ans)
        q["tolerance"] = 0
    else:
        q["type"] = "single"
        if len(opts) != 4:
            errors.append(f"#{num}: عدد الخيارات {len(opts)} بدل 4")
        if ans not in list(LETTERS):
            errors.append(f"#{num}: رمز الإجابة غير صالح: {ans!r}")
            return
        q["options"] = opts
        q["answer"] = LETTERS.index(ans)
    if expl:
        q["explanation"] = " ".join(expl)
    if not q["q"]:
        errors.append(f"#{num}: نص السؤال فارغ")
    questions.append(q)


for path in sorted(glob.glob(os.path.join(HERE, "part*.txt"))):
    text = open(path, encoding="utf-8").read()
    for block in re.split(r"\n(?=#\d+\s)", "\n" + text):
        if block.strip():
            parse_block(block, os.path.basename(path))

if errors:
    print("أخطاء:\n  " + "\n  ".join(errors))
    sys.exit(1)

questions.sort(key=lambda q: int(q["id"][1:]))
header = """/* =====================================================================
   بنك أسئلة محاكي اختبار PMP
   ---------------------------------------------------------------------
   هذا الملف يُولَّد تلقائيًا من الملفات النصية في المجلد src/ بالأمر:
       python3 src/build.py
   لتعديل سؤال أو إضافة أسئلة عدّل ملفات src/part*.txt ثم أعد التشغيل.
   (شرح الصيغة في أعلى ملف src/build.py)

   حقول السؤال:
     id, domain (people | process | business), type (single | multi | match | fill),
     q, options, answer (رقم الخيار الصحيح يبدأ من 0)، explanation (اختياري)
   ===================================================================== */
"""
with open(OUT, "w", encoding="utf-8") as f:
    f.write(header)
    f.write("window.PMP_QUESTIONS = ")
    f.write(json.dumps(questions, ensure_ascii=False, indent=1))
    f.write(";\n")

by = {}
for q in questions:
    by[q["domain"]] = by.get(q["domain"], 0) + 1
print(f"تم: {len(questions)} سؤالًا ->", by)
