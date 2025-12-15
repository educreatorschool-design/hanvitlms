import React, { useState } from 'react';
import { useStore } from '../store';
import { UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { BookOpen, UserCircle, ShieldCheck, Megaphone } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const { login, registerUser, users } = useStore();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAdminMode) {
      if (password === '050719') {
        const adminUser = users.find(u => u.role === UserRole.ADMIN);
        if (adminUser) {
            login(adminUser);
            navigate('/admin');
        } else {
            alert("관리자 계정을 찾을 수 없습니다.");
        }
      } else {
        alert("관리자 비밀번호가 틀렸습니다.");
      }
      return;
    }

    if (isLogin) {
      const user = users.find(u => u.email === email && u.password === password && u.role === UserRole.STUDENT);
      if (user) {
        login(user);
        navigate('/student');
      } else {
        alert("이메일 또는 비밀번호가 잘못되었습니다.");
      }
    } else {
      if (users.find(u => u.email === email)) {
        alert("이미 존재하는 이메일입니다.");
        return;
      }
      const newUser = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        password,
        name,
        role: UserRole.STUDENT
      };
      registerUser(newUser);
      login(newUser);
      navigate('/student');
    }
  };

  return (
    <div className="min-h-screen bg-hanbit-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="bg-hanbit-500 text-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">한빛문화예술교육원 LMS</h1>
          <p className="text-gray-500 mt-2">꿈을 향한 배움의 시작</p>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsAdminMode(false)}
            className={`px-4 py-2 rounded-l-lg border ${!isAdminMode ? 'bg-hanbit-500 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            수강생
          </button>
          <button
            onClick={() => setIsAdminMode(true)}
            className={`px-4 py-2 rounded-r-lg border ${isAdminMode ? 'bg-hanbit-900 text-white' : 'bg-gray-100 text-gray-600'}`}
          >
            관리자
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && !isAdminMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hanbit-500 outline-none"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          
          {!isAdminMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                <input
                    type="email"
                    required
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hanbit-500 outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAdminMode ? '관리자 비밀번호' : '비밀번호'}
            </label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-hanbit-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={`w-full py-3 rounded-lg text-white font-semibold transition duration-200 ${isAdminMode ? 'bg-hanbit-900 hover:bg-hanbit-800' : 'bg-hanbit-600 hover:bg-hanbit-700'}`}
          >
            {isAdminMode ? '관리자 로그인' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        {!isAdminMode && (
          <div className="mt-6 text-center text-sm text-gray-600">
            {isLogin ? (
              <>
                계정이 없으신가요?{' '}
                <button onClick={() => setIsLogin(false)} className="text-hanbit-600 hover:underline font-semibold">
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{' '}
                <button onClick={() => setIsLogin(true)} className="text-hanbit-600 hover:underline font-semibold">
                  로그인
                </button>
              </>
            )}
          </div>
        )}
        
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
             <button onClick={() => navigate('/notices')} className="text-gray-500 text-sm hover:text-hanbit-600 flex items-center gap-1">
                 <Megaphone size={14}/> 전체 공지사항
             </button>
             <button onClick={() => navigate('/guest')} className="text-gray-500 text-sm hover:text-hanbit-600">
                 비수강생 둘러보기
             </button>
        </div>
      </div>
    </div>
  );
}