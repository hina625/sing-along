"use client"
import Navbar2 from '@/components/Navbar2'
import Footer from '@/components/Footer'
import React from 'react'
import { motion } from 'framer-motion'
import { IoMdMail, IoMdPin, IoMdCall } from 'react-icons/io'

const ContactUsPage = () => {
  return (
    <div className='zeeshan min-h-screen !bg-bg-dark selection:bg-deep-gold/30'>
      <Navbar2 />

      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="light-ray-container opacity-20"></div>
        <div className="pattern-bg absolute inset-0 opacity-5"></div>
      </div>

      <div className="relative z-10 pt-[10rem] pb-24">
        <div className="container mx-auto px-6">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h1 className="main-header text-5xl md:text-6xl mb-4">
              Get in <span className="text-white">Touch</span>
            </h1>
            <p className="main-para max-w-xl mx-auto opacity-70">
              Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>
          </motion.div>

          <div className="flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-full max-w-2xl"
            >
              <div className="card-awesome-black p-8 md:p-12 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-sm">

                <div className="absolute -top-24 -left-24 w-64 h-64 bg-royal-purple/10 blur-[80px] pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-deep-gold/10 blur-[80px] pointer-events-none"></div>

                <form method="post" action="http://localhost/hgsingalong/contact-us" className="space-y-6">
                  <input
                    type="hidden"
                    name="_token"
                    defaultValue="sPNoaGFatpeqYOkOhC0B0xvqouxAeQO6SHDjG7MW"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-white/60 text-[10px] font-bold tracking-widest ml-1 uppercase">Full Name</label>
                      <input
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-deep-gold/50 focus:bg-white/[0.08] transition-all"
                        type="text"
                        placeholder="Manan Rajpout"
                        name="name"
                        required
                        minLength={3}
                      />

                    </div>
                    <div className="space-y-2">
                      <label className="text-white/60 text-[10px] font-bold tracking-widest ml-1 uppercase">Email Address</label>
                      <input
                        className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-deep-gold/50 focus:bg-white/[0.08] transition-all"
                        type="email"
                        placeholder="example@gmail.com"
                        name="email"
                        required
                        minLength={10}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-[10px] font-bold tracking-widest ml-1 uppercase">Your Country</label>
                    <input
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-deep-gold/50 focus:bg-white/[0.08] transition-all"
                      name="country"
                      type="text"
                      placeholder="e.g. Pakistan"
                      required
                      minLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-white/60 text-[10px] font-bold tracking-widest ml-1 uppercase">Message</label>
                    <textarea
                      className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-deep-gold/50 focus:bg-white/[0.08] transition-all min-h-[160px] resize-none"
                      name="message"
                      placeholder="How can we help you today?"
                      rows={5}
                      minLength={10}
                      required
                    />
                  </div>

                  <div className="flex justify-center mt-4">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      type="submit"
                      className="px-10 py-3 rounded-xl bg-gradient-to-r from-royal-purple to-burgundy text-white font-bold text-base shadow-xl shadow-royal-purple/20 border border-white/10 hover:border-white/30 transition-all"
                    >
                      Send Message
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
            className="mt-12 flex flex-col md:flex-row justify-center items-center gap-12 text-center"
          >
            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-deep-gold group-hover:bg-deep-gold group-hover:text-black transition-all">
                <IoMdMail size={24} />
              </div>
              <span className="text-white/60 text-sm">info@hgsingalong.com</span>
            </div>

            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-royal-purple group-hover:bg-royal-purple group-hover:text-white transition-all">
                <IoMdPin size={24} />
              </div>
              <span className="text-white/60 text-sm">Global Virtual Operations</span>
            </div>

            <div className="flex flex-col items-center gap-2 group">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-burgundy group-hover:bg-burgundy group-hover:text-white transition-all">
                <IoMdCall size={24} />
              </div>
              <span className="text-white/60 text-sm">Priority Digital Support</span>
            </div>
          </motion.div>

        </div>
      </div>

      <Footer />
    </div>
  )
}

export default ContactUsPage