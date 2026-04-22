"use client";
import { ReactNode } from "react";
import { Dialog, DialogContent } from "./ui/dialog";

interface IProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode
}

const InvitePeaople = ({
  isOpen,
  onClose,
  children
}:IProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex w-full max-w-4xl  flex-col gap-6 border-none bg-dark-1 px-6 py-9 text-black/90">
       {children}
      </DialogContent>
    </Dialog>
  );
};

export default InvitePeaople;
