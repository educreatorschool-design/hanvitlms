import React from 'react';
import { HashRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import CourseMgmt from './pages/CourseMgmt';
import Classroom from './pages/Classroom';
import SiteNotices from './pages/SiteNotices';
import Messages from './pages/Messages';
import { useStore } from './store';
import { UserRole, Course, User } from './types';
import { LogOut, PlusCircle, Users, Settings, Database, Book, Megaphone, Mail } from 'lucide-react';

// --- Shared Components for Dashboards ---

const CourseCard: React.FC<{ course: Course, isEnrolled: boolean, status?: string, onClick: () => void }> = ({ course, isEnrolled, status, onClick }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer p-6" onClick={onClick}>
    <div className="flex justify-between items-start mb-4">
      <span className={`px-2 py-1 rounded text-xs font-medium ${course.type === 'VIDEO' ? 'bg-blue-100 text-blue-800' : course.type === 'TEXT' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
        {course.type === 'VIDEO' ? '동영상' : course.type === 'TEXT' ? '교안중심' : 'AI교수'}
      </span>
      {status && <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded">{status}</span>}
    </div>
    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{course.title}</h3>
    <p className="text-gray-500 text-sm mb-4 line-clamp-2 h-10">{course.description}</p>
    <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-gray-400">{course.totalWeeks}주 과정</span>
        <span className="text-hanbit-600 font-semibold">{course.major}</span>
    </div>
  </div>
);

// --- Admin Dashboard ---
const AdminDashboard = () => {
  const { courses, users, logout, exportData, importData, enrollStudent, removeStudent, approveStudent, messages, currentUser } = useStore();
  const navigate = useNavigate();
  const [showStudents, setShowStudents] = React.useState(false);
  
  const unreadCount = messages.filter(m => m.receiverId === currentUser?.id && !m.read).length;

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hanbit_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) importData(ev.target.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-hanbit-900">관리자 페이지</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/messages')} className="flex items-center gap-2 text-gray-600 hover:text-hanbit-600 relative">
             <Mail size={20}/>
             {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{unreadCount}</span>}
             메시지
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <button onClick={() => navigate('/notices')} className="flex items-center gap-2 text-gray-600 hover:text-hanbit-600">
             <Megaphone size={20}/> 공지사항
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <button onClick={() => setShowStudents(!showStudents)} className="flex items-center gap-2 text-gray-600 hover:text-hanbit-600">
            <Users size={20}/> 학생 관리
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <label className="cursor-pointer text-gray-600 hover:text-hanbit-600 flex items-center gap-1 text-sm">
            <Database size={16}/> 복구
            <input type="file" className="hidden" onChange={handleImport} accept=".json"/>
          </label>
          <button onClick={handleExport} className="text-gray-600 hover:text-hanbit-600 text-sm">백업</button>
          <button onClick={() => { logout(); navigate('/'); }} className="text-red-500 hover:text-red-700 ml-4">
            <LogOut size={20}/>
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {showStudents ? (
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-bold mb-6">학생 관리</h2>
                <table className="min-w-full">
                    <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3">이름</th>
                            <th className="pb-3">이메일</th>
                            <th className="pb-3">수강 과목 수</th>
                            <th className="pb-3 text-right">관리</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.filter(u => u.role === UserRole.STUDENT).map(student => {
                            const enrolledCount = courses.filter(c => c.studentIds.includes(student.id)).length;
                            return (
                                <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="py-4 font-medium">{student.name}</td>
                                    <td className="py-4 text-gray-600">{student.email}</td>
                                    <td className="py-4">{enrolledCount}개</td>
                                    <td className="py-4 text-right">
                                        <button onClick={() => { if(confirm("학생 정보를 삭제하시겠습니까?")) removeStudent(student.id); }} className="text-red-500 text-sm hover:underline">삭제</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                {/* Pending Approvals Section inside Students View */}
                <h3 className="text-lg font-bold mt-10 mb-4">수강 승인 대기</h3>
                 <table className="min-w-full">
                    <thead>
                        <tr className="border-b text-left text-sm text-gray-500">
                            <th className="pb-3">과목명</th>
                            <th className="pb-3">학생 ID</th>
                            <th className="pb-3 text-right">승인</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.flatMap(c => c.pendingStudentIds.map(sid => ({ course: c, sid }))).map(({course, sid}) => {
                            const student = users.find(u => u.id === sid);
                            return (
                                <tr key={`${course.id}-${sid}`} className="border-b hover:bg-gray-50">
                                    <td className="py-3">{course.title}</td>
                                    <td className="py-3">{student?.name || sid}</td>
                                    <td className="py-3 text-right">
                                        <button onClick={() => approveStudent(course.id, sid)} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">승인</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                 </table>
            </div>
        ) : (
            <>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800">개설된 과목 ({courses.length})</h2>
                    <Link to="/admin/course/new" className="bg-hanbit-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-hanbit-700 transition shadow-sm">
                        <PlusCircle size={20}/> 과목 등록
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course.id} className="relative group">
                             <CourseCard 
                                course={course} 
                                isEnrolled={false} 
                                onClick={() => navigate(`/admin/course/${course.id}`)}
                             />
                             <div className="absolute top-4 right-4 flex gap-2">
                                 <button onClick={(e) => {e.stopPropagation(); navigate(`/course/${course.id}`)}} className="bg-white p-1.5 rounded-full shadow hover:text-hanbit-600" title="강의실 입장 (채점/관리)">
                                    <Book size={16} />
                                 </button>
                                 <button onClick={(e) => {e.stopPropagation(); navigate(`/admin/course/${course.id}`)}} className="bg-white p-1.5 rounded-full shadow hover:text-hanbit-600" title="수정">
                                    <Settings size={16} />
                                 </button>
                             </div>
                        </div>
                    ))}
                </div>
            </>
        )}
      </main>
    </div>
  );
};

// --- Student Dashboard ---
const StudentDashboard = () => {
    const { courses, currentUser, enrollStudent, logout, submissions, messages } = useStore();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = React.useState<'MY' | 'ALL'>('MY');

    if (!currentUser) return <Navigate to="/" />;

    const unreadCount = messages.filter(m => m.receiverId === currentUser.id && !m.read).length;

    const myCourses = courses.filter(c => c.studentIds.includes(currentUser.id));
    const pendingCourses = courses.filter(c => c.pendingStudentIds.includes(currentUser.id));
    const availableCourses = courses.filter(c => !c.studentIds.includes(currentUser.id) && !c.pendingStudentIds.includes(currentUser.id));

    // Calculate total score for a course
    const getCourseScore = (courseId: string) => {
        const mySubs = submissions.filter(s => s.courseId === courseId && s.studentId === currentUser.id);
        return mySubs.reduce((acc, curr) => acc + (curr.score || 0), 0);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Book className="text-hanbit-600"/>
                    <h1 className="text-2xl font-bold text-gray-800">나의 학습방</h1>
                </div>
                <div className="flex items-center gap-4">
                     <button onClick={() => navigate('/messages')} className="flex items-center gap-1 text-gray-600 hover:text-hanbit-600 text-sm font-medium relative">
                         <Mail size={18}/>
                         {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">{unreadCount}</span>}
                         메시지
                     </button>
                     <div className="h-4 w-px bg-gray-300"></div>
                     <button onClick={() => navigate('/notices')} className="flex items-center gap-1 text-gray-600 hover:text-hanbit-600 text-sm font-medium">
                         <Megaphone size={18}/> 공지사항
                     </button>
                     <div className="h-4 w-px bg-gray-300"></div>
                     <span className="text-gray-600 font-medium">{currentUser.name}님</span>
                     <button onClick={() => { logout(); navigate('/'); }} className="text-gray-400 hover:text-red-500">
                        <LogOut size={20}/>
                     </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto p-8">
                <div className="flex gap-4 mb-8">
                    <button 
                        onClick={() => setViewMode('MY')} 
                        className={`px-6 py-2 rounded-full font-medium transition ${viewMode === 'MY' ? 'bg-hanbit-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                    >
                        수강 중인 과목
                    </button>
                    <button 
                        onClick={() => setViewMode('ALL')} 
                        className={`px-6 py-2 rounded-full font-medium transition ${viewMode === 'ALL' ? 'bg-hanbit-600 text-white shadow' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
                    >
                        수강 신청
                    </button>
                </div>

                {viewMode === 'MY' ? (
                    <div className="space-y-8">
                        {myCourses.length === 0 && pendingCourses.length === 0 && (
                            <div className="text-center py-20 text-gray-500">
                                아직 수강 중인 과목이 없습니다. '수강 신청' 탭에서 과목을 신청해보세요!
                            </div>
                        )}
                        
                        {myCourses.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {myCourses.map(course => (
                                    <CourseCard 
                                        key={course.id} 
                                        course={course} 
                                        isEnrolled={true}
                                        status={`취득 점수: ${getCourseScore(course.id)}점`}
                                        onClick={() => navigate(`/course/${course.id}`)}
                                    />
                                ))}
                            </div>
                        )}

                        {pendingCourses.length > 0 && (
                            <div>
                                <h3 className="text-lg font-bold text-gray-700 mb-4">승인 대기 중</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-75">
                                    {pendingCourses.map(course => (
                                        <div key={course.id} className="bg-gray-100 p-6 rounded-xl border border-dashed border-gray-300">
                                            <h4 className="font-bold text-gray-600">{course.title}</h4>
                                            <p className="text-sm text-gray-500 mt-2">관리자 승인을 기다리고 있습니다.</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {availableCourses.map(course => (
                            <div key={course.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col">
                                <h3 className="text-lg font-bold mb-2">{course.title}</h3>
                                <p className="text-gray-500 text-sm mb-4 flex-1">{course.description}</p>
                                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                                    <span className="text-sm text-gray-400">{course.major}</span>
                                    <button 
                                        onClick={() => {
                                            enrollStudent(course.id, currentUser.id);
                                            alert("수강 신청되었습니다. 승인 대기 목록에서 확인하세요.");
                                        }}
                                        className="bg-hanbit-500 text-white px-4 py-2 rounded hover:bg-hanbit-600 text-sm font-medium"
                                    >
                                        신청하기
                                    </button>
                                </div>
                            </div>
                        ))}
                        {availableCourses.length === 0 && <p className="text-gray-500 col-span-3 text-center py-10">신청 가능한 새로운 과목이 없습니다.</p>}
                    </div>
                )}
            </main>
        </div>
    );
};

// --- Guest View ---
const GuestView = () => {
    const { courses } = useStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white">
            <header className="p-6 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h1 className="text-xl font-bold">한빛문화예술교육원 - 과목 둘러보기</h1>
                <div className="flex gap-4 items-center">
                    <button onClick={() => navigate('/notices')} className="flex items-center gap-1 text-gray-600 hover:text-hanbit-600 font-medium">
                         <Megaphone size={18}/> 공지사항
                     </button>
                    <button onClick={() => navigate('/')} className="text-hanbit-600 font-medium">로그인 / 회원가입</button>
                </div>
            </header>
            <main className="max-w-5xl mx-auto p-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {courses.map(course => (
                         <div key={course.id} className="border rounded-xl p-6 shadow-sm">
                             <h2 className="text-xl font-bold mb-2">{course.title}</h2>
                             <p className="text-gray-600 mb-4">{course.description}</p>
                             <div className="bg-gray-50 p-4 rounded text-sm">
                                 <h3 className="font-bold mb-2">강의 계획 (총 {course.totalWeeks}주)</h3>
                                 <ul className="list-disc pl-4 space-y-1 text-gray-600 h-32 overflow-y-auto">
                                     {course.syllabus.map(w => <li key={w.week}>{w.week}주차: {w.title}</li>)}
                                 </ul>
                             </div>
                             <div className="mt-4 text-xs text-gray-400 text-right">
                                 평가방식: {course.evaluationCriteria.map(c => `${c.name} ${c.percentage}%`).join(' + ')}
                             </div>
                         </div>
                     ))}
                 </div>
            </main>
        </div>
    )
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/guest" element={<GuestView />} />
        <Route path="/notices" element={<SiteNotices />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/course/new" element={<CourseMgmt />} />
        <Route path="/admin/course/:id" element={<CourseMgmt />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/course/:courseId" element={<Classroom />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
}