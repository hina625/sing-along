"use client"
import Navbar2 from '@/components/Navbar2'
import React, { useContext, useEffect, useState } from 'react'
import { CiHome } from 'react-icons/ci'
import { FaHandPointUp, FaLock } from "react-icons/fa";
import { FaHandshake } from "react-icons/fa";
import { IoDiamondOutline } from "react-icons/io5";
import { FaVolumeDown } from "react-icons/fa";
import { FaUnlock } from "react-icons/fa";
import { FaPlus, FaHeadphones } from "react-icons/fa";
import { ConeIcon, icons } from 'lucide-react';
import MeetingModal from '@/components/MeetingModal';
import { Textarea } from '@/components/ui/textarea';
import { Rating } from 'react-simple-star-rating'
import { useRouter } from 'next/navigation';
import { MdOutlineContentCopy } from "react-icons/md";
import { IoMdCheckmark } from "react-icons/io";
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
import { useToast } from '@/components/ui/use-toast';
import { planslist } from '@/constants';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import axios from 'axios';
import { IRoomDetails } from '@/components/CallList';
import useIsMobile from '@/hooks/useInMobile';
import TwoButtonModel from '@/components/TwoButtonModel';

interface CustomStyle extends React.CSSProperties {
  '--i'?: number;
}

function getStyle(num: number) {
  const customStyle: CustomStyle = {
    '--i': num,
  };
  return customStyle
}

const categories = [
  {
    key: 'professional',
    title: 'Professional Workspace',
    description: 'Manage meetings, projects, clients, and team collaboration from a single workspace.',
    features: ['Team Meetings', 'Client Sessions', 'Shared Notes', 'File Sharing', 'Task Tracking', 'Calendar Sync'],
  },
  {
    key: 'community',
    title: 'Community Hub',
    description: 'Bring people together through live events, discussions, announcements, and member spaces.',
    features: ['Live Events', 'Group Spaces', 'Member Access', 'Announcements', 'Discussions', 'Event Scheduling'],
  },
  {
    key: 'organization',
    title: 'Organization Suite',
    description: 'Organize recurring sessions, member engagement, shared content, and audience management tools.',
    features: ['Recurring Sessions', 'Media Library', 'Member Contributions', 'Request Management', 'Scheduled Broadcasts', 'Engagement Tools'],
  },
];

const featureGroups = [
  {
    title: 'Meetings & Events',
    features: ['HD Video Calls', 'Screen Sharing', 'Live Chat', 'Session Recording'],
  },
  {
    title: 'Collaboration Tools',
    features: ['Shared Notes', 'Task Management', 'Team Spaces', 'File Sharing'],
  },
  {
    title: 'Community Engagement',
    features: ['Member Access', 'Announcements', 'Event Scheduling', 'Discussions'],
  },
  {
    title: 'Content & Media',
    features: ['Media Library', 'Live Broadcasts', 'Shared Resources', 'Content Management'],
  },
];

