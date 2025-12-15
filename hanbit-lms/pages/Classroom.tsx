import React, { useState } from 'react';
import { useStore } from '../store';
import { useParams, useNavigate } from 'react-router-dom';
import { UserRole, CourseQnA, Submission } from '../types';
import { ArrowLeft, CheckCircle, FileText, MessageSquare, PenTool, BrainCircuit, BookOpen, Megaphone, HelpCircle, Lock, Plus, User, Calendar, MessageCircle } from 'lucide-react';
import { autoGrade } from '../services/geminiService';

export default function Classroom() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { 
      courses, currentUser, submissions, addSubmission, gradeSubmission, users,
      courseNotices, addCourseNotice, deleteCourseNotice,
      courseQnAs, addCourseQnA, answerCourseQnA
  } = useStore();
  
  const course = courses.find(c => c.id === courseId);
  const [activeMode, setActiveMode] = useState<'LECTURE' | 'NOTICE' | 'QNA'>('LECTURE');
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [submittingType, setSubmittingType] = useState<string | null>(null); // 'ASSIGNMENT', 'DISCUSSION', 'EXAM'
  const [inputText, setInputText] = useState("");
  
  // Board Input State
  const [boardTitle, setBoardTitle] = useState("");
  const [boardContent, setBoardContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  
  // QnA Answering State
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  // Admin Grading State
  const [gradingTarget, setGradingTarget] = useState<Submission | null>(null);
  
  if (!course || !currentUser) return <div>Loading...</div>;

  const currentModule = course.syllabus.find(w => w.week === activeWeek);
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isEnrolled = course.studentIds.includes(currentUser.id);
  
  if (!isAdmin && !isEnrolled && currentUser.role !== UserRole.GUEST) {
      return <div className="p-8 text-center">수강 권한이 없습니다. 승인을 기다려주세요. <button onClick={() => navigate('/student')} className="text-blue-500 underline">돌아가기</button></div>
  }

  // --- Helpers for Submission ---
  const handleSubmit = async () => {
    if (!currentModule || !submittingType) return;
    
    let score = 0;
    let feedback = "제출 완료 (채점 대기중)";
    
    if (submittingType === 'EXAM' && currentModule.quiz) {
        setSubmittingType("GRADING..."); 
        try {
            const context = currentModule.quiz.map(q => `Q: ${q.question} A: ${q.correctAnswer}`).join('\n');
            const result = await autoGrade("Complete the weekly exam", inputText, context, 100);
            score = result.score;
            feedback = result.feedback;
        } catch (e) { console.error(e); }
    } else if (!isAdmin) {
        setSubmittingType("GRADING...");
        try {
             const questionContext = submittingType === 'ASSIGNMENT' 
                ? (currentModule.assignmentTitle || "Weekly Assignment") + "\n" + (currentModule.assignmentDescription || "")
                : (currentModule.discussionTopic || "Weekly Discussion");
             
             const result = await autoGrade(
                 `${activeWeek}주차 ${submittingType === 'ASSIGNMENT' ? '과제' : '토론'}`, 
                 inputText, 
                 questionContext + "\n" + (currentModule.studyMaterial || "Course Context"), 
                 100
             );
             score = result.score;
             feedback = result.feedback;
        } catch(e) {}
    }

    const newSubmission: Submission = {
        id: Math.random().toString(36).substr(2, 9),
        courseId: course.id,
        week: activeWeek,
        studentId: currentUser.id,
        type: submittingType as any,
        content: inputText,
        submittedAt: new Date().toISOString(),
        score: score,
        feedback: feedback
    };
    
    addSubmission(newSubmission);
    setSubmittingType(null);
    setInputText("");
    alert(`제출되었습니다. AI 예상 점수: ${score}점`);
  };

  const getMySubmission = (type: string) => {
      return submissions.find(s => s.courseId === course.id && s.week === activeWeek && s.studentId === currentUser.id && s.type === type);
  };

  const getAllSubmissionsForWeek = (type: string) => {
      return submissions.filter(s => s.courseId === course.id && s.week === activeWeek && s.type === type);
  };

  // --- Helpers for Notice & QnA ---
  const filteredNotices = courseNotices.filter(n => n.courseId === course.id);
  const filteredQnAs = courseQnAs.filter(q => q.courseId === course.id).filter(q => {
      if (isAdmin) return true; // Admin sees all
      return q.studentId === currentUser.id; // Student sees only their own
  });

  const handlePostNotice = () => {
      if(!boardTitle || !boardContent) return;
      addCourseNotice({
          id: Math.random().toString(36).substr(2, 9),
          courseId: course.id,
          title: boardTitle,
          content: boardContent,
          authorName: currentUser.name,
          createdAt: new Date().toISOString()
      });
      setBoardTitle(""); setBoardContent(""); setIsPosting(false);
  };

  const handlePostQnA = () => {
      if(!boardTitle || !boardContent) return;
      addCourseQnA({
          id: Math.random().toString(36).substr(2, 9),
          courseId: course.id,
          studentId: currentUser.id,
          studentName: currentUser.name,
          title: boardTitle,
          content: boardContent,
          createdAt: new Date().toISOString()
      });
      setBoardTitle(""); setBoardContent(""); setIsPosting(false);
  };

  const handleAnswerQnA = (id: string) => {
      if(!answerText) return;
      answerCourseQnA(id, answerText);
      setAnsweringId(null);
      setAnswerText("");
  };

  return (
    <div className="flex h-screen bg-white">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r flex flex-col">
            <div className="p-4 border-b bg-white">
                <button onClick={() => navigate(isAdmin ? '/admin' : '/student')} className="flex items-center text-gray-600 hover:text-hanbit-600 mb-2">
                    <ArrowLeft size={16} className="mr-1"/> 나가기
                </button>
                <h2 className="font-bold text-gray-800 truncate">{course.title}</h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
                <div className="mb-4 space-y-1">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">메뉴</div>
                    <button 
                        onClick={() => setActiveMode('NOTICE')}
                        className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-2 ${activeMode === 'NOTICE' ? 'bg-hanbit-100 text-hanbit-900 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <Megaphone size={16}/> 공지방
                    </button>
                    <button 
                        onClick={() => setActiveMode('QNA')}
                        className={`w-full text-left p-3 rounded-lg text-sm flex items-center gap-2 ${activeMode === 'QNA' ? 'bg-hanbit-100 text-hanbit-900 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <HelpCircle size={16}/> 궁금해요방
                    </button>
                </div>

                <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4">주차별 학습</div>
                {course.syllabus.map(week => (
                    <button
                        key={week.week}
                        onClick={() => { setActiveWeek(week.week); setActiveMode('LECTURE'); }}
                        className={`w-full text-left p-3 rounded-lg text-sm mb-1 flex justify-between items-center ${activeMode === 'LECTURE' && activeWeek === week.week ? 'bg-hanbit-100 text-hanbit-900 font-medium' : 'hover:bg-gray-100 text-gray-600'}`}
                    >
                        <span>{week.week}주차</span>
                        {(week.hasAssignment || week.hasExam) && <div className="w-2 h-2 rounded-full bg-red-400"></div>}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
            
            {/* NOTICE BOARD VIEW */}
            {activeMode === 'NOTICE' && (
                <div className="flex-1 overflow-y-auto p-8">
                    <header className="mb-8 border-b pb-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <Megaphone className="text-hanbit-600"/> 공지방
                            </h1>
                            <p className="text-gray-600">교수님의 공지사항을 확인하세요.</p>
                        </div>
                        {isAdmin && (
                            <button onClick={() => setIsPosting(true)} className="bg-hanbit-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-hanbit-700">
                                <Plus size={16}/> 공지 작성
                            </button>
                        )}
                    </header>
                    
                    {isPosting && isAdmin && (
                        <div className="bg-gray-50 p-6 rounded-xl border mb-8 animate-fade-in">
                            <h3 className="font-bold mb-4">새 공지 작성</h3>
                            <input className="w-full border p-2 rounded mb-2" placeholder="제목" value={boardTitle} onChange={e => setBoardTitle(e.target.value)} />
                            <textarea className="w-full border p-2 rounded mb-4 h-32" placeholder="내용" value={boardContent} onChange={e => setBoardContent(e.target.value)} />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsPosting(false)} className="text-gray-500 hover:bg-gray-200 px-3 py-1 rounded">취소</button>
                                <button onClick={handlePostNotice} className="bg-hanbit-600 text-white px-3 py-1 rounded hover:bg-hanbit-700">등록</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {filteredNotices.length === 0 ? <div className="text-center text-gray-400 py-10">등록된 공지가 없습니다.</div> : 
                            filteredNotices.map(notice => (
                                <div key={notice.id} className="border p-6 rounded-xl shadow-sm hover:border-hanbit-200">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg">{notice.title}</h3>
                                        <div className="text-xs text-gray-400 flex flex-col items-end">
                                            <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                                            {isAdmin && <button onClick={() => deleteCourseNotice(notice.id)} className="text-red-400 hover:underline mt-1">삭제</button>}
                                        </div>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap">{notice.content}</p>
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* QnA BOARD VIEW */}
            {activeMode === 'QNA' && (
                <div className="flex-1 overflow-y-auto p-8">
                     <header className="mb-8 border-b pb-4 flex justify-between items-center">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                <HelpCircle className="text-hanbit-600"/> 궁금해요방
                            </h1>
                            <p className="text-gray-600 flex items-center gap-2">
                                <Lock size={14} className="text-gray-400"/>
                                {isAdmin ? '학생들의 질문을 확인하고 답변해주세요. (비밀글)' : '궁금한 점을 질문하세요. (작성자와 관리자만 볼 수 있습니다)'}
                            </p>
                        </div>
                        {!isAdmin && (
                            <button onClick={() => setIsPosting(true)} className="bg-hanbit-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-hanbit-700">
                                <Plus size={16}/> 질문하기
                            </button>
                        )}
                    </header>

                    {isPosting && !isAdmin && (
                        <div className="bg-gray-50 p-6 rounded-xl border mb-8 animate-fade-in">
                            <h3 className="font-bold mb-4">비밀 질문 작성</h3>
                            <input className="w-full border p-2 rounded mb-2" placeholder="질문 제목" value={boardTitle} onChange={e => setBoardTitle(e.target.value)} />
                            <textarea className="w-full border p-2 rounded mb-4 h-32" placeholder="궁금한 내용을 자세히 적어주세요." value={boardContent} onChange={e => setBoardContent(e.target.value)} />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setIsPosting(false)} className="text-gray-500 hover:bg-gray-200 px-3 py-1 rounded">취소</button>
                                <button onClick={handlePostQnA} className="bg-hanbit-600 text-white px-3 py-1 rounded hover:bg-hanbit-700">등록</button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        {filteredQnAs.length === 0 ? <div className="text-center text-gray-400 py-10">등록된 질문이 없습니다.</div> :
                            filteredQnAs.map(qna => (
                                <div key={qna.id} className="border p-6 rounded-xl shadow-sm bg-white">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg flex items-center gap-2">
                                                <Lock size={16} className="text-gray-400"/> {qna.title}
                                            </h3>
                                            <div className="text-xs text-gray-400 mt-1 flex gap-2">
                                                <span>{qna.studentName}</span>
                                                <span>•</span>
                                                <span>{new Date(qna.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${qna.answer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {qna.answer ? '답변완료' : '대기중'}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 whitespace-pre-wrap mb-4 bg-gray-50 p-4 rounded">{qna.content}</p>
                                    
                                    {qna.answer && (
                                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                                            <div className="font-bold text-blue-800 text-sm mb-2 flex items-center gap-1"><MessageCircle size={14}/> 관리자 답변</div>
                                            <p className="text-gray-800 whitespace-pre-wrap">{qna.answer}</p>
                                        </div>
                                    )}

                                    {isAdmin && !qna.answer && (
                                        <div className="mt-4 border-t pt-4">
                                            {answeringId === qna.id ? (
                                                <div className="animate-fade-in">
                                                    <textarea 
                                                        className="w-full border p-2 rounded mb-2 text-sm" 
                                                        placeholder="답변을 입력하세요..." 
                                                        value={answerText}
                                                        onChange={e => setAnswerText(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setAnsweringId(null)} className="text-xs text-gray-500">취소</button>
                                                        <button onClick={() => handleAnswerQnA(qna.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded">답변 등록</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setAnsweringId(qna.id); setAnswerText(""); }} className="text-sm text-blue-600 hover:underline">답변하기</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        }
                    </div>
                </div>
            )}

            {/* LECTURE VIEW (Existing Logic) */}
            {activeMode === 'LECTURE' && currentModule ? (
                <div className="flex-1 overflow-y-auto p-8">
                     <header className="mb-8 border-b pb-4">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentModule.week}주차: {currentModule.title}</h1>
                        <p className="text-gray-600">{currentModule.description}</p>
                    </header>

                    {/* Study Material */}
                    <section className="mb-12 prose max-w-none">
                        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <BookOpen size={24} className="text-hanbit-600" /> 학습 교안
                        </h3>
                        <div className="bg-white border rounded-xl p-8 shadow-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {currentModule.studyMaterial || "등록된 교안이 없습니다."}
                        </div>
                    </section>

                    {/* Interaction Zones */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
                        {currentModule.hasAssignment && (
                            <div className="border rounded-xl p-6 bg-gray-50 flex flex-col">
                                <div>
                                    <h3 className="font-bold mb-2 flex items-center gap-2"><FileText size={20}/> {currentModule.assignmentTitle || "과제"}</h3>
                                    {currentModule.assignmentDescription && (
                                        <p className="text-sm text-gray-600 mb-4 bg-white p-2 rounded border">{currentModule.assignmentDescription}</p>
                                    )}
                                </div>
                                <div className="flex-1">
                                    {isAdmin ? (
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-500 mb-2">제출된 과제 목록</p>
                                            {getAllSubmissionsForWeek('ASSIGNMENT').map(sub => {
                                                const student = users.find(u => u.id === sub.studentId);
                                                return (
                                                    <div key={sub.id} className="bg-white p-3 rounded border text-sm cursor-pointer hover:border-hanbit-500" onClick={() => setGradingTarget(sub)}>
                                                        <div className="flex justify-between">
                                                            <span className="font-medium">{student?.name}</span>
                                                            <span className={sub.score ? "text-green-600" : "text-gray-400"}>{sub.score ? `${sub.score}점` : '미채점'}</span>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <>
                                            {getMySubmission('ASSIGNMENT') ? (
                                                <div className="bg-white p-4 rounded border">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={16}/> 제출 완료</span>
                                                        <span className="font-bold">{getMySubmission('ASSIGNMENT')?.score}점</span>
                                                    </div>
                                                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{getMySubmission('ASSIGNMENT')?.feedback}</p>
                                                    <div className="mt-2 text-xs text-gray-400">내용: {getMySubmission('ASSIGNMENT')?.content.substring(0, 50)}...</div>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setSubmittingType('ASSIGNMENT'); setInputText(''); }} className="w-full py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm mt-auto">과제 제출하기</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentModule.hasDiscussion && (
                            <div className="border rounded-xl p-6 bg-gray-50 flex flex-col">
                                <div>
                                    <h3 className="font-bold mb-2 flex items-center gap-2"><MessageSquare size={20}/> 토론</h3>
                                    <div className="bg-blue-50 text-blue-900 p-3 rounded mb-4 text-sm font-medium border border-blue-100">
                                        <span className="block font-bold text-xs text-blue-500 mb-1">주제</span>
                                        {currentModule.discussionTopic || "자유 토론"}
                                        {currentModule.discussionDescription && <p className="font-normal mt-1 text-blue-800 opacity-80">{currentModule.discussionDescription}</p>}
                                    </div>
                                </div>
                                <div className="flex-1">
                                    {isAdmin ? (
                                         <div className="space-y-2">
                                             <p className="text-sm text-gray-500 mb-2">참여 목록 (클릭하여 채점)</p>
                                             {getAllSubmissionsForWeek('DISCUSSION').map(sub => (
                                                 <div key={sub.id} className="bg-white p-3 rounded border text-sm cursor-pointer hover:border-hanbit-500" onClick={() => setGradingTarget(sub)}>
                                                     <span className="font-medium">{users.find(u => u.id === sub.studentId)?.name}</span>
                                                     <p className="text-gray-500 truncate">{sub.content}</p>
                                                 </div>
                                             ))}
                                         </div>
                                    ) : (
                                        <>
                                            {getMySubmission('DISCUSSION') ? (
                                                <div className="bg-white p-4 rounded border">
                                                     <span className="text-green-600 font-medium text-sm">참여 완료 ({getMySubmission('DISCUSSION')?.score}점)</span>
                                                     <p className="text-gray-700 mt-1">{getMySubmission('DISCUSSION')?.content}</p>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setSubmittingType('DISCUSSION'); setInputText(''); }} className="w-full py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm mt-auto">토론 참여하기</button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {currentModule.hasExam && (
                            <div className="border rounded-xl p-6 bg-red-50 col-span-1 lg:col-span-2">
                                <h3 className="font-bold mb-4 flex items-center gap-2 text-red-700"><PenTool size={20}/> 시험</h3>
                                {isAdmin ? (
                                    <div>{getAllSubmissionsForWeek('EXAM').length}명이 응시했습니다.</div>
                                ) : (
                                    <>
                                        {getMySubmission('EXAM') ? (
                                            <div className="bg-white p-4 rounded border">
                                                <span className="text-green-600 font-medium">응시 완료 - {getMySubmission('EXAM')?.score}점</span>
                                                <p className="text-sm text-gray-600 mt-2">피드백: {getMySubmission('EXAM')?.feedback}</p>
                                            </div>
                                        ) : (
                                            <button onClick={() => { setSubmittingType('EXAM'); setInputText(''); }} className="w-full py-3 bg-red-600 text-white rounded hover:bg-red-700 font-bold">시험 응시하기</button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            ) : (activeMode === 'LECTURE' && (
                <div className="flex-1 flex items-center justify-center text-gray-400">학습할 주차를 선택하세요.</div>
            ))}
        </div>

        {/* Modal for Submission (Reused) */}
        {submittingType && submittingType !== 'GRADING...' && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-2xl">
                    <h3 className="text-xl font-bold mb-2">
                        {activeWeek}주차:
                        {submittingType === 'ASSIGNMENT' ? ` ${currentModule.assignmentTitle || '과제'}` : submittingType === 'DISCUSSION' ? ` 토론 참여` : ' 시험 응시'}
                    </h3>
                    
                    {submittingType === 'DISCUSSION' && currentModule.discussionTopic && (
                         <div className="mb-4 text-blue-800 bg-blue-50 p-3 rounded text-sm">
                             <span className="font-bold">주제:</span> {currentModule.discussionTopic}
                         </div>
                    )}
                    
                    {submittingType === 'EXAM' && currentModule?.quiz && (
                        <div className="mb-4 bg-gray-50 p-4 rounded border max-h-40 overflow-y-auto">
                            <p className="text-sm font-bold text-red-600 mb-2">다음 문제들에 대한 답안을 작성하세요:</p>
                            <ol className="list-decimal pl-5 space-y-2">
                                {currentModule.quiz.map(q => (
                                    <li key={q.id} className="text-sm">
                                        <span className="font-medium">{q.question}</span>
                                        {q.type === 'MULTIPLE_CHOICE' && q.options && (
                                            <div className="text-xs text-gray-500 mt-1">보기: {q.options.join(', ')}</div>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}

                    <textarea
                        className="w-full h-64 border rounded p-4 mb-4 focus:ring-2 focus:ring-hanbit-500 outline-none"
                        placeholder="내용을 작성하세요..."
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                    ></textarea>
                    
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setSubmittingType(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">취소</button>
                        <button onClick={handleSubmit} className="px-4 py-2 bg-hanbit-600 text-white rounded hover:bg-hanbit-700">제출하기 (AI 채점)</button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Grading Modal for Admin (Reused) */}
        {gradingTarget && (
             <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white w-full max-w-2xl rounded-xl p-6 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4">채점 및 피드백</h3>
                    <div className="mb-4 bg-gray-50 p-4 rounded">
                        <p className="text-sm text-gray-500 mb-1">학생 제출 내용:</p>
                        <p className="text-gray-800 whitespace-pre-wrap">{gradingTarget.content}</p>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 mb-4">
                        <div className="col-span-1">
                            <label className="block text-sm font-medium mb-1">점수</label>
                            <input 
                                type="number" 
                                value={gradingTarget.score || 0} 
                                onChange={e => setGradingTarget({...gradingTarget, score: Number(e.target.value)})}
                                className="w-full border p-2 rounded"
                            />
                        </div>
                        <div className="col-span-3">
                             <label className="block text-sm font-medium mb-1">피드백</label>
                             <input 
                                type="text" 
                                value={gradingTarget.feedback || ''}
                                onChange={e => setGradingTarget({...gradingTarget, feedback: e.target.value})}
                                className="w-full border p-2 rounded"
                             />
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <button 
                            onClick={async () => {
                                // AI Re-grade
                                const result = await autoGrade("Re-evaluation", gradingTarget.content, "Teacher Context", 100);
                                setGradingTarget({...gradingTarget, score: result.score, feedback: result.feedback});
                            }}
                            className="flex items-center gap-2 text-hanbit-600 text-sm font-medium"
                        >
                            <BrainCircuit size={16}/> AI 재채점
                        </button>
                        <div className="flex gap-2">
                            <button onClick={() => setGradingTarget(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">취소</button>
                            <button 
                                onClick={() => {
                                    gradeSubmission(gradingTarget.id, gradingTarget.score || 0, gradingTarget.feedback || '');
                                    setGradingTarget(null);
                                }} 
                                className="px-4 py-2 bg-hanbit-600 text-white rounded hover:bg-hanbit-700"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}