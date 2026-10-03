import React, { useState, useEffect } from 'react';
import { supabase, directSupabaseUrl, supabaseUrl } from '../supabase/client';
import { 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Database, 
  ShieldCheck, 
  Users, 
  Building2, 
  ArrowLeft,
  KeyRound,
  HardDrive
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  latencyMs?: number;
  details?: any;
}

const SupabaseDiagnostics: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [activeSessionUser, setActiveSessionUser] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setRunning(true);
    const checks: DiagnosticResult[] = [];

    const updateCheck = (result: DiagnosticResult) => {
      const idx = checks.findIndex(c => c.step === result.step);
      if (idx >= 0) {
        checks[idx] = result;
      } else {
        checks.push(result);
      }
      setResults([...checks]);
    };

    // 1. Endpoint Configuration Check
    updateCheck({
      step: 'Client Endpoint Configuration',
      status: 'pending',
      message: 'Checking target URL and environment resolution...'
    });

    try {
      const isDirect = !supabaseUrl.includes('supabase-proxy');
      updateCheck({
        step: 'Client Endpoint Configuration',
        status: 'success',
        message: `Connected via ${isDirect ? 'Direct Endpoint' : 'Preview Proxy'} (${supabaseUrl})`,
        details: { directUrl: directSupabaseUrl, activeUrl: supabaseUrl }
      });
    } catch (e: any) {
      updateCheck({
        step: 'Client Endpoint Configuration',
        status: 'error',
        message: `Configuration error: ${e.message || e}`
      });
    }

    // 2. Network Ping & Supabase Health
    const pingStart = performance.now();
    updateCheck({
      step: 'Supabase Server Connectivity',
      status: 'pending',
      message: 'Connecting to Supabase cloud service...'
    });

    try {
      const { data, error } = await supabase.from('organisations').select('id').limit(1);
      const pingEnd = performance.now();
      const latency = Math.round(pingEnd - pingStart);

      if (error) {
        updateCheck({
          step: 'Supabase Server Connectivity',
          status: 'error',
          message: `Connection failed: ${error.message} (Code: ${error.code})`,
          latencyMs: latency,
          details: error
        });
      } else {
        updateCheck({
          step: 'Supabase Server Connectivity',
          status: 'success',
          message: `Successfully connected with ${latency}ms latency`,
          latencyMs: latency
        });
      }
    } catch (e: any) {
      updateCheck({
        step: 'Supabase Server Connectivity',
        status: 'error',
        message: `Network error: ${e.message || e}`
      });
    }

    // 3. Auth Session Verification
    updateCheck({
      step: 'Authentication Session',
      status: 'pending',
      message: 'Inspecting current auth session state...'
    });

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        updateCheck({
          step: 'Authentication Session',
          status: 'error',
          message: `Session error: ${sessionError.message}`
        });
      } else if (session?.user) {
        setActiveSessionUser(session.user.email || session.user.id);
        updateCheck({
          step: 'Authentication Session',
          status: 'success',
          message: `Active session authenticated as ${session.user.email} (Role: ${session.user.role || 'authenticated'})`
        });
      } else {
        setActiveSessionUser(null);
        updateCheck({
          step: 'Authentication Session',
          status: 'success',
          message: 'Public / Anonymous visitor (no active login session - valid for landing page)'
        });
      }
    } catch (e: any) {
      updateCheck({
        step: 'Authentication Session',
        status: 'error',
        message: `Session lookup failed: ${e.message || e}`
      });
    }

    // 4. Organisations Table Query
    updateCheck({
      step: 'Table Access: organisations',
      status: 'pending',
      message: 'Querying organisations table...'
    });

    try {
      const { data, count, error } = await supabase
        .from('organisations')
        .select('*', { count: 'exact' });

      if (error) {
        updateCheck({
          step: 'Table Access: organisations',
          status: 'error',
          message: `Error: ${error.message}`
        });
      } else {
        updateCheck({
          step: 'Table Access: organisations',
          status: 'success',
          message: `Accessible (${data?.length || 0} organizations retrieved)`
        });
      }
    } catch (e: any) {
      updateCheck({
        step: 'Table Access: organisations',
        status: 'error',
        message: `Exception: ${e.message || e}`
      });
    }

    // 5. Profiles Table Query
    updateCheck({
      step: 'Table Access: profiles',
      status: 'pending',
      message: 'Querying profiles table and joins...'
    });

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, role, organisation_id, organisations(name)')
        .limit(10);

      if (error) {
        updateCheck({
          step: 'Table Access: profiles',
          status: 'error',
          message: `Error: ${error.message}`
        });
      } else {
        updateCheck({
          step: 'Table Access: profiles',
          status: 'success',
          message: `Accessible (${data?.length || 0} sample user profiles retrieved with org joins)`
        });
      }
    } catch (e: any) {
      updateCheck({
        step: 'Table Access: profiles',
        status: 'error',
        message: `Exception: ${e.message || e}`
      });
    }

    // 6. Members Table Query
    updateCheck({
      step: 'Table Access: members',
      status: 'pending',
      message: 'Querying community members registry...'
    });

    try {
      const { data, count, error } = await supabase
        .from('members')
        .select('id, name, surname, gender, occupation, support_need', { count: 'exact' });

      if (error) {
        updateCheck({
          step: 'Table Access: members',
          status: 'error',
          message: `Error: ${error.message}`
        });
      } else {
        updateCheck({
          step: 'Table Access: members',
          status: 'success',
          message: `Accessible (${data?.length || 0} member records available for live analytics)`
        });
      }
    } catch (e: any) {
      updateCheck({
        step: 'Table Access: members',
        status: 'error',
        message: `Exception: ${e.message || e}`
      });
    }

    // 7. Storage Bucket Verification
    updateCheck({
      step: 'Storage: member-images bucket',
      status: 'pending',
      message: 'Checking public file storage availability...'
    });

    try {
      const { data } = supabase.storage.from('member-images').getPublicUrl('test-probe.jpg');
      if (data?.publicUrl) {
        updateCheck({
          step: 'Storage: member-images bucket',
          status: 'success',
          message: `Storage public URL generator operational (${data.publicUrl.slice(0, 45)}...)`
        });
      } else {
        updateCheck({
          step: 'Storage: member-images bucket',
          status: 'error',
          message: 'Unable to derive storage public endpoint'
        });
      }
    } catch (e: any) {
      updateCheck({
        step: 'Storage: member-images bucket',
        status: 'error',
        message: `Storage check failed: ${e.message || e}`
      });
    }

    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-2xs hover:shadow-xs transition-all"
          >
            <ArrowLeft size={14} />
            <span>Back to Home</span>
          </Link>

          <button
            onClick={runDiagnostics}
            disabled={running}
            className="inline-flex items-center gap-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={14} className={running ? 'animate-spin' : ''} />
            <span>{running ? 'Diagnosing...' : 'Re-run Tests'}</span>
          </button>
        </div>

        {/* Diagnostic Banner */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF8A00] shrink-0">
              <Database size={24} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0B1020] tracking-tight">
                Supabase Connection Diagnostics
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                Realtime health audit of Supabase endpoint, authentication session, RLS policies, and database tables.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Target Endpoint</span>
              <span className="font-mono text-slate-700 truncate block font-semibold">{directSupabaseUrl}</span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Active Session</span>
              <span className="font-semibold text-slate-700 truncate block">
                {activeSessionUser || 'Public Visitor (Unauthenticated)'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Audit Status</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {running ? 'Running tests...' : 'Complete'}
              </span>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
          {results.map((res, index) => (
            <div key={index} className="p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-50/50 transition-colors">
              <div className="mt-0.5 shrink-0">
                {res.status === 'success' && <CheckCircle2 className="text-emerald-500" size={20} />}
                {res.status === 'error' && <XCircle className="text-rose-500" size={20} />}
                {res.status === 'pending' && <RefreshCw className="text-amber-500 animate-spin" size={18} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{res.step}</h3>
                  {res.latencyMs !== undefined && (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                      {res.latencyMs}ms
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${res.status === 'error' ? 'text-rose-600 font-semibold' : 'text-slate-600'}`}>
                  {res.message}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Help card */}
        <div className="p-5 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900">
          <p className="font-bold mb-1">Need to update production credentials?</p>
          <p className="text-amber-800 leading-relaxed">
            Ensure you have added <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">VITE_SUPABASE_URL</code> and <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">VITE_SUPABASE_ANON_KEY</code> in your Vercel Project Settings under Environment Variables.
          </p>
        </div>

      </div>
    </div>
  );
};

export default SupabaseDiagnostics;