const products = [
  {
    brandPrefix: "HG",
    brandName: "singalong",
    brandTag: "Meetings",
    brandAccent: "#FFD600",
    heading1: "MEET. CONNECT.",
    heading2: "COLLABORATE.",
    headingAccent: "#FFD600",
    description: "A professional video meeting platform for conferences, webinars, and business collaboration.",
    points: ["HD Video Meetings", "Screen Sharing", "Webinars", "Secure Rooms"],
    buttonText: "START A MEETING",
    btnBg: "#FFD600",
    btnText: "#0A1A2F",
    bannerImage: "/images/banners/card1.png",
    solidBg: "#0A1A2F",
    link: "https://hgsingalong.org/"
  },
  {
    brandPrefix: "HG",
    brandName: "pipeline",
    brandTag: "Video Sharing",
    brandAccent: "#FF4D4D",
    heading1: "SHARE YOUR VIDEOS",
    heading2: "WITH THE WORLD.",
    headingAccent: "#FF4D4D",
    description: "Upload, watch, and discover videos on our community video sharing platform — your stage, your audience.",
    points: ["Upload Videos", "Subscribe & Like", "Comment & Share", "Grow Your Channel"],
    buttonText: "WATCH NOW",
    btnBg: "#FF1F1F",
    btnText: "#FFFFFF",
    bannerImage: "/images/banners/card2.png",
    solidBg: "#1A0606",
    link: "https://hgpipeline.com/"
  },
  {
    brandPrefix: "HG",
    brandName: "vibelive",
    brandTag: "Live Streaming",
    brandAccent: "#7CFF8E",
    heading1: "STREAM LIVE.",
    heading2: "REACH EVERYONE.",
    headingAccent: "#7CFF8E",
    description: "Broadcast in HD to a global audience. Engage viewers in real time with live chat and interactive streams.",
    points: ["HD Live Streaming", "Real-Time Chat", "Multi-Camera", "Global Reach"],
    buttonText: "START STREAMING",
    btnBg: "#28A745",
    btnText: "#FFFFFF",
    bannerImage: "/images/banners/card3.png",
    solidBg: "#0B3D1E",
    link: "https://hgvibelive.org/"
  },
  {
    brandPrefix: "HG",
    brandName: "cradio",
    brandTag: "Audio Streaming",
    brandAccent: "#FFC97A",
    heading1: "TUNE IN. LISTEN LIVE.",
    heading2: "ANYWHERE.",
    headingAccent: "#FFC97A",
    description: "24/7 audio streaming platform — live radio, music, podcasts, and talk shows in crystal-clear sound.",
    points: ["Live Radio", "Music Library", "Podcasts", "Talk Shows"],
    buttonText: "LISTEN NOW",
    btnBg: "#FF6A00",
    btnText: "#FFFFFF",
    bannerImage: "/images/banners/card4.png",
    solidBg: "#4A1D00",
    link: "https://hgcradio.com/"
  },
]
const page = () => {

  const [ratingValue, setRatingValue] = useState(0);
  const [open, setOpen] = useState(false)
  const [publicRooms, setPublicRooms] = useState<IRoomDetails[]>([])
  const [openshare, setOpenShare] = useState(false)
  const [freePlanModel, setFreePlanModel] = useState(false);
  const [activeCategory, setActiveCategory] = useState(categories[0].key);
  const router = useRouter()
  const { toast } = useToast()
  const { subscription } = useContext(subscriptionContext)
  const { user } = useUser()
  const isMobile = useIsMobile();



  async function getPublicRooms() {
    try {
      const res = await axios.get(`/api/v1/get-rooms?public=true`);

      setPublicRooms(res.data?.rooms);
    } catch (error) {
      console.log(error)

    }
  }

  useEffect(() => {
    getPublicRooms();
  }, [])


  const handleRating = (rate: number) => {
    setRatingValue(rate)
  }

  const handleCopy = async () => {
    try {

      await navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_BASE_URL}`);
      toast({
        title: "Copy Successfully"

      });
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  useEffect(() => {
    const elements = document.querySelectorAll('.secvice-box');
    const contentBoxs = document.querySelectorAll('.contentBox');

    function clearActive() {
      contentBoxs.forEach(ele => ele.classList.remove('active'))
    }

    elements.forEach((ele) => {
      ele.addEventListener('mouseenter', function (e) {
        clearActive();
        const id = ele.getAttribute('data-target');
        if (id) {

          document.getElementById(id?.toString())?.classList.add('active')
        }
      });

      ele.addEventListener('mouseleave', function (e) {
        clearActive();

        document.getElementById("content0")?.classList.add('active')

      });
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window?.location.search);
    const showFeedback = params.get('show_feedback');
    if (showFeedback) {
      setOpen(true);
    } else {
      setOpen(false)
    }
  }, [])


  const handlePurchanse = async (e: any, key: string) => {
    e.stopPropagation()
    if (user) {
      // router.push(`/api/v1/subscription/buy?user_id=${user?.id}&plan=${key}`)
      router.push(`/checkout?plan=${key}`)
    } else {
      toast({
        title: "Please Login First"
      })
      router.push('/sign-in')
    }
  }


  const handleShare = () => {
    setOpen(false);
    setOpenShare(true)
  }
  // style={{
  //   backgroundImage: `linear-gradient(to top right, rgba(0,0,0,.3), rgba(0,0,0,.3)), url('/images/bg-1.png')`,
  // }}
  return (
    <div className='zeeshan overflow-x-hidden w-full'>
      {/* Navbar */}
      <Navbar2 />
      {/* Main content */}
      <section className="bg-cover bg-no-repeat !pt-24 md:!pt-[8rem] pb-6 md:pb-12 !bg-bg-dark relative overflow-hidden" >
        <div className="light-ray-container opacity-20"></div>
        <div className="container relative z-10">
          <div className="row row-grid align-items-center">
            <div className="col-12 col-md-5 col-lg-6 order-md-2 text-center flex items-center justify-center">

              <figure className="w-[80%]">
                {/* <img alt="Image placeholder" src="/images/meeting.png"
                  className="img-fluid mw-md-120" /> */}
                <img alt="Image placeholder" src="/images/hero-image.jpg"
                  className="img-fluid mw-md-120" />
              </figure>
            </div>
            <div className="col-12 col-md-7 col-lg-6 order-md-1 pr-md-5">

              <h1
                className="text-3xl md:text-5xl lg:text-6xl text-center text-md-left mb-4 leading-tight"
                style={{ color: '#ffffff', fontWeight: 700 }}
              >
                One Platform for Meetings, Communities &amp; Collaboration
              </h1>
              <p
                className="lead text-center text-md-left"
                style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}
              >
                Host live sessions, manage teams, engage members, and organize everything in one workspace.
              </p>
              <div className="text-center text-md-left mt-5">
                <a href="/sign-up" className="btn btn-primary !border-none !bg-royal-purple hover:!bg-burgundy transition-all btn-icon shadow-lg shadow-royal-purple/20">
                  <span className="btn-inner--text">Start Free</span>
                  <span className="btn-inner--icon"><svg xmlns="http://www.w3.org/2000/svg" width="1em"
                    height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="feather feather-chevron-right">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg></span>
                </a>

              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="!bg-bg-dark relative overflow-hidden py-8 md:py-16">
        <div className="container relative z-10">
          <div className="flex flex-col items-center text-center mb-6">
            <span className="inline-block px-4 py-1.5 mb-3 text-xs font-semibold text-[#D4AF37] uppercase tracking-[0.2em] border border-[#D4AF37]/30 rounded-full bg-[#D4AF37]/5">
              One workspace, every use case
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-gradient leading-tight m-0">
              Choose how you'll use Singalong
            </h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 md:gap-3 mb-6">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className="px-4 md:px-6 py-2.5 rounded-full text-sm md:text-base font-semibold transition-all"
                  style={{
                    background: isActive
                      ? 'linear-gradient(90deg, #5A2D82, #D4AF37)'
                      : 'rgba(255,255,255,0.06)',
                    color: '#ffffff',
                    border: isActive ? 'none' : '1px solid rgba(255,255,255,0.12)',
                    boxShadow: isActive ? '0 6px 18px rgba(90,45,130,0.35)' : 'none',
                  }}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>

          {categories
            .filter((cat) => cat.key === activeCategory)
            .map((cat) => (
              <div
                key={cat.key}
                className="max-w-4xl mx-auto rounded-2xl p-6 md:p-8 text-center"
                style={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                  boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)',
                }}
              >
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">{cat.title}</h3>
                <p className="text-base md:text-lg max-w-2xl mx-auto mb-6" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {cat.description}
                </p>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  {cat.features.map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium"
                      style={{
                        backgroundColor: 'rgba(212, 175, 55, 0.1)',
                        color: '#D4AF37',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
                      }}
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </section>

      <section className="py-8 md:py-16 !bg-bg-dark relative overflow-hidden">
        <div className='absolute top-1 left-1 z-0'>
        </div>
        <div className='absolute bottom-0 right-0 z-0'>
          <img src='/images/bottom-line.png' />
        </div>
        <div className="container z-10">
          {/* Title */}
          {/* Section title */}
          <div className="row mb-3 justify-content-center text-center">
            <div className="col-lg-10">
              {/*
        <span className="badge badge-soft-success badge-pill badge-lg">
          Get started
        </span>
          */}
              <h2 className="main-header !text-white text-2xl md:text-4xl leading-snug" style={{ color: 'white' }}>
                Ready to use + carefully crafted performance for quality meetings
              </h2>
              <div className="mt-2">
                <p className="lead lh-180 main-para" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  We offer competitive pricing, great features, and better value.
                  See our difference!
                </p>
              </div>
            </div>
          </div>
          {/* Card */}
          <div className="row mt-3">

            <div className="col-md-4 flex justify-center">
              <div className=' card card-awesome-black soft-glow'>

                <div className="card-body !pb-3">
                  <div className="pt-4 pb-5">
                    {/* <img
                      src="/images/illustration-5.svg"
                      className="img-fluid img-center"
                      style={{ height: 150 }}
                      alt="Illustration"
                    /> */}
                    <img
                      src="/card-images/1.webp"
                      className="img-fluid img-center !w-[100%] rounded-md"
                      style={{ height: 180 }}
                      alt="Illustration"
                    />
                  </div>
                  <h5 className="h4 lh-130 mb-3" style={{ color: '#ffffff', fontWeight: 700 }}>Easy to set up &amp; use</h5>
                  <p className=" mb-0  main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    No need to download or install any software. Just start a
                    meeting and share the link with your guests or participants to
                    join using any web browser, or our easy-to-use app.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 flex justify-center">
              <div className=' card  card-awesome-black'>


                <div className="card-body !pb-3">
                  <div className="pt-4 pb-5">
                    {/* <img
                      src="/images/illustration-6.svg"
                      className="img-fluid img-center"
                      style={{ height: 150 }}
                      alt="Illustration"
                    /> */}
                    <img
                      src="/card-images/2.webp"
                      className="img-fluid img-center !w-[100%] rounded-md"
                      style={{ height: 180 }}
                      alt="Illustration"
                    />
                  </div>
                  <h5 className="h4 lh-130 mb-3" style={{ color: '#ffffff', fontWeight: 700 }}>Fully controlled by you</h5>
                  <p className=" mb-0 main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    We have completely managed servers so you have full control of
                    your own meetings. You can set up{" "}
                    <b
                      className='text-foregroud-primary'
                      title="a system of communication where the only people who can read the messages sent back and forth to each other are the two people engaging in the conversation"
                    >
                      peer-to-peer encryption
                    </b>
                    , too.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4 flex justify-center">
              <div className=' card card-awesome-black '>


                <div className="card-body !pb-3">
                  <div className="pt-4 pb-5">
                    <img
                      src="/card-images/3.webp"
                      className="img-fluid img-center !w-[100%] rounded-md"
                      style={{ height: 180 }}
                      alt="Illustration"
                    />
                  </div>
                  <h5 className="h4 lh-130 mb-3" style={{ color: '#ffffff', fontWeight: 700 }}>
                    Unlimited Meetings &amp; Recordings
                  </h5>
                  <p className=" mb-0 main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    Go with unlimited meetings and recordings as per your activated
                    plan with no hidden charges. We offer{" "}
                    <b
                      className='text-foregroud-primary'
                      title="You will have your own(personal) meeting platform with your branding, that you will control."
                    >
                      private servers
                    </b>{" "}
                    as well.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      <section className='py-8 md:py-16 px-5 !flex !flex-col !items-center !justify-center relative overflow-hidden'
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11, 31, 58, 0.95), rgba(90, 45, 130, 0.9)), url('/images/bg-2.jpg')`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <div className="light-ray-container opacity-10"></div>
        <div className="pattern-bg absolute inset-0 opacity-10"></div>

        <div className="flex items-center justify-center flex-col mb-8 md:mb-12">

          <h2 className="mt-4 main-header !text-white text-2xl md:text-4xl">
            Why SingAlong Connect
          </h2>
          <div className="mt-2">
            <p className="leading-7 max-w-[35rem] text-center font-[300] text-[1.125rem] main-para !text-white/80">

              Discover the difference with our professional communication tools, collaboration features, and AI-powered platform built to help any organization grow.
            </p>
          </div>

        </div>
        <div className='container-infographic relative w-[17rem] h-[17rem] md:w-[30rem] md:h-[30rem] border-[.4rem] border-deep-gold rounded-full shadow-2xl shadow-deep-gold/10'>
          <div className='services -left-[50%] relative w-full h-full flex justify-center items-center cursor-pointer '>
            <div className='secvice-box flex' style={getStyle(1)} data-target="content1">
              <div className='flex items-start'>
                <h2 className='absolute -left-[180%] md:-left-[210%] top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Crystal Clear Audio</h2>
                <div className=' md:w-20 md:h-20 h-14 w-14 flex items-center justify-center rounded-full bg-royal-purple shadow-lg shadow-royal-purple/30 group-hover:bg-burgundy transition-all' >

                  <span className='text-white text-3xl'><FaVolumeDown /></span>

                </div>
              </div>
            </div>
            <div className='secvice-box flex' style={getStyle(2)} data-target="content2">
              <div className='flex items-start relative'>

                <div className=' md:w-20 md:h-20 h-14 w-14 flex items-center justify-center rounded-full bg-royal-purple shadow-lg shadow-royal-purple/30 group-hover:bg-burgundy transition-all' >

                  <span className='text-white text-3xl'><FaHandPointUp /></span>

                </div>
                <h2 className='absolute !-right-[300%] md:!-right-[210%] top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Easy To Use</h2>
              </div>
            </div>
            <div className='secvice-box flex' style={getStyle(3)} data-target="content3">
              <div className='flex items-start relative'>


                <div className=' md:w-20 md:h-20 h-14 w-14 flex items-center justify-center rounded-full bg-royal-purple shadow-lg shadow-royal-purple/30 group-hover:bg-burgundy transition-all' >

                  <span className='text-white text-3xl'><FaHandshake /></span>

                </div>
                <h2 className='absolute !-right-[260%] md:!-right-[210%] -top-[5%] md:top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Collaborative</h2>
              </div>
            </div>
            <div className='secvice-box flex' style={getStyle(4)} data-target="content4">
              <div className='flex items-start relative'>


                <div className=' md:w-20 md:h-20 h-14 w-14 flex items-center justify-center rounded-full bg-royal-purple shadow-lg shadow-royal-purple/30 group-hover:bg-burgundy transition-all' >

                  <span className='text-white text-3xl'><IoDiamondOutline /></span>

                </div>
                <h2 className='absolute !-right-[300%] md:!-right-[210%] top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Features Rich</h2>
              </div>
            </div>
            <div className='secvice-box flex' style={getStyle(5)} data-target="content5">
              <div className='flex items-start relative'>

                <h2 className='absolute -left-[110%] md:-left-[210%] top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Extendable</h2>

                <div className=' md:w-20 md:h-20 h-14 w-14 flex items-center justify-center rounded-full bg-royal-purple shadow-lg shadow-royal-purple/30 group-hover:bg-burgundy transition-all' >

                  <span className='text-white text-3xl'><FaPlus /></span>

                </div>
              </div>
            </div>
            <div className='secvice-box flex' style={getStyle(6)} data-target="content6">
              <div className='flex items-start relative'>

                <h2 className='absolute -left-[80%] md:-left-[130%] top-[25%] w-[10rem] md:!text-xl !font-[700] !text-[10px] !text-white hidden md:block'>Secure</h2>
                <div className=' md:w-20 md:h-20 h-14 w-14 flex items-center justify-center rounded-full bg-royal-purple shadow-lg shadow-royal-purple/30 group-hover:bg-burgundy transition-all' >

                  <span className='text-white text-3xl'><FaLock /></span>

                </div>
              </div>
            </div>




          </div>
          {
            isMobile ?
              (
                <div className='content absolute inset-0 overflow-hidden items-center justify-center flex'>
                  <div className='contentBox active' id='content0'>
                    <h1 className='!text-white text-lg md:!text-4xl !font-[700] text-gradient'>Why SingAlong Connect?</h1>
                  </div>
                  <div className='contentBox' id='content1'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Experience professional-grade audio clarity that captures every word with precision—ideal for meetings, presentations, webinars, interviews, and live business events.
                    </p>
                  </div>
                  <div className='contentBox' id='content2'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Our intuitive interface ensures that you can navigate and operate seamlessly, without the need for extensive instructions or technical know-how.
                    </p>
                  </div>
                  <div className='contentBox' id='content3'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Designed with teamwork in mind, our platform fosters collaboration, enabling you to work with others effortlessly and in real-time.
                    </p>
                  </div>
                  <div className='contentBox' id='content4'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Packed with cutting-edge features, our service provides all the tools you need to enhance your experience and productivity.
                    </p>
                  </div>
                  <div className='contentBox' id='content5'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Build and scale with ease. Our system is designed to grow with your needs, allowing for additional features and integrations as your requirements evolve.
                    </p>
                  </div>
                  <div className='contentBox' id='content6'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Your data and privacy are our top priorities. Enjoy peace of mind with our robust security features, ensuring that all your information stays safe and protected.
                    </p>
                  </div>
                </div>
              ) :
              (
                <div className='content absolute inset-0 overflow-hidden items-center justify-center flex'>
                  <div className='contentBox active' id='content0'>
                    <h1 className='!text-white text-lg md:!text-4xl !font-[700] text-gradient'>Why SingAlong Connect?</h1>
                  </div>
                  <div className='contentBox' id='content1'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      Experience professional-grade audio clarity that captures every word with precision—ideal for meetings, presentations, webinars, interviews, and live business events.
                    </p>
                  </div>
                  <div className='contentBox' id='content2'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      Our intuitive interface ensures that you can navigate and operate seamlessly, without the need for extensive instructions or technical know-how.
                    </p>
                  </div>
                  <div className='contentBox' id='content3'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      Designed with teamwork in mind, our platform fosters collaboration, enabling you to work with others effortlessly and in real-time.
                    </p>
                  </div>
                  <div className='contentBox' id='content4'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      Packed with cutting-edge features, our service provides all the tools you need to enhance your experience and productivity.
                    </p>
                  </div>
                  <div className='contentBox' id='content5'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      Build and scale with ease. Our system is designed to grow with your needs, allowing for additional features and integrations as your requirements evolve.
                    </p>
                  </div>
                  <div className='contentBox' id='content6'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      Your data and privacy are our top priorities. Enjoy peace of mind with our robust security features, ensuring that all your information stays safe and protected.
                    </p>
                  </div>
                </div>
              )
          }

        </div>


      </section>


      <section className="py-8 md:py-16 !bg-bg-dark relative overflow-hidden">
        <div className="container relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <span className="inline-block px-4 py-1.5 mb-3 text-xs font-semibold text-[#D4AF37] uppercase tracking-[0.2em] border border-[#D4AF37]/30 rounded-full bg-[#D4AF37]/5">
              Everything you need
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-gradient leading-tight m-0">
              Features built for every workspace
            </h2>
            <p className="mt-3 max-w-2xl text-base md:text-lg mb-0" style={{ color: 'rgba(255,255,255,0.8)' }}>
              From hosting live sessions to managing communities — Singalong brings it all together.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
            {featureGroups.map((group) => (
              <div
                key={group.title}
                className="rounded-xl p-5 md:p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  backgroundColor: '#1A1A1A',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <h3 className="text-lg md:text-xl font-bold text-white mb-4 pb-3 border-b border-white/10">
                  {group.title}
                </h3>
                <ul className="list-none p-0 m-0 space-y-2.5">
                  {group.features.map((feat) => (
                    <li
                      key={feat}
                      className="flex items-start gap-2 text-sm md:text-base"
                      style={{ color: 'rgba(255,255,255,0.85)' }}
                    >
                      <IoMdCheckmark className="text-[#D4AF37] mt-1 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>


      <section className="py-8 md:py-16 !bg-bg-dark relative overflow-hidden">
        <div className="pattern-bg absolute inset-0 opacity-5"></div>
        <div className='absolute top-1 left-1 z-0'>
        </div>
        {/* SVG separator */}
        <div className="shape-container shape-line shape-position-top shape-orientation-inverse">
          <svg
            width="2560px"
            height="100px"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            preserveAspectRatio="none"
            x="0px"
            y="0px"
            viewBox="0 0 2560 100"
            // style={{ enableBackground: "new 0 0 2560 100" }}
            xmlSpace="preserve"
            className=""
          >
            <polygon points="2560 0 2560 100 0 100" fill='#0A0A0A' />
          </svg>
        </div>
        {/* Container */}

        <div className='max-w-6xl mx-auto flex items-center flex-col md:flex-row gap-8 px-6 md:px-8'>
          <div className="w-full md:w-1/2 flex flex-col items-center md:items-start gap-4">
            <h2
              className="text-2xl md:text-4xl lg:text-5xl text-gradient leading-tight text-center md:text-left"
              style={{ color: '#ffffff', fontWeight: 700, margin: 0 }}
            >
              Are you ready to grow faster?
            </h2>
            <h4
              className="text-center md:text-left text-lg md:text-xl"
              style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 500, margin: 0 }}
            >
              Activate any plan and get started
            </h4>

            <a
              href="/plans"
              className="btn btn-primary !bg-royal-purple hover:!bg-burgundy !border-none btn-icon shadow-lg shadow-royal-purple/20 transition-all mt-2"
              style={{ color: '#ffffff', fontWeight: 600 }}
            >
              Start now
            </a>
          </div>

          <div className='w-full md:w-1/2 flex items-center justify-center md:justify-end'>
            <img src='/images/stamps.jpg' className='w-full max-w-[20rem] hover:scale-105 transition-all cursor-pointer' />
          </div>
        </div>

      </section>



      <section className="py-8 md:py-16 !bg-bg-dark relative overflow-hidden">

        <div className='absolute bottom-1 left-1 z-0'>
          <img src='/images/bottom-box-shape.png' />
        </div>
        <div className='absolute right-1 top-1 z-0'>
        </div>

        <div className="container position-relative zindex-100 px-4 sm:px-6">
          <div className="flex items-center justify-center flex-col mb-6 md:mb-10 text-center">
            <span className="inline-block px-3 sm:px-4 py-1.5 mb-3 text-[10px] sm:text-xs font-semibold text-[#D4AF37] uppercase tracking-[0.2em] border border-[#D4AF37]/30 rounded-full bg-[#D4AF37]/5">
              Pricing Plans
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient !leading-tight">
              Pricing for every team
            </h2>
            <p
              className="mt-3 mb-0 leading-7 max-w-[40rem] text-center font-[300] text-base sm:text-[1.125rem] px-2"
              style={{ color: '#ffffff' }}
            >
              Start free. Upgrade as your audience grows.
              All plans include live meetings, recordings, and real-time collaboration.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto items-stretch">
            {Object.keys(planslist)
              .filter((key) => !planslist[key].hidden)
              .map((key) => {
                const plan = planslist[key];
                const isCurrent = subscription === key;
                const isFreePlan = key === 'free';
                const isEnterprise = key === 'enterprise';
                const showFreePlanBadge = isFreePlan && subscription !== 'free';

                return (
                  <div
                    key={key}
                    className="relative flex flex-col rounded-xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1"
                    style={{
                      backgroundColor: '#1A1A1A',
                      border: plan.popular ? '1px solid rgba(212, 175, 55, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: plan.popular ? '0 10px 25px -5px rgba(212, 175, 55, 0.15)' : 'none',
                    }}
                  >
                    {plan.popular && (
                      <span
                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full"
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          background: 'linear-gradient(90deg, #5A2D82, #D4AF37)',
                          color: '#ffffff',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        Most Popular
                      </span>
                    )}

                    <div className="pb-3 sm:pb-4 border-b border-white/10">
                      <h3
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.6)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          margin: 0,
                        }}
                      >
                        {plan.title}
                      </h3>
                      <div className="mt-2 flex items-baseline gap-1 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-bold text-white leading-none">
                          ${plan.price}
                        </span>
                        <span className="text-sm text-white/55">/mo</span>
                        {isEnterprise && <span className="text-xs text-white/55 ml-1">and up</span>}
                      </div>
                      {plan.yearlyPrice ? (
                        <p className="mt-1 mb-0 text-xs text-white/55">or ${plan.yearlyPrice}/yr</p>
                      ) : null}
                      {plan.bestFor ? (
                        <p className="mt-2 mb-0 text-xs text-white/65 italic">{plan.bestFor}</p>
                      ) : null}
                    </div>

                    <ul className="mt-3 sm:mt-4 mb-0 p-0 list-none flex-1">
                      {plan.features.map((text, i) => (
                        <li
                          key={i}
                          className="flex gap-2 items-start text-sm text-white/85 py-1.5 leading-snug"
                        >
                          <IoMdCheckmark className="text-[#D4AF37] mt-1 shrink-0" />
                          <span className="break-words">{text}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 sm:mt-5">
                      {showFreePlanBadge ? (
                        <button
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'default',
                          }}
                        >
                          Free Plan
                        </button>
                      ) : isCurrent ? (
                        <button
                          onClick={isFreePlan ? () => setFreePlanModel(true) : undefined}
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            border: 'none',
                            cursor: isFreePlan ? 'pointer' : 'default',
                          }}
                        >
                          {isFreePlan ? 'Continue With Free' : 'Current Plan'}
                        </button>
                      ) : (
                        <button
                          onClick={(e) => isEnterprise ? router.push('/contact-us?subject=enterprise') : handlePurchanse(e, key)}
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            borderRadius: '0.5rem',
                            background: plan.popular
                              ? 'linear-gradient(90deg, #5A2D82, #D4AF37)'
                              : '#1ebbc4',
                            color: '#ffffff',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {plan.ctaText || 'Get Started'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
          <div className="mt-5 text-center">
            <p className="mb-2" style={{ color: 'rgba(255,255,255,0.95)' }}>
              All plans include active-subscription free support. Need more?
            </p>
            <a
              href="/contact-us"
              className="!text-deep-gold hover:!text-praise-orange transition-colors text-underline--dashed"
            >
              Contact us
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-arrow-right ml-2"
              >
                <line x1={5} y1={12} x2={19} y2={12} />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </div>
      </section>



      <section className='py-8 md:py-16 !bg-bg-dark relative overflow-hidden'>
        <div className="pattern-bg absolute inset-0 opacity-5"></div>
        <div className='absolute top-1 left-1 z-0'>
        </div>
        <div className='absolute bottom-0 right-0 z-0'>
          <img src='/images/bottom-line.png' />
        </div>
        <div className="flex items-center justify-center flex-col mb-8 md:mb-12">

          <h2 className="mt-4 main-header !text-white text-2xl md:text-4xl">
            How it works
          </h2>
          <div className="mt-2">
            <p className="leading-7 max-w-[35rem] text-center font-[300] text-[1.125rem] main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Experience engaging video and audio communication tools that are easy to use and navigate. There's never a dull moment!
            </p>
          </div>

        </div>
        <div className='container'>
          <div className='w-full relative flex flex-wrap flex-col md:flex-row items-center gap-0 my-2'>
            <div className=' w-full md:w-[50%] p-4 md:hidden block'>
              <div className="h1 text-center text-2xl md:text-4xl" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                Create an account to host a meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para text-center" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Sign up with your Name, Email Address, and Password. Then, check your email to verify your account. Once your account is verified, you will have full access to the SingAlong Connect workspace.
              </p>
              <div className="text-center text-md-left mt-3">
                <a href="/sign-in" className="btn btn-primary !border-none !bg-royal-purple hover:!bg-burgundy btn-icon !font-[500] shadow-lg shadow-royal-purple/20 transition-all">
                  <span className="btn-inner--text">Create Account</span>
                  <span className="btn-inner--icon"><svg xmlns="http://www.w3.org/2000/svg" width="1em"
                    height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="feather feather-chevron-right">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg></span>
                </a>

              </div>
            </div>


            <div className=' w-full md:w-[50%] p-4 md:block hidden'>
              <div className="h1 text-2xl md:text-4xl" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                Create an account to host a meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Sign up with your Name, Email Address, and Password. Then, check your email to verify your account. Once your account is verified, you will have full access to the SingAlong Connect workspace.
              </p>
              <div className="text-center text-md-left mt-3">
                <a href="/sign-in" className="btn btn-primary !border-none !bg-foregroud-primary btn-icon !font-[500]">
                  <span className="btn-inner--text">Create Account</span>
                  <span className="btn-inner--icon"><svg xmlns="http://www.w3.org/2000/svg" width="1em"
                    height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="feather feather-chevron-right">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg></span>
                </a>

              </div>
            </div>



            <div className='w-full md:w-[50%] p-4 !flex !items-center' style={{ display: 'flex', justifyContent: 'center' }}>
              <figure className=" w-[70%] md:w-[60%] flex items-center">
                <img alt="Image placeholder" src="/s1.webp"
                  className="img-fluid mw-md-120 rounded-md" />
              </figure>
            </div>
          </div>

          <div className='w-full relative flex flex-wrap flex-col-reverse md:flex-row items-center gap-0 my-2'>

            <div className='w-full md:w-[50%] p-4 !flex !items-center md:!hidden' style={{ display: 'flex', justifyContent: 'center' }}>
              <figure className=" w-[70%] md:w-[60%] flex items-center">
                <img alt="Image placeholder" src="/s2.webp"
                  className="img-fluid mw-md-120 rounded-md" />
              </figure>
            </div>


            <div className='w-full md:w-[50%] p-4 md:!flex !items-center !hidden' style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <figure className=" w-[70%] md:w-[60%] flex items-center">
                <img alt="Image placeholder" src="/s2.webp"
                  className="img-fluid mw-md-120 rounded-md" />
              </figure>
            </div>

            <div className=' w-full md:w-[50%] p-4 md:hidden block'>
              <div className="h1 text-center text-2xl md:text-4xl" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                Set up your meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para text-center" style={{ color: 'rgba(255,255,255,0.85)' }}>
                To set-up and schedule a meeting, click on Host a meeting which will give you full control of the meeting you have created. Once your meeting is created, share the link with your participants or add it to your calendar.
              </p>

            </div>

            <div className=' w-full md:w-[50%] p-4 hidden md:block'>
              <div className="h1 text-2xl md:text-4xl" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                Set up your meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
                To set-up and schedule a meeting, click on Host a meeting which will give you full control of the meeting you have created. Once your meeting is created, share the link with your participants or add it to your calendar.
              </p>

            </div>
          </div>

          <div className='w-full relative flex flex-wrap flex-col md:flex-row items-center gap-0 mt-2'>
            <div className=' w-full md:w-[50%] p-4 block md:hidden'>
              <div className="h1 text-center text-2xl md:text-4xl" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                Enter your meeting room
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para text-center" style={{ color: 'rgba(255,255,255,0.85)' }}>
                It is not compulsory to have an account to join a meeting on SingAlong Connect. Join any meeting using the meeting link or ID, simply insert your name, set up your microphone and video, and you're good to go.


              </p>

            </div>


            <div className=' w-full md:w-[50%] p-4 hidden md:block'>
              <div className="h1 text-2xl md:text-4xl" style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>
                Enter your meeting room
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para" style={{ color: 'rgba(255,255,255,0.85)' }}>
                It is not compulsory to have an account to join a meeting on SingAlong Connect. Join any meeting using the meeting link or ID, simply insert your name, set up your microphone and video, and you're good to go.


              </p>

            </div>
            <div className='w-full md:w-[50%] p-4 !flex !items-center' style={{ display: 'flex', justifyContent: 'center' }}>
              <figure className=" w-[70%] md:w-[60%] flex items-center">
                <img alt="Image placeholder" src="/s3.webp"
                  className="img-fluid mw-md-120 rounded-md" />
              </figure>
            </div>
          </div>
        </div>
      </section>


      <div className="bg-gray-700 py-8 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-center mb-4 !text-white leading-tight">
            Discover Our Products
          </h2>
          <div className="flex flex-col gap-8 max-w-6xl mx-auto">
            {products.map((item, index) => (
              <a key={index} href={item.link} className='block hover:scale-[1.005] transition-transform duration-300'>
                <div
                  className="rounded-xl shadow-xl overflow-hidden flex flex-col md:flex-row items-stretch md:h-[180px]"
                  style={{ background: item.solidBg }}
                >
                  {/* Left: Brand */}
                  <div className='flex md:flex-col items-center justify-center gap-2 md:gap-0 px-3 md:pl-5 md:pr-2 py-3 md:py-0 md:w-[170px] shrink-0'>
                    <img
                      src='/images/banners/img.png'
                      alt='HGsingalong'
                      className='h-16 w-16 md:h-24 md:w-24 object-contain shrink-0 md:-mb-1'
                    />
                    <div className='flex flex-col items-center leading-none min-w-0'>
                      <span className='text-lg md:text-2xl tracking-wide leading-none' style={{ color: '#ffffff', fontWeight: 700 }}>
                        {item.brandPrefix}<span style={{ fontWeight: 300 }}>{item.brandName}</span>
                      </span>
                      <span
                        className='text-[10px] md:text-xs tracking-[0.2em] md:tracking-[0.25em] uppercase mt-1 leading-none whitespace-nowrap'
                        style={{ color: item.brandAccent, fontWeight: 700 }}
                      >
                        {item.brandTag}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Heading + Description */}
                  <div className='flex-1 flex flex-col justify-center gap-2 px-4 py-4 min-w-0'>
                    <div>
                      <h3
                        className="text-xl md:text-2xl leading-tight"
                        style={{ color: '#ffffff', fontWeight: 800, margin: 0 }}
                      >
                        {item.heading1}
                      </h3>
                      <h3
                        className="text-xl md:text-2xl leading-tight"
                        style={{ color: item.headingAccent, fontWeight: 800, margin: 0 }}
                      >
                        {item.heading2}
                      </h3>
                    </div>

                    <p
                      className='text-xs md:text-sm leading-snug max-w-md'
                      style={{ color: 'rgba(255,255,255,0.85)', margin: 0 }}
                    >
                      {item.description}
                    </p>
                  </div>

                  {/* Image with button overlay */}
                  <div className='relative md:w-[340px] lg:w-[380px] h-[180px] md:h-auto shrink-0 overflow-hidden'>
                    <img
                      src={item.bannerImage}
                      alt={item.heading1}
                      className='absolute inset-0 w-full h-full object-cover'
                    />
                    <div className='absolute bottom-3 left-1/2 -translate-x-1/2'>
                      <span
                        className='inline-flex items-center gap-1.5 px-4 py-2 text-[11px] md:text-xs rounded-full shadow-lg tracking-wide whitespace-nowrap'
                        style={{ background: item.btnBg, color: item.btnText, fontWeight: 700 }}
                      >
                        {item.buttonText}
                        <span className='inline-block'>›</span>
                      </span>
                    </div>
                  </div>

                  {/* Points list (far right) */}
                  <div className='hidden md:flex flex-col justify-center gap-1.5 px-4 py-4 md:min-w-[170px] shrink-0'>
                    <ul className='flex flex-col gap-1.5' style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                      {item.points.map((pt, i) => (
                        <li
                          key={i}
                          className='flex items-center gap-2 text-xs lg:text-sm whitespace-nowrap'
                          style={{ color: '#ffffff', fontWeight: 500 }}
                        >
                          <IoMdCheckmark style={{ color: item.brandAccent }} className='shrink-0' size={14} />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>


      <section className="py-8 md:py-12 !bg-background-3 relative overflow-hidden">
        <div className='absolute bottom-1 left-1 z-0'>
          <img src='/images/bottom-box-shape.png' />
        </div>
        <div className="container">
          <div className="row">
            <div className="col-lg-12" style={{ textAlign: "center" }}>
              <span
                className="badge badge-primary !bg-foregroud-primary badge-pill !font-medium text-lg md:text-2xl"
              >
                Latest Public Meetings
              </span>
              <p className="lh-180 mt-4 mb-5 main-para px-4 md:px-0" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
                We offer Public and Private meetings. Only Public meetings (live and
                scheduled) will be displayed on our website so other users can join
                those meetings.
              </p>
            </div>
          </div>
          {/* Features */}
          <div className="row mx-lg-n4">
            <div className="col-md-12 ">
              <div className="card shadow-none " style={{ border: "1px solid" }}>
                <div className="p-3 d-flex justify-content-center">
                  <p style={{ fontWeight: "bold", marginBottom: 0 }} className='text-center'>
                    {
                      publicRooms.length == 0 ?
                        "No Public meeting is scheduled for this week!" :
                        `${publicRooms.length} public room is available now`
                    }

                  </p>
                </div>
              </div>
            </div>

          </div>


          <div className="mt-2 text-center">
            <a
              href="/meetings"
              className="!text-foregroud-primary text-underline--dashed"
            >
              View all meetings
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="1em"
                height="1em"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="feather feather-arrow-right ml-2"
              >
                <line x1={5} y1={12} x2={19} y2={12} />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
          </div>
        </div>
      </section>


      {/* End Main Content */}
      <footer className="position-relative" id="footer-main">
        <div className="footer pt-lg-7 footer-dark !bg-background-4">
          {/* SVG shape */}
          <div className="shape-container shape-line shape-position-top shape-orientation-inverse">
            <svg
              width="2560px"
              height="100px"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              preserveAspectRatio="none"
              x="0px"
              y="0px"
              viewBox="0 0 2560 100"
              // style={{ enableBackground: "new 0 0 2560 100" }}
              xmlSpace="preserve"
              className=" fill-section-secondary"
            >
              <polygon points="2560 0 2560 100 0 100" fill='#1f2226' />
            </svg>
          </div>


          {/* Footer */}
          <div className="container pt-4">
            <div className="row">
              <div className="col-lg-4 mb-5 mb-lg-0">
                {/* Theme's logo */}
                <a href="">
                  <img
                    alt="Image placeholder"
                    src="/images/apple-icon-60x60.png"
                    id="footer-logo"
                  />
                </a>
                <p className="pr-lg-4 mb-2" style={{ color: '#ffffff', fontWeight: 600, fontSize: '18px', lineHeight: '27px' }}>
                  Built for teams, organizations, creators, and communities.
                </p>
                <p className="pr-lg-4" style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 400, fontSize: '18px', lineHeight: '27px' }}>
                  SingAlong Connect is a professional video conferencing and
                  collaboration platform powered by Hallelujah Gospel Globally —
                  high-quality, secure, and reliable communication tools for meetings,
                  conferences, networking, collaboration, and virtual events.{" "}
                </p>
              </div>


              <div className="col-lg-2 col-6 col-sm-4 ml-lg-auto mb-5 mb-lg-0">
                <h6 className="heading mb-3">Account</h6>
                <ul className="list-unstyled">
                  <li>
                    <a href="/dashboard/account">
                      Profile
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/meetings">
                      My Meetings
                    </a>
                  </li>
                  <li>
                    <a href="/dashboard/recordings">
                      Recordings
                    </a>
                  </li>
                </ul>
              </div>
              <div className="col-lg-2 col-6 col-sm-4 mb-5 mb-lg-0">
                <h6 className="heading mb-3">Information</h6>
                <ul className="list-unstyled">
                  <li>
                    <a href="/page/about">About</a>
                  </li>
                  <li>
                    <a href="/services">Services</a>
                  </li>
                  <li>
                    <a href="/pricing">Pricing</a>
                  </li>
                </ul>
              </div>
              <div className="col-lg-2 col-6 col-sm-4 mb-5 mb-lg-0">
                <h6 className="heading mb-3">Our Apps</h6>
                <div className="flex flex-wrap justify-around w-100">
                  <a href="/#" className="mb-1">
                    <img
                      src="/images/app-store-badge.png"
                      alt=""
                      width={135}
                      height={40}
                    />
                  </a>
                  <a href="#">
                    <img
                      src="/images/google-play-badge.png"
                      alt=""
                      width={135}
                      style={{ marginTop: 5 }}
                    />
                  </a>
                </div>

              </div>

            </div>
            <div className='flex items-center justify-center md:justify-end flex-wrap gap-4 md:gap-8'>

              <img src="https://hallelujahgospel.org/public/new/img/hallulia/bbb.png" width="85" className="p-0 m-0" />
              <img src="https://hallelujahgospel.org/public/new/img/hallulia/access.png" width="65" className="p-0 m-0 me-2" />
              <img src="https://hallelujahgospel.org/public/new/img/hallulia/lock.png" width="65" className="p-0 m-0 me-2" />
              <img src="https://hallelujahgospel.org/public/new/img/hallulia/apple.png" width="70" className="p-0 m-0 me-2" />
              <img src="https://hallelujahgospel.org/public/new/img/hallulia/g-play.png" width="70" className="p-0 m-0" />
              <img src='/images/stamps.jpg' className='p-0 m-0 w-[4rem] h-[4rem]' />



            </div>
            <hr className="divider divider-fade divider-dark my-4" />
            <div className="row align-items-center justify-content-md-between pb-4">
              <div className="col-md-6">
                <div className="copyright text-sm font-weight-bold text-center text-md-left">
                  © 2026{" "}
                  <a
                    href="https://hgsingalong.com/"
                    className="font-weight-bold"
                    target="_blank"
                  >
                    Sing Along
                  </a>
                  . All rights reserved.
                </div>
              </div>
              <div className="col-md-6">
                <ul className="nav justify-content-center justify-content-md-end mt-3 mt-md-0">
                  <li className="nav-item">
                    <a
                      className="nav-link !text-foregroud-secondary hover:!text-foregroud-primary"
                      href="/terms"
                    >
                      Terms &amp; Conditions
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className="nav-link !text-foregroud-secondary hover:!text-foregroud-primary"
                      href="/policy"
                    >
                      Privacy Policy
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className="nav-link !text-foregroud-secondary hover:!text-foregroud-primary"
                      href="/contact-us"
                    >
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
      {/* Core JS  */}
      {/* Quick JS */}
      {/* Feather Icons */}



      <TwoButtonModel
        isOpen={freePlanModel}
        onClose={() => setFreePlanModel(false)}
        title="Partner with us"
        className="text-center"
        buttonText="Partner with us"
        handleClick={() => { router.push('/donate'); setOpen(false) }}
        handleSecondClick={() => { router.push('/dashboard'); setOpen(false) }}
      >
        <p className='text-center'>How with free plan and partner with us .</p>

      </TwoButtonModel>





      <MeetingModal
        isOpen={open}
        onClose={() => { router.push('/'); setOpen(false) }}
        title="Your Opinion matter to us!"
        className="text-center"
        buttonText="Submit"
        handleClick={() => { router.push('/'); setOpen(false) }}
      >
        <p className='text-center'>How was quality of the meet?</p>
        <div className='flex items-center justify-center'>
          <Rating onClick={handleRating} initialValue={2} />
        </div>
        <div className="flex flex-col gap-2.5">

          <Textarea
            className="border-none bg-dark-3 focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder='Leave a message, if you want'
          />
        </div>
        <p className='text-center'>
          <span className='font-semibold'>Invite Your Friends and Family!</span>
          <br />
          Thank you for using our meeting platform. Share the ease of seamless connections with your friends and family. Invite them to join today!
        </p>

        <div className='flex flex-col items-center gap-2'>
          <button
            type='button'
            onClick={handleShare}
            className='text-foregroud-primary cursor-pointer underline underline-offset-4 hover:opacity-80'
          >
            Share with friends
          </button>
          <Link href={'/plans'} className='text-foregroud-primary underline underline-offset-4 hover:opacity-80'>
            See Our Plans
          </Link>
        </div>
      </MeetingModal>

      <MeetingModal
        isOpen={openshare}
        onClose={() => { setOpenShare(false); setOpen(true) }}
        title="Share Are Platform"
        className="text-center"
        buttonText="Share Now"
        handleClick={() => { }}
      >
        <div className='flex items-center gap-4 justify-center'>
          <EmailShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <EmailIcon size={40} round={true} />
          </EmailShareButton>
          <FacebookShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <FacebookIcon size={40} round={true} />
          </FacebookShareButton>

          <WhatsappShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <WhatsappIcon size={40} round={true} />
          </WhatsappShareButton>
          <InstapaperShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <InstapaperIcon size={40} round={true} />
          </InstapaperShareButton>
          <TwitterShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <TwitterIcon size={40} round={true} />
          </TwitterShareButton>
          <TelegramShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <TelegramIcon size={40} round={true} />
          </TelegramShareButton>
          <LinkedinShareButton
            url={`${process.env.NEXT_PUBLIC_BASE_URL}`}

          >
            <LinkedinIcon size={40} round={true} />
          </LinkedinShareButton>
        </div>
        <div className='py-4 px-2 w-full rounded-md border border-gray-100 flex items-center bg-gray-200' aria-readonly>
          <input value={`${process.env.NEXT_PUBLIC_BASE_URL}`} className='text-gray-500 outline-none border-none bg-transparent w-full' />
          <button className='text-gray-800 bg-none outline-none border-none' onClick={handleCopy}><MdOutlineContentCopy /></button>
        </div>
      </MeetingModal>

    </div>

  )
}

export default page