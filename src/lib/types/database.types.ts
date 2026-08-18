// Hand-written types matching supabase/migrations/0001_schema.sql.
// If you change the schema, update this file to match (or generate it with
// `npx supabase gen types typescript --project-id <ref> > src/lib/types/database.types.ts`).

export type UserRole = "admin" | "teacher" | "student" | "parent";

// Added by 0027_centers.sql. Fixed, well-known ids — see that migration's
// header comment for why they're not gen_random_uuid().
export const AKIS_CENTER_ID = "00000000-0000-0000-0000-000000000001";
export const AKET_CENTER_ID = "00000000-0000-0000-0000-000000000002";

export type Center = {
  id: string;
  name: string;
  short_code: string;
  logo_path: string | null;
  is_active: boolean;
  created_at: string;
};

export type ProfileCenterAccess = {
  id: string;
  profile_id: string;
  center_id: string;
  created_at: string;
};

export type Profile = {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  title: string | null;
  is_active: boolean;
  archived_at: string | null;
  archived_by: string | null;
  // Added by 0022_account_security_columns.sql.
  failed_login_attempts: number;
  must_change_password: boolean;
  // Added by 0028_passkey_prompt_dismissal.sql.
  passkey_prompt_dismissed_at: string | null;
  // Added by 0029_tour_seen.sql.
  has_seen_tour: boolean;
  // Added by 0027_centers.sql — the profile's home center. See
  // profile_center_access for which center(s) a profile may actually access
  // (usually just this one; more than one for a multi-center account).
  center_id: string;
  created_at: string;
  updated_at: string;
};

export type ClassRow = {
  id: string;
  name: string;
  section: string;
  academic_year: string;
  homeroom_teacher_id: string | null;
  center_id: string;
  created_at: string;
};

export type Subject = {
  id: string;
  name: string;
  code: string;
  center_id: string;
  created_at: string;
};

export type Teacher = {
  id: string;
  employee_id: string;
  qualification: string | null;
  joining_date: string | null;
  created_at: string;
};

export type Student = {
  id: string;
  enrollment_number: string;
  class_id: string | null;
  guardian_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  created_at: string;
};

export type ClassSubjectTeacher = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  created_at: string;
};

export type Enrollment = {
  id: string;
  student_id: string;
  class_id: string;
  academic_year: string;
  status: "active" | "transferred" | "completed";
  enrolled_at: string;
};

export type TimetableEntry = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number; // 1 = Monday .. 7 = Sunday
  start_time: string; // "HH:MM:SS"
  end_time: string;
  room: string | null;
  created_at: string;
};

export type MonthlyProgressEntry = {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  month: string; // "YYYY-MM-DD", always stored as the 1st of the month
  attendance_percentage: number;
  homework_completion: number;
  class_participation: number;
  behaviour_conduct: number;
  assessment_performance: number;
  subject_understanding: number;
  teacher_comments: string | null;
  improvement_priority_areas: string | null;
  created_at: string;
  updated_at: string;
};

export type AnnouncementAudience = "all" | "teacher" | "student" | "parent";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  created_by: string | null;
  center_id: string;
  created_at: string;
};

export type FeedbackCategory = "technical" | "academic" | "suggestion" | "general";
export type FeedbackStatus = "new" | "reviewed" | "resolved";

export type Feedback = {
  id: string;
  user_id: string;
  category: FeedbackCategory;
  subject: string;
  message: string;
  status: FeedbackStatus;
  // Added by 0030_feedback_center_id.sql — the center the submitting user
  // belonged to at submission time. See centers/profile_center_access for
  // the access-grant model this is checked against in RLS.
  center_id: string;
  created_at: string;
};

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export type AttendanceRecord = {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by: string;
  created_at: string;
};

export type Assignment = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string;
  created_at: string;
};

export type SubmissionStatus = "pending" | "submitted" | "graded";

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  grade: number | null;
  feedback: string | null;
};

export type ExamType = "exam" | "quiz";

export type Exam = {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  title: string;
  exam_type: ExamType;
  exam_date: string;
  start_time: string | null;
  room: string | null;
  created_at: string;
};

export type Grade = {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string;
  exam_id: string | null;
  assessment_name: string;
  marks_obtained: number;
  marks_total: number;
  term: string;
  created_at: string;
};

export type TeacherRemark = {
  id: string;
  student_id: string;
  teacher_id: string;
  remark: string;
  created_at: string;
};

export type BehaviourCategory = "positive" | "negative";

export type BehaviourLogEntry = {
  id: string;
  student_id: string;
  teacher_id: string;
  category: BehaviourCategory;
  description: string;
  created_at: string;
};

export type LeaveStatus = "pending" | "approved" | "rejected";

