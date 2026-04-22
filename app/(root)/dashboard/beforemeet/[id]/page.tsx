"use client"
import React, { useContext, useState } from 'react'
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
import { Input } from '@/components/ui/input';

interface TypeParams {
    id: string
}

interface PropsType {
    params: TypeParams
}

const page = ({ params }: PropsType) => {
    const { user } = useUser()
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [emails,setEmails] = useState<string[]>([])
    const [email,setEmail] = useState<string>('')
    const url = `${process.env.NEXT_PUBLIC_BASE_URL}/meeting/${params?.id}`

    const { subscription } = useContext(subscriptionContext)
    const router = useRouter()
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
            <div className='w-[30rem] min-h-[20rem] relative shadow-md rounded-md border border-gray-100 flex p-4 flex-col gap-5 bg-white'>
                <h2 className='text-black/90 text-3xl text-center'>Your Meeting Ready</h2>
                <p className='text-black/60 text-center'>Or share this meeting link with others that you want in the meeting</p>
                <div className='flex items-center justify-between'>

                    <button className='bg-foregroud-primary px-4 py-2 rounded-md text-white flex items-center gap-3 w-[9rem] hover:scale-105' onClick={() => setOpen(true)}>Share Now <IoMdShareAlt /></button>
                    <button className='bg-foregroud-primary px-4 py-2 rounded-md text-white flex items-center gap-3  hover:scale-105' onClick={() => setIsOpen(true)}>Invite <IoMdShareAlt /></button>
                </div>
                <div className='py-4 px-2 w-full rounded-md border border-gray-100 flex items-center bg-gray-200' aria-readonly>
                    <input value={url} className='text-gray-500 outline-none border-none bg-transparent w-full' />
                    <button className='text-gray-800 bg-none outline-none border-none' onClick={handleCopy}><MdOutlineContentCopy /></button>
                </div>
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
                <div className='flex items-center gap-4 justify-center'>
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
                <h1 className='text-3xl text-black text-center font-semibold'>Invite Participants</h1>
                <div className='flex items-center gap-4'>
                    <input type='text' value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter Email' className='outline-none border border-gray-300 rounded-md py-3 px-3 flex-1 placeholder:font-normal' />
                    <button className='bg-foregroud-primary px-4 py-2 rounded-md text-white flex items-center gap-3  hover:scale-105' onClick={handleAddEmail}><MdPersonAdd size={25} /></button>


                </div>
                <div className='flex flex-wrap items-center justify-center gap-4 mt-8'>
                    {
                        emails.map((email,index) => (
                            <div className='bg-gray-200 rounded-md py-3 pl-4 pr-2 text-black relative'>
                                {email}
                            <button className='text-black  pl-2'><MdClose size={20} onClick={() => handleRemoveEmail(index)}/></button>
                        </div>
                        ))
                    }
                   
                </div>
                <button className='bg-foregroud-primary mx-auto px-4 py-3 rounded-md text-white flex items-center gap-3  hover:scale-105' onClick={handleSendInvitation}>Invite Now<IoMdShareAlt /></button>
            </InvitePeaople>

        </section>
    )
}

export default page