"use client"
import React, { useContext, useEffect, useState } from 'react'
import { MdOutlineContentCopy, MdPersonAdd,MdClose } from "react-icons/md";
import { IoMdShareAlt } from "react-icons/io";
import { useUser } from '@clerk/nextjs';
import { useToast } from '@/components/ui/use-toast';
import MeetingModal from '@/components/MeetingModal';
import { useRouter } from 'next/navigation';
import {
    EmailShareButton,
    EmailIcon,
    FacebookShareButton,
    WhatsappShareButton,
    WhatsappIcon,
    FacebookIcon,
    InstapaperShareButton,
    InstapaperIcon,
    TwitterShareButton,
    TwitterIcon,
    TelegramShareButton,
    TelegramIcon,
    LinkedinShareButton,
    LinkedinIcon
} from 'react-share';
import axios from 'axios';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { planslist } from '@/constants';
import InvitePeaople from '@/components/InvitePeaople';
import WhatsAppInvite from '@/components/WhatsAppInvite';
import CalendarShare from '@/components/CalendarShare';
import { Input } from '@/components/ui/input';

interface TypeParams {
    id: string
}

interface PropsType {
    params: TypeParams
}

interface MeetingInfoLite {
    title: string | null;
    scheduleTime: string | null;
    startTime: string | null;
    endTime: string | null;
}

