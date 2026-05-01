"use client"
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdInformationCircle, IoMdLock, IoMdPerson, IoMdGlobe } from 'react-icons/io'

const PrivacyPolicyPage = () => {
    return (
        <div className='zeeshan min-h-screen !bg-bg-dark selection:bg-deep-gold/30 overflow-x-hidden'>
            <Navbar2 />

            {/* Hero Section */}
            <section className="slice !pt-[10rem] !pb-24 !bg-bg-dark relative overflow-hidden">
                <div className="light-ray-container opacity-25"></div>
                <div className="pattern-bg absolute inset-0 opacity-5"></div>

                <div className="container relative z-10 mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    >
                        <h1 className="main-header text-3xl md:text-7xl lg:text-8xl mb-6">
                            Privacy <span className="text-white">Policy</span>
                        </h1>
                        <p className="main-para max-w-2xl mx-auto text-xl opacity-80 leading-relaxed font-light">
                            Committed to protecting your digital presence with transparency, security, and the highest standards of data integrity.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Shape Separator */}
            <div className="shape-container shape-line shape-position-top shape-orientation-inverse relative z-20">
                <svg width="2560px" height="100px" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 2560 100" className="fill-section-secondary">
                    <polygon points="2560 0 2560 100 0 100" fill='#121212' />
                </svg>
            </div>

            {/* Section 1: Introduction & Definitions */}
            <section className="slice slice-lg !bg-[#121212] relative py-20">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <span className="text-deep-gold font-bold tracking-widest text-xs mb-4 block uppercase">01 / Foundation</span>
                            <h2 className="text-2xl md:text-5xl text-gradient mb-6 leading-tight">Definitions & <br />Scope</h2>
                            <p className="main-para !text-white/80 mb-6 leading-relaxed">
                                This Privacy Policy explains how Hallelujah Gospel Sing-Along collects and manages your information. "Services" refers to our video conferencing, collaboration tools, and software platforms.
                            </p>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <div className="text-deep-gold text-2xl"><IoMdInformationCircle /></div>
                                    <p className="text-sm text-white/60">Effective July 6, 2024</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <div className="text-royal-purple text-2xl"><IoMdGlobe /></div>
                                    <p className="text-sm text-white/60">Global Virtual Operations Compliance</p>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2 grid grid-cols-2 gap-4"
                        >
                            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm flex flex-col items-center text-center">
                                <h4 className="text-white font-bold mb-2">Policy</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Core Document</p>
                            </div>
                            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm flex flex-col items-center text-center">
                                <h4 className="text-white font-bold mb-2">Services</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Meeting Suite</p>
                            </div>
                            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm flex flex-col items-center text-center">
                                <h4 className="text-white font-bold mb-2">Users</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Participants</p>
                            </div>
                            <div className="p-8 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm flex flex-col items-center text-center">
                                <h4 className="text-white font-bold mb-2">Data</h4>
                                <p className="text-[10px] text-white/40 uppercase tracking-widest">Personal Info</p>
                            </div>
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

            {/* Section 2: Why We Process Data */}
            <section className="slice slice-lg !bg-bg-dark relative py-20">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row-reverse items-center gap-16">
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <span className="text-royal-purple font-bold tracking-widest text-xs mb-4 block uppercase">02 / Processing</span>
                            <h2 className="text-2xl md:text-5xl text-gradient mb-6 leading-tight">Reasons for <br />Processing</h2>
                            <p className="main-para !text-white/80 mb-8 leading-relaxed">
                                We process your information to fulfill contractual obligations, provide technical support, and ensure a personalized, secure meeting experience for your organization.
                            </p>
                            <ul className="space-y-4">
                                {["Transactional fulfillment", "Service security verification", "Proactive technical support", "Feature optimization"].map((txt, i) => (
                                    <li key={i} className="flex items-center gap-4 text-white/70">
                                        <div className="w-2 h-2 rounded-full bg-deep-gold"></div>
                                        <span>{txt}</span>
                                    </li>
                                ))}
                            </ul>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <div className="card-awesome-black p-10 rounded-3xl border border-white/10 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-8 text-6xl text-white/5"><IoMdLock /></div>
                                <h3 className="text-2xl font-bold text-white mb-6">Security First</h3>
                                <p className="text-sm text-white/50 leading-relaxed italic">
                                    "We prioritize data integrity through advanced encryption and regular audits, ensuring your virtual interactions remain private."
                                </p>
                            </div>
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

            {/* Section 3: Data Protection & EU Rights */}
            <section className="slice slice-lg !bg-[#121212] relative py-20">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-deep-gold font-bold tracking-widest text-xs mb-4 block uppercase">03 / Protection</span>
                        <h2 className="text-2xl md:text-5xl text-gradient mb-4">Your Data Rights</h2>
                        <p className="text-white/60 max-w-xl mx-auto">Providing users with full control over their digital information in accordance with global privacy laws.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { title: "Review", desc: "Access your provided information anytime" },
                            { title: "Correction", desc: "Request updates to your data record" },
                            { title: "Removal", desc: "Permanent deletion upon request" },
                            { title: "Restriction", desc: "Control how your data is processed" },
                            { title: "Portability", desc: "Transfer data in structured formats" },
                            { title: "Opt-Out", desc: "Withdraw consent from marketing" }
                        ].map((right, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                viewport={{ once: true }}
                                className="flex flex-col p-6 rounded-xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all cursor-default"
                            >
                                <h4 className="text-white font-bold text-lg mb-2">{right.title}</h4>
                                <p className="text-xs text-white/50">{right.desc}</p>
                                <div className="mt-4 w-8 h-1 bg-deep-gold/30 rounded-full group-hover:w-full transition-all"></div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="mt-20 p-8 rounded-3xl bg-gradient-to-r from-royal-purple/10 to-burgundy/10 border border-white/10 text-center"
                    >
                        <div className="text-4xl text-deep-gold flex justify-center mb-4"><IoMdPerson /></div>
                        <h3 className="text-2xl font-bold text-white mb-4">Contact Privacy Team</h3>
                        <p className="text-white/70 mb-6">Have specific questions regarding your data or our practices?</p>
                        <a href="mailto:info@hgsingalong.com" className="inline-block px-10 py-4 rounded-full bg-gradient-to-r from-royal-purple to-burgundy text-white font-bold shadow-xl shadow-royal-purple/20 hover:scale-105 transition-transform">
                            info@hgsingalong.com
                        </a>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default PrivacyPolicyPage