"""Exports the AKIS account lists (HANDOVER Parts 40 and 44) from live data.

    ml/.venv/Scripts/python scripts/export-account-lists.py

Writes, in the School App folder (all gitignored by `AKIS Accounts - *`):
  AKIS Accounts - All Users           .xlsx/.pdf  name, role, username
  AKIS Accounts - Teachers            .xlsx/.pdf
  AKIS Accounts - Students and Parents.xlsx/.pdf
  AKIS Accounts - Student Logins      .xlsx/.pdf  ONLY if AKIS_STUDENT_PASSWORD
      is set: username + password per student, grouped by class, plus cut-out
      login cards, for teachers to hand to their students.

The password is never stored here: pass it in the environment for one run.
Needs: pip install openpyxl reportlab (into ml/.venv).
"""

import json
import os
import sys
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
AKIS = "00000000-0000-0000-0000-000000000001"
SITE = "www.alkamal.app"
SCHOOL = "Al Kamal International Studies"
NAVY = colors.HexColor("#0f2a4a")
GREY = colors.HexColor("#64748b")
LINE = colors.HexColor("#cbd5e1")
TODAY = date.today().strftime("%d %B %Y").lstrip("0")


# --------------------------------------------------------------------- data
def env() -> dict:
    out = {}
    for line in (ROOT / ".env.local").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1)
            out[k.strip()] = v.strip().strip('"')
    return out


E = env()


def rest(path: str) -> list:
    req = urllib.request.Request(
        f"{E['NEXT_PUBLIC_SUPABASE_URL']}/rest/v1/{path}",
        headers={"apikey": E["SUPABASE_SERVICE_ROLE_KEY"], "Authorization": f"Bearer {E['SUPABASE_SERVICE_ROLE_KEY']}"},
    )
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())


def load() -> dict:
    access = {r["profile_id"] for r in rest(f"profile_center_access?select=profile_id&center_id=eq.{AKIS}")}
    profiles = [
        p for p in rest("profiles?select=id,full_name,email,role,is_active,archived_at&archived_at=is.null")
        if p["id"] in access and p["is_active"]
    ]
    classes = {c["id"]: c for c in rest("classes?select=id,name,section,homeroom_teacher_id")}
    subjects = {s["id"]: s["name"] for s in rest("subjects?select=id,name")}
    students = {s["id"]: s for s in rest("students?select=id,enrollment_number,class_id")}
    teachers = {t["id"]: t for t in rest("teachers?select=id,employee_id")}
    cst = rest("class_subject_teachers?select=class_id,subject_id,teacher_id")
    links = rest("parent_students?select=parent_id,student_id")
    return dict(profiles=profiles, classes=classes, subjects=subjects, students=students, teachers=teachers, cst=cst, links=links)


def class_name(c: dict | None) -> str:
    return f"{c['name']} {c['section']}" if c else "No class"


def class_sort_key(label: str):
    # KG first, then Grade 1, 2, ... 10 in numeric order
    parts = label.replace("-", " ").split()
    nums = [int(p) for p in parts if p.isdigit()]
    return (0 if label.upper().startswith("KG") else 1, nums[0] if nums else 99, label)


# --------------------------------------------------------------- styling
TITLE_FONT = Font(name="Calibri", size=14, bold=True, color="0F2A4A")
SUB_FONT = Font(name="Calibri", size=10, color="64748B")
HEAD_FONT = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="0F2A4A")
BAND_FILL = PatternFill("solid", fgColor="F1F5F9")
THIN = Side(style="thin", color="CBD5E1")


def write_sheet(ws, title: str, subtitle: str, header: list[str], rows: list[list], notes: list[str] = ()):
    ws.append([title])
    ws["A1"].font = TITLE_FONT
    ws.append([subtitle])
    ws["A2"].font = SUB_FONT
    for n in notes:
        ws.append([n])
        ws.cell(ws.max_row, 1).font = SUB_FONT
    ws.append([])
    ws.append(header)
    hr = ws.max_row
    for i in range(1, len(header) + 1):
        c = ws.cell(hr, i)
        c.font, c.fill = HEAD_FONT, HEAD_FILL
        c.alignment = Alignment(vertical="center")
    for k, row in enumerate(rows):
        ws.append(row)
        for i in range(1, len(header) + 1):
            c = ws.cell(ws.max_row, i)
            c.border = Border(bottom=THIN)
            c.alignment = Alignment(vertical="top", wrap_text=True)
            if k % 2:
                c.fill = BAND_FILL
    for i, h in enumerate(header, start=1):
        width = max([len(str(h))] + [max((len(x) for x in str(r[i - 1] or "").split("\n")), default=0) for r in rows])
        ws.column_dimensions[get_column_letter(i)].width = min(max(width + 2, 6), 48)
    ws.freeze_panes = ws.cell(hr + 1, 1)
    ws.print_options.gridLines = False
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth = 1
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.page_setup.fitToHeight = 0


