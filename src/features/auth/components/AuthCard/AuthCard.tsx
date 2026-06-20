import React from 'react';
import logoV2 from '@/assets/LogoKConnecta_V2.png';

interface AuthCardProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthCard({ children, title, subtitle }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 md:p-10">
        {(title || subtitle) && (
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center mb-6">
              <img
                src={logoV2}
                alt="KConnecta"
                className="w-16 h-16 rounded-2xl shadow-md object-cover"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{title}</h1>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-400 text-sm">{subtitle}</p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
