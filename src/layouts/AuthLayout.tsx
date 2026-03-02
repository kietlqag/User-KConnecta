import React from 'react';
import { Outlet } from 'react-router@7.1.3';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <Outlet />
    </div>
  );
}