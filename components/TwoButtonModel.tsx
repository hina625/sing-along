"use client";
import { ReactNode } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Image from "next/image";

interface TwoButtonModelProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    className?: string;
    children?: ReactNode;
    handleClick?: () => void;
    handleSecondClick?: () => void;
    buttonText?: string;
    instantMeeting?: boolean;
    image?: string;
    buttonClassName?: string;
    buttonIcon?: string;
}

const TwoButtonModel = ({
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
    handleSecondClick
}: TwoButtonModelProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="flex w-full max-w-[520px] flex-col gap-6 border-none bg-dark-1 px-6 py-9 text-black/90 z-[100000]">
                <div className="flex flex-col gap-6">
                    {image && (
                        <div className="flex justify-center">
                            <Image src={image} alt="checked" width={72} height={72} />
                        </div>
                    )}
                    <h1 className={cn("text-3xl font-bold leading-[42px]", className)}>
                        {title}
                    </h1>
                    {children}

                    <div className="flex items-center gap-4">
                    <Button
                            className={
                                "bg-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                            }
                            onClick={handleSecondClick}
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
                            Continue With Free
                        </Button>

                        <Button
                            className={
                                "bg-blue-1 focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
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
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
};

export default TwoButtonModel;
