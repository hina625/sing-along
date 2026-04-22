'use client'
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdCheckmark } from 'react-icons/io'

const FeaturesPage = () => {
    const features = [
        {
            title: "AI Voice Enhancer",
            description: "Unlock your vocal potential with AI. Enjoy improved singing, personalized song suggestions, and enhanced meeting audio quality.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-bar-chart"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
            ),
            color: "text-praise-orange"
        },
        {
            title: "Sing Better",
            description: "AI will help you refine your voice, making every note perfect. Experience enhanced vocal quality and confidence.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
            ),
            color: "text-teal-accent"
        },
        {
            title: "Duet with AI",
            description: "Sing along with AI for a seamless and immersive duet experience. Elevate your performances with advanced vocal harmony.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                </svg>
            ),
            color: "text-deep-gold"
        },
        {
            title: "Song Suggestions",
            description: "Discover personalized recommendations tailored to your musical taste, enhancing your listening experience with curated selections.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-music"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            ),
            color: "text-royal-purple"
        },
        {
            title: "Enhanced Meeting Audio",
            description: "Elevate your virtual gatherings with crystal-clear sound quality, ensuring every voice is heard distinctly and clearly.",
            icon: (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-mic"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
            ),
            color: "text-burgundy"
        },
        {
            title: "Much More",
            description: "Explore a myriad of additional features designed to enrich your experience, from advanced settings to seamless integration.",
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
        <div className='zeeshan'>
            <Navbar2 />
            <section className="slice bg-cover bg-no-repeat !pt-[8rem] !bg-bg-dark relative overflow-hidden min-h-screen">
                <div className="light-ray-container opacity-25"></div>
                
                <div className="container relative z-10 px-6 mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-3xl"
                    >
                        <h1 className="main-header text-4xl md:text-5xl lg:text-6xl mb-6">
                            Explore Our <br />
                            Exciting Upcoming <span className="text-deep-gold underline decoration-deep-gold/30">Features</span>
                        </h1>

                        <p className="main-para text-lg md:text-xl opacity-90 max-w-2xl leading-relaxed">
                            We are thrilled to announce a range of exciting new features designed to enhance your experience and streamline your workflow. Get ready to explore the future of seamless, intuitive solutions!
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
                                <div className="card-body !p-6 flex flex-row items-center gap-6">
                                    <div className="flex-shrink-0">
                                        <motion.div 
                                            whileHover={{ scale: 1.1, rotate: 3 }}
                                            className={`relative p-3 rounded-xl bg-white/5 transition-colors group-hover:bg-white/10 ${feature.color}`}
                                        >
                                            {React.cloneElement(feature.icon as React.ReactElement, { className: 'w-7 h-7 relative z-10' })}
                                        </motion.div>
                                    </div>

                                    <div className="flex flex-col text-left">
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
                
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex items-center justify-center flex-col mb-8 text-center">
                        <h2 className="main-header text-3xl md:text-4xl mb-3">
                            How It Works
                        </h2>
                        <p className="main-para max-w-2xl !text-white/60 text-sm">
                            Experience engaging video and audio communication tools that are easy to use and navigate. Getting started is simple!
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
                                desc: "Sign up with your details to host or join premium meetings instantly."
                            },
                            {
                                step: "02",
                                title: "Set Up Meeting",
                                desc: "Create a room, set your preferences, and share the link with your audience."
                            },
                            {
                                step: "03",
                                title: "Go Live",
                                desc: "Enter your meeting room and enjoy high-quality sync."
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
                                className="relative p-6 rounded-xl bg-white/5 border border-white/10 group transition-all"
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
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-12 bg-gradient-to-r from-royal-purple/20 to-burgundy/20 p-12 rounded-[2rem] border border-white/10">
                        <div className="flex-grow">
                            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                                Ready to experience the <br />
                                <span className="text-deep-gold">Future of Sing Along?</span>
                            </h2>
                            <p className="text-xl text-white/70 mb-8 max-w-xl">
                                Join thousands of singers and creators who are already using our advanced AI-driven platform.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <a href="/plans" className="btn btn-primary !bg-royal-purple hover:!bg-burgundy !border-none px-8 py-4 !text-lg !font-bold transition-all shadow-xl shadow-royal-purple/20">
                                    Get Started Now
                                </a>
                                <a href="/contact-us" className="btn btn-secondary !border-white/20 !text-white px-8 py-4 !text-lg hover:bg-white/10 transition-all">
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