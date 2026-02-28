import BackButton from '../components/BackButton';
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../utils/api';



export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await axios.post(`${API}/auth/verify-email?token=${token}`);
      setStatus('success');
      setMessage(response.data.message || 'Email verified successfully!');
      toast.success('Email verified! You can now login.');
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setStatus('error');
      setMessage(
        error.response?.data?.detail || 
        'Verification failed. The link may have expired.'
      );
      toast.error('Verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4EFE9]">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <BackButton />
        {status === 'verifying' && (
          <div>
            <Loader2 className="w-16 h-16 text-[#1C1C1C] mx-auto mb-6 animate-spin" />
            <h1 className="font-heading text-3xl font-bold text-[#1C1C1C] mb-4">
              Verifying Email...
            </h1>
            <p className="text-[#7A7A7A]">Please wait while we verify your email address</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h1 className="font-heading text-4xl font-bold text-[#1C1C1C] mb-4">
              Email Verified!
            </h1>
            <p className="text-[#4A4A4A] mb-8">{message}</p>
            <p className="text-[#7A7A7A] mb-6">Redirecting to login...</p>
            <Link to="/login">
              <Button className="bg-[#1C1C1C] hover:bg-[#4A4A4A] text-white rounded-full">
                Go to Login
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="font-heading text-3xl font-bold text-[#1C1C1C] mb-4">
              Verification Failed
            </h1>
            <p className="text-[#4A4A4A] mb-8">{message}</p>
            <div className="flex gap-4 justify-center">
              <Link to="/login">
                <Button variant="outline" className="rounded-full border-[#DED7CE]">
                  Go to Login
                </Button>
              </Link>
              <Link to="/register">
                <Button className="bg-[#1C1C1C] hover:bg-[#4A4A4A] text-white rounded-full">
                  Register Again
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
