import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AppState, UserRole, CourseType, User, Course, Submission } from './types';
import { supabase } from './supabase';

// Mock Data
const MOCK_ADMIN: User = {
  id: 'admin-1',
  name: '관리자',
  email: 'admin@hanbit.com',
  role: UserRole.ADMIN,
  password: '' // Checked manually in component against 050719
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [MOCK_ADMIN],
      courses: [],
      submissions: [],
      siteNotices: [],
      courseNotices: [],
      courseQnAs: [],
      messages: [],

      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),
      
      registerUser: (user) => set((state) => ({ users: [...state.users, user] })),
      
      addCourse: (course) => set((state) => ({ courses: [...state.courses, course] })),
      
      updateCourse: (updatedCourse) => set((state) => ({
        courses: state.courses.map((c) => c.id === updatedCourse.id ? updatedCourse : c)
      })),

      enrollStudent: (courseId, studentId) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            if (c.studentIds.includes(studentId) || c.pendingStudentIds.includes(studentId)) return c;
            return { ...c, pendingStudentIds: [...c.pendingStudentIds, studentId] };
          }
          return c;
        })
      })),

      approveStudent: (courseId, studentId) => set((state) => ({
        courses: state.courses.map(c => {
          if (c.id === courseId) {
            return {
              ...c,
              pendingStudentIds: c.pendingStudentIds.filter(id => id !== studentId),
              studentIds: [...c.studentIds, studentId]
            };
          }
          return c;
        })
      })),
      
      removeStudent: (studentId) => set((state) => ({
        users: state.users.filter(u => u.id !== studentId),
        courses: state.courses.map(c => ({
            ...c,
            studentIds: c.studentIds.filter(id => id !== studentId),
            pendingStudentIds: c.pendingStudentIds.filter(id => id !== studentId)
        })),
        submissions: state.submissions.filter(s => s.studentId !== studentId)
      })),

      addSubmission: (submission) => set((state) => {
        const filtered = state.submissions.filter(s => 
          !(s.courseId === submission.courseId && 
            s.week === submission.week && 
            s.studentId === submission.studentId && 
            s.type === submission.type)
        );
        return { submissions: [...filtered, submission] };
      }),

      gradeSubmission: (id, score, feedback) => set((state) => ({
        submissions: state.submissions.map(s => s.id === id ? { ...s, score, feedback } : s)
      })),

      // Notice Actions
      addSiteNotice: (notice) => set((state) => ({ siteNotices: [notice, ...state.siteNotices] })),
      deleteSiteNotice: (id) => set((state) => ({ siteNotices: state.siteNotices.filter(n => n.id !== id) })),
      
      addCourseNotice: (notice) => set((state) => ({ courseNotices: [notice, ...state.courseNotices] })),
      deleteCourseNotice: (id) => set((state) => ({ courseNotices: state.courseNotices.filter(n => n.id !== id) })),

      // QnA Actions
      addCourseQnA: (qna) => set((state) => ({ courseQnAs: [qna, ...state.courseQnAs] })),
      answerCourseQnA: (id, answer) => set((state) => ({
        courseQnAs: state.courseQnAs.map(q => q.id === id ? { ...q, answer, answeredAt: new Date().toISOString() } : q)
      })),

      // Messaging Actions
      sendMessage: (msg) => set((state) => ({ messages: [...(state.messages || []), msg] })),
      markMessagesAsRead: (senderId, receiverId) => set((state) => ({
        messages: (state.messages || []).map(m => 
          (m.senderId === senderId && m.receiverId === receiverId && !m.read)
            ? { ...m, read: true } 
            : m
        )
      })),

      importData: (jsonString) => {
        try {
          const data = JSON.parse(jsonString);
          if (data.users && data.courses) {
            set({ 
                users: data.users, 
                courses: data.courses, 
                submissions: data.submissions || [],
                siteNotices: data.siteNotices || [],
                courseNotices: data.courseNotices || [],
                courseQnAs: data.courseQnAs || [],
                messages: data.messages || []
            });
          }
        } catch (e) {
          console.error("Import failed", e);
          alert("데이터 복구 실패: 올바르지 않은 파일 형식입니다.");
        }
      },

      exportData: () => {
        const state = get();
        return JSON.stringify({
          users: state.users,
          courses: state.courses,
          submissions: state.submissions,
          siteNotices: state.siteNotices,
          courseNotices: state.courseNotices,
          courseQnAs: state.courseQnAs,
          messages: state.messages
        });
      }
    }),
    {
      name: 'hanbit-lms-storage',
    }
  )
);

// --- Real-time Cloud Synchronization (Supabase) ---

let isSyncingFromServer = false;
let saveTimeout: any = null;
const SYNC_ROW_ID = 1;

// 1. Listen for changes from Supabase Realtime
supabase
  .channel('lms_sync_channel')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'lms_sync', filter: `id=eq.${SYNC_ROW_ID}` },
    (payload) => {
      const data = payload.new.state;
      if (data) {
        isSyncingFromServer = true;
        
        useStore.setState((state) => ({
          ...state,
          users: data.users || state.users,
          courses: data.courses || [],
          submissions: data.submissions || [],
          siteNotices: data.siteNotices || [],
          courseNotices: data.courseNotices || [],
          courseQnAs: data.courseQnAs || [],
          messages: data.messages || []
        }));
        
        // Prevent echo loop
        setTimeout(() => { isSyncingFromServer = false; }, 200);
      }
    }
  )
  .subscribe();

// 2. Initial Fetch
supabase
  .from('lms_sync')
  .select('state')
  .eq('id', SYNC_ROW_ID)
  .single()
  .then(({ data }) => {
    if (data?.state) {
        isSyncingFromServer = true;
        useStore.setState((state) => ({
          ...state,
          ...data.state
        }));
        setTimeout(() => { isSyncingFromServer = false; }, 200);
    }
  });


// 3. Push changes to Supabase
useStore.subscribe((state) => {
  if (!isSyncingFromServer) {
    if (saveTimeout) clearTimeout(saveTimeout);
    
    saveTimeout = setTimeout(async () => {
        const dataToSave = {
            users: state.users,
            courses: state.courses,
            submissions: state.submissions,
            siteNotices: state.siteNotices,
            courseNotices: state.courseNotices,
            courseQnAs: state.courseQnAs,
            messages: state.messages
        };

        // Upsert to Supabase
        await supabase
          .from('lms_sync')
          .upsert({ id: SYNC_ROW_ID, state: dataToSave });
          
    }, 1000); // 1s debounce
  }
});