P_TITLE = ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=NAVY, spaceAfter=2)
P_SUB = ParagraphStyle("s", fontName="Helvetica", fontSize=9, textColor=GREY, spaceAfter=8)
P_H2 = ParagraphStyle("h", fontName="Helvetica-Bold", fontSize=11.5, leading=15, textColor=NAVY, spaceBefore=6, spaceAfter=4)
P_CELL = ParagraphStyle("c", fontName="Helvetica", fontSize=8.5, leading=10.5)
P_CELL_B = ParagraphStyle("cb", parent=P_CELL, fontName="Helvetica-Bold")
P_NOTE = ParagraphStyle("n", fontName="Helvetica", fontSize=9, leading=12.5, textColor=colors.HexColor("#334155"))


def esc(s) -> str:
    return str(s or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")


def pdf_table(header, rows, widths, mono_cols=()):
    data = [[Paragraph(esc(h), ParagraphStyle("hh", parent=P_CELL_B, textColor=colors.white)) for h in header]]
    for r in rows:
        data.append([
            Paragraph(f'<font name="Courier-Bold" size="8">{esc(v)}</font>' if i in mono_cols else esc(v), P_CELL)
            for i, v in enumerate(r)
        ])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 1), (-1, -1), 0.4, LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def footer(label: str):
    def draw(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GREY)
        w, _ = doc.pagesize
        canvas.drawString(15 * mm, 9 * mm, f"{SCHOOL} · {label} · {TODAY} · Confidential")
        canvas.drawRightString(w - 15 * mm, 9 * mm, f"Page {doc.page}")
        canvas.restoreState()
    return draw


def build_pdf(path: Path, label: str, story: list, pagesize=landscape(A4)):
    try:
        path.open("ab").close()
    except PermissionError:
        # the old file is open in a PDF viewer (Windows locks it): don't lose
        # the run, write beside it and say so
        path = path.with_name(f"{path.stem} (new){path.suffix}")
        print(f"  ! {path.name.replace(' (new)', '')} is open in another program; wrote {path.name} instead")
    doc = SimpleDocTemplate(str(path), pagesize=pagesize, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=16 * mm,
                            title=f"{SCHOOL} — {label}", author=SCHOOL)
    doc.build(story, onFirstPage=footer(label), onLaterPages=footer(label))


