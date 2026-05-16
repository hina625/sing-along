"use client";
import { ReactNode } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Image from "next/image";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children?: ReactNode;
  handleClick?: () => void;
  buttonText?: string;
  instantMeeting?: boolean;
  image?: string;
  buttonClassName?: string;
  buttonIcon?: string;
  isButtonShow?: boolean;
}

const MeetingModal = ({
  isOpen,
  onClose,
  title,
  className,
  children,
  handleClick,
  buttonText,
  instantMeeting,
  image,
  buttonClassName,
  buttonIcon,
  isButtonShow = true
}: MeetingModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="flex w-[calc(100%-1.5rem)] max-w-[520px] max-h-[90dvh] overflow-y-auto overscroll-contain flex-col gap-4 sm:gap-6 border-none bg-dark-1 px-4 py-6 sm:px-6 sm:py-9 text-white/90 z-[100000] rounded-xl"
      >
        <div className="flex flex-col gap-4 sm:gap-6">
          {image && (
            <div className="flex justify-center">
              <Image src={image} alt="checked" width={72} height={72} />
            </div>
          )}
          <h1
            className={cn(
              "text-xl sm:text-2xl md:text-3xl font-bold leading-tight sm:leading-snug md:leading-[42px] break-words pr-8",
              className,
            )}
          >
            {title}
          </h1>
          {children}
          {
            isButtonShow &&
            <Button
              className={
                "btn-primary-worship focus-visible:ring-0 focus-visible:ring-offset-0 w-full"
              }
              onClick={handleClick}
            >
              {buttonIcon && (
                <Image
                  src={buttonIcon}
                  alt="button icon"
                  width={13}
                  height={13}
                />
              )}{" "}
              &nbsp;
              {buttonText || "Schedule Meeting"}
            </Button>
          }

        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetingModal;