export type LeaveRequest = {
  id: string;
  student_id: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: LeaveStatus;
  reviewed_by: string | null;
  created_at: string;
};

export type EventType = "event" | "holiday" | "deadline";

export type SchoolEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: EventType;
  audience: AnnouncementAudience;
  created_by: string | null;
  center_id: string;
  created_at: string;
};

export type DocumentCategory = "admit_card" | "report_card" | "certificate" | "policy" | "general";

export type SchoolDocument = {
  id: string;
  title: string;
  category: DocumentCategory;
  audience: AnnouncementAudience;
  student_id: string | null;
  file_path: string;
  uploaded_by: string | null;
  center_id: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  actor_id: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type RateLimitEvent = {
  id: string;
  bucket: string;
  created_at: string;
};

export type PasswordResetRequestStatus = "pending" | "completed" | "dismissed";

export type PasswordResetRequest = {
  id: string;
  email: string;
  status: PasswordResetRequestStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
};

export type UserDevice = {
  id: string;
  user_id: string;
  device_id: string;
  label: string | null;
  location: string | null;
  user_agent: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

export type WebauthnCredential = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string | null;
  backed_up: boolean;
  transports: string[] | null;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
};

export type DmConversation = {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
  updated_at: string;
};

export type DmMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type ParentStudent = {
  id: string;
  parent_id: string;
  student_id: string;
  created_at: string;
};

// Added by 0031_subject_chat.sql. channel_id is a class_subject_teachers.id
// — the channel IS that row, there's no separate "channel" table.
export type SubjectChatMessage = {
  id: string;
  channel_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

export type ChatbotPersona = "muhammad" | "sheikha";

export type ChatbotConversation = {
  id: string;
  user_id: string;
  persona: ChatbotPersona;
  created_at: string;
  updated_at: string;
};

export type ChatbotMessage = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

// Minimal Database shape so `createClient<Database>()` gets useful typing
// without needing the full Supabase CLI codegen output.
export type Database = {
  public: {
    Tables: {
      centers: { Row: Center; Insert: Partial<Center> & { name: string; short_code: string }; Update: Partial<Center>; Relationships: [] };
      profile_center_access: {
        Row: ProfileCenterAccess;
        Insert: Partial<ProfileCenterAccess> & { profile_id: string; center_id: string };
        Update: Partial<ProfileCenterAccess>;
        Relationships: [];
      };
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string; role: UserRole; full_name: string; email: string }; Update: Partial<Profile>; Relationships: [] };
      classes: { Row: ClassRow; Insert: Partial<ClassRow> & { name: string; section: string }; Update: Partial<ClassRow>; Relationships: [] };
      subjects: { Row: Subject; Insert: Partial<Subject> & { name: string; code: string }; Update: Partial<Subject>; Relationships: [] };
      teachers: { Row: Teacher; Insert: Partial<Teacher> & { id: string; employee_id: string }; Update: Partial<Teacher>; Relationships: [] };
      students: { Row: Student; Insert: Partial<Student> & { id: string; enrollment_number: string }; Update: Partial<Student>; Relationships: [] };
      class_subject_teachers: { Row: ClassSubjectTeacher; Insert: Partial<ClassSubjectTeacher> & { class_id: string; subject_id: string; teacher_id: string }; Update: Partial<ClassSubjectTeacher>; Relationships: [] };
      enrollments: { Row: Enrollment; Insert: Partial<Enrollment> & { student_id: string; class_id: string; academic_year: string }; Update: Partial<Enrollment>; Relationships: [] };
      timetable_entries: { Row: TimetableEntry; Insert: Partial<TimetableEntry> & { class_id: string; subject_id: string; teacher_id: string; day_of_week: number; start_time: string; end_time: string }; Update: Partial<TimetableEntry>; Relationships: [] };
      chatbot_conversations: { Row: ChatbotConversation; Insert: Partial<ChatbotConversation> & { user_id: string; persona: ChatbotPersona }; Update: Partial<ChatbotConversation>; Relationships: [] };
      chatbot_messages: { Row: ChatbotMessage; Insert: Partial<ChatbotMessage> & { conversation_id: string; role: "user" | "assistant"; content: string }; Update: Partial<ChatbotMessage>; Relationships: [] };
      monthly_progress_entries: {
        Row: MonthlyProgressEntry;
        Insert: Partial<MonthlyProgressEntry> & {
          student_id: string;
          subject_id: string;
          class_id: string;
          teacher_id: string;
          month: string;
          attendance_percentage: number;
          homework_completion: number;
          class_participation: number;
          behaviour_conduct: number;
          assessment_performance: number;
          subject_understanding: number;
        };
        Update: Partial<MonthlyProgressEntry>;
        Relationships: [];
      };
      announcements: { Row: Announcement; Insert: Partial<Announcement> & { title: string; body: string }; Update: Partial<Announcement>; Relationships: [] };
      feedback: { Row: Feedback; Insert: Partial<Feedback> & { user_id: string; category: FeedbackCategory; subject: string; message: string }; Update: Partial<Feedback>; Relationships: [] };
      attendance_records: {
        Row: AttendanceRecord;
        Insert: Partial<AttendanceRecord> & { student_id: string; class_id: string; date: string; status: AttendanceStatus; marked_by: string };
        Update: Partial<AttendanceRecord>;
        Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: Partial<Assignment> & { class_id: string; subject_id: string; teacher_id: string; title: string; due_date: string };
        Update: Partial<Assignment>;
        Relationships: [];
      };
      assignment_submissions: {
        Row: AssignmentSubmission;
        Insert: Partial<AssignmentSubmission> & { assignment_id: string; student_id: string };
        Update: Partial<AssignmentSubmission>;
        Relationships: [];
      };
      exams: {
        Row: Exam;
        Insert: Partial<Exam> & { class_id: string; subject_id: string; teacher_id: string; title: string; exam_date: string };
        Update: Partial<Exam>;
        Relationships: [];
      };
      grades: {
        Row: Grade;
        Insert: Partial<Grade> & {
          student_id: string;
          subject_id: string;
          class_id: string;
          teacher_id: string;
          assessment_name: string;
          marks_obtained: number;
          marks_total: number;
        };
        Update: Partial<Grade>;
        Relationships: [];
      };
      teacher_remarks: {
        Row: TeacherRemark;
        Insert: Partial<TeacherRemark> & { student_id: string; teacher_id: string; remark: string };
        Update: Partial<TeacherRemark>;
        Relationships: [];
      };
      behaviour_log: {
        Row: BehaviourLogEntry;
        Insert: Partial<BehaviourLogEntry> & { student_id: string; teacher_id: string; category: BehaviourCategory; description: string };
        Update: Partial<BehaviourLogEntry>;
        Relationships: [];
      };
      leave_requests: {
        Row: LeaveRequest;
        Insert: Partial<LeaveRequest> & { student_id: string; reason: string; start_date: string; end_date: string };
        Update: Partial<LeaveRequest>;
        Relationships: [];
      };
      events: { Row: SchoolEvent; Insert: Partial<SchoolEvent> & { title: string; event_date: string }; Update: Partial<SchoolEvent>; Relationships: [] };
      documents: { Row: SchoolDocument; Insert: Partial<SchoolDocument> & { title: string; file_path: string }; Update: Partial<SchoolDocument>; Relationships: [] };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog> & { actor_id: string; action: string }; Update: Partial<AuditLog>; Relationships: [] };
      dm_conversations: {
        Row: DmConversation;
        Insert: Partial<DmConversation> & { participant_a: string; participant_b: string };
        Update: Partial<DmConversation>;
        Relationships: [];
      };
      dm_messages: {
        Row: DmMessage;
        Insert: Partial<DmMessage> & { conversation_id: string; sender_id: string; content: string };
        Update: Partial<DmMessage>;
        Relationships: [];
      };
      push_subscriptions: {
        Row: PushSubscriptionRow;
        Insert: Partial<PushSubscriptionRow> & { user_id: string; endpoint: string; p256dh: string; auth: string };
        Update: Partial<PushSubscriptionRow>;
        Relationships: [];
      };
      parent_students: {
        Row: ParentStudent;
        Insert: Partial<ParentStudent> & { parent_id: string; student_id: string };
        Update: Partial<ParentStudent>;
        Relationships: [];
      };
      rate_limit_events: {
        Row: RateLimitEvent;
        Insert: Partial<RateLimitEvent> & { bucket: string };
        Update: Partial<RateLimitEvent>;
        Relationships: [];
      };
      password_reset_requests: {
        Row: PasswordResetRequest;
        Insert: Partial<PasswordResetRequest> & { email: string };
        Update: Partial<PasswordResetRequest>;
        Relationships: [];
      };
      user_devices: {
        Row: UserDevice;
        Insert: Partial<UserDevice> & { user_id: string; device_id: string };
        Update: Partial<UserDevice>;
        Relationships: [];
      };
      webauthn_credentials: {
        Row: WebauthnCredential;
        Insert: Partial<WebauthnCredential> & { user_id: string; credential_id: string; public_key: string };
        Update: Partial<WebauthnCredential>;
        Relationships: [];
      };
      subject_chat_messages: {
        Row: SubjectChatMessage;
        Insert: Partial<SubjectChatMessage> & { channel_id: string; sender_id: string; content: string };
        Update: Partial<SubjectChatMessage>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
