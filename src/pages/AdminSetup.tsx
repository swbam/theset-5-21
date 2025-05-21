import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/use-auth';
import { AlertCircle, CheckCircle, Shield } from 'lucide-react';

const AdminSetup: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<{
    message: string;
    success: boolean;
    loading: boolean;
  }>({
    message: '',
    success: false,
    loading: false
  });

  const handleSetAdminStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true, message: '' }));
    
    try {
      const response = await fetch('/api/admin/set-admin', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      setStatus({
        message: data.message,
        success: data.success,
        loading: false
      });
    } catch (error) {
      console.error('Error setting admin status:', error);
      setStatus({
        message: error instanceof Error ? error.message : 'Failed to set admin status',
        success: false,
        loading: false
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader>
            <CardTitle>Admin Setup</CardTitle>
            <CardDescription>Set up your account as an admin for TheSet application</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                You need to be logged in to access this page.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const isTargetEmail = user?.email === 'seth@bambl.ing';

  return (
    <div className="container max-w-2xl py-12">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Admin Setup
          </CardTitle>
          <CardDescription>Set up your account as an admin for TheSet application</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="font-semibold">Current Account</div>
              <div className="text-sm text-muted-foreground mt-1">{user?.email}</div>
            </div>
            
            {!isTargetEmail && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Email Not Authorized</AlertTitle>
                <AlertDescription>
                  Only seth@bambl.ing can be set as an admin.
                </AlertDescription>
              </Alert>
            )}
            
            {status.message && (
              <Alert variant={status.success ? "default" : "destructive"} className={status.success ? "bg-green-50 text-green-800 border-green-200" : ""}>
                {status.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertTitle>{status.success ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{status.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleSetAdminStatus} 
            disabled={!isTargetEmail || status.loading || (status.success && status.message.includes("admin"))}
          >
            {status.loading ? "Processing..." : "Set as Admin"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminSetup;
