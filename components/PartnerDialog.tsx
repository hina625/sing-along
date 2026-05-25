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
      <DialogContent
        className="bg-background-3 border-none text-white p-0 shadow-2xl overflow-hidden flex flex-col w-[calc(100vw-1.5rem)] max-w-[500px] max-h-[90vh] sm:max-h-[85vh]"
      >
        <div className="sidebar-glow flex flex-col flex-1 min-h-0 p-4 sm:p-6">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-orange-500 mb-3 sm:mb-4 pr-8">
              SINGALONG CONNECT PARTNERSHIP
            </DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="text-white/90 space-y-4 text-sm sm:text-base text-left overflow-y-auto flex-1 min-h-0 pr-1 -mr-1">
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
            </div>
          </DialogDescription>
          <DialogFooter className="mt-4 sm:mt-6 shrink-0">
             <Link href="/donate" className="w-full">
              <button className="btn-primary-worship py-3 w-full font-bold uppercase tracking-wider">
                I Accept
              </button>
             </Link>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PartnerDialog
