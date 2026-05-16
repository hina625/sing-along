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

    const standardPlans: VisiblePlan[] = useMemo(
        () => Object.entries(planslist)
            .filter(([k, p]) => !HIDDEN_KEYS.has(k) && p.audience === 'standard')
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
            <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl p-5 sm:p-6 bg-[#1A1A1A] border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    plan.popular
                        ? 'border-[#D4AF37]/60 shadow-lg shadow-[#D4AF37]/10'
                        : 'border-white/10'
                }`}
            >
                {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] text-white shadow">
                        Most Popular
                    </span>
                )}

                <div className="pb-4 border-b border-white/10">
                    <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider">
                        {plan.title}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-1">
                        {isEnterprise ? (
                            <span className="text-3xl sm:text-4xl font-bold text-white">Custom</span>
                        ) : (
                            <>
                                <span className="text-3xl sm:text-4xl font-bold text-white">${plan.price}</span>
                                <span className="text-sm font-normal text-white/55">/mo</span>
                            </>
                        )}
                    </div>
                </div>

                <ul className="mt-4 space-y-2.5 flex-1">
                    {plan.features.map((text) => (
                        <li key={text} className="flex gap-2 items-start text-sm text-white/85">
                            <IoMdCheckmark className="text-[#D4AF37] mt-1 shrink-0" />
                            <span className="break-words">{text}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-5">
                    {isCurrent ? (
                        <button className="w-full py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium cursor-default">
                            Current Plan
                        </button>
                    ) : isFreePlan ? (
                        <button className="w-full py-2.5 rounded-lg bg-white/10 text-white text-sm font-medium cursor-default">
                            Free Forever
                        </button>
                    ) : (
                        <button
                            onClick={(e) => handlePurchase(e, plan.key)}
                            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                plan.popular
                                    ? 'bg-gradient-to-r from-[#5A2D82] to-[#D4AF37] text-white hover:shadow-lg hover:shadow-[#D4AF37]/30'
                                    : 'bg-[#1ebbc4] text-white hover:bg-[#1ebbc4]/90'
                            }`}
                        >
                            {isEnterprise ? 'Contact Sales' : 'Get Started'}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="zeeshan overflow-x-hidden">
            <Navbar2 />
            <section className="slice bg-cover bg-no-repeat !pt-[7rem] md:!pt-[10rem] !pb-10 md:!pb-16 !bg-bg-dark relative overflow-hidden text-gray-400 body-font">
                <div className="light-ray-container opacity-20" />
                <div className="container relative z-10 px-4 sm:px-6 mx-auto">
                    <div className="flex items-center justify-center flex-col mb-6 md:mb-10 text-center">
                        <span className="inline-block px-3 sm:px-4 py-1.5 mb-3 text-[10px] sm:text-xs font-semibold text-[#D4AF37] uppercase tracking-[0.2em] border border-[#D4AF37]/30 rounded-full bg-[#D4AF37]/5">
                            Pricing Plans
                        </span>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient !leading-tight">
                            Pricing for every team
                        </h1>
                        <p className="mt-3 mb-0 !text-white leading-7 max-w-[40rem] text-center font-[300] text-base sm:text-[1.125rem] px-2">
                            Start free. Upgrade as your audience grows.
                            All plans include live meetings, recordings, and real-time collaboration.
                        </p>
                    </div>
                </div>

                {/* Standard plans */}
                <div className="container relative z-10 px-4 sm:px-6 mx-auto mb-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 max-w-7xl mx-auto items-stretch">
                        {standardPlans.map(renderCard)}
                    </div>
                </div>

                {/* Enterprise */}
                {enterprisePlans.length > 0 && (
                    <div className="container relative z-10 px-4 sm:px-6 mx-auto mb-12">
                        <div className="max-w-2xl mx-auto">
                            {enterprisePlans.map(renderCard)}
                        </div>
                    </div>
                )}

                <div className="mt-5 text-center px-4">
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
