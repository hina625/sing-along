"use client"
import { useUser } from '@clerk/nextjs'
import { Link } from 'lucide-react';
import React, { useState, useEffect } from 'react'
import { GiHamburgerMenu } from 'react-icons/gi'

const Navbar2 = () => {
  const { user } = useUser();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <nav className="navbar navbar-expand-lg  !bg-transparent !absolute top-0 left-0 right-0">
      <div className="container">
        {/* Brand */}
        <a className="#" href="/">
          <img
            alt="Image placeholder"
            src="/images/full-logo.png"
            id="navbar-logo"
            style={{ height: 70 }}
          />
        </a>
        <span className="text-center" style={{ marginLeft: 20 }}>
          <h3
            style={{
              color: "#F57C00", // Praise Orange
              marginBottom: 0,
              fontWeight: "bold",
              lineHeight: '20px',
              fontFamily: "'Marcellus', serif"
            }}
          >
            Sing Along <br />
            <small style={{ fontSize: "12.5px", fontWeight: 600, color: "#D4AF37" }}>
              HallelujahGospelGlobally
            </small>
          </h3>
        </span>
        {/* Toggler */}
        <button
          className="navbar-toggler"
          type="button"
          data-toggle="collapse"
          data-target="#navbarCollapse"
          aria-controls="navbarCollapse"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon text-foregroud-primary">
            <GiHamburgerMenu size={30} />
          </span>
        </button>
        {/* Collapse */}
        <div className="collapse2 navbar-collapse p-3 md:!p-0 rounded-md md:rounded-none" id="navbarCollapse">
          <ul className="navbar-nav mt-4 mt-lg-0 ml-auto">
            <li className="nav-item ">
              <a className="nav-link !text-black/80 md:!text-white/80  hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]" href="/">
                Home
              </a>
            </li>
            <li className="nav-item ">
              <a
                className="nav-link !text-black/80 md:!text-white/80  hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                href="/dashboard"
              >
                Dashboard
              </a>
            </li>
            <li
              className="nav-item dropdown dropdown-animate"
              data-toggle="hover"
            >
              <a
                className="nav-link !text-black/80 md:!text-white/80  hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                href="/about"
                role="button"
                data-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                About
              </a>
              <div className="dropdown-menu dropdown-menu-single">
                <a
                  href="/services"
                  className="dropdown-item !text-black/80 hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                >
                  Services
                </a>
                <a
                  href="/how-to-use"
                  className="dropdown-item !text-black/80 hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                >
                  Guidelines
                </a>
                <a
                  href="/plans"
                  className="dropdown-item !text-black/80 hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                >
                  Pricing
                </a>
                <a
                  href="/features"
                  className="dropdown-item !text-black/80 hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                >
                  Features
                </a>
                {/* <div class="dropdown-divider"></div> */}
              </div>
            </li>
            <li className="nav-item ">
              <a
                className="nav-link !text-black/80 md:!text-white/80  hover:!text-foregroud-primary !font-medium hover:!font-normal !text-[18px]"
                href="/contact-us"
              >
                Contact
              </a>
            </li>
          </ul>
          {/* Button */}
          {isMounted && !user && (
            <a
                className="navbar-btn btn btn-sm btn-primary !bg-foregroud-primary text-white !border-none hover:!scale-110 d-none d-lg-inline-block ml-3 !text-[18px] !font-medium hover:!font-normal"
                href={`/sign-in?redirect_url=${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`}
              >
                Sign In
              </a>
          )}
              
            

          {/* Mobile button
      <div class="d-lg-none text-center">
        <a href="" class="btn btn-block btn-sm btn-warning">See more details</a>
      </div>
          */}
        </div>
      </div>
    </nav>
  )
}

export default Navbar2