# ------------------------------------------------------------- documents
def main() -> None:
    d = load()
    people = {p["id"]: p for p in d["profiles"]}
    by_role = defaultdict(list)
    for p in sorted(d["profiles"], key=lambda p: p["full_name"].lower()):
        by_role[p["role"]].append(p)

    teaches = defaultdict(list)   # teacher -> ["Maths (Grade 1 A)"]
    class_teachers = defaultdict(set)  # class label -> teacher names
    for r in d["cst"]:
        cl = class_name(d["classes"].get(r["class_id"]))
        teaches[r["teacher_id"]].append(f"{d['subjects'].get(r['subject_id'], '?')} ({cl})")
        if r["teacher_id"] in people:
            class_teachers[cl].add(people[r["teacher_id"]]["full_name"])
    homeroom = defaultdict(list)
    for c in d["classes"].values():
        if c.get("homeroom_teacher_id"):
            homeroom[c["homeroom_teacher_id"]].append(class_name(c))
    parents_of = defaultdict(list)
    children_of = defaultdict(list)
    for l in d["links"]:
        if l["parent_id"] in people and l["student_id"] in people:
            parents_of[l["student_id"]].append(people[l["parent_id"]])
            children_of[l["parent_id"]].append(people[l["student_id"]])

    def student_class(sid):
        s = d["students"].get(sid)
        return class_name(d["classes"].get(s["class_id"])) if s and s.get("class_id") else "No class"

    students = sorted(by_role["student"], key=lambda p: (class_sort_key(student_class(p["id"])), p["full_name"].lower()))
    role_label = {"admin": "Admin", "teacher": "Teacher", "student": "Student", "parent": "Parent"}
    order = ["admin", "teacher", "student", "parent"]

    # ---- All users
    all_rows = []
    for role in order:
        for p in (students if role == "student" else by_role[role]):
            if role == "teacher":
                det = f"Employee ID {d['teachers'].get(p['id'], {}).get('employee_id', '—')}"
            elif role == "student":
                det = f"{student_class(p['id'])} · {d['students'].get(p['id'], {}).get('enrollment_number', '—')}"
            elif role == "parent":
                det = "Parent of " + ", ".join(c["full_name"] for c in children_of[p["id"]]) if children_of[p["id"]] else "No linked child"
            else:
                det = ""
            all_rows.append([len(all_rows) + 1, p["full_name"], role_label[role], p["email"], det])
    sub_all = f"All users: {len(all_rows)} accounts · as of {TODAY}"
    wb = Workbook(); ws = wb.active; ws.title = "All users"
    write_sheet(ws, f"{SCHOOL} — All user accounts", sub_all, ["#", "Name", "Role", "Username (email)", "Details"], all_rows)
    wb.save(ROOT / "AKIS Accounts - All Users.xlsx")
    build_pdf(ROOT / "AKIS Accounts - All Users.pdf", "All user accounts", [
        Paragraph(SCHOOL, P_TITLE), Paragraph(f"All user accounts · {sub_all}", P_SUB),
        pdf_table(["#", "Name", "Role", "Username (email)", "Details"], all_rows, [10 * mm, 60 * mm, 22 * mm, 85 * mm, 90 * mm]),
    ])

    # ---- Teachers
    t_rows = [[i + 1, p["full_name"], p["email"], d["teachers"].get(p["id"], {}).get("employee_id", "—"),
               ", ".join(homeroom[p["id"]]) or "—", "\n".join(sorted(teaches[p["id"]], key=lambda x: (class_sort_key(x.split("(")[-1]), x))) or "—"]
              for i, p in enumerate(by_role["teacher"])]
    hdr_t = ["#", "Name", "Username (email)", "Employee ID", "Class teacher of", "Teaches"]
    sub_t = f"Teachers: {len(t_rows)} accounts · as of {TODAY}"
    wb = Workbook(); ws = wb.active; ws.title = "Teachers"
    write_sheet(ws, f"{SCHOOL} — Teacher accounts", sub_t, hdr_t, t_rows)
    wb.save(ROOT / "AKIS Accounts - Teachers.xlsx")
    build_pdf(ROOT / "AKIS Accounts - Teachers.pdf", "Teacher accounts", [
        Paragraph(SCHOOL, P_TITLE), Paragraph(f"Teacher accounts · {sub_t}", P_SUB),
        pdf_table(hdr_t, t_rows, [10 * mm, 45 * mm, 75 * mm, 25 * mm, 30 * mm, 82 * mm]),
    ])

    # ---- Students and parents
    s_rows = []
    for i, p in enumerate(students):
        ps = parents_of[p["id"]]
        s_rows.append([i + 1, p["full_name"], p["email"], d["students"].get(p["id"], {}).get("enrollment_number", "—"), student_class(p["id"]),
                       "\n".join(x["full_name"] for x in ps) or "—", "\n".join(x["email"] for x in ps) or "—"])
    p_rows = [[i + 1, p["full_name"], p["email"], "\n".join(f"{c['full_name']} ({student_class(c['id'])})" for c in children_of[p["id"]]) or "No linked child"]
              for i, p in enumerate(by_role["parent"])]
    hdr_s = ["#", "Student", "Username (email)", "Enrolment no.", "Class", "Parent", "Parent username"]
    hdr_p = ["#", "Parent", "Username (email)", "Children (class)"]
    wb = Workbook(); ws = wb.active; ws.title = "Students"
    write_sheet(ws, f"{SCHOOL} — Student and parent accounts", f"Students: {len(s_rows)} accounts · as of {TODAY}", hdr_s, s_rows)
    write_sheet(wb.create_sheet("Parents"), f"{SCHOOL} — Student and parent accounts", f"Parents: {len(p_rows)} accounts · as of {TODAY}", hdr_p, p_rows)
    wb.save(ROOT / "AKIS Accounts - Students and Parents.xlsx")
    build_pdf(ROOT / "AKIS Accounts - Students and Parents.pdf", "Student and parent accounts", [
        Paragraph(SCHOOL, P_TITLE), Paragraph(f"Student and parent accounts · as of {TODAY}", P_SUB),
        Paragraph(f"Students <font color='#64748b'>{len(s_rows)} accounts</font>", P_H2),
        pdf_table(hdr_s, s_rows, [7 * mm, 38 * mm, 64 * mm, 25 * mm, 40 * mm, 30 * mm, 63 * mm]),
        Spacer(1, 6 * mm),
        Paragraph(f"Parents <font color='#64748b'>{len(p_rows)} accounts</font>", P_H2),
        pdf_table(hdr_p, p_rows, [8 * mm, 55 * mm, 85 * mm, 119 * mm]),
    ])
    print(f"updated lists: {len(all_rows)} users, {len(t_rows)} teachers, {len(s_rows)} students, {len(p_rows)} parents")

    # ---- Student logins (only with a password supplied for this run)
    password = os.environ.get("AKIS_STUDENT_PASSWORD")
    if not password:
        print("AKIS_STUDENT_PASSWORD not set: Student Logins not written")
        return
    write_student_logins(students, student_class, class_teachers, password)


