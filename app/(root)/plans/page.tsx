'use client';
import Navbar2 from '@/components/Navbar2';
import Footer from '@/components/Footer';
import { useContext, useMemo } from 'react';
import { planslist, Plan } from '@/constants';
import { subscriptionContext } from '@/providers/SubscriptionProvider';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { IoMdCheckmark } from 'react-icons/io';

interface VisiblePlan extends Plan {
    key: string;
}

const PlansPage = () => {
    const { subscription } = useContext(subscriptionContext);
    const { user } = useUser();
    const router = useRouter();
    const { toast } = useToast();

    const handlePurchase = (e: React.MouseEvent, key: string) => {
        e.stopPropagation();
        if (!user) {
            toast({ title: 'Please sign in first' });
            router.push('/sign-in');
            return;
        }
        if (key === 'enterprise') {
            router.push('/contact-us?subject=enterprise');
            return;
        }
        router.push(`/checkout?plan=${key}`);
    };

    // Hide legacy aliases from the public page (kept in `planslist` only for
    // backwards-compat with users whose subscription row still says 'plus').
    const HIDDEN_KEYS = useMemo(() => new Set(['plus']), []);

    const churchPlans: VisiblePlan[] = useMemo(
        () => Object.entries(planslist)
            .filter(([k, p]) => !HIDDEN_KEYS.has(k) && p.audience === 'church')
            .map(([key, p]) => ({ key, ...p })),
        [HIDDEN_KEYS],
    );
    const enterprisePlans: VisiblePlan[] = useMemo(
        () => Object.entries(planslist)
            .filter(([k, p]) => !HIDDEN_KEYS.has(k) && p.audience === 'enterprise')
            .map(([key, p]) => ({ key, ...p })),
        [HIDDEN_KEYS],
    );

    const renderCard = (plan: VisiblePlan) => {
        const isCurrent = subscription === plan.key
            || (plan.key === 'growth' && subscription === 'plus'); // legacy alias
        const isFreePlan = plan.key === 'free';
        const isEnterprise = plan.key === 'enterprise';

        return (
            <div key={plan.key} className={`w-full max-w-[20rem] ${plan.popular ? 'lg:scale-105' : ''}`}>
                <div className={`card card-pricing card-awesome-black text-center px-3 hover-scale-105 relative ${plan.popular ? 'border border-[#D4AF37]' : ''}`}>
                    {plan.popular && (
                        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] text-white shadow">
                            Most Popular
                        </span>
                    )}
                    <div className="card-header py-5 border-0 delimiter-bottom">
                        <div className="h1 text-center mb-0 !text-white">
                            {isEnterprise ? (
                                <span className="font-weight-bolder">Custom</span>
                            ) : (
                                <>
                                    $<span className="price font-weight-bolder">{plan.price}</span>
                                    <span className="text-base font-normal text-white/55">/mo</span>
                                </>
                            )}
                        </div>
                        <span className="h6 !text-white">{plan.title}</span>
                    </div>
                    <div className="card-body !p-1 !text-white">
                        <span className="h6 !text-white" style={{ fontWeight: 'bold' }}>Features:</span>
                        <ul className="list-unstyled text-sm mb-4">
                            {plan.features.map((text) => (
                                <li key={text} className="py-2 !text-left flex gap-2 items-start">
                                    <IoMdCheckmark className="text-[#D4AF37] mt-1 shrink-0" /> <span>{text}</span>
                                </li>
                            ))}
                        </ul>
                        {isCurrent ? (
                            <a className="btn btn-sm !bg-[#1ebbc4] !text-white hover-translate-y-n3 hover-shadow-lg mb-3 cursor-default">
                                Current Plan
                            </a>
                        ) : isFreePlan ? (
                            <a className="btn btn-sm !bg-white/10 !text-white hover-translate-y-n3 hover-shadow-lg mb-3 cursor-default">
                                Free Forever
                            </a>
                        ) : (
                            <a
                                onClick={(e) => handlePurchase(e, plan.key)}
                                className="btn btn-sm !bg-[#1ebbc4] !text-white hover-translate-y-n3 hover-shadow-lg mb-3 cursor-pointer"
                            >
                                {isEnterprise ? 'Contact Sales' : 'Purchase Now'}
                            </a>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="zeeshan">
            <Navbar2 />
            <section className="slice bg-cover bg-no-repeat !pt-[10rem] !bg-bg-dark relative overflow-hidden min-h-screen text-gray-400 body-font pb-14">
                <div className="light-ray-container opacity-20" />
                <div className="container relative z-10 px-6 mx-auto">
                    <div className="flex items-center justify-center flex-col mb-12">
                        <h2 className="mt-4 text-gradient">Pricing for every congregation</h2>
                        <div className="mt-2 text-white/80">
                            <p className="leading-7 max-w-[40rem] text-center font-[300] text-[1.125rem]">
                                Start free. Upgrade when your worship outgrows the room.
                                All plans include lyrics mode, prayer requests, and donations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Church track */}
                <div className="container relative z-10 px-6 mx-auto mb-10">
                    <h3 className="text-center text-white/85 mb-6 text-xl font-semibold">For churches & ministries</h3>
                    <div className="flex flex-wrap items-stretch justify-center gap-7">
                        {churchPlans.map(renderCard)}
                    </div>
                </div>

                {/* Enterprise */}
                {enterprisePlans.length > 0 && (
                    <div className="container relative z-10 px-6 mx-auto mb-12">
                        <h3 className="text-center text-white/85 mb-6 text-xl font-semibold">Large organizations</h3>
                        <div className="flex flex-wrap items-stretch justify-center gap-7">
                            {enterprisePlans.map(renderCard)}
                        </div>
                    </div>
                )}

                <div className="mt-5 text-center">
                    <p className="mb-2 text-white/80">
                        All paid plans include priority support. Questions?
                    </p>
                    <a href="/contact-us" className="!text-foregroud-primary text-underline--dashed">
                        Contact us
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none"
                             stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                             className="feather feather-arrow-right ml-2">
                            <line x1={5} y1={12} x2={19} y2={12} />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </a>
                </div>
            </section>
            <Footer />
        </div>
    );
};

export default PlansPage;
