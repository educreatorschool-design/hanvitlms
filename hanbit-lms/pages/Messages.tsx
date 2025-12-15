import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store';
import { UserRole } from '../types';
import { ArrowLeft, Send, User, Search, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Messages() {
  const navigate = useNavigate();
  const { currentUser, users, messages, sendMessage, markMessagesAsRead } = useStore();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Safe access to messages
  const safeMessages = messages || [];

  if (!currentUser) return <div>Loading...</div>;

  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  // Identify the chatting partner
  // If Student: Partner is always the first Admin
  // If Admin: Partner is the selected Student
  const adminUser = users.find(u => u.role === UserRole.ADMIN);
  const partnerId = isAdmin ? selectedUserId : adminUser?.id;
  
  const chatStudents = users.filter(u => u.role === UserRole.STUDENT);

  useEffect(() => {
    // If student, auto select admin
    if (!isAdmin && adminUser) {
        setSelectedUserId(adminUser.id);
    }
  }, [isAdmin, adminUser]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    
    // Mark as read when viewing
    // IMPORTANT: Check if there are actually unread messages to avoid infinite loop
    if (partnerId) {
        const hasUnread = safeMessages.some(m => m.senderId === partnerId && m.receiverId === currentUser.id && !m.read);
        if (hasUnread) {
            markMessagesAsRead(partnerId, currentUser.id);
        }
    }
  }, [safeMessages, partnerId, currentUser.id, markMessagesAsRead]);

  const handleSend = (e: React.FormEvent) => {
      e.preventDefault();
      if (!inputText.trim() || !partnerId) return;

      sendMessage({
          id: Math.random().toString(36).substr(2, 9),
          senderId: currentUser.id,
          receiverId: partnerId,
          content: inputText,
          createdAt: new Date().toISOString(),
          read: false
      });
      setInputText("");
  };

  // Filter messages for the current conversation
  const currentConversation = safeMessages.filter(m => 
    (m.senderId === currentUser.id && m.receiverId === partnerId) ||
    (m.senderId === partnerId && m.receiverId === currentUser.id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Helper to get unread count for Admin list
  const getUnreadCount = (studentId: string) => {
      return safeMessages.filter(m => m.senderId === studentId && m.receiverId === currentUser.id && !m.read).length;
  };

  // Filter students based on search (Visual only currently or implement simple filter)
  const [searchTerm, setSearchTerm] = useState("");
  const filteredStudents = chatStudents.filter(s => 
    s.name.includes(searchTerm) || s.email.includes(searchTerm)
  );

  return (
    <div className="flex h-screen bg-white">
      {/* LEFT SIDEBAR (Only for Admin to select students) */}
      {isAdmin && (
          <div className="w-80 border-r bg-gray-50 flex flex-col">
              <div className="p-4 border-b bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-gray-700">
                      <button onClick={() => navigate('/admin')} className="hover:bg-gray-100 p-1 rounded">
                          <ArrowLeft size={18}/>
                      </button>
                      <span>메시지함</span>
                  </div>
              </div>
              <div className="p-3 border-b">
                  <div className="relative">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                      <input 
                        className="w-full pl-9 p-2 rounded bg-white border text-sm" 
                        placeholder="학생 검색..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                  {filteredStudents.map(student => {
                      const unread = getUnreadCount(student.id);
                      return (
                          <button 
                              key={student.id}
                              onClick={() => setSelectedUserId(student.id)}
                              className={`w-full text-left p-4 border-b flex justify-between items-center hover:bg-white transition ${selectedUserId === student.id ? 'bg-white border-l-4 border-l-hanbit-600' : 'bg-transparent'}`}
                          >
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                                      <User size={20}/>
                                  </div>
                                  <div>
                                      <div className="font-medium text-gray-900">{student.name}</div>
                                      <div className="text-xs text-gray-500 truncate w-32">{student.email}</div>
                                  </div>
                              </div>
                              {unread > 0 && (
                                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{unread}</span>
                              )}
                          </button>
                      )
                  })}
              </div>
          </div>
      )}

      {/* RIGHT MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full relative">
          {/* Header */}
          <div className="h-16 border-b flex items-center px-6 justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                  {!isAdmin && (
                       <button onClick={() => navigate('/student')} className="mr-2 hover:bg-gray-100 p-2 rounded-full">
                           <ArrowLeft size={20}/>
                       </button>
                  )}
                  {partnerId ? (
                      <>
                        <div className="w-8 h-8 rounded-full bg-hanbit-100 flex items-center justify-center text-hanbit-700">
                             <User size={16}/>
                        </div>
                        <h2 className="font-bold text-gray-800">
                            {users.find(u => u.id === partnerId)?.name || "Unknown"}
                        </h2>
                      </>
                  ) : (
                      <span className="text-gray-400">대화 상대를 선택해주세요.</span>
                  )}
              </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-100 space-y-4">
              {partnerId ? (
                  currentConversation.length > 0 ? (
                      currentConversation.map(msg => {
                          const isMe = msg.senderId === currentUser.id;
                          return (
                              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  <div className={`max-w-[70%] p-3 rounded-2xl shadow-sm text-sm whitespace-pre-wrap ${isMe ? 'bg-hanbit-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                                      {msg.content}
                                  </div>
                                  <span className="text-[10px] text-gray-400 self-end mx-2">
                                      {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      {isMe && msg.read && " • 읽음"}
                                  </span>
                              </div>
                          )
                      })
                  ) : (
                      <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
                          <MessageSquare size={48} className="mb-4 opacity-20"/>
                          <p>대화 내용이 없습니다.</p>
                          <p className="text-sm">메시지를 보내 대화를 시작해보세요.</p>
                      </div>
                  )
              ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                      왼쪽 목록에서 학생을 선택하여 대화를 시작하세요.
                  </div>
              )}
              <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          {partnerId && (
              <div className="p-4 bg-white border-t">
                  <form onSubmit={handleSend} className="flex gap-2 max-w-4xl mx-auto w-full">
                      <input 
                          className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:ring-2 focus:ring-hanbit-500 outline-none"
                          placeholder="메시지를 입력하세요..."
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                      />
                      <button 
                          type="submit" 
                          disabled={!inputText.trim()}
                          className="bg-hanbit-600 text-white p-3 rounded-full hover:bg-hanbit-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                          <Send size={20}/>
                      </button>
                  </form>
              </div>
          )}
      </div>
    </div>
  );
}