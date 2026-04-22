import Image from 'next/image'
import { FeatureCard } from '@/components/FeatureCard'
import { Button } from '@/components/ui/button'
import { ArrowRight, Video, Shield, Users, Headphones, VideoIcon, EarthLock, Bitcoin, Feather, SignalHigh, Disc3 } from 'lucide-react'
import Navbar2 from '@/components/Navbar2'

export default function FeaturesPage() {
    const features = [
        {
            title: 'HD Video Conferencing',
            description: 'Crystal clear video and audio for seamless communication.',
            icon: <Video className="w-8 h-8 text-blue-500" />,
        },
        {
            title: 'End-to-End Encryption',
            description: 'Your meetings are secure with our advanced encryption.',
            icon: <Shield className="w-8 h-8 text-green-500" />,
        },
        {
            title: 'Large Group Meetings',
            description: 'Host meetings with up to 1000 participants effortlessly.',
            icon: <Users className="w-8 h-8 text-purple-500" />,
        },
        {
            title: '24/7 Customer Support',
            description: 'Our dedicated team is always available to assist you.',
            icon: <Headphones className="w-8 h-8 text-red-500" />,
        },
    ]

    return (
        <div className='zeeshan'>
            {/* Navbar */}
            <Navbar2 />
            <>
                {/* Main content */}
                <section className="slice !pt-[8rem] !py-8 !bg-background-4">
                    {/* Container */}
                    <div className='absolute bottom-1 left-1 z-0'>
                        <img src='/images/bottom-box-shape.png' />
                    </div>
                    <div className="container">
                        <div className="row row-grid align-items-center">
                            <div className="col-lg-12">
                                {/* Heading */}
                                <h1 className="h1 text-gradient text-center text-lg-left my-4">
                                    Our Features
                                </h1>
                                {/* Text */}
                                <p className="lead text-white text-center text-lg-left opacity-8">
                                    Our platform provides cutting-edge online meeting solutions for businesses of all sizes.
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* SVG separator */}
                    <div className="shape-container shape-line shape-position-bottom">
                        <svg
                            width="2560px"
                            height="100px"
                            xmlns="http://www.w3.org/2000/svg"
                            xmlnsXlink="http://www.w3.org/1999/xlink"
                            preserveAspectRatio="none"
                            x="0px"
                            y="0px"
                            viewBox="0 0 2560 100"

                            xmlSpace="preserve"
                            className=""
                        >
                            <polygon points="2560 0 2560 100 0 100" fill='#1a1d22' />
                        </svg>
                    </div>
                </section>
                <section className="slice slice-sm !bg-background-3">
                    <div className='absolute bottom-1 left-1 z-0'>
                        <img src='/images/bottom-box-shape.png' />
                    </div>
                    <div className='absolute bottom-0 right-0 z-0'>
                        <img src='/images/bottom-line.png' />
                    </div>

                    <div className="container">
                        {/* Title */}
                        {/* Section title */}
                        <div className="row mb-5 justify-content-center text-center">
                            <div className="col-lg-12">

                                <h2 className=" mt-4 text-gradient">
                                    Reliable and Scalable Meeting Server Solutions
                                </h2>
                                <div className="mt-2">
                                    <p className="lead lh-180 text-white/80">
                                        Empower your business with a robust meeting platform designed for seamless collaboration, high performance, and enhanced security.

                                        {" "}
                                    </p>
                                </div>
                            </div>
                        </div>


                        <div className="row">
                            <div className="col-lg-4">
                                <div className="card text-center hover-translate-y-n10 hover-shadow-lg" style={{minHeight: '22rem'}}>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="py-4">
                                            <div className="icon text-warning icon-sm mx-auto">
                                                <VideoIcon size={30} />
                                            </div>
                                        </div>
                                        <h5 className="">High-Quality Video and Audio</h5>
                                        <p className=" mt-2 mb-0 text-muted">
                                            Experience crystal-clear communication with ultra-low latency and smooth performance. Enjoy adaptive streaming that ensures uninterrupted video quality, HD audio and video for immersive calls, and noise suppression to eliminate distractions for seamless conversations.
                                        </p>

                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-4">
                                <div className="card text-center hover-translate-y-n10 hover-shadow-lg" style={{minHeight: '22rem'}}>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="py-4">
                                            <div className="icon text-warning icon-sm mx-auto">
                                                <EarthLock  size={30} />
                                            </div>
                                        </div>
                                        <h5 className="">End-to-End Encryption</h5>
                                        <p className=" mt-2 mb-0 text-muted">
                                            Your meetings are always private and fully secure with advanced encryption protocols. Protect sensitive discussions with secure connections, maintain confidentiality, and manage access with role-based controls for every participant.
                                        </p>

                                    </div>
                                </div>
                            </div>


                            <div className="col-lg-4">
                                <div className="card text-center hover-translate-y-n10 hover-shadow-lg" style={{minHeight: '22rem'}}>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="py-4">
                                            <div className="icon text-warning icon-sm mx-auto">
                                                <Bitcoin  size={30} />
                                            </div>
                                        </div>
                                        <h5 className="">Custom Branding</h5>
                                        <p className=" mt-2 mb-0 text-muted">
                                            Showcase your brand with personalized meeting interfaces and features. Add your logo, customize colors, and create branded URLs, ensuring your platform aligns perfectly with your organization’s identity.
                                        </p>

                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="card text-center hover-translate-y-n10 hover-shadow-lg" style={{minHeight: '22rem'}}>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="py-4">
                                            <div className="icon text-warning icon-sm mx-auto">
                                            <Feather size={30} />
                                            </div>
                                        </div>
                                        <h5 className="">Interactive Features</h5>
                                        <p className=" mt-2 mb-0 text-muted">
                                            Enhance collaboration with intuitive tools designed for engagement. Share your screen, conduct live polls, manage Q&A sessions, or create breakout rooms for focused discussions, all within an easy-to-use interface.
                                        </p>

                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="card text-center hover-translate-y-n10 hover-shadow-lg" style={{minHeight: '22rem'}}>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="py-4">
                                            <div className="icon text-warning icon-sm mx-auto">
                                            <SignalHigh size={30} />
                                            </div>
                                        </div>
                                        <h5 className="">Global Reach with Low Latency</h5>
                                        <p className=" mt-2 mb-0 text-muted">
                                            Effortlessly connect with participants worldwide through optimized servers. Enjoy low-latency performance for smooth communication, 24/7 service reliability, and an uninterrupted meeting experience, no matter the location.
                                        </p>

                                    </div>
                                </div>
                            </div>
                            <div className="col-lg-4">
                                <div className="card text-center hover-translate-y-n10 hover-shadow-lg" style={{minHeight: '22rem'}}>
                                    <div className="px-4 pb-4 pt-4">
                                        <div className="py-4">
                                            <div className="icon text-warning icon-sm mx-auto">
                                            <Disc3 size={30} />
                                            </div>
                                        </div>
                                        <h5 className="">Meeting Recording and Playback</h5>
                                        <p className=" mt-2 mb-0 text-muted">
                                            Never miss a moment with built-in recording. Record meetings in the cloud or locally, and play back sessions anytime for review and reference.
                                        </p>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </>

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
                            <polygon points="2560 0 2560 100 0 100" fill='#1a1d22' />
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
                                <p className="mt-4 text-sm opacity-8 pr-lg-4 !text-white !font-[400] !text-[18px] !leading-[27px]">
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
                        <div className='flex items-center justify-end gap-8'>

                            <img src="https://hallelujahgospel.org/public/new/img/hallulia/bbb.png" width="85" className="p-0 m-0" />
                            <img src="https://hallelujahgospel.org/public/new/img/hallulia/access.png" width="65" className="p-0 m-0 me-2" />
                            <img src="https://hallelujahgospel.org/public/new/img/hallulia/lock.png" width="65" className="p-0 m-0 me-2" />
                            <a href="#" target="_blank">
                                <img src="https://hallelujahgospel.org/public/new/img/hallulia/apple.png" width="70" className="p-0 m-0 me-2" />
                            </a>
                            <a href="#" target="_blank">
                                <img src="https://hallelujahgospel.org/public/new/img/hallulia/g-play.png" width="70" className="p-0 m-0" />
                            </a>


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
        </div>
    )
}

