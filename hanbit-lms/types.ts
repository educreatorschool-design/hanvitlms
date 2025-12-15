export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Simple mock auth
}

export enum CourseType {
  VIDEO = 'VIDEO',
  TEXT = 'TEXT',
  AI_TUTOR = 'AI_TUTOR'
}

export interface EvaluationCriteria {
  name: string; // e.g., "과제", "토론", "종합평가"
  percentage: number;
}

export interface QuizQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'ESSAY';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer?: string; // For auto grading reference
}

export interface WeeklyModule {
  week: number;
  title: string;
  description: string;
  studyMaterial?: string; // HTML/Markdown content (AI generated 교안)
  quiz?: QuizQuestion[];
  
  // Flags for enabling features
  hasAssignment?: boolean;
  hasDiscussion?: boolean;
  hasExam?: boolean;

  // Detailed content for activities
  assignmentTitle?: string;
  assignmentDescription?: string;
  discussionTopic?: string;
  discussionDescription?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  major: string;
  totalWeeks: number;
  type: CourseType;
  evaluationCriteria: EvaluationCriteria[];
  syllabus: WeeklyModule[];
  studentIds: string[]; // Approved students
  pendingStudentIds: string[]; // Requests
}

export interface Submission {
  id: string;
  courseId: string;
  week: number;
  studentId: string;
  type: 'ASSIGNMENT' | 'DISCUSSION' | 'EXAM';
  content: string; // Text or file URL (mock)
  score?: number;
  feedback?: string;
  submittedAt: string;
}

// --- New Types for Notices & QnA ---

export interface SiteNotice {
  id: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface CourseNotice {
  id: string;
  courseId: string;
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
}

export interface CourseQnA {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  title: string;
  content: string;
  createdAt: string;
  answer?: string;
  answeredAt?: string;
}

// --- Messaging System ---
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface AppState {
  currentUser: User | null;
  users: User[];
  courses: Course[];
  submissions: Submission[];
  
  // New State Arrays
  siteNotices: SiteNotice[];
  courseNotices: CourseNotice[];
  courseQnAs: CourseQnA[];
  messages: Message[];

  login: (user: User) => void;
  logout: () => void;
  registerUser: (user: User) => void;
  addCourse: (course: Course) => void;
  updateCourse: (course: Course) => void;
  enrollStudent: (courseId: string, studentId: string) => void;
  approveStudent: (courseId: string, studentId: string) => void;
  removeStudent: (studentId: string) => void; // Global removal
  addSubmission: (submission: Submission) => void;
  gradeSubmission: (id: string, score: number, feedback: string) => void;
  importData: (data: string) => void;
  exportData: () => string;

  // New Actions
  addSiteNotice: (notice: SiteNotice) => void;
  deleteSiteNotice: (id: string) => void;
  addCourseNotice: (notice: CourseNotice) => void;
  deleteCourseNotice: (id: string) => void;
  addCourseQnA: (qna: CourseQnA) => void;
  answerCourseQnA: (id: string, answer: string) => void;
  
  sendMessage: (msg: Message) => void;
  markMessagesAsRead: (senderId: string, receiverId: string) => void;
}