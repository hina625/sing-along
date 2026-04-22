'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface FeatureCardProps {
  title: string
  description: string
  icon: React.ReactNode
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="bg-white overflow-hidden shadow-lg rounded-lg border border-gray-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.03 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-center w-12 h-12 mb-5 bg-blue-100 rounded-full">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? 'auto' : 0 }}
          transition={{ duration: 0.3 }}
          className="text-sm text-gray-500 overflow-hidden"
        >
          {description}
        </motion.div>
      </div>
    </motion.div>
  )
}