HOW_TO = [
    f"1. Open <b>{SITE}</b> in any browser (phone, tablet or computer).",
    "2. Choose English or Arabic, then sign in with the username and password below.",
    "3. That's it: no code or extra step is needed. You can change your password any time in Settings.",
    "Keep your password private. Three wrong passwords in a row lock the account; ask your teacher if that happens.",
]


def write_student_logins(students, student_class, class_teachers, password: str) -> None:
    by_class = defaultdict(list)
    for p in students:
        by_class[student_class(p["id"])].append(p)
    classes = sorted(by_class, key=class_sort_key)

    # Excel: one sheet with everyone (sorted by class), then one sheet per class
    hdr = ["#", "Student", "Class", "Username", "Password"]
    notes = [n.replace("<b>", "").replace("</b>", "") for n in HOW_TO]
    rows = [[i + 1, p["full_name"], student_class(p["id"]), p["email"], password] for i, p in enumerate(students)]
    wb = Workbook(); ws = wb.active; ws.title = "All students"
    write_sheet(ws, f"{SCHOOL} — Student logins", f"{len(rows)} students · as of {TODAY} · Confidential: give each student only their own login", hdr, rows, notes)
    for cl in classes:
        crow = [[i + 1, p["full_name"], cl, p["email"], password] for i, p in enumerate(by_class[cl])]
        teachers = ", ".join(sorted(class_teachers.get(cl, []))) or "—"
        write_sheet(wb.create_sheet(cl[:31]), f"{SCHOOL} — Student logins · {cl}", f"{len(crow)} students · teachers: {teachers} · as of {TODAY}", hdr, crow, notes)
    wb.save(ROOT / "AKIS Accounts - Student Logins.xlsx")

    # PDF: a page per class (for the class teacher), then cut-out login cards
    story = [Paragraph(SCHOOL, P_TITLE),
             Paragraph(f"Student logins · {len(students)} students · as of {TODAY} · Confidential: give each student only their own login", P_SUB),
             *[Paragraph(n, P_NOTE) for n in HOW_TO], Spacer(1, 4 * mm)]
    for k, cl in enumerate(classes):
        crow = [[i + 1, p["full_name"], p["email"], password] for i, p in enumerate(by_class[cl])]
        teachers = ", ".join(sorted(class_teachers.get(cl, []))) or "—"
        block = [Paragraph(f"{cl} <font color='#64748b' size='9'>· {len(crow)} students · teachers: {esc(teachers)}</font>", P_H2),
                 pdf_table(["#", "Student", "Username", "Password"], crow, [8 * mm, 50 * mm, 92 * mm, 30 * mm], mono_cols=(2, 3)),
                 Spacer(1, 5 * mm)]
        story.append(KeepTogether(block))

    story += [PageBreak(), Paragraph("Login cards", P_TITLE),
              Paragraph("Cut along the dashed lines and give each student their own card.", P_SUB)]
    card_w, card_h = 88 * mm, 52 * mm
    cards = []
    for p in students:
        cards.append([
            Paragraph(f"<font color='#0f2a4a'><b>{SCHOOL}</b></font>", P_CELL),
            Paragraph(f"<font size='12'><b>{esc(p['full_name'])}</b></font><br/><font color='#64748b'>{esc(student_class(p['id']))}</font>",
                      ParagraphStyle("cn", parent=P_CELL, leading=15)),
            Paragraph(f"Website: <b>{SITE}</b>", P_CELL),
            Paragraph(f"Username:<br/><font name='Courier-Bold' size='8.5'>{esc(p['email'])}</font>", P_CELL),
            Paragraph(f"Password: <font name='Courier-Bold' size='10'>{esc(password)}</font>", P_CELL),
            Paragraph("<font color='#64748b' size='7.5'>Choose English or Arabic, then sign in. Keep this card private.</font>", P_CELL),
        ])
    grid = []
    for i in range(0, len(cards), 2):
        pair = cards[i:i + 2] + ([[]] if len(cards[i:i + 2]) == 1 else [])
        grid.append([Table([[x] for x in c], colWidths=[card_w - 8 * mm]) if c else "" for c in pair])
    t = Table(grid, colWidths=[card_w + 4 * mm] * 2, rowHeights=[card_h] * len(grid))
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.6, GREY, None, (3, 3)),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, GREY, None, (3, 3)),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(t)
    build_pdf(ROOT / "AKIS Accounts - Student Logins.pdf", "Student logins", story, pagesize=A4)
    print(f"student logins: {len(students)} students in {len(classes)} classes ({', '.join(classes)})")


if __name__ == "__main__":
    sys.exit(main())
