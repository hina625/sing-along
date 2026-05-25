'use client';

import React, { useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { planslist } from '@/constants';
import Link from 'next/link';
import Image from 'next/image';
import Loader from '@/components/Loader';
import PermissionGate from '@/components/PermissionGate';
import { useToast } from '@/components/ui/use-toast';

const WORKSPACE_MODES: Array<{ value: 'worship' | 'business' | 'community'; label: string; hint: string }> = [
  { value: 'business',  label: 'Teams & Business',         hint: 'For meetings, collaboration, and project management.' },
  { value: 'community', label: 'Communities & Groups',     hint: 'For memberships, events, and engagement.' },
  { value: 'worship',   label: 'Organizations & Networks', hint: 'For recurring sessions, content, and audience management.' },
];

const SettingsPage = () => {
  const { user, isLoaded } = useUser();
  const { subscription } = useContext(subscriptionContext);
  const { activeWorkspace, refresh: refreshWorkspaces } = useContext(WorkspaceContext);
  const { toast } = useToast();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [updating, setUpdating] = useState(false);

  // Workspace editing state — admin-only.
  const isWorkspaceAdmin = activeWorkspace?.myRole === 'admin';
  const canCustomizeBranding = activeWorkspace?.ownerPlan?.customBranding !== false;
  const [wsName, setWsName] = useState('');
  const [wsMode, setWsMode] = useState<'worship' | 'business' | 'community'>('worship');
  const [wsPrimary, setWsPrimary] = useState('#5A2D82');
  const [wsAccent, setWsAccent] = useState('#D4AF37');
  const [wsLogo, setWsLogo] = useState('');
  const [wsUpdating, setWsUpdating] = useState(false);

  // Keep the form synced with whichever workspace is currently active. Re-runs
  // when the user switches workspaces in the switcher so the form reflects the
  // workspace being edited, not a stale earlier one.
  useEffect(() => {
    if (!activeWorkspace) return;
    setWsName(activeWorkspace.name || '');
    const m = activeWorkspace.mode;
    setWsMode(m === 'worship' || m === 'business' || m === 'community' ? m : 'worship');
    setWsPrimary(activeWorkspace.branding?.primaryColor || '#5A2D82');
    setWsAccent(activeWorkspace.branding?.accentColor || '#D4AF37');
    setWsLogo(activeWorkspace.branding?.logoUrl || '');
  }, [activeWorkspace?._id, activeWorkspace?.name, activeWorkspace?.mode, activeWorkspace?.branding]);

  const handleUpdateWorkspace = async () => {
    if (!activeWorkspace?._id || !user?.id) return;
    if (!wsName.trim()) {
      toast({ title: 'Workspace name is required', variant: 'destructive' });
      return;
    }
    try {
      setWsUpdating(true);
      const body: Record<string, unknown> = {
        id: activeWorkspace._id,
        user_id: user.id,
        name: wsName.trim(),
        mode: wsMode,
      };
      if (canCustomizeBranding) {
        body.branding = {
          logoUrl: wsLogo.trim() || null,
          primaryColor: wsPrimary,
          accentColor: wsAccent,
        };
      }
      const res = await axios.patch('/api/v1/workspace', body);
      if (res.data?.success) {
        await refreshWorkspaces();
        toast({ title: 'Workspace Updated', description: 'Your changes have been saved.' });
      } else {
        throw new Error(res.data?.message || 'Update failed');
      }
    } catch (error: any) {
      console.error(error);
      const msg = error?.response?.data?.message || error.message || 'Update failed';
      toast({ title: 'Update Failed', description: msg, variant: 'destructive' });
    } finally {
      setWsUpdating(false);
    }
  };

  if (!isLoaded) return <Loader />;

  const currentPlan = planslist[subscription as keyof typeof planslist] || planslist['free'];

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      await user?.update({
        firstName,
        lastName,
      });
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Update Failed",
        description: error.message || "An error occurred while updating your profile.",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <section className='flex size-full flex-col gap-6 text-white pb-10'>
      <div className="flex items-center justify-center flex-col mt-8 md:mt-12 mb-4 md:mb-6 px-4">
        <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white text-center">
          Account Settings
        </h2>
        <p className="text-sm md:text-lg text-white/70 mt-2 text-center max-w-2xl">Manage your profile and subscription preferences.</p>
      </div>

      <div className='max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 px-2 sm:px-6'>
        {/* Profile Card */}
        <div className='bg-background-3/40 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl card-premium flex flex-col gap-4 h-fit'>
          <div className='flex flex-col sm:flex-row items-center gap-3 sm:gap-5 mb-1 sm:mb-2 text-center sm:text-left'>
            <div className='relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-orange-500/30'>
              <Image src={user?.imageUrl || '/images/avatar-1.jpeg'} alt="Profile" fill className='object-cover' />
            </div>
            <div>
              <h3 className='text-xl sm:text-2xl font-bold'>{user?.fullName || 'User Profile'}</h3>
              <p className='text-sm sm:text-base text-white/60 break-all'>{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          
          <div className='space-y-4 sm:space-y-5'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              <div className='flex flex-col gap-2'>
                <label className='text-xs sm:text-sm text-white/60 font-medium uppercase tracking-wider'>First Name</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 transition-all text-sm sm:text-base'
                  placeholder="First Name"
                />
              </div>
              <div className='flex flex-col gap-2'>
                <label className='text-xs sm:text-sm text-white/60 font-medium uppercase tracking-wider'>Last Name</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 transition-all text-sm sm:text-base'
                  placeholder="Last Name"
                />
              </div>
            </div>

            <div className='flex flex-col gap-2'>
              <label className='text-xs sm:text-sm text-white/60 font-medium uppercase tracking-wider'>Email Address (Primary)</label>
              <input 
                type="email" 
                value={user?.primaryEmailAddress?.emailAddress}
                disabled
                className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 opacity-50 cursor-not-allowed text-sm sm:text-base'
              />
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={updating}
              className='w-full py-3.5 sm:py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-orange-900/20 text-sm sm:text-base mt-2'
            >
              {updating ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving Changes...
                </>
              ) : 'Save Profile Changes'}
            </button>
          </div>

          <div className='mt-2 flex flex-col gap-2 border-t border-white/10 pt-6'>
            <div className='flex justify-between items-center bg-white/5 p-3 rounded-xl'>
              <span className='text-[10px] text-white/40 uppercase tracking-widest font-bold'>Member Since</span>
              <span className='text-xs sm:text-sm font-medium'>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className='bg-gradient-to-br from-orange-600/20 to-orange-400/5 backdrop-blur-xl border border-orange-500/20 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl flex flex-col justify-between h-fit'>
          <div>
            <div className='flex flex-col sm:flex-row justify-between items-start gap-3 mb-4'>
              <div>
                <h3 className='text-xl sm:text-2xl font-bold text-white'>{currentPlan.title}</h3>
                <p className='text-orange-400 text-xs sm:text-sm font-medium'>Active Subscription</p>
              </div>
              <div className='bg-orange-500 text-white px-3 py-1.5 rounded-full font-bold text-base sm:text-lg'>
                ${currentPlan.price}<span className='text-xs font-normal'>/mo</span>
              </div>
            </div>

            <div className='space-y-4'>
              <div>
                <p className='text-white/60 text-[10px] sm:text-xs mb-2 italic uppercase tracking-wider'>Plan Features:</p>
                <ul className='space-y-2 sm:space-y-2.5'>
                  {currentPlan.features.slice(0, 5).map((feature, i) => (
                    <li key={i} className='flex items-start gap-3 text-white/80'>
                      <svg className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className='text-sm sm:text-base'>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className='bg-white/5 p-4 rounded-xl border border-white/10'>
                <h4 className='text-sm sm:text-base font-bold mb-1'>Need more features?</h4>
                <p className='text-white/60 text-[10px] sm:text-xs mb-3'>Upgrade to host more participants and unlock premium features.</p>
                <Link href="/plans" className='inline-block text-orange-500 text-xs sm:text-sm font-bold hover:text-orange-400 transition-colors'>
                  View Options &rarr;
                </Link>
              </div>
            </div>
          </div>

          <Link href="/plans" className='mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-400 text-white font-bold text-center shadow-lg hover:shadow-orange-500/20 hover:scale-[1.02] transition-all text-sm'>
            Manage Subscription
          </Link>
        </div>

        {/* Workspace Card — admin-only. Spans both columns on lg so it gets
            enough width for the name + mode + branding row. */}
        {activeWorkspace && (
          <div className='lg:col-span-2 bg-background-3/40 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-6 shadow-2xl card-premium flex flex-col gap-4 h-fit'>
            <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2'>
              <div>
                <h3 className='text-xl sm:text-2xl font-bold'>Workspace</h3>
                <p className='text-sm text-white/60 mt-1'>
                  {isWorkspaceAdmin
                    ? 'Edit the name, mode, and branding for this workspace.'
                    : 'Only workspace admins can edit these details.'}
                </p>
              </div>
              <span className='text-[10px] uppercase tracking-widest font-bold text-white/45'>
                Slug: {activeWorkspace.slug}
              </span>
            </div>

            <div className='space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='flex flex-col gap-2'>
                  <label className='text-xs sm:text-sm text-white/60 font-medium uppercase tracking-wider'>Workspace Name</label>
                  <input
                    type='text'
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    disabled={!isWorkspaceAdmin}
                    maxLength={80}
                    className='bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 transition-all text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed'
                    placeholder="e.g. Zainab's Workspace"
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <label className='text-xs sm:text-sm text-white/60 font-medium uppercase tracking-wider'>Mode</label>
                  <select
                    value={wsMode}
                    onChange={(e) => setWsMode(e.target.value as typeof wsMode)}
                    disabled={!isWorkspaceAdmin}
                    style={{ colorScheme: 'dark' }}
                    className='role-select bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-orange-500/50 transition-all text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed'
                  >
                    {WORKSPACE_MODES.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                  <p className='text-xs text-white/50'>
                    {WORKSPACE_MODES.find((m) => m.value === wsMode)?.hint}
                  </p>
                </div>
              </div>

              {/* Branding — visible to all admins, but the inputs disable + an
                  upsell hint shows if the workspace's plan doesn't include
                  custom branding. */}
              <div className='border-t border-white/10 pt-4'>
                <div className='flex items-center justify-between mb-3'>
                  <h4 className='text-sm sm:text-base font-bold uppercase tracking-wider text-white/80'>Branding</h4>
                  {!canCustomizeBranding && (
                    <span className='text-[10px] uppercase tracking-widest font-bold text-orange-400'>Upgrade to customize</span>
                  )}
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs text-white/60 font-medium uppercase tracking-wider'>Primary Color</label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='color'
                        value={wsPrimary}
                        onChange={(e) => setWsPrimary(e.target.value)}
                        disabled={!isWorkspaceAdmin || !canCustomizeBranding}
                        className='h-10 w-12 rounded cursor-pointer border border-white/10 bg-transparent disabled:opacity-60 disabled:cursor-not-allowed'
                      />
                      <input
                        type='text'
                        value={wsPrimary}
                        onChange={(e) => setWsPrimary(e.target.value)}
                        disabled={!isWorkspaceAdmin || !canCustomizeBranding}
                        className='flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-orange-500/50 text-sm disabled:opacity-60 disabled:cursor-not-allowed'
                      />
                    </div>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <label className='text-xs text-white/60 font-medium uppercase tracking-wider'>Accent Color</label>
                    <div className='flex items-center gap-2'>
                      <input
                        type='color'
                        value={wsAccent}
                        onChange={(e) => setWsAccent(e.target.value)}
                        disabled={!isWorkspaceAdmin || !canCustomizeBranding}
                        className='h-10 w-12 rounded cursor-pointer border border-white/10 bg-transparent disabled:opacity-60 disabled:cursor-not-allowed'
                      />
                      <input
                        type='text'
                        value={wsAccent}
                        onChange={(e) => setWsAccent(e.target.value)}
                        disabled={!isWorkspaceAdmin || !canCustomizeBranding}
                        className='flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 outline-none focus:border-orange-500/50 text-sm disabled:opacity-60 disabled:cursor-not-allowed'
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpdateWorkspace}
                disabled={!isWorkspaceAdmin || wsUpdating}
                className='w-full py-3.5 sm:py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-900/20 text-sm sm:text-base mt-2'
              >
                {wsUpdating ? (
                  <>
                    <svg className='animate-spin h-5 w-5 text-white' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
                      <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
                      <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                    </svg>
                    Saving Changes...
                  </>
                ) : 'Save Workspace Changes'}
              </button>
              {!isWorkspaceAdmin && (
                <p className='text-xs text-white/50 text-center'>
                  Read-only — you don&apos;t have admin rights on this workspace.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default function SettingsPageGated() {
  return (
    <PermissionGate resource="settings" action="view">
      <SettingsPage />
    </PermissionGate>
  );
}
