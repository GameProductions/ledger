import { useEffect } from 'react';
import { useNavigate } from 'react-router';

export default function LoginRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/#/login', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );
}
