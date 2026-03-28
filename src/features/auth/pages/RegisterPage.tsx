import React, { useState } from 'react';
import { Link } from 'react-router@7.1.3';
import { AuthCard } from '../components/AuthCard';
import { EmailStep, OTPVerificationStep, PasswordStep, ProfileSetupStep } from '../components/signup-steps';

type SignupStep = 'email' | 'otp' | 'password' | 'profile';

interface SignupData {
  email: string;
  password: string;
}

export function RegisterPage() {
  const [currentStep, setCurrentStep] = useState<SignupStep>('email');
  const [signupData, setSignupData] = useState<SignupData>({
    email: '',
    password: '',
  });

  const handleEmailNext = (email: string) => {
    setSignupData(prev => ({ ...prev, email }));
    setCurrentStep('otp');
  };

  const handleOTPNext = () => {
    setCurrentStep('password');
  };

  const handlePasswordNext = (password: string) => {
    setSignupData(prev => ({ ...prev, password }));
    setCurrentStep('profile');
  };

  const handleBackToEmail = () => {
    setCurrentStep('email');
  };

  const handleBackToOTP = () => {
    setCurrentStep('otp');
  };

  const handleBackToPassword = () => {
    setCurrentStep('password');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <AuthCard 
        title="" 
        subtitle=""
      >
        {currentStep === 'email' && (
          <EmailStep 
            onNext={handleEmailNext} 
            initialEmail={signupData.email}
          />
        )}

        {currentStep === 'otp' && (
          <OTPVerificationStep 
            email={signupData.email}
            onNext={handleOTPNext}
            onBack={handleBackToEmail}
          />
        )}

        {currentStep === 'password' && (
          <PasswordStep 
            onNext={handlePasswordNext}
            onBack={handleBackToOTP}
          />
        )}

        {currentStep === 'profile' && (
          <ProfileSetupStep 
            email={signupData.email}
            password={signupData.password}
            onBack={handleBackToPassword}
          />
        )}

        {currentStep === 'email' && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Đã có tài khoản?{' '}
            <Link 
              to="/auth/login" 
              className="text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              Đăng nhập
            </Link>
          </p>
        )}
      </AuthCard>
    </div>
  );
}
