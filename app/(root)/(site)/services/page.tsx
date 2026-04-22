"use client";
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdCheckmark, IoMdHeadset, IoMdCart, IoMdBuild, IoMdLock, IoMdPulse, IoMdPeople, IoMdVideocam, IoMdDesktop, IoMdPhonePortrait, IoMdSettings, IoMdMic } from 'react-icons/io'

const ServicesPage = () => {
    const keyFeatures = [
        { title: "Unlimited Meetings", desc: "Based on active plans" },
        { title: "Unlimited Recordings", desc: "No hidden cloud charges" },
        { title: "P2P Encrypted", desc: "Secure peer connections" },
        { title: "Moderator Rights", desc: "Full room management" },
        { title: "Screen Sharing", desc: "Crystal clear presentations" },
        { title: "Zero Install", desc: "Runs in any browser" },
        { title: "Mobile Apps", desc: "Available for iOS & Android" },
        { title: "Custom UI", desc: "Tailored to your brand" },
        { title: "High Fidelity", desc: "Superior audio/video sync" }
    ];

    const supportOptions = [
        {
            title: "Sales Inquiry",
            desc: "Have questions about bulk pricing or enterprise features? Talk to us.",
            icon: <IoMdCart />,
            link: "/contact-us"
        },
        {
            title: "24/7 Support",
            desc: "Our live support is always active to assist you with any technical issues.",
            icon: <IoMdHeadset />,
            link: "/contact-us"
        },
        {
            title: "Custom Offers",
            desc: "Need a private server or custom development? We build for you.",
            icon: <IoMdBuild />,
            link: "/contact-us"
        }
    ];

    return (
        <div className='zeeshan min-h-screen !bg-bg-dark selection:bg-deep-gold/30'>
            <Navbar2 />

            {/* Hero Section */}
            <section className="slice !pt-[10rem] !pb-20 !bg-bg-dark relative overflow-hidden">
                <div className="light-ray-container opacity-25"></div>
                <div className="pattern-bg absolute inset-0 opacity-5"></div>
                
                <div className="container relative z-10 mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="main-header text-5xl md:text-7xl lg:text-8xl mb-6">
                            Global Services <br />
                            <span className="text-white">Without Limits</span>
                        </h1>
                        <p className="main-para max-w-2xl mx-auto text-xl opacity-80 leading-relaxed font-light">
                            Transform your virtual interactions with unparalleled performance, secure encryption, and a suite of professional tools designed for creators.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Slice 1: Seamless Setup */}
            <section className="slice slice-lg !bg-bg-dark relative py-12">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <h2 className="h1 text-gradient mb-6 leading-tight">Easy to set up, <br />Instant to Join</h2>
                            <p className="main-para !text-white/80 mb-6 leading-relaxed">
                                No complicated downloads or installation required. Start a meeting instantly from the web browser or our intuitive mobile application. Simply share your link and go live in seconds.
                            </p>
                            <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm">
                                <p className="text-sm text-white/50 italic font-light italic">
                                    "Sing Along has redefined how we host global gospel events. The zero-install feature is a game changer for our international audience."
                                </p>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <img src='/images/meeting.png' className='img-fluid rounded-2xl shadow-2xl skew-y-1 hover:skew-y-0 transition-transform duration-700' alt="Meeting Platform" />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Shape Separator */}
            <div className="shape-container shape-line shape-position-top shape-orientation-inverse relative z-20">
                <svg width="2560px" height="100px" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 2560 100" className="fill-section-secondary">
                    <polygon points="2560 0 2560 100 0 100" fill='#121212' />
                </svg>
            </div>

            {/* Slice 2: Full Control */}
            <section className="slice slice-lg !bg-[#121212] relative py-12">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <h2 className="h1 text-gradient mb-6 leading-tight">Total Privacy,<br />Full Control</h2>
                            <p className="main-para !text-white/80 mb-8 leading-relaxed">
                                Our platform is built on fully managed, high-performance servers giving you complete command over your data. Enable peer-to-peer encryption for the ultimate security in your conversations.
                            </p>
                            <div className="flex gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex-1 text-center">
                                    <div className="text-praise-orange mb-2 text-2xl flex justify-center"><IoMdLock /></div>
                                    <h4 className="text-white font-bold text-sm">P2P Encrypted</h4>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex-1 text-center">
                                    <div className="text-deep-gold mb-2 text-2xl flex justify-center"><IoMdPulse /></div>
                                    <h4 className="text-white font-bold text-sm">Pro Sync</h4>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <img src='/images/controls.png' className='img-fluid rounded-2xl shadow-2xl -skew-y-1 hover:skew-y-0 transition-transform duration-700' alt="Controls" />
                        </motion.div>
                    </div>
                </div>
            </section>

             {/* Shape Separator */}
             <div className="shape-container shape-line shape-position-top relative z-20">
                <svg width="2560px" height="100px" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 2560 100">
                    <polygon points="2560 0 2560 100 0 100" fill='#0A0A0A' />
                </svg>
            </div>

            {/* Slice 3: Unlimited Scale */}
            <section className="slice slice-lg !bg-bg-dark relative py-12">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <h2 className="h1 text-gradient mb-6 leading-tight">Unlimited Meetings <br />& Recordings</h2>
                            <p className="main-para !text-white/80 mb-6 leading-relaxed">
                                Host as many meetings as you need and record them all without hidden cloud charges. Our platform scales with your global audience seamlessly.
                            </p>
                            <div className="flex items-center gap-4 text-deep-gold">
                                <IoMdVideocam size={24} />
                                <span className="font-bold">Pro Unlimited Plan Included</span>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <img src='/images/gospel_choir.png' className='img-fluid rounded-2xl shadow-2xl skew-y-1 hover:skew-y-0 transition-transform duration-700' alt="Unlimited Events" />
                        </motion.div>
                    </div>
                </div>
            </section>

             {/* Shape Separator */}
             <div className="shape-container shape-line shape-position-top relative z-20">
                <svg width="2560px" height="100px" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 2560 100">
                    <polygon points="2560 0 2560 100 0 100" fill='#0A0A0A' />
                </svg>
            </div>

            {/* Key Features Matrix */}
            <section className="slice slice-lg !bg-bg-dark py-24 relative">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="h1 text-gradient mb-4">Unified Feature Suite</h2>
                        <p className="text-white/60 max-w-xl mx-auto">Discover the professional tools included in our service ecosystem designed to simplify your workflow.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {keyFeatures.map((feature, i) => (
                            <motion.div 
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                viewport={{ once: true }}
                                className="flex items-center gap-5 p-5 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all cursor-default"
                            >
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-deep-gold/10 text-deep-gold flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <IoMdCheckmark size={20} />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-lg">{feature.title}</h4>
                                    <p className="text-xs text-white/50">{feature.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Support Cards Section */}
            <section className="slice !pb-20 !bg-bg-dark relative">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 ">
                        {supportOptions.map((opt, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 40 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -8 }}
                                className="card-awesome-black p-6 rounded-2xl text-center flex flex-col items-center"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-royal-purple to-burgundy text-white flex items-center justify-center text-2xl mb-4 shadow-lg shadow-royal-purple/20">
                                    {opt.icon}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">{opt.title}</h3>
                                <p className="text-white/50 text-xs mb-6 leading-relaxed px-2">{opt.desc}</p>
                                <a href={opt.link} className="mt-auto px-6 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm font-bold hover:bg-white hover:text-black transition-all">
                                    Contact Now
                                </a>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default ServicesPage