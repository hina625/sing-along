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

const products = [
  {
    title: "ANYTIME",
    subtitle: "VIDEO CHAT",
    icon: <img src='/images/streams.png' className='w-[80%] h-[5rem] object-contain' />,
    gradient: "from-yellow-400 to-orange-500",
    icon2: "/card-logo/1.png",
    link: "https://hgvibelive.org/"
  },
  {
    title: "WATCH",
    subtitle: "VIDEOS",
    icon: <img src='/images/pipeline.png' className='w-[80%] h-[5rem] object-contain' />,
    gradient: "from-green-400 to-blue-500",
    icon2: "/card-logo/2.png",
    link: "https://hgpipeline.com/"
  },
  {
    title: "SUBMIT",
    subtitle: "ANYTIME",
    icon: <img src='/images/radio.png' className='w-[80%] h-[5rem] object-contain' />,
    gradient: "from-purple-400 to-pink-500",
    icon2: "/card-logo/3.png",
    link: "https://hgcradio.com/"
  },
  {
    title: "COMING",
    subtitle: "SOON",
    icon: <img src='/images/main-logo.png' className='w-[80%] h-[5rem] object-contain' />,
    gradient: "from-orange-400 to-yellow-500",
    icon2: "/card-logo/4.png",
    link: "#"
  },
]
const page = () => {

  const [ratingValue, setRatingValue] = useState(0);
  const [open, setOpen] = useState(false)
  const [publicRooms, setPublicRooms] = useState<IRoomDetails[]>([])
  const [openshare, setOpenShare] = useState(false)
  const [freePlanModel, setFreePlanModel] = useState(false);
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
      <section className="slice bg-cover bg-no-repeat !pt-[8rem] !bg-bg-dark relative overflow-hidden" >
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

              <h1 className="text-3xl md:text-5xl lg:text-6xl text-center text-md-left mb-4 !font-bold !text-white leading-tight">
                It's time to set up your <strong className="text-gradient">virtual meetings</strong>
              </h1>
              <p className="lead text-center text-md-left !font-[400] !text-white/90">
                Now you can set up your secured and high-quality virtual meetings on Sing Along.
              </p>
              <div className="text-center text-md-left mt-5">
                <a href="/dashboard" className="btn btn-primary !border-none !bg-royal-purple hover:!bg-burgundy transition-all btn-icon shadow-lg shadow-royal-purple/20">
                  <span className="btn-inner--text">Get started</span>
                  <span className="btn-inner--icon"><svg xmlns="http://www.w3.org/2000/svg" width="1em"
                    height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round"
                    className="feather feather-chevron-right">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg></span>
                </a>
                <a href="/how-to-use"
                  className="btn btn-neutral btn-icon d-none d-lg-inline-block !text-white !border-2 hover:!border-foregroud-primary">Read Guidelines</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="slice slice-lg pt-lg-6 pb-0 pb-lg-6 !bg-bg-dark relative overflow-hidden">
        <div className='absolute top-1 left-1 z-0'>
          <img src='/images/left-plus.png' />
        </div>
        <div className='absolute bottom-0 right-0 z-0'>
          <img src='/images/bottom-line.png' />
        </div>
        <div className="container z-10">
          {/* Title */}
          {/* Section title */}
          <div className="row mb-5 justify-content-center text-center">
            <div className="col-lg-10">
              {/*
        <span className="badge badge-soft-success badge-pill badge-lg">
          Get started
        </span>
          */}
              <h2 className="mt-4 main-header !text-white text-2xl md:text-4xl leading-snug" style={{ color: 'white' }}>
                Ready to use + carefully crafted performance for quality meetings
              </h2>
              <div className="mt-2">
                <p className="lead lh-180 main-para !text-white/90">
                  We offer competitive pricing, great features, and better value.
                  See our difference!
                </p>
              </div>
            </div>
          </div>
          {/* Card */}
          <div className="row mt-5">

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
                  <h5 className="h4 lh-130 mb-3 !text-white">Easy to set up &amp; use</h5>
                  <p className=" mb-0  main-para !text-white/80">
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
                  <h5 className="h4 lh-130 mb-3 !text-white/90">Fully controlled by you</h5>
                  <p className=" mb-0 main-para !text-white/80">
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
                  <h5 className="h4 lh-130 mb-3 !text-white/90">
                    Unlimited Meetings &amp; Recordings
                  </h5>
                  <p className=" mb-0 main-para !text-white/80">
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



      <section className='section py-12 px-5 !flex !flex-col !items-center !justify-center relative overflow-hidden'
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(11, 31, 58, 0.95), rgba(90, 45, 130, 0.9)), url('/images/bg-2.jpg')`,
          backgroundPosition: 'center',
          backgroundSize: 'cover'
        }}
      >
        <div className="light-ray-container opacity-10"></div>
        <div className="pattern-bg absolute inset-0 opacity-10"></div>

        <div className="flex items-center justify-center flex-col mb-12">

          <h2 className="mt-4 main-header !text-white text-2xl md:text-4xl">
            Why HG Sing Along
          </h2>
          <div className="mt-2">
            <p className="leading-7 max-w-[35rem] text-center font-[300] text-[1.125rem] main-para !text-white/80">

              Discover the difference with our competitive pricing, exceptional features, and unbeatable value—an experience we don't want you to miss!
            </p>
          </div>

        </div>
        <div className='container-infographic relative w-[17rem] h-[17rem] md:w-[30rem] md:h-[30rem] border-[.4rem] border-deep-gold rounded-full shadow-2xl shadow-deep-gold/10'>
          <div className='services -left-[50%] relative w-full h-full flex justify-center items-center cursor-pointer '>
            <div className='secvice-box flex' style={getStyle(1)} data-target="content1">
              <div className='flex items-start'>
                <h2 className='absolute -left-[180%] md:-left-[210%] top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Crystal Clear Sound</h2>
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
                <h2 className='absolute !-right-[260%] md:!-right-[210%] -top-[5%] md:top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Collabrative</h2>
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

                <h2 className='absolute -left-[110%] md:-left-[210%] top-[25%] w-[10rem] !text-[10px] md:!text-xl !font-[700] !text-white hidden md:block'>Extandable</h2>

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
                    <h1 className='!text-white text-lg md:!text-4xl !font-[700] text-gradient'>Why HG SingAlong ?</h1>
                  </div>
                  <div className='contentBox' id='content1'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 text-sm md:text-base'>
                      Experience exceptional audio quality that delivers every note with precision. Whether you're enjoying music, calls, or videos, the clarity will impress you.
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
                    <h1 className='!text-white text-lg md:!text-4xl !font-[700] text-gradient'>Why HG SingAlong ?</h1>
                  </div>
                  <div className='contentBox' id='content1'>
                    <p className='!text-white/80 max-w-[21rem] main-para text-center md:p-0 p-5 pt-6 !text-md'>
                      I am in PC Experience exceptional audio quality that delivers every note with precision. Whether you're enjoying music, calls, or videos, the clarity will impress you.
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




      <section className="slice slice-lg !bg-bg-dark pt-5 pt-lg-8 relative overflow-hidden">
        <div className="pattern-bg absolute inset-0 opacity-5"></div>
        <div className='absolute top-1 left-1 z-0'>
          <img src='/images/left-plus.png' />
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

        <div className='flex items-center flex-col md:flex-row px-3 md:px-6'>
          <div className="px-2 py-8 w-full md:w-[50%] flex flex-col items-center justify-center md:block">
            <h2 className="text-lg md:text-4xl lg:text-5xl text-white !font-[700] text-gradient leading-tight text-center md:text-left">Are you ready to grow faster?</h2>
            <h4 className="text-white mt-3 !font-[500] text-center md:text-left">
              Activate any plan and get started
            </h4>

            <a
              href="/plans"
              className="btn btn-primary !bg-royal-purple hover:!bg-burgundy !border-none btn-icon mt-4 !font-500 shadow-lg shadow-royal-purple/20 transition-all"
            >
              Start now
            </a>
          </div>


          <div className='flex items-center justify-center w-full md:w-[50%]'>
            <img src='/images/stamps.jpg' className='w-full max-w-[22rem] hover:scale-110 transition-all cursor-pointer' />
          </div>
        </div>

      </section>



      <section className="slice !bg-bg-dark pt-7 relative overflow-hidden">

        <div className='absolute bottom-1 left-1 z-0'>
          <img src='/images/bottom-box-shape.png' />
        </div>
        <div className='absolute right-1 top-1 z-0'>
          <img src='/images/left-plus.png' />
        </div>

        <div className="container position-relative zindex-100">
          <div className="flex flex-wrap items-center justify-center gap-7">
            {
              Object.keys(planslist).map((plan) => (
                <React.Fragment key={plan}>
                  {
                    plan == 'starter' &&
                    <div className="w-[18rem]">
                      <div
                        className="card card-pricing card-awesome-black text-center px-3 border-0 hover-scale-110 md:scale-110"
                        style={{ border: "1px solid" }}
                      >
                        <div className="card-header py-5 border-0 delimiter-bottom">
                          <div className="h1  text-center mb-0 text-gradient">
                            $<span className="price font-weight-bolder text-gradient">{planslist[plan].price}</span>
                          </div>
                          <span className="h6 text-gradient">{planslist[plan].title}</span>
                        </div>
                        <div className="card-body !p-1 !text-white">
                          <span className="h6 !text-white" style={{ fontWeight: "bold" }}>
                            Features:
                          </span>
                          <ul className="list-unstyled  text-sm opacity-8 mb-4">
                            {
                              planslist[plan].features.map((text, i) => (
                                <li key={i} className="py-2 !text-left">
                                  <IoMdCheckmark /> {text}
                                </li>
                              ))
                            }
                          </ul>
                          {

                            subscription === plan ?
                              (
                                <a

                                  className="btn btn-sm btn- !bg-[#1ebbc4] !text-white hover-translate-y-n3 hover-shadow-lg mb-3"
                                >
                                  Current Plan
                                </a>

                              )
                              :
                              (
                                <a
                                  onClick={(e) => handlePurchanse(e, plan)}
                                  className="btn btn-sm btn- !bg-[#A79369] !text-white hover-translate-y-n3 hover-shadow-lg mb-3"
                                >
                                  Purchase Now
                                </a>

                              )
                          }
                        </div>
                      </div>
                    </div>
                  }
                  {
                    plan != "starter" &&
                    <div className="w-[18rem]">
                      <div
                        className="card card-awesome-black card-pricing text-center px-3 hover-scale-110"

                      >
                        <div className="card-header py-5 border-0 delimiter-bottom">
                          <div className="h1 text-center mb-0 text-gradient">
                            $<span className="price font-weight-bolder ">{planslist[plan].price}</span>
                          </div>
                          <span className="h6  text-gradient">{planslist[plan].title}</span>
                        </div>
                        <div className="card-body !p-1">
                          <span className="h6 !text-white" style={{ fontWeight: "bold" }}>
                            Features:
                          </span>
                          <ul className="list-unstyled text-sm mb-4">
                            {
                              planslist[plan].features.map((text, i) => (
                                <li key={i} className="py-2 !text-left  !text-white">
                                  <IoMdCheckmark /> {text}
                                </li>
                              ))
                            }

                          </ul>

                          {
                            plan == 'free' && subscription != 'free' ?
                              (
                                <a

                                  className="btn btn-sm btn- !bg-[#A79369] !text-white hover-translate-y-n3 hover-shadow-lg mb-3"
                                >
                                  Free Plan
                                </a>
                              ) :
                              subscription === plan ?
                                (
                                  <a
                                    onClick={plan == "free" ? () => setFreePlanModel(true) : () => { }}
                                    className="btn btn-sm btn- !bg-[#A79369] !text-white hover-translate-y-n3 hover-shadow-lg mb-3"
                                  >
                                    {plan == "free" ? "Continue With Free" : "Current Plan"}

                                  </a>

                                )
                                :
                                (
                                  <a
                                    onClick={(e) => handlePurchanse(e, plan)}
                                    className="btn btn-sm btn- !bg-royal-purple !text-white hover:!bg-burgundy hover-translate-y-n3 hover-shadow-lg mb-3 shadow-md shadow-royal-purple/20 transition-all font-bold"
                                  >
                                    Purchase Now
                                  </a>

                                )
                          }

                        </div>
                      </div>
                    </div>
                  }
                </React.Fragment>
              ))
            }
          </div>
          <div className="mt-5 text-center">
            <p className="mb-2 !text-white">
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



      <section className='section !bg-bg-dark relative overflow-hidden'>
        <div className="pattern-bg absolute inset-0 opacity-5"></div>
        <div className='absolute top-1 left-1 z-0'>
          <img src='/images/left-plus.png' />
        </div>
        <div className='absolute bottom-0 right-0 z-0'>
          <img src='/images/bottom-line.png' />
        </div>
        <div className="flex items-center justify-center flex-col mb-12">

          <h2 className="mt-4 main-header !text-white text-2xl md:text-4xl">
            How it works
          </h2>
          <div className="mt-2">
            <p className="leading-7 max-w-[35rem] text-center font-[300] text-[1.125rem] main-para !text-white/80">
              Experience engaging video and audio communication tools that are easy to use and navigate. There's never a dull moment!
            </p>
          </div>

        </div>
        <div className='container'>
          <div className='w-full relative flex flex-wrap flex-col md:flex-row items-center gap-0 my-2'>
            <div className=' w-full md:w-[50%] p-4 md:hidden block'>
              <div className="h1 !text-white/90 text-center text-2xl md:text-4xl">
                Create an account to host a meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para !text-white/80 text-center">
                Sign up with your Name, Email Address, and Password. Then, check your email to verify your account. Once your account is verified, you will have full access to Trivoh workspace.
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
              <div className="h1 text-2xl md:text-4xl !text-white/90 ">
                Create an account to host a meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para !text-white/80">
                Sign up with your Name, Email Address, and Password. Then, check your email to verify your account. Once your account is verified, you will have full access to Trivoh workspace.
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
              <div className="h1 !text-white/90 text-center text-2xl md:text-4xl">
                Set up your meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para !text-white/80 text-center">
                To set-up and schedule a meeting, click on Host a meeting which will give you full control of the meeting you have created. Once your meeting is created, share the link with your participants or add it to your calendar.
              </p>

            </div>

            <div className=' w-full md:w-[50%] p-4 hidden md:block'>
              <div className="h1 text-2xl md:text-4xl !text-white/90">
                Set up your meeting
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para !text-white/80">
                To set-up and schedule a meeting, click on Host a meeting which will give you full control of the meeting you have created. Once your meeting is created, share the link with your participants or add it to your calendar.
              </p>

            </div>
          </div>

          <div className='w-full relative flex flex-wrap flex-col md:flex-row items-center gap-0 mt-2'>
            <div className=' w-full md:w-[50%] p-4 block md:hidden'>
              <div className="h1 !text-white/90 text-center text-2xl md:text-4xl">
                Enter your meeting room
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para !text-white/80 text-center">
                It is not compulsory to have an account to join a meeting on Trivoh, Join any meetings using the meeting link or ID, Simply insert your name, set up your microphones and videos, and you are good to go.


              </p>

            </div>


            <div className=' w-full md:w-[50%] p-4 hidden md:block'>
              <div className="h1 !text-white/90 text-2xl md:text-4xl">
                Enter your meeting room
              </div>
              <p className="leading-7 mt-3 font-[300] text-[1.125rem] main-para !text-white/80">
                It is not compulsory to have an account to join a meeting on Trivoh, Join any meetings using the meeting link or ID, Simply insert your name, set up your microphones and videos, and you are good to go.


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


      <div className="bg-background-3 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-center mb-8 !bg-gradient-to-r !text-white !text-transparent !bg-clip-text leading-tight">
            Discover Our Products
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((item, index) => (
              <a key={index} href={item.link}>


                <div
                  className={` rounded-3xl text-white shadow-lg`}
                >
                  <div className='flex items-center justify-center p-3 bg-[#343434] rounded-t-3xl'>
                    <div className='h-[8px] w-[4rem] rounded-3xl !bg-black'></div>
                  </div>
                  <div className="h-[10rem] w-full bg-[url('/images/bg-card.png')] bg-cover bg-no-repeat relative">
                    <div className='absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center bg-black/80'>
                      {item.icon}
                    </div>
                  </div>

                  <div className='flex items-center justify-center  px-4 pb-4 !pt-0 bg-white  w-full rounded-b-3xl relative flex-col'>
                    <img src={item.icon2} className='w-full h-full object-contain' />
                    <h3 className="text-2xl md:text-4xl font-bold text-black">{item.title}</h3>
                    <h5 className='px-3 py-2 bg-[#ff950b] text-black text-lg md:text-2xl !font-normal rounded-lg'>{item.subtitle}</h5>
                  </div>

                </div>
              </a>
            ))}
          </div>
        </div>
      </div>


      <section className="slice slice-sm !bg-background-3 relative overflow-hidden">
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
              <p className="lh-180 mt-4 mb-5 main-para !text-white/80 !font-normal px-4 md:px-0">
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
                <p className="text-sm opacity-8 pr-lg-4 !text-white !font-[400] !text-[18px] !leading-[27px]">
                  Sing Along is a video conferencing/meeting platform offered by
                  Hallelujah Gospel Globally. We offer high-quality, secured, and
                  hassle-free meetings.{" "}
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
                  © 2024{" "}
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
        title="Donate Now"
        className="text-center"
        buttonText="Donate Now"
        handleClick={() => { router.push('/donate'); setOpen(false) }}
        handleSecondClick={() => { router.push('/dashboard'); setOpen(false) }}
      >
        <p className='text-center'>How with free plan and donate now.</p>

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
        <p className='text-center'>Invite Your Friends and Family! <br /> Thank you for using our meeting platform. <span className='text-foregroud-primary cursor-pointer' onClick={handleShare}>share</span> the ease of seamless connections with your friends and family. Invite them to join today! </p>


        <span className='text-foregroud-primary text-center'><Link href={'/plans'}>See Our Plans</Link></span>
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