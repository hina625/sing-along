'use client'
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdCheckmark } from 'react-icons/io'

const FeaturesPage = () => {
    const features = [
        {
            title: "AI Voice Enhancement",
            description: "Enhance communication clarity with advanced AI audio technology for meetings, presentations, interviews, customer support, podcasts, and live business events.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bar-chart"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
            ),
            color: "text-praise-orange"
        },
        {
            title: "Professional Meeting Quality",
            description: "Experience crystal-clear audio and video designed to improve communication, team collaboration, and professional client interactions.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
            ),
            color: "text-teal-accent"
        },
        {
            title: "Business Networking Rooms",
            description: "Connect with entrepreneurs, companies, investors, ministries, professionals, and organizations worldwide through interactive networking rooms and live events.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-5.13a4 4 0 11-8 0 4 4 0 018 0zm6 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            ),
            color: "text-deep-gold"
        },
        {
            title: "AI Business Recommendations",
            description: "Receive intelligent recommendations for potential business partnerships, services, collaborations, networking opportunities, and strategic connections.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" /></svg>
            ),
            color: "text-royal-purple"
        },
        {
            title: "Sales & Marketing Growth Tools",
            description: "Promote products, services, events, and business opportunities while increasing visibility, customer engagement, and revenue potential.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
            ),
            color: "text-burgundy"
        },
        {
            title: "Enhanced Virtual Conferences",
            description: "Host secure conferences, training sessions, webinars, interviews, live streams, business presentations, and team meetings with ease.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>
            ),
            color: "text-teal-accent"
        },
        {
            title: "Much More",
            description: "Discover additional tools designed to support communication, automation, collaboration, scheduling, audience engagement, branding, and business growth.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
            ),
            color: "text-sky-1"
        }
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15
            }
        }
    };

    const cardVariants = {
        hidden: { opacity: 0, scale: 0.98 },
        visible: { 
            opacity: 1,
            scale: 1,
            transition: {
                duration: 0.4,
                ease: "easeOut"
            }
        }
    };

    return (
        <div className='zeeshan overflow-x-hidden'>
            <Navbar2 />
            <section className="slice bg-cover bg-no-repeat !pt-[8rem] !bg-bg-dark relative overflow-hidden min-h-screen">
                <div className="light-ray-container opacity-25"></div>
                
                <div className="container relative z-10 px-4 md:px-6 mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-3xl"
                    >
                        <h1 className="text-3xl md:text-5xl lg:text-6xl mb-6 text-white font-bold leading-tight">
                            Explore Our <br />
                            Exciting Upcoming <span className="text-deep-gold underline decoration-deep-gold/30">Business Features</span>
                        </h1>

                        <p className="text-base md:text-xl !text-white opacity-90 max-w-2xl leading-relaxed">
                            We are excited to introduce powerful new tools designed to help entrepreneurs, organizations, professionals, creators, and teams connect, collaborate, communicate, and grow their businesses more effectively. Experience the future of professional networking, virtual meetings, and AI-powered business solutions.
                        </p>
                    </motion.div>

                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        className="grid grid-cols-1 gap-6 mt-12 xl:mt-24 md:grid-cols-2"
                    >
                        {features.map((feature, index) => (
                            <motion.div 
                                key={index} 
                                variants={cardVariants}
                                whileHover={{ 
                                    y: -5,
                                    scale: 1.015,
                                    borderColor: "rgba(212, 175, 55, 0.4)",
                                    backgroundColor: "rgba(255, 255, 255, 0.04)",
                                    transition: { duration: 0.3, ease: "easeOut" }
                                }}
                                className={`card card-awesome-black ${index === 0 ? 'soft-glow' : ''} group relative`}
                            >
                                <div className="card-body !p-4 md:!p-6 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-4 md:gap-6">
                                    <div className="flex-shrink-0">
                                        <motion.div 
                                            whileHover={{ scale: 1.1, rotate: 3 }}
                                            className={`relative p-3 rounded-xl bg-white/5 transition-colors group-hover:bg-white/10 ${feature.color}`}
                                        >
                                            {React.cloneElement(feature.icon as React.ReactElement, { className: 'w-7 h-7 relative z-10' })}
                                        </motion.div>
                                    </div>

                                    <div className="flex flex-col">
                                        <h4 className="text-xl mb-1 !text-white font-bold tracking-wide">
                                            {feature.title}
                                        </h4>

                                        <p className="text-sm !text-white/60 leading-snug">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                                
                                {/* Inner decorative glow */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.01] rounded-bl-full pointer-events-none group-hover:bg-white/[0.04] transition-colors"></div>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* How it Works Section */}
            <section className='section !bg-bg-dark relative overflow-hidden py-12'>
                <div className="pattern-bg absolute inset-0 opacity-5"></div>
                <div className='absolute top-1 left-1 z-0 opacity-20'>
                    <img src='/images/left-plus.png' alt="" />
                </div>
                
                <div className="container relative z-10 mx-auto px-4 md:px-6">
                    <div className="flex items-center justify-center flex-col mb-8 text-center">
                        <h2 className="text-xl md:text-4xl mb-3 text-white font-bold">
                            How It Works
                        </h2>
                        <p className="text-xs md:text-sm max-w-2xl !text-white/60">
                            Experience professional communication and business networking tools that are simple, secure, and easy to use.
                        </p>
                    </div>

                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {[
                            {
                                step: "01",
                                title: "Create Account",
                                desc: "Register your account to access meetings, networking opportunities, virtual conferences, and collaboration tools instantly."
                            },
                            {
                                step: "02",
                                title: "Set Up Your Meeting or Event",
                                desc: "Create virtual rooms, customize your settings, schedule sessions, and invite clients, teams, partners, or audiences worldwide."
                            },
                            {
                                step: "03",
                                title: "Go Live & Connect",
                                desc: "Launch your meetings, webinars, interviews, networking sessions, and live events with high-quality audio and video communication."
                            }
                        ].map((item, i) => (
                            <motion.div 
                                key={i} 
                                variants={cardVariants}
                                whileHover={{ 
                                    y: -8,
                                    backgroundColor: "rgba(255, 255, 255, 0.06)",
                                    borderColor: "rgba(212, 175, 55, 0.4)",
                                    transition: { duration: 0.3 }
                                }}
                                className="relative p-4 md:p-6 rounded-xl bg-white/5 border border-white/10 group transition-all"
                            >
                                <motion.div 
                                    whileHover={{ scale: 1.2, x: 5 }}
                                    className="text-4xl font-black text-white/5 group-hover:text-deep-gold/10 transition-colors absolute top-4 right-4"
                                >
                                    {item.step}
                                </motion.div>
                                <h3 className="text-xl font-bold text-white mb-2 relative z-10">{item.title}</h3>
                                <p className="text-sm text-white/50 leading-relaxed relative z-10">{item.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="slice slice-lg !bg-bg-dark py-20 relative overflow-hidden">
                <div className="container relative z-10 mx-auto px-4 md:px-6">
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 bg-gradient-to-r from-royal-purple/20 to-burgundy/20 p-6 md:p-12 rounded-[2rem] border border-white/10 text-center md:text-left">
                        <div className="flex-grow">
                            <h2 className="text-2xl md:text-5xl font-bold text-white mb-4 md:mb-6">
                                Ready to experience the <br className="hidden md:block" />
                                <span className="text-deep-gold">Future of Business Networking?</span>
                            </h2>
                            <p className="text-base md:text-xl text-white/70 mb-6 md:mb-8 max-w-xl mx-auto md:mx-0">
                                Join entrepreneurs, organizations, ministries, professionals, creators, and companies already using our advanced AI-powered communication platform to build meaningful connections and expand business opportunities globally.
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-3 md:gap-4">
                                <a href="/plans" className="btn btn-primary !bg-royal-purple hover:!bg-burgundy !border-none px-6 py-2 md:px-8 md:py-4 text-xs md:text-lg !font-bold transition-all shadow-xl shadow-royal-purple/20">
                                    Get Started Now
                                </a>
                                <a href="/contact-us" className="btn btn-secondary !border-deep-gold/30 !text-deep-gold px-6 py-2 md:px-8 md:py-4 text-xs md:text-lg hover:!bg-deep-gold hover:!text-black transition-all">
                                    Contact Sales
                                </a>
                            </div>
                        </div>
                        <div className="hidden lg:block w-1/3">
                            <img src='/images/stamps.jpg' className='w-full rounded-2xl shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500' alt="HG Experience" />
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default FeaturesPage