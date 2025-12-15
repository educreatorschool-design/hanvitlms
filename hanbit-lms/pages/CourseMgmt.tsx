import React, { useState } from 'react';
import { useStore } from '../store';
import { Course, CourseType, EvaluationCriteria, WeeklyModule, QuizQuestion } from '../types';
import { generateSyllabus, generateStudyMaterial, generateQuiz, generateActivityDetails } from '../services/geminiService';
import { ArrowLeft, Loader2, Sparkles, Plus, Trash, BookOpen, Save, FileText, MessageSquare, PenTool, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function CourseMgmt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { courses, addCourse, updateCourse } = useStore();
  
  const existingCourse = courses.find(c => c.id === id);
  const isEdit = !!existingCourse;

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("");
  
  // Form State
  const [title, setTitle] = useState(existingCourse?.title || '');
  const [description, setDescription] = useState(existingCourse?.description || '');
  const [major, setMajor] = useState(existingCourse?.major || '');
  const [totalWeeks, setTotalWeeks] = useState(existingCourse?.totalWeeks || 15);
  const [type, setType] = useState<CourseType>(existingCourse?.type || CourseType.VIDEO);
  const [criteria, setCriteria] = useState<EvaluationCriteria[]>(existingCourse?.evaluationCriteria || [
    { name: '과제', percentage: 20 },
    { name: '토론', percentage: 30 },
    { name: '종합평가', percentage: 50 }
  ]);
  const [syllabus, setSyllabus] = useState<WeeklyModule[]>(existingCourse?.syllabus || []);
  const [activeTab, setActiveTab] = useState<'INFO' | 'SYLLABUS' | 'CONTENT'>('INFO');

  const handleGenSyllabus = async () => {
    if (!title || !description) return alert("과목명과 개요를 입력해주세요.");
    setLoading(true);
    setLoadingStep("강의계획서 생성 중...");
    try {
      const generated = await generateSyllabus(title, description, totalWeeks, type);
      setSyllabus(generated);
      setActiveTab('SYLLABUS');
    } catch (e) {
      alert("생성 실패");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const handleGenAllContent = async () => {
    if (syllabus.length === 0) return alert("강의계획서가 먼저 필요합니다.");
    setLoading(true);
    
    const newSyllabus = [...syllabus];
    for (let i = 0; i < newSyllabus.length; i++) {
        setLoadingStep(`${i + 1}주차 교안 생성 중...`);
        // Generate content if missing
        if (!newSyllabus[i].studyMaterial) {
            newSyllabus[i].studyMaterial = await generateStudyMaterial(title, newSyllabus[i].title, newSyllabus[i].description);
        }
        
        // Generate Activities (Assignment/Discussion)
        if (newSyllabus[i].hasAssignment || newSyllabus[i].hasDiscussion) {
             setLoadingStep(`${i + 1}주차 활동 주제 생성 중...`);
             const activities = await generateActivityDetails(title, newSyllabus[i].title, newSyllabus[i].studyMaterial || newSyllabus[i].description);
             if (newSyllabus[i].hasAssignment) {
                 newSyllabus[i].assignmentTitle = activities.assignmentTitle;
                 newSyllabus[i].assignmentDescription = activities.assignmentDescription;
             }
             if (newSyllabus[i].hasDiscussion) {
                 newSyllabus[i].discussionTopic = activities.discussionTopic;
                 newSyllabus[i].discussionDescription = activities.discussionDescription;
             }
        }

        // Generate Quiz if exam enabled and missing
        if (newSyllabus[i].hasExam && (!newSyllabus[i].quiz || newSyllabus[i].quiz!.length === 0)) {
             setLoadingStep(`${i + 1}주차 시험문제 출제 중...`);
             newSyllabus[i].quiz = await generateQuiz(newSyllabus[i].studyMaterial || "");
        }
    }
    
    setSyllabus(newSyllabus);
    setLoading(false);
    setLoadingStep("");
    alert("모든 주차의 교안 및 평가 생성이 완료되었습니다.");
  };

  const handleSave = () => {
    if (!title) return alert("과목명은 필수입니다.");
    
    const totalPercent = criteria.reduce((acc, c) => acc + c.percentage, 0);
    if (totalPercent !== 100) return alert(`평가 비율의 합은 100%여야 합니다. (현재: ${totalPercent}%)`);

    const courseData: Course = {
      id: isEdit ? existingCourse.id : Math.random().toString(36).substr(2, 9),
      title,
      description,
      major,
      totalWeeks,
      type,
      evaluationCriteria: criteria,
      syllabus,
      studentIds: existingCourse?.studentIds || [],
      pendingStudentIds: existingCourse?.pendingStudentIds || []
    };

    if (isEdit) {
      updateCourse(courseData);
      alert("수정되었습니다.");
    } else {
      addCourse(courseData);
      alert("등록되었습니다.");
    }
    navigate('/admin');
  };

  // Helper for manual quiz management
  const updateQuizQuestion = (weekIdx: number, qIdx: number, field: keyof QuizQuestion, value: any) => {
      const newSyllabus = [...syllabus];
      if (!newSyllabus[weekIdx].quiz) newSyllabus[weekIdx].quiz = [];
      const questions = [...(newSyllabus[weekIdx].quiz || [])];
      
      if (field === 'options' && typeof value === 'string') {
          // Handle comma separated string for options
          questions[qIdx] = { ...questions[qIdx], options: value.split(',').map(s => s.trim()) };
      } else {
          questions[qIdx] = { ...questions[qIdx], [field]: value };
      }
      
      newSyllabus[weekIdx].quiz = questions;
      setSyllabus(newSyllabus);
  };

  const addQuizQuestion = (weekIdx: number) => {
      const newSyllabus = [...syllabus];
      if (!newSyllabus[weekIdx].quiz) newSyllabus[weekIdx].quiz = [];
      newSyllabus[weekIdx].quiz?.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'MULTIPLE_CHOICE',
          question: '',
          options: [],
          correctAnswer: ''
      });
      setSyllabus(newSyllabus);
  };

  const deleteQuizQuestion = (weekIdx: number, qIdx: number) => {
      const newSyllabus = [...syllabus];
      if (newSyllabus[weekIdx].quiz) {
          newSyllabus[weekIdx].quiz = newSyllabus[weekIdx].quiz!.filter((_, i) => i !== qIdx);
          setSyllabus(newSyllabus);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white shadow border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? '강의 수정' : '새 강의 등록'}</h1>
          </div>
          <button 
             onClick={handleSave}
             className="flex items-center gap-2 bg-hanbit-600 text-white px-4 py-2 rounded-lg hover:bg-hanbit-700"
          >
            <Save size={18} /> 저장하기
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-8 px-4">
         {/* Tabs */}
         <div className="flex space-x-4 mb-6 border-b">
            {['INFO', 'SYLLABUS', 'CONTENT'].map((t) => (
                <button
                    key={t}
                    onClick={() => setActiveTab(t as any)}
                    className={`pb-2 px-4 font-medium ${activeTab === t ? 'border-b-2 border-hanbit-600 text-hanbit-600' : 'text-gray-500'}`}
                >
                    {t === 'INFO' ? '기본 정보 & 평가' : t === 'SYLLABUS' ? '강의 계획서' : '주차별 콘텐츠'}
                </button>
            ))}
         </div>

         {loading && (
             <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 text-white">
                 <Loader2 size={48} className="animate-spin mb-4" />
                 <p className="text-lg font-medium">{loadingStep}</p>
             </div>
         )}

         {/* INFO TAB */}
         {activeTab === 'INFO' && (
            <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">과목명</label>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-hanbit-500" />
                    </div>
                    <div className="col-span-2">
                         <label className="block text-sm font-medium text-gray-700 mb-1">과목 개요 (AI 생성 기초 자료)</label>
                         <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="w-full border p-2 rounded focus:ring-2 focus:ring-hanbit-500" placeholder="이 과목은 무엇에 대한 것인가요?" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">관련 전공</label>
                        <input type="text" value={major} onChange={e => setMajor(e.target.value)} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">총 주차</label>
                        <input type="number" value={totalWeeks} onChange={e => setTotalWeeks(Number(e.target.value))} className="w-full border p-2 rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">강의 유형</label>
                        <select value={type} onChange={e => setType(e.target.value as CourseType)} className="w-full border p-2 rounded">
                            <option value={CourseType.VIDEO}>동영상 중심</option>
                            <option value={CourseType.TEXT}>텍스트/교안 중심</option>
                            <option value={CourseType.AI_TUTOR}>AI 교수 (하이브리드)</option>
                        </select>
                    </div>
                </div>
                
                <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4 flex justify-between items-center">
                        평가 기준 설정 (총합 100%)
                        <button onClick={() => setCriteria([...criteria, { name: '', percentage: 0 }])} className="text-sm text-hanbit-600 flex items-center gap-1"><Plus size={14}/>추가</button>
                    </h3>
                    {criteria.map((c, idx) => (
                        <div key={idx} className="flex gap-4 mb-2 items-center">
                            <input type="text" value={c.name} onChange={e => {
                                const newC = [...criteria]; newC[idx].name = e.target.value; setCriteria(newC);
                            }} placeholder="항목명 (예: 과제)" className="flex-1 border p-2 rounded" />
                            <div className="flex items-center gap-2">
                                <input type="number" value={c.percentage} onChange={e => {
                                    const newC = [...criteria]; newC[idx].percentage = Number(e.target.value); setCriteria(newC);
                                }} className="w-20 border p-2 rounded text-right" />
                                <span className="text-gray-500">%</span>
                            </div>
                            <button onClick={() => setCriteria(criteria.filter((_, i) => i !== idx))} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash size={16}/></button>
                        </div>
                    ))}
                    <div className="text-right text-sm font-medium text-gray-600 mt-2">
                        현재 합계: <span className={`${criteria.reduce((a, b) => a + b.percentage, 0) === 100 ? 'text-green-600' : 'text-red-600'}`}>{criteria.reduce((a, b) => a + b.percentage, 0)}%</span>
                    </div>
                </div>
            </div>
         )}

         {/* SYLLABUS TAB */}
         {activeTab === 'SYLLABUS' && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                     <div className="flex items-center gap-3">
                         <Sparkles className="text-blue-600" />
                         <span className="text-blue-800 font-medium">AI로 강의계획서 자동 생성</span>
                     </div>
                     <button onClick={handleGenSyllabus} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm transition">
                         {syllabus.length > 0 ? '다시 생성하기' : '강의계획서 생성하기'}
                     </button>
                 </div>

                 {syllabus.length > 0 && (
                     <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                         <table className="min-w-full divide-y divide-gray-200">
                             <thead className="bg-gray-50">
                                 <tr>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주차</th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">주제</th>
                                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">내용 요약</th>
                                     <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">평가 요소</th>
                                 </tr>
                             </thead>
                             <tbody className="bg-white divide-y divide-gray-200">
                                 {syllabus.map((week, idx) => (
                                     <tr key={idx}>
                                         <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{week.week}주차</td>
                                         <td className="px-6 py-4 text-sm text-gray-900">
                                             <input 
                                                value={week.title} 
                                                onChange={(e) => {
                                                    const newS = [...syllabus]; newS[idx].title = e.target.value; setSyllabus(newS);
                                                }}
                                                className="w-full border-b focus:border-hanbit-500 outline-none bg-transparent"
                                             />
                                         </td>
                                         <td className="px-6 py-4 text-sm text-gray-500">
                                             <input 
                                                value={week.description} 
                                                onChange={(e) => {
                                                    const newS = [...syllabus]; newS[idx].description = e.target.value; setSyllabus(newS);
                                                }}
                                                className="w-full border-b focus:border-hanbit-500 outline-none bg-transparent"
                                             />
                                         </td>
                                         <td className="px-6 py-4 text-sm text-gray-500 text-center space-x-2">
                                            <label className="inline-flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" checked={week.hasAssignment} onChange={(e) => {
                                                     const newS = [...syllabus]; newS[idx].hasAssignment = e.target.checked; setSyllabus(newS);
                                                }} /> 과제
                                            </label>
                                            <label className="inline-flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" checked={week.hasDiscussion} onChange={(e) => {
                                                     const newS = [...syllabus]; newS[idx].hasDiscussion = e.target.checked; setSyllabus(newS);
                                                }} /> 토론
                                            </label>
                                            <label className="inline-flex items-center gap-1 cursor-pointer">
                                                <input type="checkbox" checked={week.hasExam} onChange={(e) => {
                                                     const newS = [...syllabus]; newS[idx].hasExam = e.target.checked; setSyllabus(newS);
                                                }} /> 시험
                                            </label>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 )}
             </div>
         )}

         {/* CONTENT TAB */}
         {activeTab === 'CONTENT' && (
             <div className="space-y-8">
                 <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                     <div className="flex items-center gap-3">
                         <Sparkles className="text-indigo-600" />
                         <span className="text-indigo-800 font-medium">AI로 모든 주차 교안 및 활동, 시험문제 일괄 생성</span>
                     </div>
                     <button onClick={handleGenAllContent} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition">
                         전체 생성 시작
                     </button>
                 </div>

                 {syllabus.map((week, idx) => (
                     <div key={idx} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                         <div className="bg-gray-50 px-6 py-3 border-b flex justify-between items-center">
                             <h3 className="font-semibold text-gray-800">{week.week}주차: {week.title}</h3>
                             <span className="text-xs text-gray-500">{week.description}</span>
                         </div>
                         <div className="p-6 space-y-6">
                             {/* Lecture Content */}
                             <div>
                                 <label className="block text-sm font-bold text-gray-700 mb-2 flex justify-between items-center">
                                     <span className="flex items-center gap-2"><BookOpen size={16}/> 학습 교안 (Markdown)</span>
                                     <button 
                                        onClick={async () => {
                                            setLoading(true); setLoadingStep("교안 생성 중...");
                                            const content = await generateStudyMaterial(title, week.title, week.description);
                                            const newS = [...syllabus]; newS[idx].studyMaterial = content; setSyllabus(newS);
                                            setLoading(false);
                                        }}
                                        className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                                     >
                                        AI 개별 생성
                                     </button>
                                 </label>
                                 <textarea 
                                    className="w-full h-40 border rounded p-2 text-sm font-mono" 
                                    value={week.studyMaterial || ''} 
                                    onChange={(e) => {
                                        const newS = [...syllabus]; newS[idx].studyMaterial = e.target.value; setSyllabus(newS);
                                    }}
                                    placeholder="AI로 생성하거나 직접 입력하세요."
                                 />
                             </div>
                            
                             {/* Activity Settings (Assignment / Discussion) */}
                             {(week.hasAssignment || week.hasDiscussion) && (
                                 <div className="border rounded-lg p-4 bg-gray-50">
                                     <div className="flex justify-between items-center mb-4">
                                         <h4 className="font-bold text-gray-800 flex items-center gap-2"><Sparkles size={16} className="text-hanbit-600"/> 활동(과제/토론) 관리</h4>
                                         <button
                                             onClick={async () => {
                                                 setLoading(true); setLoadingStep("활동 주제 생성 중...");
                                                 const activities = await generateActivityDetails(title, week.title, week.studyMaterial || week.description);
                                                 const newS = [...syllabus];
                                                 if (week.hasAssignment) {
                                                     newS[idx].assignmentTitle = activities.assignmentTitle;
                                                     newS[idx].assignmentDescription = activities.assignmentDescription;
                                                 }
                                                 if (week.hasDiscussion) {
                                                     newS[idx].discussionTopic = activities.discussionTopic;
                                                     newS[idx].discussionDescription = activities.discussionDescription;
                                                 }
                                                 setSyllabus(newS);
                                                 setLoading(false);
                                             }}
                                             className="text-xs bg-white border px-2 py-1 rounded hover:bg-gray-50 text-hanbit-600 font-medium"
                                         >
                                             AI 주제 추천 받기
                                         </button>
                                     </div>

                                     <div className="space-y-4">
                                         {week.hasAssignment && (
                                             <div className="bg-white p-3 rounded border">
                                                 <h5 className="font-semibold text-sm mb-2 flex items-center gap-2"><FileText size={14}/> 과제 설정</h5>
                                                 <input 
                                                     placeholder="과제 제목 (예: ~에 대한 보고서 작성)"
                                                     className="w-full border p-2 rounded text-sm mb-2"
                                                     value={week.assignmentTitle || ''}
                                                     onChange={e => {
                                                         const newS = [...syllabus]; newS[idx].assignmentTitle = e.target.value; setSyllabus(newS);
                                                     }}
                                                 />
                                                 <textarea
                                                     placeholder="과제 가이드라인/설명"
                                                     className="w-full border p-2 rounded text-sm h-20"
                                                     value={week.assignmentDescription || ''}
                                                     onChange={e => {
                                                         const newS = [...syllabus]; newS[idx].assignmentDescription = e.target.value; setSyllabus(newS);
                                                     }}
                                                 />
                                             </div>
                                         )}
                                         
                                         {week.hasDiscussion && (
                                             <div className="bg-white p-3 rounded border">
                                                 <h5 className="font-semibold text-sm mb-2 flex items-center gap-2"><MessageSquare size={14}/> 토론 설정</h5>
                                                 <input 
                                                     placeholder="토론 주제"
                                                     className="w-full border p-2 rounded text-sm mb-2"
                                                     value={week.discussionTopic || ''}
                                                     onChange={e => {
                                                         const newS = [...syllabus]; newS[idx].discussionTopic = e.target.value; setSyllabus(newS);
                                                     }}
                                                 />
                                                 <textarea
                                                     placeholder="토론 배경 설명"
                                                     className="w-full border p-2 rounded text-sm h-20"
                                                     value={week.discussionDescription || ''}
                                                     onChange={e => {
                                                         const newS = [...syllabus]; newS[idx].discussionDescription = e.target.value; setSyllabus(newS);
                                                     }}
                                                 />
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )}

                             {/* Exam Settings */}
                             {week.hasExam && (
                                 <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                     <div className="flex justify-between items-center mb-4">
                                         <h4 className="font-medium text-yellow-800 flex items-center gap-2"><PenTool size={16}/> 평가(시험) 문제 관리</h4>
                                         <div className="flex gap-2">
                                             <button 
                                                onClick={() => addQuizQuestion(idx)}
                                                className="flex items-center gap-1 text-xs bg-white text-gray-700 px-3 py-1.5 rounded border hover:bg-gray-50 font-medium"
                                             >
                                                <Plus size={14}/> 문제 추가
                                             </button>
                                             <button 
                                                 onClick={async () => {
                                                    if(!week.studyMaterial) return alert("교안이 먼저 있어야 문제를 만들 수 있습니다.");
                                                    setLoading(true); setLoadingStep("문제 출제 중...");
                                                    const quiz = await generateQuiz(week.studyMaterial);
                                                    const newS = [...syllabus]; newS[idx].quiz = quiz; setSyllabus(newS);
                                                    setLoading(false);
                                                 }}
                                                 className="flex items-center gap-1 text-xs bg-yellow-200 text-yellow-800 px-3 py-1.5 rounded hover:bg-yellow-300 font-medium"
                                             >
                                                <Sparkles size={14}/> AI 문제 출제
                                             </button>
                                         </div>
                                     </div>
                                     
                                     {week.quiz && week.quiz.length > 0 ? (
                                         <div className="space-y-3">
                                             {week.quiz.map((q, qIdx) => (
                                                 <div key={q.id || qIdx} className="bg-white p-4 rounded-lg border shadow-sm group">
                                                     <div className="flex justify-between mb-3">
                                                         <select 
                                                             value={q.type} 
                                                             onChange={(e) => updateQuizQuestion(idx, qIdx, 'type', e.target.value)}
                                                             className="border rounded px-2 py-1 text-xs bg-gray-50 focus:ring-2 focus:ring-yellow-400 outline-none"
                                                         >
                                                             <option value="MULTIPLE_CHOICE">객관식</option>
                                                             <option value="SHORT_ANSWER">단답형</option>
                                                             <option value="ESSAY">서술형</option>
                                                         </select>
                                                         <button onClick={() => deleteQuizQuestion(idx, qIdx)} className="text-gray-400 hover:text-red-500 transition">
                                                            <X size={16}/>
                                                         </button>
                                                     </div>

                                                     <div className="space-y-3">
                                                        <input 
                                                            className="w-full border-b p-2 text-sm focus:border-yellow-500 outline-none bg-transparent font-medium placeholder-gray-400" 
                                                            placeholder="문제 내용을 입력하세요"
                                                            value={q.question}
                                                            onChange={(e) => updateQuizQuestion(idx, qIdx, 'question', e.target.value)}
                                                        />

                                                        {q.type === 'MULTIPLE_CHOICE' && (
                                                            <div>
                                                                <label className="block text-xs text-gray-400 mb-1">보기 (쉼표로 구분)</label>
                                                                <input 
                                                                    className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-yellow-500 outline-none bg-gray-50" 
                                                                    placeholder="예: 사과, 배, 포도"
                                                                    value={q.options?.join(', ') || ''}
                                                                    onChange={(e) => updateQuizQuestion(idx, qIdx, 'options', e.target.value)}
                                                                />
                                                            </div>
                                                        )}

                                                        <div>
                                                            <label className="block text-xs text-gray-400 mb-1">정답 / 채점 기준</label>
                                                            <textarea 
                                                                className="w-full border rounded p-2 text-sm focus:ring-1 focus:ring-yellow-500 outline-none h-20 resize-none bg-gray-50" 
                                                                placeholder="정답 또는 채점 가이드를 입력하세요"
                                                                value={q.correctAnswer || ''}
                                                                onChange={(e) => updateQuizQuestion(idx, qIdx, 'correctAnswer', e.target.value)}
                                                            />
                                                        </div>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     ) : (
                                         <div className="text-center py-8 bg-white/50 rounded border border-dashed border-gray-300">
                                            <p className="text-sm text-gray-400">등록된 문제가 없습니다.</p>
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>
                     </div>
                 ))}
             </div>
         )}
      </div>
    </div>
  );
}