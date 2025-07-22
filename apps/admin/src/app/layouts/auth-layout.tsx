import type { ReactNode } from 'react';
import '../../styles/auth-animations.css';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="min-h-screen flex">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 xl:px-12 relative">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 auth-pattern-animate" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }} />
          </div>
          
          <div className="mx-auto max-w-md relative z-10">
            <div className="text-center mb-12">
              <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl mb-6 shadow-lg">
                <div className="absolute -inset-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl blur opacity-25"></div>
                <svg
                  className="w-10 h-10 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
                CMS Platform
              </h1>
              <p className="text-xl text-slate-600 leading-relaxed">
                Content Management & Translation System
              </p>
            </div>
            
            <div className="space-y-8">
              <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 auth-feature-float auth-fade-in auth-feature-stagger">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">Multi-brand Management</h3>
                  <p className="text-slate-600 leading-relaxed">Manage content across different brands and jurisdictions with ease</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 auth-feature-float auth-fade-in auth-feature-stagger">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">Translation Workflows</h3>
                  <p className="text-slate-600 leading-relaxed">Streamlined translation and localization processes</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white/50 backdrop-blur-sm border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-200 auth-feature-float auth-fade-in auth-feature-stagger">
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg mb-1">Release Management</h3>
                  <p className="text-slate-600 leading-relaxed">Atomic deployments with rollback capabilities</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:px-8 lg:flex-none lg:w-96 xl:w-[480px] bg-white/60 backdrop-blur-sm border-l border-slate-200/50">
          <div className="w-full max-w-sm mx-auto">
            <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-200/50 p-8 auth-fade-in auth-glow">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}