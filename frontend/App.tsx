import { useState, useEffect, FormEvent } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import AccountList from './components/AccountList';
import OrderList from './components/OrderList';
import CardList from './components/CardList';
import ItemList from './components/ItemList';
import Settings from './components/Settings';
import Keywords from './components/Keywords';
import { verifySession, generateQRLogin, checkQRLoginStatus, passwordLogin, checkPasswordLoginStatus, updateAccountCookie } from './services/api';
import { ShieldCheck, ArrowRight, Loader2, User, Lock, TerminalSquare, QrCode, KeyRound, Eye, Smartphone } from 'lucide-react';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [needsInit, setNeedsInit] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // 登录方式选择
  const [loginMethod, setLoginMethod] = useState<'password' | 'qr' | 'cookie'>('password');
  
  // 密码登录状态
  const [passwordLoginAccount, setPasswordLoginAccount] = useState('');
  const [passwordLoginPassword, setPasswordLoginPassword] = useState('');
  const [showBrowser, setShowBrowser] = useState(false);
  const [passwordLoginSessionId, setPasswordLoginSessionId] = useState<string | null>(null);
  const [passwordLoginStatus, setPasswordLoginStatus] = useState<string>('idle');
  const [passwordLoginMessage, setPasswordLoginMessage] = useState('');
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // QR 登录状态
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [qrStatus, setQrStatus] = useState<string>('pending');
  const [qrSessionId, setQrSessionId] = useState<string | null>(null);

  // Cookie 手动输入状态
  const [cookieId, setCookieId] = useState('');
  const [cookieValue, setCookieValue] = useState('');
  const [cookieLoginLoading, setCookieLoginLoading] = useState(false);

  // Check auth on mount
  useEffect(() => {
      verifySession()
        .then((res) => {
          if (res?.initialized === false) {
            setNeedsInit(true);
            setIsLoggedIn(false);
            return;
          }

          setNeedsInit(false);
          if (res?.authenticated) setIsLoggedIn(true);
        })
        .catch(() => setIsLoggedIn(false))
        .finally(() => setCheckingAuth(false));

      const handleLogout = () => setIsLoggedIn(false);
      window.addEventListener('auth:logout', handleLogout);
      return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  // 轮询密码登录状态
  useEffect(() => {
    if (passwordLoginStatus === 'processing' && passwordLoginSessionId) {
      const interval = setInterval(async () => {
        try {
          const statusRes = await checkPasswordLoginStatus(passwordLoginSessionId!);
          setPasswordLoginStatus(statusRes.status);
          setPasswordLoginMessage(statusRes.message || '');
          
          if (statusRes.status === 'verification_required') {
            setVerificationUrl(statusRes.verification_url || null);
          } else if (statusRes.status === 'success') {
            clearInterval(interval);
            setTimeout(() => {
              setIsLoggedIn(true);
            }, 1000);
          } else if (statusRes.status === 'failed') {
            clearInterval(interval);
          }
        } catch (err) {
          console.error('检查密码登录状态失败:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [passwordLoginStatus, passwordLoginSessionId]);

  // 轮询 QR 登录状态
  useEffect(() => {
    if (qrStatus === 'waiting' && qrSessionId) {
      const interval = setInterval(async () => {
        try {
          const statusRes = await checkQRLoginStatus(qrSessionId!);
          if (statusRes.status === 'success') {
            clearInterval(interval);
            setQrStatus('success');
            setTimeout(() => {
              setIsLoggedIn(true);
            }, 1000);
          } else if (statusRes.status === 'expired' || statusRes.status === 'error') {
            clearInterval(interval);
            setQrStatus('error');
          }
        } catch (err) {
          console.error('检查 QR 登录状态失败:', err);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [qrStatus, qrSessionId]);

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    setPasswordLoginStatus('processing');
    setPasswordLoginMessage('登录任务已启动，请稍候...');
    
    try {
      const res = await passwordLogin({
        account_id: `pwd_${Date.now()}`,
        account: passwordLoginAccount,
        password: passwordLoginPassword,
        show_browser: showBrowser
      });
      
      if (res.success && res.session_id) {
        setPasswordLoginSessionId(res.session_id);
      } else {
        setPasswordLoginStatus('failed');
        setPasswordLoginMessage(res.message || '登录失败');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setPasswordLoginStatus('failed');
      setPasswordLoginMessage(msg || '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQRLogin = async () => {
    setQrStatus('loading');
    try {
      const res = await generateQRLogin();
      if (res.success && res.qr_code_url && res.session_id) {
        setQrCodeUrl(res.qr_code_url);
        setQrSessionId(res.session_id);
        setQrStatus('waiting');
      } else {
        setQrStatus('error');
      }
    } catch (e) {
      setQrStatus('error');
    }
  };

  const handleCookieLogin = async (e: FormEvent) => {
    e.preventDefault();
    setCookieLoginLoading(true);
    setLoginError('');
    
    try {
      // 使用 updateAccountCookie API 来保存 Cookie
      const { updateAccountCookie } = await import('./services/api');
      await updateAccountCookie(cookieId || `cookie_${Date.now()}`, cookieValue);
      setIsLoggedIn(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoginError(msg || 'Cookie 保存失败');
    } finally {
      setCookieLoginLoading(false);
    }
  };

  const resetLogin = () => {
    setPasswordLoginSessionId(null);
    setPasswordLoginStatus('idle');
    setPasswordLoginMessage('');
    setVerificationUrl(null);
    setQrSessionId(null);
    setQrStatus('pending');
    setQrCodeUrl('');
    setLoginError('');
  };

  if (checkingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
              <Loader2 className="w-8 h-8 text-[#FFE815] animate-spin" />
          </div>
      );
  }

  // Init Screen (system not initialized)
  if (needsInit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] p-4 relative overflow-hidden font-sans">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-yellow-200/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-200/30 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="bg-white/80 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full max-w-xl border border-white relative z-10 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-[#FFE815] rounded-[2rem] flex items-center justify-center shadow-xl shadow-yellow-200 mx-auto mb-6 transform rotate-[-6deg] transition-all duration-500">
              <TerminalSquare className="w-10 h-10 text-black" />
            </div>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">系统尚未初始化</h2>
            <p className="text-gray-600 font-medium">为避免默认口令风险，管理员必须通过服务器本机 CLI 初始化。</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="text-sm font-bold text-gray-900 mb-2">请在服务器上执行：</div>
              <pre className="text-xs bg-black text-white p-4 rounded-2xl overflow-x-auto">python3 init_admin.py</pre>
              <div className="text-xs text-gray-500 mt-2">完成后刷新页面即可进入登录。</div>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full ios-btn-primary h-14 rounded-2xl text-lg shadow-xl shadow-yellow-200 mt-2 flex items-center justify-center gap-2 group"
            >
              我已初始化，刷新 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">Secure Bootstrap</span>
          </div>
        </div>
      </div>
    );
  }

  // Login Screen Component
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] p-4 relative overflow-hidden font-sans">
        {/* Animated Background Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-yellow-200/40 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-200/30 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="bg-white/80 backdrop-blur-3xl p-8 md:p-12 rounded-[3rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full max-w-lg border border-white relative z-10 animate-fade-in">
          
          {/* Header with Logo */}
          <div className="text-center mb-8">
             <div className="w-24 h-24 bg-[#FFE815] rounded-[2rem] flex items-center justify-center shadow-xl shadow-yellow-200 mx-auto mb-6 transform rotate-[-6deg] hover:rotate-0 transition-all duration-500 cursor-pointer group">
                <span className="text-black font-extrabold text-5xl group-hover:scale-110 transition-transform">闲</span>
             </div>
             <h2 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">欢迎回来</h2>
             <p className="text-gray-500 font-medium">闲鱼智能自动发货与管家系统</p>
          </div>
          
          {/* Login Method Tabs */}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => { setLoginMethod('password'); resetLogin(); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                loginMethod === 'password' 
                  ? 'text-[#FFE815] border-b-2 border-[#FFE815]' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <User className="w-4 h-4" /> 密码登录
              </div>
            </button>
            <button
              onClick={() => { setLoginMethod('qr'); resetLogin(); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                loginMethod === 'qr' 
                  ? 'text-[#FFE815] border-b-2 border-[#FFE815]' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <QrCode className="w-4 h-4" /> 扫码登录
              </div>
            </button>
            <button
              onClick={() => { setLoginMethod('cookie'); resetLogin(); }}
              className={`flex-1 py-3 text-sm font-bold transition-colors ${
                loginMethod === 'cookie' 
                  ? 'text-[#FFE815] border-b-2 border-[#FFE815]' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <KeyRound className="w-4 h-4" /> Cookie
              </div>
            </button>
          </div>

          {/* Password Login Form */}
          {loginMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              {passwordLoginStatus === 'idle' && (
                <>
                  <div className="space-y-4">
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
                      <input 
                        type="text" 
                        placeholder="闲鱼账号（手机号/用户名）" 
                        value={passwordLoginAccount}
                        onChange={e => setPasswordLoginAccount(e.target.value)}
                        className="w-full ios-input pl-14 pr-6 py-4.5 rounded-2xl text-base h-14"
                        required
                      />
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
                      <input 
                        type={showPassword ? 'text' : 'password'} 
                        placeholder="密码" 
                        value={passwordLoginPassword}
                        onChange={e => setPasswordLoginPassword(e.target.value)}
                        className="w-full ios-input pl-14 pr-12 py-4.5 rounded-2xl text-base h-14"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setShowBrowser(!showBrowser)}
                      className={`w-14 h-8 rounded-full transition-colors duration-300 relative ${
                        showBrowser ? 'bg-[#FFE815]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${
                          showBrowser ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <label className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      显示浏览器（用于处理验证）
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loginLoading}
                    className="w-full ios-btn-primary h-14 rounded-2xl text-lg shadow-xl shadow-yellow-200 mt-2 flex items-center justify-center gap-2 group disabled:opacity-70"
                  >
                    {loginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>立即登录 <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
                  </button>
                </>
              )}

              {passwordLoginStatus === 'processing' && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 text-[#FFE815] animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">{passwordLoginMessage}</p>
                  <p className="text-xs text-gray-400 mt-2">正在登录中，请稍候...</p>
                </div>
              )}

              {passwordLoginStatus === 'verification_required' && (
                <div className="text-center py-6 bg-amber-50 rounded-2xl border border-amber-200">
                  <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Smartphone className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-amber-900 mb-2">需要人脸验证</h3>
                  <p className="text-sm text-amber-700 mb-4">{passwordLoginMessage}</p>
                  {verificationUrl && (
                    <a
                      href={verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block ios-btn-primary py-3 px-6 rounded-xl text-sm font-bold"
                    >
                      点击此处进行验证
                    </a>
                  )}
                  <p className="text-xs text-amber-600 mt-4">验证完成后将自动登录</p>
                </div>
              )}

              {passwordLoginStatus === 'success' && (
                <div className="text-center py-8 bg-green-50 rounded-2xl border border-green-200">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-900 mb-2">登录成功</h3>
                  <p className="text-sm text-green-700">{passwordLoginMessage}</p>
                </div>
              )}

              {passwordLoginStatus === 'failed' && (
                <div className="text-center py-6 bg-red-50 rounded-2xl border border-red-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">登录失败</h3>
                  <p className="text-sm text-red-700 mb-4">{passwordLoginMessage}</p>
                  <button
                    type="button"
                    onClick={resetLogin}
                    className="ios-btn-primary py-2 px-6 rounded-xl text-sm font-bold"
                  >
                    重试
                  </button>
                </div>
              )}
            </form>
          )}

          {/* QR Code Login */}
          {loginMethod === 'qr' && (
            <div className="space-y-5">
              {qrStatus === 'pending' && (
                <div className="text-center py-8">
                  <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium mb-6">点击下方按钮获取二维码</p>
                  <button 
                    onClick={handleQRLogin}
                    className="w-full ios-btn-primary h-14 rounded-2xl text-lg shadow-xl shadow-yellow-200 flex items-center justify-center gap-2"
                  >
                    <QrCode className="w-5 h-5" /> 获取二维码
                  </button>
                </div>
              )}

              {qrStatus === 'loading' && (
                <div className="text-center py-8">
                  <Loader2 className="w-12 h-12 text-[#FFE815] animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 font-medium">正在生成二维码...</p>
                </div>
              )}

              {qrStatus === 'waiting' && (
                <div className="text-center py-6">
                  <div className="w-64 h-64 bg-[#F7F8FA] rounded-[2rem] mx-auto flex items-center justify-center overflow-hidden border-4 border-white shadow-inner mb-6">
                    {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-full h-full p-4" />}
                  </div>
                  <p className="text-sm text-gray-500 font-medium mb-2">请打开闲鱼 APP 扫描二维码</p>
                  <p className="text-xs text-gray-400">二维码有效期为 5 分钟</p>
                </div>
              )}

              {qrStatus === 'success' && (
                <div className="text-center py-8 bg-green-50 rounded-2xl border border-green-200">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-green-900 mb-2">登录成功</h3>
                  <p className="text-sm text-green-700">正在跳转...</p>
                </div>
              )}

              {qrStatus === 'error' && (
                <div className="text-center py-6 bg-red-50 rounded-2xl border border-red-200">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-red-900 mb-2">获取失败</h3>
                  <p className="text-sm text-red-700 mb-4">二维码获取失败，请重试</p>
                  <button
                    type="button"
                    onClick={handleQRLogin}
                    className="ios-btn-primary py-2 px-6 rounded-xl text-sm font-bold"
                  >
                    重试
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cookie Manual Input */}
          {loginMethod === 'cookie' && (
            <form onSubmit={handleCookieLogin} className="space-y-5">
              <div className="space-y-4">
                <div className="relative group">
                  <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-black transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Cookie ID（可选，留空自动生成）" 
                    value={cookieId}
                    onChange={e => setCookieId(e.target.value)}
                    className="w-full ios-input pl-14 pr-6 py-4.5 rounded-2xl text-base h-14"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2 ml-2">Cookie 值</label>
                  <textarea
                    value={cookieValue}
                    onChange={e => setCookieValue(e.target.value)}
                    placeholder="请输入 Cookie 字符串"
                    className="w-full ios-input px-4 py-3 rounded-2xl h-32 resize-none font-mono text-xs"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-2">当前 Cookie 长度：{cookieValue.length} 字符</p>
                </div>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-500 text-sm text-center font-bold flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> {loginError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={cookieLoginLoading}
                className="w-full ios-btn-primary h-14 rounded-2xl text-lg shadow-xl shadow-yellow-200 mt-2 flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {cookieLoginLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>保存 Cookie <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>}
              </button>
            </form>
          )}
          
          <div className="mt-8 pt-6 border-t border-gray-100">
             <div className="mt-6 text-center">
                 <span className="text-xs text-gray-400 font-medium tracking-widest uppercase">
                    Xianyu Auto-Dispatch Pro v2.5
                 </span>
             </div>
          </div>
        </div>
      </div>
    );
  }

  // Main App Layout
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'accounts': return <AccountList />;
      case 'orders': return <OrderList />;
      case 'cards': return <CardList />;
      case 'items': return <ItemList />;
      case 'keywords': return <Keywords />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F4F5F7] text-[#111]">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab} 
        onLogout={() => {
            setIsLoggedIn(false);
        }}
      />
      
      <main className="flex-1 ml-64 p-8 md:p-12 overflow-y-auto h-screen relative scroll-smooth">
        {/* Subtle background decoration */}
        <div className="fixed top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-yellow-50 to-transparent rounded-full blur-[120px] pointer-events-none -z-10 opacity-60"></div>
        
        <div className="max-w-[1400px] mx-auto pb-10">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;
