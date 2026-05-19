'use client';

import { useContext, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import axios from 'axios';
import { MdPersonAdd, MdClose } from 'react-icons/md';
import { IoMdShareAlt } from 'react-icons/io';

import { useGetCallById } from '@/hooks/useGetCallById';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { WorkspaceContext } from '@/providers/WorkspaceProvider';
import { planslist } from '@/constants';
import InvitePeaople from '@/components/InvitePeaople';
import WhatsAppInvite from '@/components/WhatsAppInvite';

const Table = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-start gap-2 xl:flex-row">
    <h1 className="text-base font-medium text-sky-1 lg:text-xl xl:min-w-32">
      {title}:
    </h1>
    <h1 className="text-sm font-bold break-all lg:text-xl">{description}</h1>
  </div>
);

const PersonalRoom = () => {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const { subscription } = useContext(subscriptionContext);
  const { activeWorkspace } = useContext(WorkspaceContext);
  const [starting, setStarting] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const meetingId = user?.id ?? '';
  const { call } = useGetCallById(meetingId);

  // Lazily create the personal-room DB row. Used by both "Start Meeting" and
  // the email invite flow (send-invitation looks up the room by room_id).
  const ensureRoom = async () => {
    if (!user || call) return;
    const minutes = (planslist as any)?.[subscription]?.min || 40;
    const now = new Date();
    const end_time = new Date(now.getTime() + minutes * 60 * 1000).toUTCString();
    await axios.post('/api/v1/create-room', {
      user_id: user.id,
      workspaceId: activeWorkspace?._id || null,
      room_id: meetingId,
      user_plan: subscription,
      start_time: now.toUTCString(),
      end_time,
      scheduleTime: now.toISOString(),
      status: 'private',
    });
  };

  const startRoom = async () => {
    if (!user || starting) return;
    setStarting(true);
    try {
      await ensureRoom();
      router.push(`/meeting/${meetingId}?personal=true`);
    } catch (e: any) {
      setStarting(false);
      toast({
        title: 'Could not start meeting',
        description: e?.response?.data?.message || e?.message || 'Try again.',
      });
    }
  };

  const handleAddEmail = () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    if (emails.includes(trimmed)) {
      setEmail('');
      return;
    }
    setEmails((cur) => [...cur, trimmed]);
    setEmail('');
  };

  const handleRemoveEmail = (index: number) => {
    setEmails((cur) => cur.filter((_, i) => i !== index));
  };

  const handleSendInvitation = async () => {
    if (!user || emails.length === 0 || sending) return;
    setSending(true);
    try {
      await ensureRoom();
      await axios.post('/api/v1/send-invitation', {
        emails,
        room_id: meetingId,
        user_id: user.id,
      });
      setEmails([]);
      setIsInviteOpen(false);
      toast({ title: 'Invitations sent' });
    } catch (e: any) {
      toast({
        title: 'Could not send invitations',
        description: e?.response?.data?.message || e?.message || 'Try again.',
      });
    } finally {
      setSending(false);
    }
  };

  const meetingLink = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${meetingId}?personal=true`;

  return (
    <section className="flex size-full flex-col gap-10 text-white">
      <h1 className="text-xl font-bold lg:text-3xl text-gradient">Personal Meeting Room</h1>
      <div className="flex w-full flex-col gap-8 xl:max-w-[900px]">
        <Table title="Topic" description={`${user?.firstName ?? ''}'s Meeting Room`} />
        <Table title="Meeting ID" description={meetingId} />
        <Table title="Invite Link" description={meetingLink} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button className="bg-blue-1" onClick={startRoom} disabled={starting}>
          {starting ? 'Starting…' : 'Start Meeting'}
        </Button>
        <Button className="bg-foregroud-primary" onClick={() => setIsInviteOpen(true)}>
          Invite <IoMdShareAlt className="ml-2" />
        </Button>
        <Button
          className="bg-dark-3"
          onClick={() => {
            navigator.clipboard.writeText(meetingLink);
            toast({ title: 'Link Copied' });
          }}
        >
          Copy Invitation
        </Button>
      </div>

      <InvitePeaople isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)}>
        <h1 className="text-3xl text-black text-center font-semibold">Invite People</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* === Email column === */}
          <div className="flex flex-col gap-4 bg-gray-50 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-black">By Email</h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEmail();
                  }
                }}
                placeholder="Enter Email"
                className="outline-none border border-gray-300 rounded-md py-3 px-3 flex-1 placeholder:font-normal"
              />
              <button
                className="bg-foregroud-primary px-4 py-3 rounded-md text-white flex items-center gap-3 hover:scale-105"
                onClick={handleAddEmail}
              >
                <MdPersonAdd size={22} />
              </button>
            </div>
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {emails.map((em, index) => (
                  <div
                    key={`${em}-${index}`}
                    className="bg-white border border-gray-200 rounded-md py-2 pl-3 pr-1 text-black flex items-center gap-1 text-sm"
                  >
                    {em}
                    <button
                      className="text-gray-500 hover:text-red-500 pl-1"
                      onClick={() => handleRemoveEmail(index)}
                    >
                      <MdClose size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              className="bg-foregroud-primary px-4 py-3 rounded-md text-white flex items-center justify-center gap-2 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mt-auto"
              onClick={handleSendInvitation}
              disabled={emails.length === 0 || sending}
            >
              {sending ? 'Sending…' : 'Send Email Invites'} <IoMdShareAlt />
            </button>
          </div>

          {/* === WhatsApp column === */}
          <WhatsAppInvite url={meetingLink} />
        </div>
      </InvitePeaople>
    </section>
  );
};

export default PersonalRoom;
