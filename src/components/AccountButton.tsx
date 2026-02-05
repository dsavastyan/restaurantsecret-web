import React from 'react';
import { Link } from 'react-router-dom';

/**
 * AccountButton component - A circular profile button with a soft green gradient
 * and a minimalistic outline icon, matching the iOS design aesthetic.
 * 
 * Customization:
 * - Background gradient: .account-button__inner background
 * - Icon color: .account-button__inner color (#2F5D4A)
 * - Size: Responsive (36px on mobile, 40px on desktop) via CSS
 */
export default function AccountButton() {
    return (
        <Link to="/account" className="account-button" aria-label="Личный кабинет">
            <div className="account-button__inner">
                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="account-button__icon"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* User head */}
                    <circle cx="12" cy="7" r="4" />
                    {/* User shoulders/body */}
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                </svg>
            </div>
        </Link>
    );
}
