'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import Link from "next/link"
import { ReactNode } from "react"

const PartnerDialog = ({ children }: { children: ReactNode }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-background-3 border-none text-white max-w-[500px] p-0 shadow-2xl overflow-hidden">
        <div className="sidebar-glow p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-500 mb-4">
              SINGALONG CONNECT PARTNERSHIP
            </DialogTitle>
            <DialogDescription className="text-white/90 space-y-4 text-base text-left">
              <p>By partnering with SingAlong Connect, you help us maintain a high-quality platform where everyone can meet, share, and grow together.</p>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-orange-400">WHY PARTNER WITH US?</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><strong>Continuous Upgrades:</strong> Help us bring you the latest features and performance improvements.</li>
                  <li><strong>Enhanced Meetings:</strong> Supports the infrastructure for seamless, high-quality video worship.</li>
                  <li><strong>Community Growth:</strong> Your voluntary support helps us expand our reach and impact.</li>
                </ul>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <h4 className="font-semibold text-orange-400">IMPORTANT:</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>This partnership is completely optional and voluntary.</li>
                  <li>It is not required to use the platform or host meetings.</li>
                  <li>It helps us upgrade and scale SingAlong for a better experience.</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6">
             <Link href="/plans" className="w-full">
              <button className="btn-primary-worship py-3 w-full font-bold uppercase tracking-wider">
                I Agree
              </button>
             </Link>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PartnerDialog
