# Feature & permission map (Phase 1 of the new onboarding)

Read-only research, 2026-11-16, branch `mark/onboarding-v2`. Source of truth for the sidebar is `NAV_ITEMS` in `src/components/nav/Sidebar.tsx:93-166` (+ `OVERSIGHT_ITEM` at `:168`, Settings pinned at `:445`). Nothing here was run: every claim comes from reading code and SQL, so "verified" means "read in source", not "seen working in a browser".

**Cite shorthand** (so lines stay short):
- `D/` = `src/app/(dashboard)/`  - `L/` = `src/lib/`  - `C/` = `src/components/`  - `mig/` = `supabase/migrations/`
- RLS lines cite the **latest** definition of each policy (later migrations override earlier ones; overrides are named).
- Migrations 0050-0055 (Jack's branch) are **not in this checkout**; anything they change is not reflected here.

**Counts of sidebar items covered** (NAV_ITEMS + Settings): Admin 17 + Settings = 18 (+ Chat oversight conditional = 19), Teacher 15 + Settings = 16, Student 13 + Settings = 14, Parent 7 + Settings = 8.

---

## 0. Read this first: where the plan and the code disagree

These change what lessons can truthfully say. Each is detailed in the item it belongs to.

1. **`/welcome` already exists and is public.** `src/app/welcome/language/page.tsx`, `src/app/welcome/splash/page.tsx` and `src/app/welcome/layout.tsx` are the pre-login "Choose your language" + splash screens. `src/proxy.ts:8,37` lists `/welcome` in `PUBLIC_PATHS` (any `/welcome/*` skips the auth redirect) and `src/proxy.ts:75` exempts it from the first-launch-language redirect. A signed-in `/welcome` route under the plan would collide with that layout and be unauthenticated at the proxy. Needs a different path (e.g. `/getting-started`) or a deliberate proxy/layout change.
2. **Admissions has no "review -> accept" step.** One form -> `createAdmissionAction` saves the record and immediately runs `processAdmission` which creates the student + parent accounts, the PDF and the welcome email in the same request (`D/admin/admissions/actions.ts:91-194`, `:700-880`). Statuses are only `pending` / `processed` / `failed`; "Retry processing" exists for failed/stuck ones. There is nothing to "accept".
3. **Password resets have no "approve".** The list only offers "View account" and "Dismiss" (`D/admin/password-reset-requests/page.tsx`). The real fix is: open the user -> "Set a new password" -> that action also marks the matching pending request `completed` (`D/admin/users/actions.ts:328-364`).
4. **Audit log has no filter UI** (a flat table of the latest 200 rows, `D/admin/audit-log/page.tsx:12`), and it records **teacher** actions too (attendance, grades, assignments, exams, remarks, progress, timetable edits), not only admin actions. The page's own subtitle says "sensitive admin actions" (`adminAuditLog.subtitle`), which is out of date.
5. **Timetable builder: any teacher can edit any class's timetable in the centre** (not only their own classes) - `mig/0049_demo_center_write_checks.sql:22-45` + `mig/0048_demo_center.sql:116-122`, and the builder lists every class of the centre (`L/timetable/builderQueries.ts:5-8`). The only gate is that the subject+teacher pair must be a real class assignment.
6. **Parents are not notified about new assignments/exams** (only the class's students are: `D/teacher/assignments/actions.ts:44-58`, `D/teacher/exams/actions.ts:45-60`). Parents are notified only by: leave decisions for their child, announcements whose audience is `all`/`parent`, and chat pushes. A **student-audience** announcement notifies students only, although parents can *read* it (`mig/0048_demo_center.sql:50-56`).
7. **No notification when**: a teacher marks attendance, records a grade, grades a submission, adds a remark/behaviour entry, files a progress entry, a student/parent submits a leave request (admins get nothing), a student hands in an assignment (teacher gets nothing), an admin creates an event or uploads a document. Practice screens must not imply otherwise.
8. **Student "submit assignment" is only a "Mark as Submitted" button** - no file or text upload (`D/student/assignments/actions.ts:8-16`). No review/return flow beyond the teacher entering a grade (0-100) + feedback.
9. **"Match my device" theme does not exist.** `ThemeProvider` only knows `light | dark` (`L/theme/theme.ts:1`). The framework must read `matchMedia('(prefers-color-scheme: dark)')` once and call `setTheme`.
10. **Switching language needs a full page load** (cookie + `window.location`), it is not instant; there is no server action and nothing is saved on the profile (`C/i18n/LanguageCards.tsx`, `L/i18n/setLocaleCookie.ts`). See section 11.
11. **A locked admin cannot be unlocked from the UI**: lockout applies to every role (`src/app/login/actions.ts:87`), but `setUserActiveAction` refuses admin targets (`D/admin/users/actions.ts:265`) and the Users list's role filter has no admin option. Do not teach "reactivate a locked admin".
12. **Old tour version** is `CURRENT_TOUR_VERSION = 4` (`L/tour/steps.ts:48`); the plan's "bump to 10" is fine, but the DB column default for existing rows is 1 (`mig/0032_tour_versioning_and_notifications.sql:28`), real rows hold up to 4.
13. **Students get the 3-device cap and the 12-character password rule** like everyone; only the *forced* password change and passkey/2FA prompts are skipped (`L/auth.ts:115`, `:276`, `:119`). Teach students "you can change your password in Settings", not "you never see security screens".
14. **Message safety is not read-only for non-overseers**: every admin can read the full text of any *blocked/flagged* message, from any chat (`mig/0046_messaging_v2.sql:463`, not centre-scoped), even though only the overseer can read whole chats. The privacy chapter must say this.
15. **Teacher remarks and behaviour entries (including "Negative") are visible to the student and their parents** (`mig/0010_academic_records.sql:239-261`, `mig/0014_parent_portal.sql:63-66`, rendered on `D/student/page.tsx` and `D/parent/page.tsx`). Same for progress comments. Teachers should hear this in the Remarks lesson.

---

# ADMIN

Layout gate: `D/admin/layout.tsx:8` `requireRole("admin")` for every `/admin/*` page; each action re-checks (`requireRole("admin")`). Admin sidebar order (`Sidebar.tsx:94-112`): Overview, Users, Admissions, ID Cards, Password Resets, Classes, Subjects, Timetable, Progress, Leave Requests, Calendar, Documents, Announcements, Messages, Message safety, [Chat oversight], Feedback, Audit Log; Settings pinned at the bottom.

General admin data rule: admins read most tables through `is_admin()` policies that are **not centre-scoped** (attendance `mig/0010:165`, grades `:228`, remarks `:243`, behaviour `:259`, leave `:273`, progress `mig/0006:55`, audit `mig/0011:84`, message flags `mig/0046:463`). Centre-scoped for classes/subjects/announcements/events/documents/feedback/admissions/profiles-insert (`mig/0027`, `mig/0030`, `mig/0043:269`). With only AKIS in production this is equivalent, but say "admins" not "admins of that centre" in lessons.

### Overview - `/admin` - label "Overview" (`nav.overview`)
- **What it does:** A snapshot of the school for the admin: head-counts, this week's attendance rate, a "Needs attention" list, upcoming events and the latest activity. Also the launch pad for the most common jobs.
- **Main actions:** Stat cards (Total students, Total teachers, Classes, Attendance rate with "vs. last week" trend). **Quick actions**: "Add student or teacher" (primary), "New admission", "Create a class", "Manage subjects", "Build timetable". **Needs attention** rows (each links on): "Pending leave requests", "Open feedback", "Pending password resets" with an amber count badge, or "Nothing pending" (`adminOverview.reviewNow` / `.nothingPending`). "Upcoming events" (next 5, with "View all"), "Recent activity" (last 6 audit rows, "View all" -> audit log). Source: `D/admin/page.tsx`, counts `D/admin/queries.ts`.
- **Who can see / change:** READ: admin only (`D/admin/layout.tsx:8`); counts and events scoped to the active centre, activity list = latest audit rows of everyone (`D/admin/queries.ts:191-208`, audit policy `mig/0011_operations.sql:84`). WRITE: nothing on this page.
- **Practice demo:** (1) Open "Pending leave requests" and see it jump to the list; (2) read one stat card and find where "Attendance rate" comes from; (3) use a Quick action to land on the right form. No validation to mimic.
- **UI details:** `PageHeader` with eyebrow "Welcome, {name}" and title `adminOverview.title`; 4 `StatCard`s in a row (1 col phone, 2 tablet, 4 desktop); sections built from `Section` + `ListCard` + `ListRowLink` + `DateBlock`; event type badge shows the raw word `event|holiday|deadline` (gold/navy/red tones, not translated - `D/admin/page.tsx:25`). One filled button only (DESIGN.md "Never").

### Users - `/admin/users` - label "Users" (`nav.users`)
- **What it does:** Create and manage every teacher, student and parent account: search, edit, switch on/off, link parents to children, set a password, archive. Admin accounts cannot be edited here.
- **Main actions:** List with search box ("Search by name or email", `adminUsers.searchPlaceholder`) + Role filter (All/Teacher/Student/Parent) + "Filter" + CSV export ("Export"); table columns Name, Email, Role, Details (enrolment no. + class for students, employee ID for teachers), Status badge (Active green / Deactivated red), and an inline **Activate/Deactivate** link (`deletion.activate|deactivate`). **Add user** form (`/admin/users/new`): Role (Student/Teacher/Parent), Full name, Phone (optional), Email, Temporary password ("At least 12 characters. Share this with them securely...", hint says they can change it after signing in), then per role: Teacher: Employee ID (required), Qualification; Student: Enrollment number (required), Class (optional), Date of birth, Guardian name/phone/email, Emergency contact name/phone/relationship; Parent: multi-select "Children (hold Ctrl/Cmd to select multiple)". **User page** (`/admin/users/[id]`): edit name/phone/class/qualification/children links, "Set a new password" (field + Generate + "Set password"), Archive ("Permanently Delete": must type `DELETE`, `deletion.confirm*`). After create: redirect to the list; audit event `create_<role>_account`.
- **Who can see / change:** READ in the UI: admin only (`D/admin/layout.tsx:8`, page `D/admin/users/page.tsx`). **Looser at the database**: `profiles` rows (name, email, phone, DOB, avatar) are readable by *every signed-in user of the centre* (`mig/0027_centers.sql:308-312`); the UI just never lists them to non-admins. WRITE: admin only via service role after `requireRole("admin")` (`D/admin/users/actions.ts:45`, `:191`, `:259`, `:297`, `:328`). A teacher/student/parent cannot create or change accounts. 20 creations/hour/admin rate limit (`:50`).
- **Account rules to teach:** students are created with `must_change_password = false`, teachers/parents with `true` (`D/admin/users/actions.ts:101`); admin-set passwords follow the same rule (`:352`). Archive revokes sign-in and clears a student's class (`:297-317`). A deactivated or auto-locked account shows as "Deactivated"; **Activate** sets `failed_login_attempts = 0`, lifts the Auth ban and clears the login rate limit (`:274-284`). Archived accounts can never be reactivated (`:266`).
- **Practice demo:** (1) Create a student: enter name, enrolment number, class -> account appears in the list; (2) reactivate a locked account from the list ("Deactivated" -> Activate -> badge turns green); (3) link a parent to two children from the parent's page; (4) try a 6-character password.
- **Validation/errors to mimic (exact English, hard-coded, no dictionary key):** "Password must be at least 12 characters."; "That password is too common - choose something less guessable." (`L/security/password.ts:49-55`); "Employee ID is required for teachers."; "Enrollment number is required for students."; "That enrollment number is already in use."; "That employee ID is already in use."; "Too many accounts created recently. Wait a while before creating more."; "A selected student belongs to a different center."
- **UI details:** `Table` with `Badge` tones; `ExportCsvButton`; `Select`/`Input` from `Field`; role-conditional shaded sub-panel in the form. Note: the browser input has `minLength={8}` while the server requires 12 (`NewUserForm.tsx`), so an 8-11 char password passes the browser and fails with the server message.

### Admissions - `/admin/admissions` - label "Admissions" (`nav.admissions`)
- **What it does:** Digitises a paper registration. One long form creates the official PDF, a student account and a parent account (or reuses the family's existing parent account) and queues a welcome email with both logins.
- **Main actions:** List (Student, Date, Status badge Pending amber / Processed green / Failed red, "View details"), "New admission" (primary). **New admission** form sections (`admissions.section*`): Student information (name*, gender* Male/Female, DOB, Emirates ID/Passport, religion, nationality), Father's and Mother's information (name, job title, mobile, email, nationality; **at least one parent email** is needed or processing fails), Residence address (emirate, area, street, building), Medical history (conditions text; five difficulty checkboxes Vision/Motor/Hearing/Balance/Speech; allergies + detail), three **required** acknowledgements (informed consent, payment policy, additional policies), Enrolment grade, optional class placement ("Not placed yet - assign manually later"). Detail page: Download PDF, Edit admission (edits the saved record only, does not resend email), "Retry processing" (failed/pending), "Delete admission" (confirm; archives any accounts created). "Pending outbound emails" panel with Copy buttons because **no email provider is configured unless `RESEND_API_KEY` is set** (`L/email/send.ts`).
- **Who can see / change:** READ and WRITE: admin of that centre only (`mig/0043_audit_hardening.sql:269-272`; pages `requireRole("admin")` `D/admin/admissions/page.tsx:20`; actions `D/admin/admissions/actions.ts:91,215,257,372`). Pending outbound emails carry the family's **plaintext temporary passwords** and are admin-only (`mig/0043:275-290`). Parents/teachers/students cannot see admissions at all. The parent receives the logins by email (or by the admin copying it).
- **What happens after submit:** accounts are created in the same request; the parent account is forced to change password (`must_change_password = true`, `actions.ts:776`), the student is not (`:794`). Audit `create_admission` (`:884`).
- **Practice demo:** (1) Fill the minimum (student name, gender, one parent email, tick the three acknowledgements) -> Submit -> detail page shows "Processed" with PDF and two accounts; (2) leave the parent email empty -> record is created but status "Failed" with `admissions.processingError` "Provide at least one parent email."; (3) press "Retry processing".
- **Errors to mimic (exact English):** "The informed consent acknowledgment is required." / "The payment policy acknowledgment is required." / "The additional policies acknowledgment is required." (`actions.ts:109-112`); "Choose the student's gender."; "Student full name is required."; "Too many admissions submitted recently. Wait a while before submitting more."
- **UI details:** very long single form with grouped section headings (`section-title`), table list, `PendingEmailsPanel` (copy buttons, `admissions.copy`/`copied`), delete via `ConfirmDialog`.

### ID Cards - `/admin/id-cards` - label "ID Cards" (`nav.idCards`)
- **What it does:** Look up any student's official ID card, view it, download as PDF or image, and change the student's photo.
- **Main actions:** Searchable student list (avatar, name, "Grade / Class", "Student ID") -> "View ID card" (`/admin/id-cards/[studentId]`); card view with photo upload (admin may edit) and "Download PDF" / "Save as Image" (`idCard.*`). Failure text `idCard.downloadError`.
- **Who can see / change:** READ: an admin of AKIS for a student of AKIS (`L/idcard/authorizeIdCardAccess.ts:36-41`); teachers only for students of classes they teach (`:26-34`); a student only their own (`:12`); a parent only linked children (`:14-23`). WRITE (photo): everyone allowed to view **except teachers** (`:44-47`); stored as the student's profile avatar, so it changes the picture shown everywhere (`L/idcard/actions.ts:30-45`). PNG only, <= 4 MB.
- **Practice demo:** (1) search a student and open the card; (2) download the PDF; (3) replace the photo and notice the same photo appears on the profile.
- **Errors:** "You don't have permission to change this student's photo." / "Invalid image type." / "Image is too large." (`L/idcard/actions.ts`); `idCard.notFound` "This student's ID card isn't available."
- **UI details:** `IdCardView` (Navy & Gold card graphic, same model feeds screen/PDF/PNG), `IdCardDownloadButtons`, `IdCardPhotoUpload`.

### Password Resets - `/admin/password-reset-requests` - label "Password Resets" (`nav.passwordResetRequests`)
- **What it does:** Inbox of "Forgot password?" requests from the sign-in page. Admins do not click an "approve" - they set a new temporary password on the person's account and tell them.
- **Main actions:** Table (Email, Requested, actions "View account" -> user page, "Dismiss"). Title/subtitle `adminPasswordResetRequests.title|subtitle`; empty: "No pending password reset requests." The fix itself is on the user page "Set a new password" (marks the request `completed`, audit `admin_set_password`). Dismiss -> status `dismissed`, audit `dismiss_password_reset_request`.
- **Who can see / change:** READ/WRITE: admin only (`mig/0023_password_reset_requests.sql:31-35`, page `D/admin/password-reset-requests/page.tsx:11`, action `actions.ts:13`). Requests are created by anyone (even signed out) via the public form - rate-limited 5/hour per email and the response is always "Request sent" whether or not the email exists (`app/forgot-password/actions.ts:20-83`, key `forgotPassword.requestSent`). Admins get a push "Password reset requested" (no bell entry).
- **Practice demo:** (1) a pending request for a teacher appears -> click "View account"; (2) set a temporary password -> request disappears; (3) dismiss a duplicate.
- **UI details:** plain `Table`; red/amber not used; the push title key `adminPasswordResetRequests.pushTitle`.

### Classes - `/admin/classes` - label "Classes" (`nav.classes`)
- **What it does:** Creates classes/sections, sets the homeroom teacher, and decides which teacher teaches which subject in each class. That assignment is what gives a teacher their attendance, assignments, grades and class chat.
- **Main actions:** List (Class "Grade 9 - A", Academic year, Homeroom teacher, Students). "Create class": Class name, Section, Academic year (must look like `2026` or `2026-2027`), Homeroom teacher (optional). Class page: edit details; **Subject teachers** form (Subject, Teacher, "Assign"; a table with "Remove"); student list (assign students to a class from the Users page).
- **Who can see / change:** READ: any signed-in user of the centre can read classes (`mig/0027_centers.sql:351-353`); the admin pages are admin-only. WRITE: admin of the centre (`:355-366`; actions `D/admin/classes/actions.ts:27,63,97,112`). Assigning a teacher to a subject **creates that subject's class chat group** (trigger `trg_cst_create_group`, `mig/0046_messaging_v2.sql:441`) and grants the teacher write access to attendance/assignments/exams/grades/remarks/progress for that class (`cst` checks in `mig/0010:167-170`, `mig/0019`). Re-assigning the same class+subject swaps the teacher (`upsert` on `class_id,subject_id`, `actions.ts:102`). Removing deletes the group chat (`classes.confirmRemoveAssignment`: "...The subject's class chat for this class is deleted with it, and the timetable keeps listing the old teacher until you change it.").
- **Practice demo:** (1) create "Grade 9 - A"; (2) assign Maths to a teacher; (3) try to create the same class again -> error.
- **Errors (exact):** "A class with this name, section, and year already exists."; "Academic year must look like 2026 or 2026-2027."; "Select a subject and teacher."
- **UI details:** `Table`; two stacked `card` sections (`section-title`); inline remove with confirm.

### Subjects - `/admin/subjects` - label "Subjects" (`nav.subjects`)
- **What it does:** The school-wide subject list used by classes and timetables.
- **Main actions:** Inline form "Subject name" + "Code" (upper-cased) + add; table with Delete. Delete is refused while the subject is in use.
- **Who can see / change:** READ: centre members (`mig/0027:370-372`); WRITE: admin only (`:374-386`; `D/admin/subjects/actions.ts:24,61`).
- **Practice demo:** add "Science / SCI"; try adding the same code again; try deleting a subject that classes use.
- **Errors (exact):** "A subject with this code already exists."; `"<name>" can't be removed because it is still in use: 3 class assignment(s), 12 timetable period(s)... Removing it would permanently delete all of that.` (`actions.ts:85`).
- **UI details:** one-row inline form above a `Table`; `adminSubjects.*` keys (`subjectName`, `code`, `noSubjectsYet`).

### Timetable - `/admin/timetable` - label "Timetable" (`nav.timetable`)
- **What it does:** Build the weekly schedule of each class. The subject picks its teacher automatically from the class assignment, and the app refuses double-bookings.
- **Main actions:** Class selector, "Add a period" form: Subject (teacher assigned automatically), Day (Monday-Sunday), Start time, End time, Room (optional); weekly grid beside the form with "Edit" and "Remove" (confirm `adminTimetable.confirmRemovePeriod`). If a class has no subject-teacher assignments the form is replaced by `adminTimetable.assignTeacherFirst`.
- **Who can see / change:** READ: every user of the centre can read the class's timetable (`mig/0048:90-92`); students/teachers see theirs on their own pages. WRITE: any admin **or any teacher** of the centre, provided the (class, subject, teacher) triple is a real assignment (`mig/0049:22-45`, delete `mig/0048:116-122`; `L/timetable/builderActions.ts:49` `requireRole("admin","teacher")`). Audit `create_/update_/delete_timetable_entry`.
- **Clash refusal (exact English, mimic these):** `This class already has a period from 09:00 to 09:45 that overlaps.` and `This teacher is already teaching another class from 09:00 to 09:45.` (pre-check, `L/timetable/builderActions.ts:92-93`); also "End time must be after start time." (`:54`); database backstop texts "This class already has a period at that time. Pick a free time slot." / "This teacher is already teaching another class at that time. Pick a free time slot." (`:29-30`, constraint `mig/0044_timetable_no_overlaps.sql`); "That subject and teacher aren't assigned to this class."
- **Practice demo:** (1) place Maths Monday 09:00-09:45; (2) place English Monday 09:30-10:15 for the same class -> class clash; (3) give the same teacher a second class at 09:00 -> teacher clash; (4) edit a period.
- **UI details:** `WeeklyScheduleGrid` = one card per day (Mon-Sat always, Sunday only if used; `C/timetable/WeeklyScheduleGrid.tsx:18,44`), 1/2/3 columns by width; `layout="beside-form"` variant with the 320px form column; times rendered LTR inside RTL (`<bdi dir="ltr">`).

### Progress - `/admin/progress` - label "Progress" (`nav.progress`)
- **What it does:** Read-only view of every monthly progress entry teachers filed, school-wide, with filters and CSV export.
- **Main actions:** Filters: Student, Class, Month (`type=month`), "Submit" (label `common.submit`); "Export" CSV; table Student, Class, Subject, Teacher, Month, Overall score (average of six factors, `L/progress/calculate.ts`).
- **Who can see / change:** READ: admin (`mig/0006_progress_system.sql:55`); WRITE: none for admin here (admins can delete rows at DB level `:84`, no UI). The authoring teacher, the student and the student's parents also see the entry (`mig/0006:50,60`, `mig/0014_parent_portal.sql:49`).
- **Practice demo:** filter to one class and month; read an overall score; export.
- **UI details:** native `<select>` filters, `Table`; `progress.*` keys.

### Leave Requests - `/admin/leave-requests` - label "Leave Requests" (`nav.leave`)
- **What it does:** Students and parents ask for time off; the admin approves or rejects. Both the student and their parents are told the result.
- **Main actions:** Table (Student, Start Date, End Date, Reason, Status badge Pending amber / Approved green / Rejected red) with **Approve / Reject** (each asks `confirm("Approve?")`) on pending rows only. After a decision: audit `approved_leave_request`/`rejected_leave_request`; notification to the student and every linked parent: title "Leave request approved" / "Leave request not approved", body "Leave from <start> to <end> was approved.", link `/` (`D/admin/leave-requests/actions.ts:12-30`, bell + push).
- **Who can see / change:** READ: admin (`mig/0010:273`), the student (`:271`), their parents (`mig/0014:69`), and teachers of the student's class at DB level (`mig/0010:275`, no teacher UI). WRITE (create): the student for themself or a linked parent for their child, only `pending` and unreviewed (`mig/0043:248-255`); WRITE (decide): admin only (`mig/0010:284`).
- **Practice demo:** approve one request and reject another; note what the student sees (badge changes, bell entry).
- **UI details:** `Table` + `Badge`; `leave.*` keys; admins get no alert when a request arrives (only the "Needs attention" count on Overview).

### Calendar - `/admin/events` - label "Calendar" (`nav.calendar`)
- **What it does:** Add school events, holidays and deadlines and choose who sees them.
- **Main actions:** Form: Title, Message (description, optional), Date, Type (Event/Holiday/Deadline), Audience (Everyone/Teachers/Students/Parents), "Submit"; list with Delete (`calendar.deleteConfirm` "Delete this event?"). Audit `create_event` / `delete_event`. **No notification is sent.**
- **Who can see / change:** WRITE: admin of the centre (`mig/0027_centers.sql:416-428`; `D/admin/events/actions.ts:23,49`). READ: audience `all`, or the viewer's role, or admin (`mig/0027:411-414`); parents additionally read `student`-audience events (`mig/0048:59-65`). So: audience Teachers -> teachers only; Students -> students and **their parents**; Parents -> parents; Everyone -> all.
- **Practice demo:** add a holiday for Everyone; add a deadline for Students; check which role sees which (calendar lesson shares this).
- **UI details:** reuses `announcements.heading|body|audience` labels; `Badge` shows raw type word.

### Documents - `/admin/documents` - label "Documents" (`nav.documents`)
- **What it does:** Upload reports, certificates, policies or general files, either for a role audience or for one specific student.
- **Main actions:** Form: Title, Category (Admit Card, Report Card, Certificate, Policy, General), Audience (Everyone/Teachers/Students/Parents), "For Student (optional)" / "Not student-specific", File (drag-and-drop; PDF, Word, JPG, PNG; **max 4 MB**); list with Download + Delete. Audit `upload_document`/`delete_document`. No notification.
- **Who can see / change:** WRITE: admin of the centre (`mig/0027_centers.sql:446-452`; `D/admin/documents/actions.ts:42,94`). READ (centre members only): admin all; a **student-specific** document (a student chosen) is visible to **that student** and **their parents** and admins and *nobody else, whatever the audience says*; a general document is visible by audience (`all` or the viewer's role) (`mig/0027:435-443`, parent link policy `mig/0014:74-75`). Downloads are 60-second signed links after an RLS-checked lookup (`L/documents/getDocumentUrl.ts:15-25`).
- **Errors (exact):** "Choose a file to upload."; "File must be under 4MB."; "Use a PDF, Word document, JPG, or PNG file." (`actions.ts:44-48`).
- **Practice demo:** upload "Term 1 report - Omar" attached to one student; upload a "Uniform policy" for Parents; try an `.exe`.
- **UI details:** `FileUpload` dropzone (`documents.fileDropHint`, `removeFile`), `Card` per document with category `Badge` and a gold student-name badge.

### Announcements - `/admin/announcements` - label "Announcements" (`nav.announcements`)
- **What it does:** Post a message to everyone or to one role; it shows on dashboards and rings the bell.
- **Main actions:** Form: Title, Message, Audience (Everyone / Teachers / Students / Parents), "Submit"; list with Delete (`announcements.deleteConfirm`). On submit: every profile of the centre with that role (all non-archived profiles for Everyone, *including inactive and the admins themselves*) gets an in-app notification + push with type `announcement`, link `/` (`D/admin/announcements/actions.ts:44-62`). Audit `create_announcement`.
- **Who can see / change:** WRITE: admin (`mig/0027:398-410`). READ: `all`, or the viewer's role, or admin (`mig/0027:392-396`), plus parents may read `student` announcements (`mig/0048:50-56`) but **are not notified** of them. Dashboards show the latest 3-5 (`L/queries/announcements.ts:12`).
- **Practice demo:** post "School closed Monday" to Everyone; post a Parents-only reminder; delete one.
- **Errors:** "Title is required." / "Message is required."
- **UI details:** `Input` + `Textarea` + `Select`; list of cards with delete; success is silent (form resets).

### Messages - `/messages` - label "Messages" (`nav.messages`)
- Shared WhatsApp-style two-pane inbox for every role; the full rules, filter and oversight behaviour are in **section 6**. Admin specifics: an admin may start a direct chat with **anyone** active in the centre (`mig/0048_demo_center.sql:126-140`, `pa.role = 'admin'`); admins are **not** members of subject groups (since `mig/0047_chat_oversight.sql:45-58` only the overseer is), so an admin sees no group chats unless they are the overseer; replying works in chats an admin started.
- **Practice demo (admin):** start a chat with a teacher; open the "Directory"; send a message and watch the ticks (Sent/Delivered/Read). Live rule (`tickFor`, `L/chat/types.ts:70`): Read only once **every** other member has read it, so in a group it stays Delivered until the last member reads it (the practice shows Delivered, then Read after ~6 s); the chat-list preview always shows a single tick (`MessagesShell.tsx:240`).

### Message safety - `/admin/message-safety` - label "Message safety" (`nav.messageSafety`)
- **What it does:** The review queue for messages the safety filter stopped or found borderline. Marking each "Harmful" or "Fine" also builds training data for the filter.
- **Main actions:** Table: From (name, role, time), Messages (full text), Why (badge Blocked red / Flagged amber + reasons "word list", "risky phrase", "wellbeing concern", "model" + model score), "Harmful?" with buttons "Mark harmful" / "Mark fine" (turn into the labels "Harmful"/"Fine"). Latest 200. Empty: `messageSafety.empty`. The unused key `messageSafety.openChat` is defined but no link is rendered.
- **Who can see / change:** READ and WRITE: **any admin** (`mig/0046_messaging_v2.sql:463-466`; page `D/admin/message-safety/page.tsx:17,21`; action `actions.ts:10`). Every admin of the sender's centre also gets a bell + push alert when something is flagged: "Blocked message from {name}" / "Message from {name} needs review" / "Wellbeing concern: {name}" (self-harm wording; body "A message mentioned self-harm or suicide. It was delivered. Please check on them today.") - the alert never contains the message text (`L/chat/after-send.ts:79-101`). Flags are written server-side only.
- **Practice demo:** (1) open a flagged item and mark it Harmful; (2) open a "wellbeing concern" item and see it was *delivered* (action Flagged); (3) mark a harmless borderline message Fine.
- **UI details:** `Table` + `Badge` red/amber; `bdi dir="auto"` around message text (Arabic/English mixed); `PageHeader` with `messageSafety.subtitle`.

### Chat oversight (conditional) - `/admin/chat-oversight` - label "Chat oversight" (`nav.chatOversight`)
- **When shown:** only when the signed-in admin is in `chat_overseers`: the dashboard layout calls `is_chat_overseer` for admins (`D/layout.tsx:18`), the sidebar inserts the item after "Message safety" (`Sidebar.tsx:186`), and the page returns 404 for anyone else (`D/admin/chat-oversight/page.tsx:22`). The only overseer is `muhammad@alkamalinternational.com` (`mig/0047_chat_oversight.sql:27-29`); the table has RLS with no policies, so neither a browser session nor another admin can change it (`:21-25`).
- **What it does:** Lists every private chat and subject group in the school (read-only, 500 most recent) and opens any of them. Opening leaves **no read receipt** (`mark_chat_read` still requires real membership, `mig/0046:325-340`); the thread shows `chatOversight.readOnly` "Oversight view: read-only. Your visit doesn't show as read." The overseer can read all direct chats and groups and can **post in groups** (he is a member) but cannot post in other people's direct chats (`mig/0047` header, `:45-58`, `:67-75`).
- **Who can see:** the overseer account only (the rest of the school should be told the school's oversight account can read chats - see section 6).
- **Practice demo:** (not for general users) - show the table "Between / Last message / Open"; open a chat and see the read-only banner.
- **UI details:** `Table` + `Badge` "Subject group"; `chatOversight.*` keys.

### Feedback - `/admin/feedback` - label "Feedback" (`nav.feedback`)
- **What it does:** Inbox of what teachers, students and parents sent through the Feedback page; admins set a status.
- **Main actions:** Table From (name, role, email), Category badge (Technical red / Academic navy / Suggestion gold / General slate), Subject + truncated message, Posted, Status select New/Reviewed/Resolved (audit `update_feedback_status`). The subtitle `feedback.inboxSubtitle` still says "(email/spreadsheet sync not wired up yet)".
- **Who can see / change:** READ: the author (own rows) and admins of the centre (`mig/0030_feedback_center_id.sql:67-70`); WRITE status: admin of the centre (`:72-76`); create: the user themself, status `new`, centre check (`mig/0049_demo_center_write_checks.sql:56-59`). No notification is sent to admins (only the Overview "Open feedback" count).
- **Practice demo:** open one item and set it Reviewed then Resolved.
- **UI details:** `Table`; `StatusSelect` (inline select); `feedback.status*` keys.

### Audit Log - `/admin/audit-log` - label "Audit Log" (`nav.auditLog`)
- **What it does:** A flat list of recorded actions (latest 200): who, what, which record, when. **No filter, search or export exists.**
- **Recorded actions** (`logAuditEvent`, inserted by the server with the service role; users cannot insert their own - the self-insert policy was dropped `mig/0016_authz_hardening.sql:51`): admin: `create_<teacher|student|parent>_account`, `update_user`, `activate_account`, `deactivate_account`, `archive_account`, `admin_set_password`, `create_/update_/delete_timetable_entry`, `create_class`, `update_class`, `assign_subject_teacher`, `remove_subject_teacher`, `create_subject`, `delete_subject`, `create_announcement`, `delete_announcement`, `create_event`, `delete_event`, `upload_document`, `delete_document`, `approved_/rejected_leave_request`, `update_feedback_status`, `dismiss_password_reset_request`, `create_admission`, `update_admission`, `delete_admission`; teacher: `mark_attendance`, `create_assignment`, `grade_submission`, `create_exam`, `record_grade`, `add_remark`, `add_behaviour_entry`, `submit_progress_entry`, timetable edits; anyone: `mfa_enrolled`, `mfa_unenrolled`, `webauthn_credential_registered/removed`; system: `auto_deactivate_failed_logins` (3-strike lockout). **Not logged**: sign-ins, messages, document downloads, leave submissions, student actions, profile edits, settings changes (`L/audit/log.ts`; list via grep of `logAuditEvent(`).
- **Who can see / change:** READ: admins (`mig/0011_operations.sql:84`, not centre-scoped; page `D/admin/audit-log/page.tsx:9`); also summarised on Overview. Nobody can edit or delete from the app.
- **Practice demo:** find "who deactivated this account" and "who marked this attendance" by scanning actor/action/target.
- **UI details:** monospace action text (`font-mono`), target as `table · first-8-of-id…`, local `toLocaleString()` time.

### Settings (admin) - `/settings` - label "Settings" (`nav.settings`)
- Shared page (section 7 details). Admin cards, in order: Theme (Light/Dark), Language (English / العربية cards), Change Password (**min 15 characters** for admins, `D/settings/page.tsx:45`), Face ID / Fingerprint sign-in (passkeys), Devices + "Sign out other sessions", **Two-factor authentication (admins only)** with Reset device, Notifications ("Enable notifications"), Contact Us (phone 052 772 7246, info@alkamalinternational.com).
- **Practice demo:** change theme; reveal where "Reset device" for 2FA lives (do not run it); turn notifications on.

---

# TEACHER

Layout gate: `D/teacher/layout.tsx:4` `requireRole("teacher")`. Sidebar order (`Sidebar.tsx:114-130`): My Classes, ID Cards, My Timetable, Timetable (builder), Attendance, Assignments, Exams, Grades, Remarks & Behaviour, Progress, Calendar, Documents, Messages, Help Assistant, Feedback; Settings pinned.

Key teacher rule: write access to a class's data requires a `class_subject_teachers` (cst) row for that teacher (admin created it under Classes). Assignments/exams additionally need the exact class **and subject**; grades/progress need the class+subject and the student must be in the class (`mig/0019_verify_student_class_membership.sql`); remarks/behaviour need the student to be in any class the teacher teaches (`mig/0010:245-251,261-267`).

### My Classes - `/teacher` - label "My Classes" (`nav.myClasses`)
- **What it does:** The teacher's home: today's lessons, latest announcements, pending work counts and the list of classes they teach.
- **Main actions:** Header "Welcome, {name}" with date eyebrow and the primary button "Submit Progress" -> `/teacher/progress`. Stat cards: My Classes, Students, "Upcoming exams" (their own), "Pending grading" (submitted, ungraded submissions of their assignments; hint "Nothing waiting to be graded"). "Today's schedule" rows (time, subject, class, room) each linking to that class's attendance. Announcements (3 latest). "My Classes" table (Class, Subject, Students) whose rows link to attendance. Empty states `teacherDashboard.noClassesAssignedYet` / `...Description`.
- **Who can see / change:** READ: the teacher sees their own cst rows, their own timetable entries, announcements for `all`/`teacher` (`mig/0027:392-396`). `Pending grading` counts only submissions RLS shows them (own assignments' submissions, `mig/0010:192-195`). WRITE: none here.
- **Practice demo:** (1) click a row in Today's schedule -> lands on attendance for that class; (2) notice "Pending grading 2" and go to Assignments.
- **UI details:** `PageHeader` + 4 `StatCard`; `card` list rows with `ChevronRight` (flipped in RTL); `Table` with a full-row link overlay.

### ID Cards - `/teacher/id-cards` - label "ID Cards" (`nav.idCards`)
- **What it does:** View or download the ID card of any student in the teacher's classes.
- **Main actions:** Table (Name, Class, Student ID) -> card view (`/teacher/id-cards/[studentId]`, photo **not** editable), Download PDF / Save as Image.
- **Who can see / change:** READ: teachers of that student's class only (`L/idcard/authorizeIdCardAccess.ts:26-34`; the page 404s otherwise `D/teacher/id-cards/[studentId]/page.tsx:17-20`). WRITE: nothing (teachers cannot change the photo, `:44-47`). PDF/image endpoints use the same check (`app/api/id-card/[studentId]/route.ts`).
- **Practice demo:** open one student's card, download PDF, notice there is no "change photo".
- **UI details:** `Table`, `IdCardView canEditPhoto={false}`.

### My Timetable - `/teacher/timetable` - label "My Timetable" (`nav.myTimetable`)
- **What it does:** Read-only weekly view of all lessons the teacher is scheduled for, across every class.
- **Main actions:** none (view only). Empty: "Nothing scheduled yet" / "Your admin hasn't built your timetable yet." (`myTimetable.nothingScheduledYet`, `.teacherEmptyDescription`); subtitle "Every class you teach, across the week."
- **Who can see / change:** READ: entries where `teacher_id` is them (`D/teacher/queries.ts:getMySchedule`); table readable centre-wide (`mig/0048:90-92`). WRITE: via the builder item below.
- **Practice demo:** find tomorrow's first lesson; read which room.
- **UI details:** `WeeklyScheduleGrid` (cards per weekday; subject + class name + room).

### Timetable (builder) - `/teacher/timetable-builder` - label "Timetable" (`nav.timetable`)
- **What it does:** Same builder as the admin's: add, move or remove periods for a class. The label is just "Timetable" (the key is shared with admin), the page title is `adminTimetable.title`.
- **Main actions & errors:** identical to admin Timetable (class select; Subject (teacher assigned automatically), Day, Start, End, Room; Edit/Remove) including the four exact clash messages listed under Admin > Timetable. After edit it returns to `/teacher/timetable-builder?class=...`.
- **Who can see / change:** WRITE: any teacher for any class in the centre (see section 0 item 5; `mig/0049:22-45`, `mig/0048:116-122`, action `L/timetable/builderActions.ts:49,131`). READ: whole centre (`mig/0048:90`). Edits are audit-logged and affect what students/other teachers see immediately (`revalidateTimetables`, `L/timetable/builderActions.ts:117,123-128`).
- **Practice demo:** same as admin: create a clash and read the refusal.
- **UI details:** same components as admin (`C/timetable/builder/*`).
- **Uncertain:** whether the "any teacher, any class" scope is intended product behaviour (migration 0042 comment says "Muhammad's choice"); the lesson text should not say "only your classes".

### Attendance - `/teacher/attendance` - label "Attendance" (`nav.attendance`)
- **What it does:** Mark who is present, absent, late or excused for a class on a date. Parents and the student see it; admins see all.
- **Main actions:** Class select (their classes) + Date (default today) + "Continue" (`common.continue`); a row per student (name, enrolment number, status select Present/Absent/Late/Excused, default **Present** unless already saved) + "Submit"; on success "Save ✓" alert. Below: "Attendance History" (their last 100 marks: Student, Date, Status badge present green / absent red / late amber / excused slate). One record per **student per day** (not per lesson): saving again overwrites (`upsert onConflict student_id,date`, `D/teacher/attendance/actions.ts:49`). **No notification** goes to anyone. Audit `mark_attendance`.
- **Who can see / change:** WRITE: a teacher with a cst row for the class, for students enrolled in it (`mig/0019:42-50`, updates `mig/0043:209-220`); every teacher of the class can read and re-mark it (`mig/0043:198-205`), so a second teacher sees the same sheet. READ elsewhere: the student (`mig/0010:161`), their parents (`mig/0014:46-47`), admins (`mig/0010:165`). Not seen by other students, other parents, teachers who do not teach the class.
- **Practice demo:** mark Omar Absent and Lina Late for today, press Submit, see "Save ✓", then find both in History. Try a future date.
- **Errors (exact):** "Attendance can't be marked for a future date." (`:32`); "You can only mark attendance for classes you teach." (`:53`); "Enter a valid date."; "No students to mark."; `attendance.noClassesAssignedYet` "You don't have any classes assigned yet, so there's no attendance to mark."; `attendance.noStudentsInClass` "No students in this class".
- **UI details:** `ActionForm` (does not wipe typed values on error); status `Badge` tones green/red/amber/slate; list in a divided bordered box; keys `attendance.*`.

### Assignments - `/teacher/assignments` - label "Assignments" (`nav.assignments`)
- **What it does:** Give homework to a class and later grade what students hand in.
- **Main actions:** "New Assignment" card: "Class — Subject" select (only their class+subject pairs), Title, Description, Due Date, "Submit". After saving: **every student in the class gets a bell + push** "New assignment: {title}" / "Due {date}" linking `/student/assignments` (`D/teacher/assignments/actions.ts:44-58`); parents are not notified. List (Title -> detail, Class, Subject, Due Date). Detail page: roster with status badge (Pending slate / Submitted gold / Graded green), Grade (0-100, step 0.1), Feedback text, "Save" per student (creates or updates the submission as `graded`, audit `grade_submission`); **the student is not notified of the grade**.
- **Who can see / change:** WRITE (create): teacher with cst for that class **and subject** (`mig/0010:181-185`; the form only offers those). Visible to: the assigning teacher only among teachers (`mig/0010:176-180`; a co-teacher of the same class cannot see it), the students of the class, parents of those students (`mig/0014:52-55`), admins. WRITE (grade): only the assignment's teacher, for a student of that class (`mig/0019:96-112`); detail page 404s for others (`D/teacher/assignments/[id]/page.tsx:12`). Students can only hand in their own work and cannot touch a graded one (`mig/0043:112-135`).
- **Practice demo:** (1) create "Fractions worksheet" due Friday for 5A Maths -> note the confirmation; (2) open it, give Omar 85 with feedback "Good method", Save -> badge turns Graded.
- **Errors (exact):** "Title is required."; "Due date is required."; "Enter a grade between 0 and 100."; `Keep the description under 5000 characters.`; no-classes alert "You don't have any classes/subjects assigned yet."
- **UI details:** `Table` list; roster rows with inline mini form; `Badge`; keys `assignments.*`.

### Exams - `/teacher/exams` - label "Exams" (`nav.exams`)
- **What it does:** Schedule an exam or quiz so students (and parents) can plan.
- **Main actions:** "New Exam/Quiz": Class-Subject, Title, Type (Exam/Quiz), Date, Time (optional), Room; "Submit" -> "Save ✓". Students of the class get a bell + push "New exam: {title}" / "{date} at {time}" -> `/student/exams` (`D/teacher/exams/actions.ts:45-60`). List (Title, Class, Subject, Type badge navy/gold, Date). No marks are entered here (that is Grades).
- **Who can see / change:** WRITE: the teacher with cst for that class+subject, own exams only (`mig/0010:213-222`). READ: everyone in the centre at database level (`mig/0048:70-72` "exams are readable within accessible centers") - UI shows students/parents only their class's exams (`D/student/exams/page.tsx`, `D/parent/queries.ts`). **Looser than the UI**; do not claim "students of other classes cannot see this".
- **Practice demo:** schedule a quiz next Tuesday 10:00 in Room 3; read it back in the list.
- **UI details:** `Table`, `examTypeLabel` badges; keys `exams.*`.

### Grades - `/teacher/grades` - label "Grades" (`nav.grades`)
- **What it does:** Record a mark for a student on an assessment; students and parents see it.
- **Main actions:** "Record Grade": Student — Subject (Class) select, Assessment (placeholder "Mid-term test"), Marks Obtained, Marks Total, Term (default "Term 1"), "Submit" -> "Save ✓". Table of recorded grades.
- **Who can see / change:** WRITE: the teacher with cst for that class+subject and the student in that class (`mig/0019:19-37`). READ: the student (`mig/0010:224`), the recording teacher only (`:226`; other teachers of the class cannot), parents (`mig/0014:60-61`), admins (`mig/0010:228`). No notification; students see it on Grades and the dashboard.
- **Practice demo:** record 42/50 for Omar "Unit 3 quiz" Term 1; then try 60/50.
- **Errors (exact):** "Marks obtained cannot exceed marks total." (`D/teacher/grades/actions.ts:29`); "Assessment name is required."; "Enter the marks obtained (0 or more)."; "Enter the total marks (greater than 0)."; "Term is required."
- **UI details:** `Select` of student-subject pairs; 3-column number row.

### Remarks & Behaviour - `/teacher/remarks` - label "Remarks & Behaviour" (`nav.remarks`)
- **What it does:** Short written notes about a student, and a positive/negative behaviour log. They are shared with the student and parents.
- **Main actions:** Two forms side by side: "New Remark" (Student, text) and "New Entry" (Student, Category Positive/Negative, Description), each "Submit" -> "Save ✓"; below, the teacher's own remark cards and behaviour cards (Positive green / Negative red badge). Audit `add_remark` / `add_behaviour_entry`.
- **Who can see / change:** WRITE: a teacher of a class the student is in (`mig/0010:245-251`, `:261-267`). READ: the writing teacher only (own rows, `:241`, `:257`) - not other teachers; **the student** (`:239`, `:255`), **the student's parents** (`mig/0014:63-67`), admins (`:243`, `:259`). Shown on the student dashboard and the parent dashboard ("Teacher Remarks" and "Behaviour Log").
- **Practice demo:** add a Positive entry "Helped a classmate" and a remark; then preview "this is what Omar and his parents will read".
- **Errors:** "Remark is required." / "Description is required." / "Keep this under 2000 characters." / "No students assigned yet."
- **UI details:** two `Card`s in a grid; list of `Card` rows with date; `behaviourLabel` badges.

### Progress - `/teacher/progress` - label "Progress" (`nav.progress`)
- **What it does:** File a monthly progress report per student and subject: six scores plus comments.
- **Main actions:** "New Entry": Student — Subject (Class), Month (month picker, defaults current), six numbers 0-100: Attendance %, Homework Completion, Class Participation, Behaviour & Conduct, Assessment Performance, Subject Understanding; Teacher Comments; "Improvement Priority Areas"; "Submit" -> "Progress entry saved." Re-submitting the same student+subject+month overwrites (`upsert`, `D/teacher/progress/actions.ts:65`). "Past Entries" with filters (Student, Subject, Class, Month, "Submit") and table (Student, Subject, Class, Month, Overall Score). Dashboard button "Submit Progress" leads here.
- **Who can see / change:** WRITE: cst teacher for that class+subject with the student in the class (`mig/0019:65-92`). READ: the authoring teacher only (`mig/0006:60-63`), the student (`:50`), parents (`mig/0014:49`), admins (`mig/0006:55`). Overall score = average of the six (`L/progress/calculate.ts:14-17`) drives the student's progress ring.
- **Errors (exact):** "A progress report can't be filed for a future month." (`:31`); "That month is too far in the past."; "Enter a number from 0 to 100."; "Keep comments under 3000 characters."; no-targets alert "You don't have any classes/subjects assigned yet, so there's no one to submit a progress entry for. Contact your administrator."
- **Practice demo:** file June progress for Lina Maths (scores + a comment), then refile with a correction; try next month.
- **UI details:** big form in a `Card`; native filter selects; `Table`.

### Calendar - `/calendar` - label "Calendar" (`nav.calendar`)
- Shared read-only list of upcoming events (`D/calendar/page.tsx`, all four roles). Teacher sees events with audience Everyone or Teachers (`mig/0027:411-414`). Each card: date block (day number + short month), title, type badge (raw `event|holiday|deadline`), description. Empty `calendar.noEvents` "No upcoming events." Only events from today onward (`schoolToday()`). Creation is admin-only (see Admin > Calendar). **Practice demo:** find the next holiday and the next deadline; filter nothing (no filters exist).

### Documents - `/documents` - label "Documents" (`nav.documents`)
- Shared read-only list with Download (`D/documents/page.tsx`; admins use `/admin/documents`). Teacher sees general documents with audience Everyone/Teachers; **never** student-specific documents (`mig/0027:435-443`). Download opens a 60-second signed link in a new tab; error text "Could not open the file." / "Document not found." (`L/documents/getDocumentUrl.ts`). Empty `documents.noDocuments`. **Practice demo:** download the policy PDF; note category badge.

### Messages - `/messages` - label "Messages" (`nav.messages`)
- Shared; see section 6. Teacher specifics: may start a direct chat with the students they teach, those students' parents, and any admin - **not** other teachers (`mig/0048:126-170`); is automatically a member of the group chat of each class+subject they teach ("Taught by {teacher}" label, members = that class's students + the teacher, parents excluded); placeholder in some contexts `classChat.typeMessageTeacher` is legacy. **Practice demo:** (1) write to the class group "Homework is on page 12"; (2) message a parent; (3) type a rude word to see the block banner.

### Help Assistant - `/chatbot` - label "Help Assistant" (`nav.helpAssistant`)
- **What it does:** A scripted FAQ helper (not AI): pick one of two characters ("Muhammad" or "Sheikha") and ask short questions about using the app; answers come from a keyword FAQ for the user's role and language (`L/chatbot/faq.ts`, `D/chatbot/actions.ts:59-108`).
- **Main actions:** two persona cards -> "Chat with {name}"; recent conversations; message box "Ask {name} about the app…", each conversation capped at **20 user messages** (`L/chatbot/constants.ts:3`); notes "{n} messages left in this conversation"; at the cap: "You've reached this conversation's message limit." / error "This conversation has reached its message limit. Start a new conversation to keep chatting." Input max 500 characters. Disclaimer `chatbot.disclaimer` "App questions only - not for personal or sensitive information."
- **Who can see / change:** Only the user's own conversations (`mig/0005_chatbot.sql:69-82`); layout allows teacher/student/parent only (`D/chatbot/layout.tsx:6`) - **admins have no Help Assistant**. Admins cannot read these chats (no admin policy).
- **Practice demo:** ask "How do I mark attendance?"; reach a short answer; notice the message counter.
- **Uncertain:** the FAQ answer texts were not reviewed here (591-line `faq.ts`); lessons should not copy them.
- **UI details:** persona `Card`s with round avatar, chat bubbles in `ChatInterface.tsx`.

### Feedback - `/feedback` - label "Feedback" (`nav.feedback`)
- **What it does:** Tell the school about a problem or idea; admins read it in their inbox.
- **Main actions:** Category (Technical Issue / Academic Issue / Suggestion / General Feedback), Subject, Message (max 4000), "Submit" -> "Thanks - your feedback has been submitted." Max 10 per hour (`D/feedback/actions.ts:19`; error "You've submitted a lot of feedback recently - please wait a while before sending more.").
- **Who can see / change:** WRITE: teacher/student/parent for themselves (`D/feedback/actions.ts:30`, `mig/0049:56-59`). READ: the author and the centre's admins only (`mig/0030:67-70`). Not shown to other users. No acknowledgement/notification to the admin beyond the Overview count.
- **Practice demo:** send a "Suggestion" and see the success alert.
- **UI details:** one `Card` with `Select`, `Input`, `Textarea`, success `Alert` (check icon).

### Settings (teacher) - `/settings` - label "Settings" (`nav.settings`)
- Shared (section 7). Teacher differences: password min 12; **no** 2FA card; **passkey suggestion**: after 48 hours since their first registered device a one-time "Set up faster sign-in" page appears (`L/auth.ts:276-290`, `/setup-passkey`), skippable with "Maybe later" (stores `passkey_prompt_dismissed_at`, `app/setup-passkey/actions.ts`) and always available in Settings > "Face ID / Fingerprint Sign-In".

---

# STUDENT

Layout gate `D/student/layout.tsx:4`. Sidebar (`Sidebar.tsx:132-146`): Dashboard, ID Card, My Timetable, Attendance, Assignments, Exams, Grades, Leave Requests, Calendar, Documents, Messages, Help Assistant, Feedback; Settings pinned. A student can read **only their own** attendance, grades, remarks, behaviour, leave, submissions, progress (`student_id = auth.uid()` policies, `mig/0010:161,224,239,255,271`, `mig/0006:50`) and their class's assignments/exams/timetable. Other students' data is invisible except names (profiles are centre-readable - see Users) and group-chat posts.

### Dashboard - `/student` - label "Dashboard" (`nav.dashboard`)
- **What it does:** One page with where the student stands: schedule today, what is due, announcements, grades and teacher comments.
- **Main actions:** none that write. Sections: header "Welcome, {name}" with class and "Enrollment #"; Academic Progress (ring with overall score + vs. last month); Attendance Summary; "Today's schedule" (each row links to timetable); "Upcoming Tasks & Exams" (assignment/quiz/exam badges, link to the right page; "Nothing due soon - you're all caught up."); Announcements; "Recent Grades"; "Recent Teacher Comments"; "Monthly Performance Overview"; "Teacher Remarks"; "Behaviour Log". If no class: info alert `myTimetable.noClassAssigned`.
- **Who can see / change:** READ own data only (policies above) + class assignments (`mig/0010:176-180`) + announcements `all`/`student` (`mig/0027:392-396`). WRITE: none.
- **Practice demo:** find tomorrow's first lesson; find the next deadline; open the grade you got.
- **UI details:** `ProgressRing`, `StatCard`/cards, `Section` + `ListCard` rows, `Badge` for kind.

### ID Card - `/student/id-card` - label "ID Card" (`nav.idCard`)
- Their own official ID card, view / "Download PDF" / "Save as Image"; **may change their own photo** (PNG <= 4 MB; same photo becomes their profile picture everywhere) (`L/idcard/authorizeIdCardAccess.ts:12,44`). Subtitle `idCard.subtitleStudent`. **Practice demo:** upload a photo, download the PDF.

### My Timetable - `/student/timetable` - label "My Timetable" (`nav.myTimetable`)
- Read-only weekly cards for their class (`D/student/timetable/page.tsx`); shows subject, teacher, room. Empty: `myTimetable.studentEmptyDescription` "Your school hasn't published a timetable yet."; no class: `myTimetable.noClassAssigned` "You haven't been assigned to a class yet. Contact your school administrator." READ: class timetable (`mig/0048:90`). **Practice demo:** find Wednesday's second lesson and its room.

### Attendance - `/student/attendance` - label "Attendance" (`nav.attendance`)
- Read-only. Five tiles: attendance rate % (`L/attendance/rate.ts`), Present, Late, Absent, Excused, then a table Date + Status badge (green/amber/red/slate). READ: own records (`mig/0010:161`), parents too (`mig/0014:46`). Student cannot edit or excuse themselves (a leave request is the route). **Practice demo:** read why the rate dropped; see the absent day listed.

### Assignments - `/student/assignments` - label "Assignments" (`nav.assignments`, page title "My Assignments")
- **What it does:** The student's homework cards and the way to hand them in.
- **Main actions:** Cards for the class's assignments (title, subject · "Due {date}", description, status badge Pending slate / Submitted gold / Graded green). On Pending: **"Mark as Submitted"** (button; no upload). When graded: "Grade: 85" + the teacher's feedback line. Bell + push when a new one is set ("New assignment: ...").
- **Who can see / change:** READ: assignments of their class (`mig/0010:176-180`), their own submissions (`:192-195`). WRITE: create/update only their own submission, only `pending|submitted`, no grade/feedback, only for an assignment of their class, never after grading (`mig/0043:112-135`). The teacher is **not notified** of a submission (they see the status when they open the roster, plus the "Pending grading" count).
- **Practice demo:** open the Maths homework -> Mark as Submitted -> badge becomes "Submitted"; see a graded one with feedback.
- **UI details:** 2-column card grid (`FadeUpStagger`), `Badge` tones.

### Exams - `/student/exams` - label "Exams" (`nav.exams`)
- Read-only table of the class's exams and quizzes: Title, Subject, Type badge (Exam navy / Quiz gold), Date, Room. Empty `exams.noExams`. READ: `D/student/exams/page.tsx`; RLS `mig/0048:70`. Notification when added (`New exam: ...`). **Practice demo:** find the next quiz and its room.

### Grades - `/student/grades` - label "Grades" (`nav.grades`)
- Read-only table: Subject, Assessment, "Marks Obtained/Marks Total", Term; empty `grades.noGrades`. READ: own only (`mig/0010:224`); parents see it too (`mig/0014:60`). No notification when a grade is added. **Practice demo:** compute which assessment was lowest.

### Leave Requests - `/student/leave` - label "Leave Requests" (`nav.leave`)
- **What it does:** Ask the school for a day or more off; an admin approves or rejects.
- **Main actions:** Form: Start Date, End Date, Reason, "Submit" -> "Save ✓". List below: Start/End, Reason, Status badge (Pending amber / Approved green / Rejected red). Decision arrives as a bell + push "Leave request approved" / "Leave request not approved" (to the student and parents). Admins are not alerted at submit time. Parents can also file one for the student from the parent dashboard.
- **Who can see / change:** WRITE: the student for themself, status forced `pending` (`mig/0043:248-251`). READ: the student (`mig/0010:271`), their parents (`mig/0014:69`), admins (`:273`), teachers of the class at DB level only. Decision: admin only.
- **Practice demo:** request tomorrow-to-Friday "Doctor's appointment"; try a start date three weeks ago.
- **Errors (exact):** "Please give a short reason."; "The start date can't be more than two weeks ago."; "The end date is too far in the future."; "End date must be on or after the start date." (`L/validation.ts:25-34`, `D/student/leave/actions.ts`).
- **UI details:** `Card` form (2-col dates + textarea) over a `Table`.

### Calendar / Documents / Messages / Help Assistant / Feedback (student)
- **Calendar** `/calendar`: events with audience Everyone or Students (`mig/0027:411`). **Documents** `/documents`: general documents for Everyone/Students **plus any document attached to this student** (e.g. their report card) (`mig/0027:435-443`). **Messages** `/messages`: may chat **only** with teachers who teach them, never classmates or management in a *new* direct chat, but may reply in a chat an admin started (`mig/0046_messaging_v2.sql:17-22` header, `:190-216`); is a member of every subject group of their class (and can post there, so classmates can talk in groups). **Help Assistant** `/chatbot`: as teacher (20-message cap). **Feedback** `/feedback`: as teacher. See sections 6 and 7 and the teacher entries for the exact texts.
- **Practice demos:** Messages: reply "Yes, Miss" in the Maths group; message a teacher; type a rude word and read the block banner. Documents: download their report card. Calendar: find next holiday.

### Settings (student) - `/settings`
- Shared (section 7). Students: Theme, Language, Change Password (min 12), passkey (optional, never prompted), Devices (max 3), Sessions, Notifications, Contact. **No forced password change** (created with the sheet password, `D/admin/users/actions.ts:101`; gate skipped `L/auth.ts:115`), no passkey nudge (`:276`), no 2FA. The device cap still applies (`:119`). Three wrong passwords lock the account until an admin reactivates it (also students; `app/login/actions.ts:87`).

---

# PARENT

Layout gate `D/parent/layout.tsx:4`. Sidebar (`Sidebar.tsx:148-156`): Dashboard, ID Card, Calendar, Documents, Messages, Help Assistant, Feedback; Settings pinned. Parents are **read-only** on their children's school data, via `is_parent_of()` policies (`mig/0014_parent_portal.sql:20-27,46-82`); the only things a parent can write are leave requests, feedback, messages and their own settings.

### Dashboard - `/parent` - label "Dashboard" (`nav.dashboard`; page title "My Children")
- **What it does:** One child's standing at a glance: progress, attendance, what is coming up, grades, announcements, teacher notes and leave.
- **Main actions:** If the parent has several children: a pill switcher (`/parent?child=<id>`, `nav` with `aria-label="My Children"`); otherwise a single child. Panels: Academic Progress ring, Attendance trend, "Upcoming Assignments", "Upcoming Exams", "Recent Grades", Announcements, "Teacher Remarks", "Behaviour Log", and **Leave Requests**: form (Start Date, End Date, Reason, "Submit") for the selected child + list with status badges. No children linked: info alert `parent.noChildren` "No children linked to your account yet. Contact the school administrator."
- **Who can see / change:** READ: only linked children (`parent_students`, set by admins only: `mig/0014:34-38`), policies for attendance, progress, assignments (class), submissions, grades, remarks, behaviour, leave, documents (`mig/0014:46-75`); announcements/events of audience `all`/`student`/`parent` (`mig/0027:392`, `mig/0048:50,59`). WRITE: a leave request for a linked child, pending only (`mig/0043:252-256`); decision by admin; **no notification to admin at submit**.
- **Practice demo:** (1) switch between two children and see the page change; (2) submit a leave request for Lina; (3) find Lina's latest grade and the teacher's remark.
- **Multiple children:** all parent pages that show a child (`/parent`, `/parent/id-card`) use `?child=` (`D/parent/page.tsx:12`, `D/parent/id-card/page.tsx:15-16`); default is the first linked child. Calendar/Documents/Messages/Feedback are parent-wide, not per child (documents attached to *any* linked child appear together).
- **UI details:** same building blocks as the student dashboard; `PageHeader` with description "{class} · #{enrollment}"; `ChildLeaveForm`.

### ID Card - `/parent/id-card` - label "ID Card" (`nav.idCard`)
- View / "Download PDF" / "Save as Image" of the selected child's card; parent **may change** the child's photo (`L/idcard/authorizeIdCardAccess.ts:44-47`; subtitle `idCard.subtitleParent`). Child switcher pills when more than one child. READ only for linked children (`:14-23`). **Practice demo:** switch child; download.

### Calendar - `/calendar` - label "Calendar"
- Events for audience Everyone, **Students and Parents** (`mig/0048:59-65` + generic `mig/0027:411`). Same list UI as teacher entry.

### Documents - `/documents` - label "Documents"
- General documents for Everyone/Parents, plus every document attached to any linked child (`mig/0014:74-75`, `mig/0027:435`). Note: documents addressed to audience "Students" with no student attached are **not** shown to parents. **Practice demo:** download a child's report card.

### Messages - `/messages` - label "Messages"
- May start a chat with **their children's teachers** and with **admins** (`mig/0048:126-170`); not with other parents, not with students, not with teachers who do not teach their child. Not a member of subject groups. Typical practice: "Ask Miss Sara about Lina's homework". Safety filter applies (section 6).

### Help Assistant / Feedback / Settings (parent)
- As teacher/student (`D/chatbot/layout.tsx:6`, `D/feedback/page.tsx:9`). Settings: min password 12, **forced password change at first sign-in** (parents are created with `must_change_password = true`: `D/admin/users/actions.ts:101`, admissions `:776`), no passkey nudge, no 2FA, 3-device cap.

---

# ADMIN, TEACHER AND STUDENT: CambriLearn

### CambriLearn - `/cambrilearn` - label "CambriLearn"
- **What it does:** A launcher page styled like a browser window (tab "CambriLearn", address bar `campus.cambrilearn.com/users/login`) with one button, "Open CambriLearn", that opens CambriLearn's own login page in a new browser tab. It is not embedded because CambriLearn's site forbids embedding. Two tips: sign in with your CambriLearn username and password (not your Al Kamal one); CambriLearn opens in a new tab, so switch back to the Al Kamal tab to return.
- **Who can see / change:** admin, teacher and student: layout gate `src/app/(dashboard)/cambrilearn/layout.tsx` `requireRole("admin","teacher","student")`; sidebar item in `src/components/nav/Sidebar.tsx`, second item for each of those roles. **Parents do not see it.** The app only links out; it never sees or stores the CambriLearn password. Onboarding: `since: 11`; `ROLE_ONBOARDING_VERSION` in `src/lib/onboarding/version.ts` keeps parents (no new lesson) from being sent to an empty "what's new".
- **Practice demo:** tap the address bar to see where it goes; press "Open CambriLearn" (the practice shows a pretend message and opens nothing).
- **Uncertain:** what CambriLearn contains is deliberately not described.

---

# CROSS-CUTTING

## 6. Messaging rules (Messages / chat)

**Where:** inbox `/messages`, thread `/messages/[id]` (`D/messages/layout.tsx`, `C/chat/MessagesShell.tsx`, `C/chat/ChatThread.tsx`). Delivery: Supabase Realtime; sending: `POST /api/chat/send` (`app/api/chat/send/route.ts`). Typing/online presence and per-person receipts (ticks "Sent / Delivered / Read").

**Who can START a direct chat** (`can_start_chat`, latest definition `mig/0048_demo_center.sql:126-170`; both people must be active, not archived, and share a centre):
| From | To |
|---|---|
| Admin | anyone |
| Teacher | admins; students of classes they teach; parents of those students (also autism-assignment parents, legacy) |
| Student | only teachers who teach them (a student can **reply** in a chat an admin/teacher opened: `can_send_in_chat`, `mig/0046:190-216`) |
| Parent | admins; teachers of their child's class |
No teacher-teacher, student-student, student-parent, parent-parent, student-admin (new chats). `my_contacts()` returns exactly the people the viewer may start with, and is what the "Directory" / new chat panel lists (`mig/0046:401-430`).

**Subject groups:** one group chat per `class_subject_teachers` row, created by trigger when the admin assigns a teacher (`mig/0046:441`); members = that teacher + all students currently in that class (+ the overseer) (`mig/0047:45-58`); parents and other admins are not members. Any member may post (students included). Label "Subject group", subtitle "Taught by {teacher}", "{n} members". When a teacher is removed from a class they can no longer send (`can_send_in_chat` re-checks every send; the page then shows `messages.readOnly` "You can no longer send messages in this chat.").

**Safety filter** (`L/moderation/*`, engine `L/moderation/engine.ts`, runs in-process on every send, for **every role**, English + Arabic word list + a small ML model):
- `block` -> HTTP 422, message never stored or delivered, sender's bubble disappears and a red banner shows **`messages.blocked`: "This message can't be sent. It breaks the school's messaging rules, and the school has been notified."** (`C/chat/ChatThread.tsx:183-186`, key `en.ts:474`). The text is written to `message_flags` and admins get "Blocked message from {name}".
- `flag` (borderline model score, or **self-harm wording**) -> delivered normally with **no sign to the sender**; logged and admins notified ("Message from {name} needs review" / "Wellbeing concern: {name}") (`app/api/chat/send/route.ts:54`, `L/chat/after-send.ts:84-100`). A word-list hit that also has self-harm wording is blocked **and** logged as a concern (`L/moderation/engine.ts:134`).
- Stored messages that today's stricter filter would block are shown as an italic placeholder **`messages.hiddenMessage`: "This message was hidden by the safety filter."** in the thread and the chat list preview (`L/chat/queries.ts:76-77,106`).
- Other send errors (keys): `messages.notAllowed` "You can't send messages in this chat."; `messages.rateLimited` "You're sending messages too fast. Wait a moment and try again." (limit 20 messages per 10 s, `mig/0046:261`); `messages.failed` "Not sent. Tap to retry."; `messages.openChatFailed` "Couldn't open that chat. Please try again."
- Short everyday messages (< model's min words) are judged by the word/phrase list only; do not promise "any bad sentence is caught".

**Oversight (the honest statement for Chapter 4):**
- Only the **chat overseer account** (`muhammad@alkamalinternational.com`, table `chat_overseers`, `mig/0047:21-29`) can read all private chats and all groups, read-only for other people's direct chats and with no read receipt (`mig/0047:67-75`; `mig/0046:325-340`). Principal and other admins **cannot** read chats they are not in.
- **But** every admin can read the full text of *blocked or flagged* messages in Message safety (`mig/0046:463`) - that is the one window other admins have.
- Senders and recipients of a chat see each other's messages; nobody else (other teachers, other students, other parents) can.

**Practice demo (every role):** (1) send a normal message and watch Sent -> Delivered -> Read; (2) send a message containing a clearly rude word -> banner `messages.blocked`; (3) try finding a classmate in the Directory (not there) as a student; (4) in a group, tap a member count. Mimic: "New chat" panel with search ("Search people", "People"), filters "All / Unread / Groups", empty "No conversations yet.", "Choose a chat, or tap + to start one.", day separators "Today"/"Yesterday", "Load earlier messages", "N unread messages" divider, "Mark all as read".

**UI details:** `ch-*` CSS in `C/chat/chat.css`; left rail (Chats, Groups, Directory, Settings), list pane, wallpaper thread, composer with emoji popover; RTL via logical properties and `ch-flip`; recent Light Rail redesign (Part 59).

## 7. Notifications and push; sign-in and security by role

**In-app bell** (`C/nav/NotificationBell.tsx`; rows from `notifications`; user reads/marks only own, `mig/0032:45-52`; inserts are server-only). Keys `notifications.title|empty|markAllRead`. A separate chat icon with unread badge (`C/nav/MessagesButton.tsx`, `my_unread_total()`).

**What triggers a bell + push (type)**:
| Trigger | Who gets it | Source |
|---|---|---|
| Announcement posted (`announcement`) | all profiles of that audience in the centre (Everyone = every role incl. admin) | `D/admin/announcements/actions.ts:44-62` |
| Leave approved/rejected (`leave`) | the student + all linked parents | `D/admin/leave-requests/actions.ts:12-30` |
| New assignment (`assignment`) | students of the class only | `D/teacher/assignments/actions.ts:44-58` |
| New exam/quiz (`exam`) | students of the class only | `D/teacher/exams/actions.ts:45-60` |
| Message blocked/flagged/wellbeing (`safety`) | admins of the sender's centre | `L/chat/after-send.ts:79-101` |
**Push only (no bell entry):** new chat message to other members (`L/chat/after-send.ts:14-44`, service worker skips if the app is focused); password reset request to AKIS admins (`app/forgot-password/actions.ts:61-80`).
Nothing is sent for: attendance, grades, remarks, progress, documents, events, feedback, submissions (see section 0 items 6-7).

**Enabling push:** Settings > Notifications > "Enable notifications" (`C/settings/PushNotificationToggle.tsx`): needs `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (else "Push isn't configured on this deployment yet."), browser permission (denied -> "Notifications permission was denied."), service worker; failure "Couldn't enable notifications on this browser."; unsupported -> "Push notifications aren't supported in this browser."; off: "Turn off notifications". One subscription row per browser (`push_subscriptions`, upsert by endpoint, `D/settings/actions.ts:87-103`). The toggle is per browser/device, not per account.
**PWA:** `public/manifest.json` (standalone, start `/login`, theme `#0b2138`) + `public/sw.js` registered only in production (`C/PwaRegister.tsx`). There is **no in-app "Add to home screen" prompt** and no `beforeinstallprompt` handling; installation is the browser's own menu. (iOS web push requires an installed home-screen app - general platform knowledge, not verified in this repo.) The proxy deliberately serves `/sw.js`, `/manifest.json` and `/offline` without redirects (`src/proxy.ts:33`).

**Sign-in and security, per role** (all in `L/auth.ts` unless noted):
- **Everyone:** active account (`:70`); 3-device cap (`MAX_DEVICES = 3`, `L/auth/deviceCookie.ts:14`; at the cap sign-in lands on `/devices/manage` "Device limit reached" to remove one); **3 consecutive wrong passwords lock the account** and ban it until an admin reactivates it, even with the right password afterwards (`L/auth/lockout.ts:8`, `app/login/actions.ts:79-90`), plus a 10-attempts/15-min throttle ("Too many failed attempts. Wait a few minutes and try again.", `:17`); exact text `login.locked` / `ACCOUNT_LOCKED_MESSAGE` "This account is locked after 3 failed sign-in attempts. It can't be used to sign in, even with the correct password. Contact your administrator to unlock it." (`L/auth/lockout.ts:13`, applies to students and admins too).
- **Students:** never forced to change password (`:115`), no passkey nudge (`:276`), no 2FA. Settings still lets them change password (12+ chars) and add a passkey.
- **Parents:** forced password change on first sign-in (`:115`), no passkey nudge, no 2FA.
- **Teachers:** forced password change; **passkey suggestion** once, 48 h after the first registered device, skippable with "Maybe later" (`:276-290`, `/setup-passkey`, `passkeySuggestion.*` keys); no 2FA.
- **Admins:** forced password change (min 15 chars) then **mandatory TOTP** (`/mfa/setup` first time, `/mfa/verify` after; `:121-123`, `:207-224`); a verified passkey sign-in counts as the second factor (`:211`); Settings lets them "Reset device". No passkey nudge. Password sign-in routes straight to the 2FA step (`L/auth/completeLogin.ts:151`).
- "Remember me on this device" checkbox on login (`login.rememberMe`); "Sign out other sessions" in Settings; changing the password signs out other sessions (`D/settings/actions.ts:68`).
- Not in this repo's checkout: any change from Jack's unmerged security migrations 0050-0055 (e.g. lockout design) - re-verify before teaching "locked until an admin reactivates".

## 8. Audit log
Covered under Admin > Audit Log. Short form: recorded by server code through the service role (`L/audit/log.ts`), swallowed on failure; viewable by admins only (`mig/0011:84`); includes some teacher and security events; no UI filter; sign-ins, messages and settings changes are not recorded.

## 9. Profile page and class-chat routes
- **`/profile`**: still reachable and used - the Topbar avatar/name links to it for **every role** (`C/nav/Topbar.tsx:37`). It is not in the sidebar. Content: avatar upload with crop (JPG/PNG/WEBP, < 4 MB; `profilePage.avatarInvalidType|avatarTooLarge|cropTitle|...`), Full name, Phone, then admin-editable Email + Date of birth (others see them read-only with hints `profilePage.emailChangeHint|dobChangeHint`), "Account details" (employee ID + qualification for teachers; enrollment number, class, emergency contact for students). Save -> "Profile updated." (`D/profile/*`; the avatar is the same one shown on the ID card).
- **`/class-chat` and `/class-chat/[channelId]`**: **legacy redirects** to `/messages` and to the matching subject group chat (`D/class-chat/page.tsx`, `D/class-chat/[channelId]/page.tsx`); old links in old notifications still land correctly. Dead dictionary keys remain: `nav.classChat` ("Class Chat") and the whole `classChat` section (en `:523`, ar equivalent) - safe to leave, not used by any screen. The `/messages` inbox is the only live chat.

## 10. Existing tour - everything to remove (for the framework phase)

**Files (delete):** `src/lib/tour/actions.ts` (`markTourSeenAction`, `:25`), `src/lib/tour/steps.ts` (`CURRENT_TOUR_VERSION = 4`, `:48`), `src/lib/tour/TourProvider.tsx` (reads `profile.has_seen_tour` / `profile.tour_version_seen`, `useTour`, `startTour`), `src/components/tour/TourOverlay.tsx`.
**Edits (remove references):**
- `C/nav/DashboardShell.tsx:8-9` imports, `:44` `<TourProvider profile onNavStepChange={setMobileOpen}>` wrapper, `:81` `<TourOverlay />`, `:83` closing tag (the `onNavStepChange` existed only so the tour could open the mobile drawer).
- `C/nav/Sidebar.tsx`: `:31` `Compass` import, `:43` `useTour` import, `:188` `const { startTour } = useTour()`, `:298` `data-tour-nav={item.href}`, `:416-444` the "Tutorial" button block + its comment (this is where "Getting started" replaces it).
- `C/ui/PageHeader.tsx:10-11,18,25,32` prop `titleDataTour` and `data-tour={titleDataTour}`.
- `titleDataTour="page-title"` at `D/admin/page.tsx:82`, `D/teacher/page.tsx:42`, `D/student/page.tsx:74`, `D/parent/page.tsx:51`; `data-tour="page-title"` at `D/admin/admissions/page.tsx:34`.
- `L/types/database.types.ts:47-51` comments/fields `has_seen_tour`, `tour_version_seen` (**keep the fields** - the plan reuses them; only drop the "tour" wording if renaming meaning).
- Comment-only mentions: `L/notifications/actions.ts:9`, `L/notifications/notify.ts:22` (migration name `0032_tour_versioning_and_notifications.sql`, which also created the **`notifications`** table - never drop that migration or table); `tailwind.config.ts:92` ("the tour card"); `DESIGN.md:41,56` (gold accent "and the guided tour", "the tour card").
- Scripts that set the columns for fixtures: `scripts/create-tutorial-fixtures.mjs:103-104` (`has_seen_tour: true`, `tour_version_seen: 4`), `scripts/create-audit-fixtures.mjs:79` - these will need `tour_version_seen` bumped so fixtures do not auto-start the new flow; `tutorial-video/` is an unrelated video asset folder.
- Migrations `mig/0029_tour_seen.sql` (`has_seen_tour boolean default false`, comment says "Take the tour again in Settings") and `mig/0032...` (`tour_version_seen integer default 1`, `:28`): **keep** (no migration per plan). Note the self-update policy leaves both columns user-writable on purpose (`L/tour/actions.ts` header comment) - so completion can be saved with the normal client.

**Dictionary keys (en `src/lib/i18n/dictionaries/en.ts:890-1061`, ar `ar.ts:889-1060`, kept identical by the `Dictionary = typeof en` type, `L/i18n/types.ts:6`):**
- `nav.tutorial` - en `:106` "Tutorial", ar `:105` "الجولة التعريفية" (used by the Sidebar button only).
- `tour.next`, `tour.back`, `tour.skip`, `tour.finish`, `tour.stepOf`, `tour.replayTitle`.
- `tour.welcome.{admin|teacher|student|parent}.{title|body}` (8 keys).
- `tour.steps.admin.{overview, users, classes, subjects, timetable, progress, leave, announcements, auditLog, admissions, settings}.{title|body}`; `tour.steps.teacher.{myClasses, classChat, timetable, attendance, assignments, exams, grades, remarks, settings}`; `tour.steps.student.{dashboard, classChat, timetable, attendance, assignments, exams, grades, leave, settings}`; `tour.steps.parent.{dashboard, calendar, documents, messages, settings}` (each `.title|.body`).
- Only runtime users of `dict.tour.*`: `src/lib/tour/steps.ts:59-113` and `src/components/tour/TourOverlay.tsx:212-314`.
No `useTour`, `data-tour` or `has_seen_tour` use exists elsewhere in `src/` (searched). Note the old tour **missed**: ID Cards, Password Resets, Events, Documents, Message safety, Feedback, Chat oversight, Timetable builder, Teacher progress, Help assistant, Light Rail Messages - the staleness test should key off `NAV_ITEMS` hrefs.
Also unrelated but nearby: the admissions welcome email contains the phrase "Getting started is simple" (`D/admin/admissions/actions.ts:650,684`) - not tour code.

## 11. i18n mechanics, theme and locale switching
- **Dictionaries:** `src/lib/i18n/dictionaries/en.ts` (canonical shape, 1064 lines, ~944 key paths) and `ar.ts`. `type Dictionary = typeof en` (`L/i18n/types.ts:6`) so a missing/extra Arabic key is a **compile error** (TypeScript parity already enforced; a test would only be needed for lesson dictionaries that live outside `en.ts`). No interpolation helper: placeholders are `{name}`/`{count}` replaced with `.replace()` at the call site (e.g. `dict.messages.members.replace("{count}", ...)`).
- **Server components:** `const dict = await getDictionary(await getLocale())` (`L/i18n/getDictionary.ts`, `getLocale.ts` reads cookie `NEXT_LOCALE`, default `en`).
- **Client components:** `const { dict, locale } = useLocale()` from `L/i18n/LocaleProvider.tsx` (context mounted in `src/app/layout.tsx:80-84`; throws outside the provider). `dirForLocale(locale)` (`L/i18n/locales.ts`) gives `"rtl"` for `ar`; `<html lang dir>` is set from the cookie in the root layout (`src/app/layout.tsx:73-74`). Localised label helpers for enum values: `L/i18n/labels.ts` (`roleLabel`, `attendanceLabel`, `examTypeLabel`, `documentCategoryLabel`, `feedbackCategoryLabel`, `behaviourLabel`, `audienceLabel`, `displayTitle`). Dates: `formatSchoolDate`/`formatSchoolDateTime`/`schoolToday` in `L/dates.ts`.
- **Applying "Language" instantly:** call `setLocaleCookie("ar" | "en")` (`L/i18n/setLocaleCookie.ts`, writes `NEXT_LOCALE`, 1-year, path `/`) and then do a **full navigation** (`window.location.href = "/getting-started?..."` - a client `router.push` would NOT re-render `<html dir>` or the LocaleProvider). That is exactly what `C/i18n/LanguageCards.tsx` does (`redirectTo`). There is no server action and no `profiles.locale` column (`grep` of `mig/` found none). Practice screens that must be Arabic/English **without** a reload should take `locale` and a **lesson-local dictionary** rather than depend on the global one; the global switch needs the reload.
- **Theme:** `useTheme()` from `L/theme/ThemeProvider.tsx` returns `{ theme: "light" | "dark", setTheme }`; `setTheme` updates state, toggles `document.documentElement.classList` `dark` and writes cookie `THEME` (1 year) - **instant, no reload** (`:23-27`). Server reads `getTheme()` (`L/theme/getTheme.ts`) and adds the `dark` class in `<html>` (`src/app/layout.tsx:75`). No "system" option exists: "Match my device" = `window.matchMedia("(prefers-color-scheme: dark)").matches` then `setTheme(...)` once (that choice is then stored as plain light/dark). Settings UI for reference: `C/settings/ThemeSwitch.tsx` (two buttons, `settings.themeLight|themeDark`).
- **First-launch language screen (already exists):** proxy redirects any browser without `NEXT_LOCALE` to `/welcome/language` (`src/proxy.ts:75-77`), then `/welcome/splash` (1.4 s) then `/login`; copy keys `welcome.languageTitle|languageSubtitle|continueButton|splashTagline`. So signed-in users will already have a locale cookie.
- **Fonts/RTL:** families named directly (IBM Plex Sans / Sans Arabic / Source Serif 4) - do not rely on next/font fallback (DESIGN.md "Type"); use logical utilities (`ms-/me-/ps-/pe-`, `rtl:rotate-180`) as the app does.

## 12. Design primitives to reuse (`src/components/ui/*`, rules in `DESIGN.md`)
- `ActionForm.tsx` - drop-in `<form action>` that does **not** wipe inputs after server errors; `useFormStatus` re-export. Use for practice forms to match real behaviour.
- `Alert.tsx` - `tone: error|success|info|warning`, `role="alert"`.
- `Badge.tsx` - tones `green` (done/present/approved), `amber` (pending), `red` (failed/absent/rejected), `navy`, `slate`, `gold` (renders warm neutral).
- `Button.tsx` - variants `primary|secondary|danger|gold`, `loading` prop. DESIGN.md: only one filled button per screen.
- `Card.tsx` - `Card`, `StatCard` (label, value, hint, icon, trend sparkline, delta).
- `ConfirmDialog.tsx` - centred modal via portal (`title`, `confirmLabel`, `onConfirm`, `confirmDisabled`, `pending`); used for typed-`DELETE` archive.
- `ExportCsvButton.tsx` - client-side CSV from rows/columns.
- `Field.tsx` - `Input`, `Textarea`, `Select`, `FieldWrapper` (label, hint, error).
- `FileUpload.tsx` - drag-and-drop single file with remove.
- `List.tsx` - `Section`, `SectionLink`, `ListCard`, `ListRows`, `ListRow(Link)`, `ListEmpty`, `DateBlock` (one card, hairline-divided rows).
- `Listbox.tsx` - accessible custom select.
- `Logo.tsx` - crest + wordmark.
- `PageHeader.tsx` - eyebrow, serif title, description, one action (carries the soon-removed `titleDataTour`).
- `PasswordField.tsx` - input with show/hide.
- `ProgressRing.tsx` - circular score. `Sparkline.tsx` - tiny trend + `TrendDelta`.
- `Table.tsx` - `Table`, `Thead`, `Th`, `Tbody`, `Td`, `EmptyState`.
- Other reusable pieces: `C/timetable/WeeklyScheduleGrid.tsx` (+ `builder/NewEntryForm.tsx`, `ClassSelect`), `C/idcard/IdCardGraphic.tsx`/`IdCardView.tsx` (pure model-driven card), `C/chat/*` (thread/list/composer; heavy coupling to Realtime provider `ChatRealtimeProvider`), `C/motion/FadeUp.tsx` (layout-only now), `C/auth/AuthBackground.tsx` (the one navy gradient + star lattice surface, used by `/welcome` layout), `C/offline/OfflineBanner.tsx`.
- **DESIGN.md rules a practice screen must obey:** IBM Plex Sans body 14px, Source Serif 4 only for page titles/hero numbers, sentence case, navy ink + slate greys, gold only on dark brand surfaces, status colours only for status, radii 6/8/10px, 1px border + `shadow-card`, 8px grid, 16px phone gutter, buttons 40/44px, no mascots/confetti/blobs/gradient buttons, one animation per change and `prefers-reduced-motion`, Lucide 1.75 stroke icons beside labels, no emoji. Checklist: 390/320/1366 px, light/dark/RTL.

## 13. Visibility cheat-sheet (for Chapter 4 per-role table)
| Data | Student (self) | Parents of that student | Teacher | Other students / other parents | Admin |
|---|---|---|---|---|---|
| Attendance | yes | yes | all teachers of the class (`mig/0043:198`) | no | all |
| Grades | yes | yes | only the teacher who recorded it (`mig/0010:226`) | no | all |
| Remarks / behaviour (incl. Negative) | **yes** | **yes** | only the author (`mig/0010:241,257`) | no | all |
| Monthly progress + comments | yes | yes | only the author (`mig/0006:60`) | no | all |
| Assignments | class only | via child's class | only the assigning teacher | other classes: no | all |
| Submissions + grade/feedback | own | child's | the assignment's teacher | no | all |
| Exams | class (UI) | child's class (UI) | own exams (UI); centre-wide at DB | DB: readable centre-wide (`mig/0048:70`) | all |
| Timetable | class | via child's class (UI) | centre-wide read; any teacher can edit | DB: centre-wide read | all |
| Leave requests | own | child's | class teachers at DB only, no UI | no | all, decides |
| Documents | role docs + own-student docs | role docs + child's docs | role docs only | no | all |
| Announcements / events | by audience (`all`+`student`) | `all`+`student`+`parent` | `all`+`teacher` | - | all |
| Direct chats | participants only | participants only | participants only | no | overseer only (all); others only their own + flagged text |
| Student ID card | own (+ photo change) | child (+ photo change) | students of own classes, no photo change | no | all students (+ photo change) |
| Audit log | no | no | no (but their actions are in it) | no | yes |

---

## Uncertain / needs Mark's check

1. **`/welcome` path clash** (section 0 item 1): decide the new route name or rework the proxy/layout. Proxy is the only thing that makes `/welcome/*` public.
2. **Teacher "edit any class timetable"** is real in SQL and UI but may not be intended policy (migration 0042/0048/0049 comments call it Muhammad's choice); decide wording for the Timetable lesson.
3. **Locked admin cannot be reactivated from the app** (and Users filter has no admin role). Unknown how it is recovered in practice (service role / SQL). Avoid teaching it; confirm whether Jack's 0050-0055 change lockout (not in this checkout).
4. **`profiles` and `exams` readable centre-wide at the database** (names/emails/phones/DOB; exams of all classes) while the UI hides them. Lessons describe UI visibility; do not claim a DB guarantee for those two tables. Also admin policies are not centre-scoped for several tables (harmless with one centre).
5. **Parents are not notified of assignments/exams/grades** and student-audience announcements only notify students: confirm this is intended before the Parent lessons set expectations ("you will be told when..." must not be used).
6. **Message Safety "Open chat" key** (`messageSafety.openChat`) exists with no UI; Cosmetic only, but the practice copies should follow the real UI (no link).
7. **iPhone push requires installed app** - stated from platform knowledge, not from this repo; no install prompt exists in the app, so the "Mostly on Phone" tip has to describe the browser's own "Add to Home Screen" step.
8. **Dictionary has no keys for many page strings** (hard-coded English in actions: validation messages above, "Due {date}" on assignment cards, "Choose a month...", success `Save ✓`, ConfirmDialog `confirm()` text). Arabic users see these in English today; practice screens either match (honest) or translate (diverges). Needs a decision.
9. **Help Assistant FAQ answers** were not read (`L/chatbot/faq.ts`, 591 lines); if any answer mentions "Tutorial"/"tour" it must be updated (a grep for "tutorial|tour|guided" found none in `src/` outside tour files, but the FAQ text itself was only grepped, not read).
10. **Calendar event type badge and a few dates** print raw enum words / default `toLocaleDateString()` (not localised) - practice screens may localise; real screen does not.
11. **Plan item "Audit log (filter)" and "Admissions review -> accept" and "Password resets (approve)"** do not match the product (items 2-4 in section 0); lesson tasks must be rewritten (e.g. "set a new password for the account in the request").
12. **Chat oversight lesson** is shown only to the overseer: a client-side check needs the same `is_chat_overseer` result the layout already fetches (`D/layout.tsx:18` passes `canOverseeChats` to `DashboardShell` -> `Sidebar`), not currently exposed to other components.
13. **Not verified in a browser**: nothing was executed; item behaviour (e.g. exact visual layout, whether `confirm()` dialogs show in the practice copy) comes from source only.
