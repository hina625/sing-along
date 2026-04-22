import React from 'react'

const Footer = () => {
    return (
        <footer className="position-relative" id="footer-main">
            <div className="footer pt-lg-7 footer-dark !bg-background-4">
                {/* SVG shape */}
                <div className="shape-container shape-line shape-position-top shape-orientation-inverse">
                    <svg
                        width="2560px"
                        height="100px"
                        xmlns="http://www.w3.org/2000/svg"
                        xmlnsXlink="http://www.w3.org/1999/xlink"
                        preserveAspectRatio="none"
                        x="0px"
                        y="0px"
                        viewBox="0 0 2560 100"
                        xmlSpace="preserve"
                        className=" fill-section-secondary"
                    >
                        <polygon points="2560 0 2560 100 0 100" fill='#1f2226' />
                    </svg>
                </div>

                {/* Footer */}
                <div className="container pt-4">
                    <div className="row">
                        <div className="col-lg-4 mb-5 mb-lg-0">
                            {/* Theme's logo */}
                            <a href="/">
                                <img
                                    alt="Image placeholder"
                                    src="/images/apple-icon-60x60.png"
                                    id="footer-logo"
                                />
                            </a>
                            <p className="text-sm opacity-8 pr-lg-4 !text-white !font-[400] !text-[18px] !leading-[27px] mt-4">
                                Sing Along is a video conferencing/meeting platform offered by
                                Hallelujah Gospel Globally. We offer high-quality, secured, and
                                hassle-free meetings.
                            </p>
                        </div>

                        <div className="col-lg-2 col-6 col-sm-4 ml-lg-auto mb-5 mb-lg-0">
                            <h6 className="heading mb-3 text-white">Account</h6>
                            <ul className="list-unstyled">
                                <li>
                                    <a href="/dashboard/account" className="text-white/60 hover:text-white">Profile</a>
                                </li>
                                <li>
                                    <a href="/dashboard/meetings" className="text-white/60 hover:text-white">My Meetings</a>
                                </li>
                                <li>
                                    <a href="/dashboard/recordings" className="text-white/60 hover:text-white">Recordings</a>
                                </li>
                            </ul>
                        </div>
                        <div className="col-lg-2 col-6 col-sm-4 mb-5 mb-lg-0">
                            <h6 className="heading mb-3 text-white">Information</h6>
                            <ul className="list-unstyled">
                                <li>
                                    <a href="/about" className="text-white/60 hover:text-white">About</a>
                                </li>
                                <li>
                                    <a href="/services" className="text-white/60 hover:text-white">Services</a>
                                </li>
                                <li>
                                    <a href="/plans" className="text-white/60 hover:text-white">Pricing</a>
                                </li>
                            </ul>
                        </div>
                        <div className="col-lg-2 col-6 col-sm-4 mb-5 mb-lg-0">
                            <h6 className="heading mb-3 text-white">Our Apps</h6>
                            <div className="flex flex-wrap gap-2">
                                <a href="#" className="mb-1">
                                    <img
                                        src="/images/app-store-badge.png"
                                        alt="App Store"
                                        width={135}
                                        height={40}
                                    />
                                </a>
                                <a href="#">
                                    <img
                                        src="/images/google-play-badge.png"
                                        alt="Google Play"
                                        width={135}
                                    />
                                </a>
                            </div>
                        </div>
                    </div>

                    <div className='flex items-center justify-end gap-4 mt-8 flex-wrap'>
                        <img src="https://hallelujahgospel.org/public/new/img/hallulia/bbb.png" width="85" className="p-0 m-0" alt="Stamp" />
                        <img src="https://hallelujahgospel.org/public/new/img/hallulia/access.png" width="65" className="p-0 m-0 me-2" alt="Stamp" />
                        <img src="https://hallelujahgospel.org/public/new/img/hallulia/lock.png" width="65" className="p-0 m-0 me-2" alt="Stamp" />
                        <img src="https://hallelujahgospel.org/public/new/img/hallulia/apple.png" width="70" className="p-0 m-0 me-2" alt="Stamp" />
                        <img src="https://hallelujahgospel.org/public/new/img/hallulia/g-play.png" width="70" className="p-0 m-0" alt="Stamp" />
                        <img src='/images/stamps.jpg' className='p-0 m-0 w-[4rem] h-[4rem] rounded-full' alt="Stamp" />
                    </div>

                    <hr className="divider divider-fade divider-dark my-4 opacity-10" />

                    <div className="row align-items-center justify-content-md-between pb-4">
                        <div className="col-md-6">
                            <div className="copyright text-sm font-weight-bold text-center text-md-left text-white/60">
                                © 2024{" "}
                                <a
                                    href="https://hgsingalong.com/"
                                    className="font-weight-bold text-white hover:text-deep-gold"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Sing Along
                                </a>
                                . All rights reserved.
                            </div>
                        </div>
                        <div className="col-md-6">
                            <ul className="nav justify-content-center justify-content-md-end mt-3 mt-md-0">
                                <li className="nav-item">
                                    <a
                                        className="nav-link !text-white/60 hover:!text-foregroud-primary"
                                        href="/terms"
                                    >
                                        Terms & Conditions
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className="nav-link !text-white/60 hover:!text-foregroud-primary"
                                        href="/policy"
                                    >
                                        Privacy Policy
                                    </a>
                                </li>
                                <li className="nav-item">
                                    <a
                                        className="nav-link !text-white/60 hover:!text-foregroud-primary"
                                        href="/contact-us"
                                    >
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer
