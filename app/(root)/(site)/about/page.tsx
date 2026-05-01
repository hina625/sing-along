"use client"
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdHeart, IoMdMusicalNotes, IoMdPeople, IoMdStar } from 'react-icons/io'

const AboutPage = () => {
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
                            About <span className="text-white">Us</span>
                        </h1>
                        <p className="main-para max-w-2xl mx-auto text-xl opacity-80 leading-relaxed font-light">
                            Empowering communities to unite through the power of gospel music and seamless digital connection.
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

            {/* Section 1: Our Mission */}
            <section className="slice slice-lg !bg-[#121212] relative py-20">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center gap-16">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <span className="text-deep-gold font-bold tracking-widest text-xs mb-4 block uppercase">01 / Our Mission</span>
                            <h2 className="text-2xl md:text-5xl text-gradient mb-6 leading-tight">Spreading Joy <br />Through Harmony</h2>
                            <p className="main-para !text-white/80 mb-6 leading-relaxed">
                                Hallelujah Gospel Sing-Along was founded with a simple yet profound vision: to bridge distances and bring people together through the transformative power of worship and song.
                            </p>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <div className="text-deep-gold text-2xl"><IoMdMusicalNotes /></div>
                                    <p className="text-sm text-white/60">Professional Grade Audio for Pure Worship</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center gap-4">
                                    <div className="text-royal-purple text-2xl"><IoMdPeople /></div>
                                    <p className="text-sm text-white/60">Building Global Faith Communities</p>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            className="w-full md:w-1/2"
                        >
                            <div className="relative">
                                <div className="absolute -inset-4 bg-gradient-to-r from-deep-gold/20 to-royal-purple/20 blur-2xl opacity-30 rounded-full"></div>
                                <img 
                                    src="/images/hero-image.jpg" 
                                    alt="Community Singing" 
                                    className="relative rounded-2xl shadow-2xl border border-white/10 w-full object-cover h-[400px]"
                                />
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

            {/* Section 2: Why We Exist */}
            <section className="slice slice-lg !bg-bg-dark relative py-16 overflow-hidden">
                <div className="pattern-bg absolute inset-0 opacity-5"></div>
                <div className="container relative z-10 mx-auto px-6">
                    <div className="text-center mb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="main-header text-2xl md:text-5xl mb-4">Core <span className="text-white">Values</span></h2>
                            <p className="main-para max-w-2xl mx-auto">The pillars that define our commitment to you and your community.</p>
                        </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <IoMdHeart />,
                                title: "Passion",
                                desc: "Every line of code is written with a passion for music and community engagement.",
                                color: "text-red-500"
                            },
                            {
                                icon: <IoMdStar />,
                                title: "Quality",
                                desc: "We provide high-definition video and crystal-clear audio to ensure every note is heard.",
                                color: "text-deep-gold"
                            },
                            {
                                icon: <IoMdPeople />,
                                title: "Inclusivity",
                                desc: "Designed for everyone, regardless of technical skill, to join and sing along together.",
                                color: "text-royal-purple"
                            }
                        ].map((value, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-sm hover:bg-white/[0.05] transition-all group"
                            >
                                <div className={`${value.color} text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                                    {value.icon}
                                </div>
                                <h4 className="text-lg font-bold text-white mb-2">{value.title}</h4>
                                <p className="text-white/60 leading-relaxed text-sm">{value.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Section 3: Platform Highlights */}
            <section className="slice slice-lg !bg-[#0A0A0A] relative py-20 overflow-hidden">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                        >
                            <h2 className="main-header text-4xl mb-8">What Makes Us <span className="text-white">Unique</span></h2>
                            <div className="space-y-8">
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-full bg-deep-gold/10 flex items-center justify-center text-deep-gold shrink-0 border border-deep-gold/20">
                                        <IoMdStar size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-xl font-bold mb-2">Private Gospel Servers</h4>
                                        <p className="text-white/60">Unlike generic platforms, we offer dedicated servers optimized for musical frequencies and worship environments.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-full bg-royal-purple/10 flex items-center justify-center text-royal-purple shrink-0 border border-royal-purple/20">
                                        <IoMdPeople size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-xl font-bold mb-2">Built for Collaboration</h4>
                                        <p className="text-white/60">Share lyrics, chords, and music sheets in real-time during your sing-along sessions.</p>
                                    </div>
                                </div>
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 rounded-full bg-deep-gold/10 flex items-center justify-center text-deep-gold shrink-0 border border-deep-gold/20">
                                        <IoMdMusicalNotes size={24} />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-xl font-bold mb-2">Crystal Clear Audio</h4>
                                        <p className="text-white/60">Advanced noise cancellation and high-fidelity audio streams ensure that every voice is heard in harmony.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                             <img 
                                src="/images/worship_hero.png" 
                                alt="Platform Highlights" 
                                className="rounded-2xl shadow-2xl border border-white/10 w-full object-cover"
                            />
                            <div className="absolute -bottom-6 -left-6 p-6 bg-[#121212] rounded-xl border border-white/10 shadow-2xl hidden md:block">
                                <div className="text-deep-gold font-bold text-3xl mb-1">100%</div>
                                <div className="text-white/40 text-xs uppercase tracking-widest">Secured & Encrypted</div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="slice slice-lg !bg-[#121212] relative py-24">
                <div className="container relative z-10 mx-auto px-6">
                    <div className="max-w-4xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-royal-purple/20 to-deep-gold/10 border border-white/10 text-center relative overflow-hidden">
                        <div className="light-ray-container opacity-10"></div>
                        <h2 className="h1 text-white mb-6">Ready to Join the Harmony?</h2>
                        <p className="main-para !text-white/70 mb-10 max-w-xl mx-auto">
                            Start your journey with Hallelujah Gospel Sing-Along today and experience worship like never before with our premium video conferencing suite.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <a href="/dashboard" className="btn-primary-worship px-12 py-4 rounded-full font-bold shadow-2xl shadow-royal-purple/20 hover:scale-105 transition-all">
                                Get Started Now
                            </a>
                            <a href="/contact-us" className="btn btn-neutral !bg-transparent !border-2 !border-white/20 hover:!border-deep-gold hover:!text-deep-gold !text-white px-12 py-4 rounded-full font-bold transition-all">
                                Contact Us
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}

export default AboutPage
