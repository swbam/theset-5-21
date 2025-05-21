
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new Auth page
    navigate('/auth', { replace: true });
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
      <span>Redirecting to login...</span>
    </div>
  );
};

export default Login;
