import React, { useState } from 'react';
import { useStore } from '../store';
import { UserRole } from '../types';
import { ArrowLeft, Megaphone, Calendar, User, Trash, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SiteNotices() {
  const { siteNotices, currentUser, addSiteNotice, deleteSiteNotice } = useStore();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newContent) return;

    addSiteNotice({
      id: Math.random().toString(36).substr(2, 9),
      title: newTitle,
      content: newContent,
      authorName: currentUser?.name || '관리자',
      createdAt: new Date().toISOString()
    });
    
    setNewTitle("");
    setNewContent("");
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
               <ArrowLeft size={20} />
             </button>
             <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Megaphone className="text-hanbit-600" /> 공지사항
             </h1>
          </div>
          {isAdmin && (
             <button 
                onClick={() => setShowForm(!showForm)} 
                className="bg-hanbit-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-hanbit-700 text-sm font-medium"
             >
                <Plus size={16}/> 공지 작성
             </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-8">
         {showForm && (
             <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-hanbit-100 animate-fade-in">
                 <h2 className="text-lg font-bold mb-4">새 공지 작성</h2>
                 <form onSubmit={handleCreate}>
                     <input 
                        className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-hanbit-500 outline-none"
                        placeholder="제목을 입력하세요"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        required
                     />
                     <textarea 
                        className="w-full border p-3 rounded-lg mb-4 h-40 focus:ring-2 focus:ring-hanbit-500 outline-none"
                        placeholder="내용을 입력하세요"
                        value={newContent}
                        onChange={e => setNewContent(e.target.value)}
                        required
                     />
                     <div className="flex justify-end gap-2">
                         <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">취소</button>
                         <button type="submit" className="px-4 py-2 bg-hanbit-600 text-white rounded-lg hover:bg-hanbit-700">등록</button>
                     </div>
                 </form>
             </div>
         )}

         <div className="space-y-4">
             {siteNotices.length === 0 ? (
                 <div className="text-center py-20 text-gray-500 bg-white rounded-xl shadow-sm">
                     등록된 공지사항이 없습니다.
                 </div>
             ) : (
                 siteNotices.map(notice => (
                     <div key={notice.id} className="bg-white p-6 rounded-xl shadow-sm border hover:border-hanbit-200 transition">
                         <div className="flex justify-between items-start mb-2">
                             <h3 className="text-lg font-bold text-gray-800">{notice.title}</h3>
                             {isAdmin && (
                                 <button onClick={() => deleteSiteNotice(notice.id)} className="text-gray-400 hover:text-red-500">
                                     <Trash size={16} />
                                 </button>
                             )}
                         </div>
                         <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 border-b pb-4">
                             <span className="flex items-center gap-1"><User size={12}/> {notice.authorName}</span>
                             <span className="flex items-center gap-1"><Calendar size={12}/> {new Date(notice.createdAt).toLocaleDateString()}</span>
                         </div>
                         <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                             {notice.content}
                         </div>
                     </div>
                 ))
             )}
         </div>
      </main>
    </div>
  );
}