const page = ({ params }: PropsType) => {
    const { user } = useUser()
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [emails,setEmails] = useState<string[]>([])
    const [email,setEmail] = useState<string>('')
    const [meetingInfo, setMeetingInfo] = useState<MeetingInfoLite | null>(null);
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${params?.id}`

    const { subscription } = useContext(subscriptionContext)
    const router = useRouter()

    useEffect(() => {
        let cancelled = false;
        axios.get(`/api/v1/meeting-info?room_id=${params?.id}`)
            .then((res) => {
                if (cancelled || !res.data?.success) return;
                setMeetingInfo({
                    title: res.data.title,
                    scheduleTime: res.data.scheduleTime,
                    startTime: res.data.startTime,
                    endTime: res.data.endTime,
                });
            })
            .catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [params?.id]);
    const handleCopy = async () => {
        try {

            await navigator.clipboard.writeText(url);
            toast({
                title: "Copy Successfully"

            });
        } catch (err) {
            console.error('Failed to copy: ', err);
        }
    };

    const handleStart = async () => {
        try {
            let end_time;
            if (subscription == 'starter') {
                end_time = new Date(Date.now() + 1 * 60 * 60 * 1000).toUTCString()
            } else if (subscription == 'plus') {
                end_time = new Date(Date.now() + 2 * 60 * 60 * 1000).toUTCString()
            } else {
                end_time = new Date(Date.now() + planslist['free']?.min * 60 * 1000).toUTCString()
            }
            const res = await axios.put(`/api/v1/create-room?room_id=${params.id}`, {
                start_time: new Date().toUTCString(),
                end_time
            });

            console.log(res.data);
            router.push(`/meeting/${params.id}`)
        } catch (error) {

        }
    }

    const handleAddEmail = () => {
        if(!email) return
        setEmails(prev => [...prev,email]);
        setEmail('');
    }

    const handleRemoveEmail = (index:number) => {
  
        setEmails(prev => prev.filter((_,i) => index != i));

    }

    const handleSendInvitation = async () => {
        if(emails.length == 0) return;
        console.log('calll')
        try {
            const res = await axios.post('/api/v1/send-invitation',{emails,room_id: params?.id,user_id: user?.id});
       
            setIsOpen(false);
            toast({
                title: "Send Successfully"
            });
            setEmails([]);
        } catch (error) {
            console.log((error as Error).message)
        }
    }
    return (
        <section className='flex items-center justify-center p-5 flex-col'>
            <div className='w-full max-w-[30rem] min-h-[20rem] relative shadow-md rounded-md border border-gray-100 flex p-4 flex-col gap-5 bg-white'>
                <h2 className='text-black/90 text-3xl text-center'>Your Meeting Ready</h2>
                <p className='text-black/60 text-center'>Or share this meeting link with others that you want in the meeting</p>
                <div className='flex flex-wrap items-center justify-between gap-4'>

                    <button className='bg-foregroud-primary px-4 py-2 rounded-md text-white flex items-center gap-3 w-[9rem] hover:scale-105' onClick={() => setOpen(true)}>Share Now <IoMdShareAlt /></button>
                    <button className='bg-foregroud-primary px-4 py-2 rounded-md text-white flex items-center gap-3  hover:scale-105' onClick={() => setIsOpen(true)}>Invite <IoMdShareAlt /></button>
                </div>
                <div className='py-4 px-2 w-full rounded-md border border-gray-100 flex items-center bg-gray-200' aria-readonly>
                    <input value={url} className='text-gray-500 outline-none border-none bg-transparent w-full' />
                    <button className='text-gray-800 bg-none outline-none border-none' onClick={handleCopy}><MdOutlineContentCopy /></button>
                </div>
                <CalendarShare
                    roomId={params?.id}
                    title={meetingInfo?.title || 'Singalong Session'}
                    meetingUrl={url}
                    startISO={meetingInfo?.scheduleTime || meetingInfo?.startTime || new Date().toISOString()}
                    endISO={meetingInfo?.endTime || undefined}
                    description={meetingInfo?.title || undefined}
                    className="my-2"
                />
                <button className='bg-foregroud-primary px-4 py-2 rounded-md text-white flex items-center gap-3 w-[7rem] hover:scale-105 mx-auto' onClick={handleStart}>Start Now</button>
                <p className='text-black/60 text-center'>joined as <span className='text-foregroud-primary'>{user?.primaryEmailAddress?.emailAddress}</span></p>

            </div>

            <MeetingModal
                isOpen={open}
                onClose={() => setOpen(false)}
                title="Share Meet URL"
                className="text-center"
                buttonText="Start Now"
                handleClick={handleStart}
            >
                <div className='flex flex-wrap items-center gap-4 justify-center'>
                    <EmailShareButton
                        url={url}

                    >
                        <EmailIcon size={40} round={true} />
                    </EmailShareButton>
                    <FacebookShareButton
                        url={url}

                    >
                        <FacebookIcon size={40} round={true} />
                    </FacebookShareButton>

                    <WhatsappShareButton
                        url={url}

                    >
                        <WhatsappIcon size={40} round={true} />
                    </WhatsappShareButton>
                    <InstapaperShareButton
                        url={url}

                    >
                        <InstapaperIcon size={40} round={true} />
                    </InstapaperShareButton>
                    <TwitterShareButton
                        url={url}

                    >
                        <TwitterIcon size={40} round={true} />
                    </TwitterShareButton>
                    <TelegramShareButton
                        url={url}

                    >
                        <TelegramIcon size={40} round={true} />
                    </TelegramShareButton>
                    <LinkedinShareButton
                        url={url}

                    >
                        <LinkedinIcon size={40} round={true} />
                    </LinkedinShareButton>
                </div>
            </MeetingModal>


            <InvitePeaople isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <h1 className='text-3xl text-black text-center font-semibold'>Invite People</h1>
                <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                    {/* === Email column === */}
                    <div className='flex flex-col gap-4 bg-gray-50 rounded-xl p-5'>
                        <h2 className='text-lg font-semibold text-black'>By Email</h2>
                        <div className='flex items-center gap-3'>
                            <input type='text' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter Email' className='outline-none border border-gray-300 rounded-md py-3 px-3 flex-1 placeholder:font-normal' />
                            <button className='bg-foregroud-primary px-4 py-3 rounded-md text-white flex items-center gap-3 hover:scale-105' onClick={handleAddEmail}><MdPersonAdd size={22} /></button>
                        </div>
                        {emails.length > 0 && (
                            <div className='flex flex-wrap gap-2'>
                                {emails.map((em, index) => (
                                    <div key={`${em}-${index}`} className='bg-white border border-gray-200 rounded-md py-2 pl-3 pr-1 text-black flex items-center gap-1 text-sm'>
                                        {em}
                                        <button className='text-gray-500 hover:text-red-500 pl-1' onClick={() => handleRemoveEmail(index)}><MdClose size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button
                            className='bg-foregroud-primary px-4 py-3 rounded-md text-white flex items-center justify-center gap-2 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 mt-auto'
                            onClick={handleSendInvitation}
                            disabled={emails.length === 0}
                        >
                            Send Email Invites <IoMdShareAlt />
                        </button>
                    </div>

                    {/* === WhatsApp column === */}
                    <WhatsAppInvite url={url} />
                </div>
            </InvitePeaople>

        </section>
    )
}

export default page