"use client"
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdPerson, IoMdVideocam, IoMdPeople, IoMdLock, IoMdPulse } from 'react-icons/io'

const HowToUsePage = () => {
    return (
        <div className='zeeshan min-h-screen !bg-bg-dark overflow-x-hidden'>
            <Navbar2 />

            {/* Hero Section */}
            <section className="slice !pt-[10rem] !pb-16 !bg-bg-dark relative overflow-hidden">
                <div className="light-ray-container opacity-25"></div>
                <div className="pattern-bg absolute inset-0 opacity-5"></div>
                
                <div className="container relative z-10 mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="main-header text-5xl md:text-7xl lg:text-8xl mb-6">
                            Master Your <br />
                            <span className="text-white">Performance</span>
                        </h1>
                        <p className="main-para max-w-2xl mx-auto text-xl opacity-80 leading-relaxed">
                            Discover how to navigate the Sing Along platform, host global meetings, and ensure the highest quality for your audience.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Slice 1: Getting Started */}
            <section className="slice slice-lg !bg-bg-dark relative py-16">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <h2 className="h1 text-gradient mb-6">Creating Your Account</h2>
                            <p className="main-para !text-white/80 mb-8 leading-relaxed">
                                Join the global community in seconds. Visit our secure login page or use the app's fast-registration to set up your profile.
                            </p>
                            <ul className="space-y-4">
                                {[
                                    "Enter your Name & Email Address",
                                    "Choose your Country for localized sync",
                                    "Set a strong password to protect your recordings"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-white/70">
                                        <div className="w-6 h-6 rounded-full bg-deep-gold/20 flex items-center justify-center text-deep-gold">
                                            <IoMdPerson size={14} />
                                        </div>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2 relative"
                        >
                            <div className="absolute -inset-4 bg-royal-purple/20 blur-3xl opacity-50 rounded-full"></div>
                            <img src='/s1.webp' className='img-fluid rounded-2xl shadow-2xl relative z-10 border border-white/5' alt="Getting Started" />
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

            {/* Slice 2: Hosting Meetings */}
            <section className="slice slice-lg !bg-[#121212] relative py-16">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                        <motion.div 
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="w-full md:w-1/2"
                        >
                            <h2 className="h1 text-gradient mb-6">Hosting Your First Room</h2>
                            <p className="main-para !text-white/80 mb-8 leading-relaxed">
                                Take control of your stage. Whether you're on the web or our mobile app, starting a meeting is just a click away.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <motion.div 
                                    whileHover={{ y: -5 }}
                                    className="p-4 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10"
                                >
                                    <h4 className="text-white font-bold mb-2">On Website</h4>
                                    <p className="text-xs text-white/50 leading-relaxed">Use 'Quick Start' on your dashboard or schedule a future session from the meetings tab.</p>
                                </motion.div>
                                <motion.div 
                                    whileHover={{ y: -5 }}
                                    className="p-4 rounded-2xl bg-white/5 border border-white/10 transition-all hover:bg-white/10"
                                >
                                    <h4 className="text-white font-bold mb-2">On Mobile App</h4>
                                    <p className="text-xs text-white/50 leading-relaxed">Tap 'Start Meeting' and enter a title to immediately ignite your session.</p>
                                </motion.div>
                            </div>
                        </motion.div>
                        <motion.div 
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <img src='/s2.webp' className='img-fluid rounded-2xl shadow-2xl border border-white/5' alt="Hosting" />
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

            {/* Slice 3: Audience & Quality */}
            <section className="slice slice-lg !bg-bg-dark relative py-16">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div 
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <h2 className="h1 text-gradient mb-6">Interaction & Security</h2>
                            <p className="main-para !text-white/80 mb-8 leading-relaxed">
                                Connect with your audience while maintaining complete privacy. Sing Along gives you tools to manage who joins and how they interact.
                            </p>
                            <div className="space-y-6">
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-deep-gold/20 flex items-center justify-center text-deep-gold">
                                        <IoMdPeople size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Easy Sharing</h4>
                                        <p className="text-sm text-white/60">Instantly generate and share secure links to invite your audience.</p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-royal-purple/20 flex items-center justify-center text-royal-purple">
                                        <IoMdLock size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Total Control</h4>
                                        <p className="text-sm text-white/60">Lock your room to prevent unauthroized access from external users.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div 
                             initial={{ opacity: 0, scale: 0.9 }}
                             whileInView={{ opacity: 1, scale: 1 }}
                             viewport={{ once: true }}
                             className="w-full md:w-1/2"
                        >
                            <img src='/s3.webp' className='img-fluid rounded-2xl shadow-2xl border border-white/5' alt="Audience" />
                        </motion.div>
                    </div>
                </div>
            </section>

             {/* Final CTA Section */}
             <section className="py-20 !bg-[#121212] relative overflow-hidden">
                <div className="container relative z-10 mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="max-w-3xl mx-auto p-8 rounded-3xl bg-white/[0.02] border border-white/5 shadow-2xl"
                    >
                        <div className="flex-grow">
                            <h2 className="text-4xl font-bold mb-6">Still have questions?</h2>
                            <p className="text-white/60 mb-10">Our support team is available 24/7 to help you refine your experience.</p>
                            <motion.a 
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                href="/contact-us" 
                                className="btn btn-primary !bg-gradient-to-r !from-[#6D1A36] !to-[#5A2D82] hover:!from-[#5A2D82] hover:!to-[#6D1A36] !border-none px-10 py-3 !font-bold transition-all shadow-xl shadow-burgundy/20"
                            >
                                Contact Support
                            </motion.a>
                        </div>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default HowToUsePage