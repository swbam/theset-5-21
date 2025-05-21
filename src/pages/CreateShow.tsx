
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CreateShowForm from '@/components/shows/CreateShowForm';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth/AuthContext';

const CreateShow = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow px-6 md:px-8 lg:px-12 py-12">
        <div className="max-w-2xl mx-auto">
          <Button 
            variant="ghost" 
            className="mb-6" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-4">Create a New Show</h1>
            <p className="text-muted-foreground">
              Add a new concert to the platform and let fans vote on the setlist
            </p>
          </div>
          
          <div className="bg-card border border-border rounded-xl p-6 md:p-8">
            <CreateShowForm />
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default CreateShow;
